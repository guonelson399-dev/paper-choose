# 来源、贡献与许可状态

## 已核对来源

- 基线：作者提供的历史包 `paper-limit-choose-2(4).zip`，包内 `INSTALL.txt` / `SKILL.md` 标记版本 2.0.1。
- 原 ZIP SHA-256：`48ed5b6937902f4350308010e3ac757825cd82e8fb12eba383ad02e95872b2ae`。
- 包内记载前身 `paper-limit-choose 1.6.0`；本轮未取得该前身进行逐行来源追溯。
- 原包的 `SKILL.md` 声明 `license: MIT`；未发现独立 LICENSE、版权人或外部源码 URL。
  保留原声明，不把缺少文本解释成其他许可证，也不声称权利链已经核清。

## 本轮贡献

作者确定用途、组件边界、授权范围与发布约束；助手在独立候选目录整理文档，
移除默认 1000 词/旧课程专用规则，澄清冲突项和独立翻译缺失时的行为，
修改字数 CLI 的显式参数与错误处理，新增合成例子和回归测试。
基线其余内容来自原包；具体逐文件差异保留在外层审阅材料，不虚构历史个人或团队贡献。

## 依赖与第三方内容

原基础版运行脚本和 Python 测试仅依赖 Python 标准库（argparse、re、sys、pathlib 等），没有打包解释器、
第三方 Python 库、模型权重、客户端软件或外部 skill。课件提取方法中提到的
`pdftotext` 是可选外部工具，未随包分发，且本轮未测试该路径。
真实 BTI/AEC 工具与助手客户端需另行配置；其许可、计费与数据权限不由此包授予。
合成例子由本轮编写，不引用真实稿件或课程材料。

## 公开前尚需完成

确认原包与新增修改的权利归属、适用许可及版权署名；若继续采用原声明 MIT，
补齐作者批准的完整许可文本与署名。本轮不新增或更换许可证、不创建远端仓库。

## 本轮本地工作台增量（2026-10-19）

在2.0.2-rc.1基础上新增 Python 标准库核心/CLI/本地HTTP页面、Windows启动脚本、
严格核对格式、合成JSON和执行测试。页面为原生HTML/CSS/JavaScript，无CDN、图像素材或外部前端库。
开发过程中参考 Sites 技能的本地工作与验证边界，未复制其模板或部署代码。
原计数脚本保持单一来源，未改用另一套算法。
助手完成代码及文档；作者提供任务边界和继续推进的指令。当前结果为本地开发候选，未部署、未收费。
原MIT声明保留，新增内容的最终许可与权利署名仍待作者确认；本轮未作许可变更。

## 可选本地翻译候选增量（2026-10-19）

新增本地翻译接口、页面预览与采用、原文快照下载、失效检查、可选安装器和测试。
保留原有核对方法，更新 SKILL.md 的本地翻译能力与执行入口说明；软件版本后缀标识本轮翻译候选。

- Argos Translate 1.9.6：来源 https://github.com/argosopentech/argos-translate ，使用其公开 Python 接口；项目声明 MIT。
- CPU PyTorch 2.5.1：来源 https://pytorch.org/ ，官方 CPU wheel 来源 https://download.pytorch.org/whl/cpu 。
- 其他依赖由 requirements-translation.txt 经 pip 安装，包括 Stanza、CTranslate2、SentencePiece 等；适用各自上游许可。此源码包不再分发这些依赖。
- 模型通过 Argos 官方索引 https://github.com/argosopentech/argospm-index 下载。实际本轮中英双向包均为 1.9，其 README 将原 OPUS 模型标为 CC-BY 4.0，并列出 Jörg Tiedemann、Santhosh Thottingal，OPUS-MT — Building open translation services for the World，EAMT 2020。模型包原说明随本地安装保留。
- 本候选 ZIP 不包含第三方库、模型权重、真实稿件或 API 密钥。未来若分发模型或完整安装包，应随包保留相应许可及署名。

独立翻译和核对有助于查找语义差异；本项目不把这种流程宣传为改变或保证 AI 检测结果。
