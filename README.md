# Paper Choose：717处理后的最小纠错辅助

**原稿 + 717处理稿 → Agent 提出 P1/P2 → 作者逐项选择 → 导出修改稿。**

717处理文字后，可能出现专业名词错误、主语与宾语错位、代词指代错误或论证含义偏移。Paper Choose 仅作为这一步之后的辅助工具：对照作者认可的原稿，列出必要的最小修改，让作者自己决定采用哪些。

**纠错后 AI 检测分数可能上升、下降或不变。Paper Choose 不提供检测分数优化，也不保证降低分数。** 可以采用部分建议，也可以全部不采用；不会为了分数保留或制造错误。

当前版本：`3.0.0-dev.1`，开发候选版。

## 只保留哪些功能？

- **P1：实质错误**。术语概念、主语/宾语、指代、数字、否定、因果、条件、范围、归属、主张强度等偏移。
- **P2：必要技术性纠错**。专名大小写、影响意思的连字符、造成歧义的语法、影响来源识别的引用格式。
- **作者择项**。P1/P2 均默认不采用；只执行已选编号，选区外文字保持不变。
- **对照与记录**。保留原稿、717处理稿、修改稿、修改对照及作者选择记录。

不做全文润色、风格统一、扩写、压缩或句段删除。不要求中文中间稿，不再提供 DeepSeek/Argos 翻译、回译、BTI/AEC 或音频扩展。旧流程保留在 Git 历史中。

## 怎么使用？

1. 在717自行处理文本，保留处理前的作者认可原稿。
2. GitHub 点击 **Code → Download ZIP**，完整解压；准备 Python 3.10+。
3. 双击 **start_windows.cmd**；Mac/Linux 在项目目录运行 `python3 -m paperchoose serve --open`。
4. 页面粘贴英文原稿与717英文处理稿，可填写需要精确保留的术语。
5. 选择核对方式：授权配置的云端 Agent 核对，或下载核对请求交给自己的 Agent，再导入它返回的 JSON。
6. 阅读每一项的原文、依据、最小替换和原因，选择采用项，再导出。

输入为纯文本，网页每份上限15,000字符；超出请按章节处理，不会截断。页面刷新会丢失未下载内容。修改输入或术语后，旧建议失效，需重新核对。

## 原稿与717的关系

原稿用于核对意思，不是要求逐字恢复的写作模板。只要717稿表达同一意思，保留其措辞和文风；例如 `may` 与 `might` 表意等价时不为统一用词而修改。

如果原稿本身含糊或与作者要求冲突，Agent 应指出具体问题，请作者澄清，而非猜测主语或补写结论。程序检查位置和选择范围，不能自动证明语义正确。

本项目不调用717服务，也不验证粘贴稿是否确由717生成；配合使用不表示官方集成或合作认证。

## 核对在哪里运行？

| 操作 | 位置 |
| --- | --- |
| 717处理 | 作者在717自行完成 |
| 云端 Agent 核对 | 配置的 Base44 服务，授权后发送两份稿件和术语 |
| 自有 Agent 核对 | 作者自行选择工具并交付核对请求 |
| 建议验证、执行选择、导出 | 本机 Python 服务 |

GitHub 源码更新不等于云端服务已部署。3.x 使用独立云端函数 `checkMinimalCorrection`，须部署新版函数后才能使用云端按钮；不会静默回退到旧翻译函数。未部署时，可直接使用自有 Agent 请求/导入流程。公开应用 ID 不是密钥，也不保证免费服务和额度。

## Agent／命令行

读取 [SKILL.md](SKILL.md)、[Agent 工作流](docs/AGENT_WORKFLOW.md) 和 [JSON 格式](docs/AUDIT_FORMAT.md)。只保留 `prepare-review`、`check-review`、`apply-review`、`serve`。

```bash
python -m paperchoose prepare-review --source-text source.txt --draft draft.txt --context context.json --out request
python -m paperchoose check-review --source-text source.txt --draft draft.txt --context context.json --audit audit.json
python -m paperchoose apply-review --source-text source.txt --draft draft.txt --context context.json --audit audit.json --select P1-01 --out result
```

`--none` 表示全部不采用。输出目录必须不存在，避免覆盖原件。命令行支持英文同语种或中文同语种核对。

## 开发者

- `paperchoose/workflow.py`：两稿和设置绑定、P1/P2执行、导出。
- `paperchoose/core.py`：精确选区算法；保留内部v1适配格式，不作为旧翻译产品入口。
- `frontend/src/`：网页；`frontend/base44/functions/checkMinimalCorrection/`：云端建议生成。

```bash
python -B -m unittest discover -s tests -v
cd frontend
npm ci
npm test
npm run lint
npm run build:local
python ../scripts/install_webapp.py
```

构建后的页面位于 `paperchoose/webapp/`，普通用户无需 Node.js。云端部署见 [部署说明](frontend/部署说明.md)。测试使用合成材料及模拟云端响应，不代表真实模型纠错质量或AI检测结果。
