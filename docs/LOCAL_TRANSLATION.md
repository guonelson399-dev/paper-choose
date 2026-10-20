> 新网页已支持自动分批翻译。以下预览、手动采用和下载翻译记录的操作属于 /classic 原界面；单次 API 的 5000 字符限制仍保留。

# 可选本地翻译

此候选把普通机翻接入页面；没有接入苹果翻译服务，网页也不自动调用 AI 服务；具备工具权限的当前助手可以按 AGENT_WORKFLOW.md 执行核对。
翻译引擎为 Argos Translate 1.9.6，使用本地中英直接模型，不自动转接云端或第三种语言。

## Windows

建议安装 Python 3.12 后双击根目录的 `setup_local_translation.cmd`。
安装器会询问是否联网下载；按 Y 才开始。完成后重新启动 `start_windows.cmd`。
该启动器优先使用项目内的 `.paperchoose-venv`，避免安装和运行使用不同解释器。
遇到安装失败，请保留报错信息。

## Linux / macOS 命令行

在项目目录执行以下 Linux 安装命令。macOS 需要选择适用的 PyTorch 安装方式。
CPU PyTorch 的官方索引主要用于 Linux / Windows；macOS 请按 PyTorch 官方安装指引配置。

```sh
python3.12 -m venv .paperchoose-venv
.paperchoose-venv/bin/python -m pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.paperchoose-venv/bin/python -m pip install -r requirements-translation.txt
.paperchoose-venv/bin/python -m paperchoose.translation --download-models
.paperchoose-venv/bin/python -m paperchoose serve --open
```

安装会访问 PyPI、PyTorch 与 Argos 的模型下载服务；不需要稿件。
安装固定双向 1.9 模型，并校验脚本内固定的模型归档 SHA-256。
翻译时不更新索引、不下载模型。模型缺失会返回错误，保留页面原稿。

## 页面操作与保留记录

1. 选择翻译方向，将作者原稿放在左侧，点击“按所选方向翻译原稿”。
2. 先看译文预览；此时原稿不改变。
3. 点击“放入待核对译文”。这只把机翻稿放入右侧，不表示语义正确；右侧已有内容时会确认替换。
4. 下载本次翻译记录。JSON 包含当时的原稿、旧译文与本次译文、模型版本、时间、摘要值和是否采用。
5. 采用译文后，旧核对结果会清除。为新版本重新导出核对请求。

每次最多 5,000 个字符，CPU 同时处理一条翻译。刷新或关闭页面会清除未下载记录。
翻译中更改稿件或选择后，旧结果不会自动进入页面稿件。
双向核对都以作者提供的原稿为依据。英译中不强制再翻回英文；机翻稿不会变成作者原意。

## 接口

- `GET /api/translation/status`：已安装方向与安装提示。已安装不等于已经成功运行。
- `POST /api/translate`：`{"text":"需要翻译的文字","source":"zh","target":"en"}`。
  另支持 en→zh。使用现有会话令牌、Host 和 Origin 校验，不提供公网接口。
- 返回译文、输入及输出 SHA-256、实际引擎/模型版本、UTC 时间。`meaning_verified` 固定为 false。

## 测试

项目根目录运行 `python -B -m unittest discover -s tests -v`。翻译相关单元测试包含模拟响应；检查真实翻译效果时需要已安装的模型和实际文本。
