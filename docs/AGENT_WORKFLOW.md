# 让你正在使用的助手跑完整流程

目标入口：Codex、Cursor、Claude Code，以及具备相应执行能力的 Grok Bot。
它们共用本项目的一套规则与脚本，不另维护四套翻译或核对代码。
这里提供通用文件与命令入口，不声明已经安装到四个客户端或通过其实际验收。

## 用户只需交代什么

把整个项目文件夹和允许处理的稿件提供给助手，发送：

> 请读取这个项目的 SKILL.md 和 docs/AGENT_WORKFLOW.md，使用 Paper Choose 处理我指定的稿件。先检查本地翻译是否可用，再完成需要的翻译和核对。中文以我确认的版本为准。先给我看有编号的修改建议，等我选择后再执行；保留原稿，不自由润色。请不要另开付费 API 或上传到其他服务。

提供中文原稿时，可以直接确认该中文作为依据。只有英文初稿时，先让助手产生中文阅读稿，等你确认或修订中文，再继续后续核对。
不要求你手动复制 JSON；有执行能力的助手可以生成文件、调用程序并向你展示建议。

## 助手先检查环境

1. 读取 `SKILL.md`、`references/list-lock.md` 和当前任务需要的规则文件。
2. 确认你能读取用户指定文件并执行 Python。只有聊天权限时，说明缺少文件/命令能力，转为文件交换流程，不声称已在用户电脑运行。
3. 定位项目目录与同一个 Python 解释器。Windows 可选翻译环境为 `.paperchoose-venv\Scripts\python.exe`；Linux 为 `.paperchoose-venv/bin/python`。
4. 运行 `python -m paperchoose.translation` 查看安装状态。这里的 `python` 须替换为上一步找到的解释器路径，后续每条命令使用同一个解释器。
5. 缺少翻译组件时，报告缺件并按用户授权使用 `setup_local_translation.cmd` 或 `docs/LOCAL_TRANSLATION.md` 安装。不要在翻译失败时拿助手自己生成的译文冒充独立机翻。

必须在能访问项目代码和模型的执行环境里运行。云端 Codex 的文件和模型不会自动出现在用户的 Windows 电脑上。
当前助手对稿件的读取受其服务与用户设置约束；本地翻译并不意味着云端助手也离线。

## 翻译与核对

以下文件名是示例。先绑定用户实际文件与版本；输出使用新的任务目录，不覆盖已有目录。
命令在项目根目录执行；带空格的路径必须加引号。当前翻译每次最多 5,000 个字符，长稿按用户确认的章节拆分。

已有作者确认的中文 `source.zh.txt` 时：

```sh
python -m paperchoose translate --input source.zh.txt --source zh --target en --out work/mt-01
python -m paperchoose prepare --chinese source.zh.txt --english work/mt-01/translated.en.txt --out work/request-01
```

先创建 `work` 父目录。`translate` 生成独立译稿和 `translation.json`，记录实际引擎、模型、来源摘要及时间。翻译本身不授予修改原稿的权限。

只有英文 `draft.en.txt` 时，可先生成中文阅读稿：

```sh
python -m paperchoose translate --input draft.en.txt --source en --target zh --out work/reading-01
```

把中文交给作者确认或修订。未经确认，不把这份回译直接当作原英文正确性的证明。保留最初 AI 英文供后续只读对照，作者确认的中文才是本轮核对依据。

将作者实际确认的中文另存为 `source.zh.txt`，不要自动把阅读稿标为已确认。然后运行上面的中文→英文与 `prepare` 两条命令，使用新的输出目录。确认前停在阅读稿阶段。

如果作者已提供确认的中文和要核对的英文，跳过翻译，直接生成请求：

```sh
python -m paperchoose prepare --chinese source.zh.txt --english draft.en.txt --out work/request-01
```

此路线后续 `check` 和 `apply` 的 `--english` 都使用同一个 `draft.en.txt`，不得混用机翻目录中的另一版本。纯英文作者修订的 AEC 对照直接比较两个英文版本，不强制来回翻译。

读取请求目录中的 `request.json` 与 `AUDIT_PROMPT.md`。**当前助手自己完成核对**，按指定格式保存 `audit.json`，不另接 API，不调用第二个模型来冒充当前助手。
写清实际核对来源，复制请求中的版本摘要，不猜测或重算成另一个版本。只列真实发现，不为演示凑修改项。

```sh
python -m paperchoose check --chinese source.zh.txt --english work/mt-01/translated.en.txt --audit work/audit.json
```

给作者展示中文说明的编号清单：原英文、中文依据、问题、最小改法。若程序校验未通过，先修正格式或定位，再展示可执行建议。不得把“通过格式检查”说成“意思已验证”。

## 等作者选择，再执行

助手不得自行选择全部建议，也不得把用户要求开始流程当成批准修改。
作者选择 `P1-01` 后，才能执行对应命令：

```sh
python -m paperchoose apply --chinese source.zh.txt --english work/mt-01/translated.en.txt --audit work/audit.json --select P1-01 --out work/result-01
```

作者明确全部不采用时使用 `--none`，不要同时传 `--select`。
检查并交付 `revised.en.txt`、`changes.diff`、`decisions.json`。报告采用与未采用的编号，并让作者检查含义与必要的排版。
输入被修改后，重新生成请求与核对清单。不得绕过版本检查、用全文重写代替择项执行，或额外整理邻句。
BTI/AEC 继续只读，不并入这条自动修改链。

## 各入口的当前状态

| 入口 | 使用方式 | 验收状态 |
|---|---|---|
| Codex | 在具备文件与命令能力的执行环境中读取本说明并运行通用命令 | 本轮执行环境已跑通命令链；其他 Codex 部署未逐一验证 |
| Cursor | 向其 Agent 提供项目、规则与任务；需要它有文件和终端执行权限 | 未做客户端验收 |
| Claude Code | 在项目目录向助手提供本说明与任务，使用相同命令 | 未做客户端验收 |
| Grok Bot | 需先确认具体 Bot 能否访问项目文件并执行命令；具备能力时使用相同命令 | 具体部署未确认，未验收 |

用户需要确认的是中文原意和修改选择。其余文件传递与命令可由有权限的助手执行；不用为了核对环节再单独配置一个 API。
