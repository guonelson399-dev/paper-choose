"""Optional, direct local Argos translation. Never installs models during inference."""
from __future__ import annotations
import argparse
import hashlib
from datetime import datetime, timezone
from importlib.metadata import version, PackageNotFoundError
import os
from pathlib import Path
import threading

from .core import Rejected, reject, digest

MAX_CHARS = 5000
PAIRS = {('zh', 'en'), ('en', 'zh')}
ROOT = Path(__file__).resolve().parents[1]
LOCK = threading.Lock()
TRANSLATORS = {}
MODEL_VERSION = "1.9"
MODEL_SHA256 = {'translate-en_zh.argosmodel': '433e7c4f034d87fbe2353161e05f18646d7999452f801a4e1f0378522b9850ab', 'translate-zh_en.argosmodel': '62e7af5a3a48b530e47b7b3e5c78c2de79073ecd815750d2bf3ab35b4a67da2d'}


def configure():
    # Dedicated project models/cache; no third-party debug logs containing manuscripts.
    os.environ['ARGOS_PACKAGES_DIR'] = str(ROOT / '.translation-data' / 'packages')
    os.environ['XDG_DATA_HOME'] = str(ROOT / '.translation-data' / 'data')
    os.environ['XDG_CACHE_HOME'] = str(ROOT / '.translation-data' / 'cache')
    os.environ['ARGOS_PACKAGE_INDEX'] = 'https://raw.githubusercontent.com/argosopentech/argospm-index/main'
    os.environ['ARGOS_MODEL_PROVIDER'] = 'OPENNMT'
    os.environ['ARGOS_DEVICE_TYPE'] = 'cpu'
    os.environ['ARGOS_STANZA_AVAILABLE'] = 'True'
    os.environ['ARGOS_DEBUG'] = 'False'


def packages():
    configure()
    try:
        import argostranslate.package as package
        return package.get_installed_packages()
    except ImportError:
        reject('TRANSLATION_SETUP', '本地翻译尚未安装。请先运行 setup_local_translation.cmd，或查看 README 的翻译安装说明。')


def status():
    try:
        installed = packages()
        return {'engine': 'Argos Translate', 'version': version('argostranslate'),
                'pairs': [{'source': a, 'target': b} for a, b in sorted(PAIRS)
                          if any(p.from_code == a and p.to_code == b and str(p.package_version) == MODEL_VERSION for p in installed)],
                'max_chars': MAX_CHARS, 'message': '模型已安装；首次翻译需要加载。'}
    except (Rejected, PackageNotFoundError):
        return {'engine': 'Argos Translate', 'pairs': [], 'max_chars': MAX_CHARS,
                'message': '本地翻译尚未安装。请查看页面上的安装说明。'}
    except Exception:
        return {'engine': 'Argos Translate', 'pairs': [], 'max_chars': MAX_CHARS,
                'message': '本地翻译组件无法读取。请重新运行翻译安装程序。'}


def load_translator(source, target):
    installed = packages()
    found = [p for p in installed if p.from_code == source and p.to_code == target and str(p.package_version) == MODEL_VERSION]
    if not found:
        reject('TRANSLATION_MODEL', '缺少这个方向的本地模型。请运行翻译安装程序；本次请求不会自动下载模型或上传文字。')
    # Direct packages only: no network provider and no silent intermediate language.
    pkg = sorted(found, key=lambda p: str(p.package_path))[0]
    import argostranslate.translate as translate
    engine = translate.PackageTranslation(translate.Language(source, source),
                                          translate.Language(target, target), pkg)
    return engine, {'name': 'Argos Translate', 'version': version('argostranslate'),
                    'model_version': str(pkg.package_version), 'device': 'cpu',
                    'tested_model_archive_sha256': MODEL_SHA256[f'translate-{source}_{target}.argosmodel'],
                    'source': source, 'target': target}


def translate_text(text, source, target):
    if not isinstance(source, str) or not isinstance(target, str) or (source, target) not in PAIRS:
        reject('TRANSLATION_PAIR', '本版只支持中文→英文、英文→中文。')
    if not isinstance(text, str) or not text.strip():
        reject('TRANSLATION_INPUT', '请先放入需要翻译的文字。')
    if len(text) > MAX_CHARS:
        reject('TRANSLATION_LIMIT', f'每次最多翻译 {MAX_CHARS} 个字符，请按章节或段落处理。')
    if not LOCK.acquire(blocking=False):
        reject('TRANSLATION_BUSY', '本地引擎正在翻译，请等这次完成后再试。')
    try:
        pair = (source, target)
        if pair not in TRANSLATORS:
            TRANSLATORS[pair] = load_translator(*pair)
        engine, metadata = TRANSLATORS[pair]
        result = engine.translate(text)
        if not isinstance(result, str) or not result.strip():
            reject('TRANSLATION_EMPTY', '翻译没有返回有效文字；原稿未改变。')
        return {'source_text': text, 'source_sha256': digest(text),
                'translated_text': result, 'translation_sha256': digest(result),
                'engine': metadata, 'created_at': datetime.now(timezone.utc).isoformat(),
                'meaning_verified': False}
    except Rejected:
        raise
    except Exception:
        # Do not expose exception text: dependencies may include manuscript content.
        reject('TRANSLATION_FAILED', '本地翻译失败，原稿未改变。请检查模型和依赖是否完整，或先用短段落重试。')
    finally:
        LOCK.release()


def main():
    parser = argparse.ArgumentParser(description='安装可选本地翻译模型；不读取稿件。')
    parser.add_argument('--download-models', action='store_true', help='联网下载中英双向模型到项目目录')
    args = parser.parse_args()
    if not args.download_models:
        import json
        print(json.dumps(status(), ensure_ascii=False, indent=2))
        return
    configure()
    import argostranslate.package as package
    package.update_package_index()
    available = package.get_available_packages()
    for source, target in sorted(PAIRS):
        if any(p.from_code == source and p.to_code == target and str(p.package_version) == MODEL_VERSION for p in package.get_installed_packages()):
            print(f'{source} -> {target}: already installed', flush=True)
            continue
        matches = [p for p in available if p.from_code == source and p.to_code == target and str(p.package_version) == MODEL_VERSION]
        if not matches:
            raise SystemExit(f'No direct package for {source} -> {target}')
        print(f'Downloading {source} -> {target}', flush=True)
        archive = matches[0].download()
        expected = MODEL_SHA256[f'translate-{source}_{target}.argosmodel']
        if hashlib.sha256(Path(archive).read_bytes()).hexdigest() != expected:
            raise SystemExit("Model archive differs from tested candidate. Not installed.")
        package.install_from_path(archive)
        print(f'Installed {source} -> {target}', flush=True)


if __name__ == '__main__':
    main()
