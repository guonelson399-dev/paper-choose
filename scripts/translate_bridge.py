#!/usr/bin/env python3
"""Generate separate translations; never rewrite or overwrite the source."""

import argparse
import json
import hashlib
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler

ENDPOINT = "https://api.deepseek.com/chat/completions"
MAX_INPUT_CHARACTERS = 12000  # Conservative client guard, not a provider limit.
PROMPT_PATH = Path(__file__).resolve().parent.parent / "references" / "faithful-en-zh-prompt.txt"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("DeepSeek redirect refused; source and credentials were not forwarded")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def read_input(path: Path) -> str:
    value = path.read_bytes().decode("utf-8")
    if not value.strip():
        raise ValueError("Input is empty")
    return value


def write_output(source: Path, destination: Path, value: str) -> None:
    if source.resolve() == destination.resolve():
        raise ValueError("Output must differ from input")
    if destination.exists():
        raise ValueError(f"Output already exists: {destination}")
    if not value.strip():
        raise ValueError("Translation is empty")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("x", encoding="utf-8", newline="") as handle:
        handle.write(value)


def paragraphs(value: str):
    return re.split(r"(\n\s*\n)", value)


def local_translation(value: str, source: str, target: str) -> str:
    try:
        import argostranslate.package
        import argostranslate.translate
    except ImportError as exc:
        raise RuntimeError("Install argostranslate in this Python environment") from exc
    installed = argostranslate.package.get_installed_packages()
    if not any(p.from_code == source and p.to_code == target for p in installed):
        raise RuntimeError(f"Direct Argos model {source}->{target} is not installed")
    return "".join(
        argostranslate.translate.translate(piece, source, target)
        if piece.strip() and not piece.isspace() else piece
        for piece in paragraphs(value)
    )


def deepseek_chinese(value: str, model: str, allow_cloud: bool):
    if not allow_cloud:
        raise RuntimeError("Cloud translation requires --allow-cloud after author authorization")
    if len(value) > MAX_INPUT_CHARACTERS:
        raise ValueError("Input exceeds 12000 characters; split at section boundaries without truncation")
    if not model or model.strip() != model:
        raise ValueError("Set a nonempty DEEPSEEK_MODEL or --model")
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY is not set")
    prompt = read_input(PROMPT_PATH)
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": value},
        ],
        "stream": False,
        "thinking": {"type": "disabled"},
    }
    request = Request(
        ENDPOINT,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=120) as response:
            result = json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"DeepSeek API returned HTTP {exc.code}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError("DeepSeek API is unreachable") from exc
    try:
        choice = result["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise RuntimeError("DeepSeek response did not finish normally; no translation saved")
        translation = choice["message"]["content"]
        returned_model = result["model"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("DeepSeek API response has no translated content") from exc
    if not isinstance(translation, str) or not translation.strip():
        raise RuntimeError("DeepSeek API response has no translated content")
    if not isinstance(returned_model, str) or not returned_model:
        raise RuntimeError("DeepSeek API response has no model identifier")
    return translation, {
        "provider": "DeepSeek",
        "endpoint": ENDPOINT,
        "requested_model": model,
        "returned_model": returned_model,
        "source_language": "en",
        "target_language": "zh",
        "source_sha256": sha256(value),
        "translation_sha256": sha256(translation),
        "prompt_sha256": sha256(prompt),
        "finish_reason": "stop",
        "semantic_fidelity_verified": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    local = sub.add_parser("local", help="Independent offline Argos machine translation")
    local.add_argument("--from-lang", choices=("en", "zh"), required=True)
    local.add_argument("--to-lang", choices=("en", "zh"), required=True)
    ds = sub.add_parser("deepseek-zh", aliases=["v4-zh"],
                        help="Faithful English to Chinese via DeepSeek (cloud, billed)")
    ds.add_argument("--model", default=os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro"))
    ds.add_argument("--allow-cloud", action="store_true",
                    help="Confirm author authorized sending this input to DeepSeek")
    for p in (local, ds):
        p.add_argument("--input", type=Path, required=True)
        p.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.input.resolve() == args.output.resolve():
            raise ValueError("Output must differ from input")
        metadata_path = args.output.with_name(args.output.name + ".metadata.json")
        if args.output.exists() or (args.command != "local" and metadata_path.exists()):
            raise ValueError("Output or metadata already exists; use a new destination")
        source = read_input(args.input)
        if args.command == "local":
            if args.from_lang == args.to_lang:
                raise ValueError("Choose different source and target languages")
            result = local_translation(source, args.from_lang, args.to_lang)
        else:
            result, metadata = deepseek_chinese(source, args.model, args.allow_cloud)
        write_output(args.input, args.output, result)
        if args.command != "local":
            # Separate provenance contains no key or manuscript text.
            with metadata_path.open("x", encoding="utf-8") as handle:
                json.dump(metadata, handle, ensure_ascii=False, indent=2)
            print("Saved DeepSeek translation and metadata; semantic fidelity requires review.")
        return 0
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"Translation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
