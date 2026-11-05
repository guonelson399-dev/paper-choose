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

## 原稿与717的关系

原稿用于核对意思。只要717稿表达同一意思，保留其措辞和文风；例如 `may` 与 `might` 表意等价时不为统一用词而修改。

如果原稿本身含糊或与作者要求冲突，Agent 应指出具体问题，请作者澄清。

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
- `paperchoose/core.py`：精确选区算法；保留内部v1适配格式。
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

构建后的页面位于 `paperchoose/webapp/`。云端部署见 [部署说明](frontend/部署说明.md)。
