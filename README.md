# Paper Choose · 本地作者择项工作台

**从双语核对结果到作者确认的新稿。** `2.1.0-dev.1` 是本地开发候选，基于 `2.0.2-rc.1`。
它把版本、位置、选中项和导出检查落到了程序中；语义核对由你选用的助手或人工完成。

## 最短启动方式

需要 Python 3.10+，没有第三方 Python 依赖。解压整个文件夹。

- Windows：双击 `start_windows.cmd`，保持终端打开；脚本尝试启动本地页。
- 其他系统或命令行：在本文件所在目录运行：

```sh
python -m paperchoose serve --open
```

浏览器地址默认是 `http://127.0.0.1:8765/`。端口被占用时可用 `--port 8766`。
停止服务按 Ctrl+C。只监听本机，页面不加载 CDN，不调用模型，也不自动上传原文。
本轮在 Linux / Python 3.12.14 运行了命令行与 HTTP 集成测试；未实测 Windows 启动及真实浏览器点击。

## 第一次使用：约一分钟的合成演示

1. 点击 **试用合成示例**。界面载入中文、英文及明确标注为手工构造的核对清单。
2. 勾选 **P1-01**，保留 P1-02 不选。查看原文、中文依据、替换建议及原因。
3. 点击 **预览所选修改**。新稿只将 `always improves` 改为 `may improve`。
4. 确认后下载结果包，得到 `revised.en.txt`、`changes.diff`、`decisions.json`。
5. 选择 **全部不采用** 再预览，输出应与原英文逐字节一致。

例子不是实际论文、机器翻译调用或真实作者决定。保留未选错误是为了演示范围控制。

## 用于自己的文本

### 1. 放入原稿

粘贴中文语义稿和英文译稿，或分别导入 UTF-8 TXT。每份最多 200,000 字节；适合指定章节。
导入文件未被编辑时保留 CRLF、BOM 和末尾换行；在文本框重新编辑后，以新文本重新绑定版本。
本工具不会直接读取 Word/PDF，不自动提取全文或扫描目录。

### 2. 取得核对结果

点击 **导出给助手的核对请求**。请求包包含两份原文、版本哈希、JSON 模板和核对提示。
将其中的提示与 request.json，以及本包 SKILL.md，交给你选择的助手。是否将材料交给云端由你决定。
这个步骤由现有助手执行，网页没有“自动核对”按钮或隐含 API 调用。

助手应返回符合 `docs/AUDIT_FORMAT.md` 的 JSON。也可以由人工填写。
模板中的空 proposals 仅表示尚未填入意见；不要把未经核对的空模板当作零问题证明。

### 3. 导入、确认和导出

导入核对 JSON 后点击 **校验并展示修改项**。所有项目默认不选中。
每项显示中文引文、英文原文、建议替换和理由。缺失依据或定位不明确的项目不可采用。
修改原文或导入新结果会清除选择和预览，要求重新确认。

预览时按原稿位置一次性执行选中项；不会先改全文再从新稿搜索其他修改。
两个选中项重叠时整次拒绝，保留原件，待你选择其中一项或重新核对。
确认下载前再次检查预览对应的输入与清单，防止导出过期选择。

## 程序保证的范围

| 程序检查 | 实际行为 |
|---|---|
| 中英版本 | 当前文本 SHA-256 必须匹配核对清单；不自动更新旧清单的哈希 |
| 修改位置 | 精确 before 与相邻上下文必须匹配唯一位置 |
| 中文依据 | source_quote 必须在中文原稿出现；这不代表建议语义正确 |
| 作者选择 | 只使用本次显式选择的 ID，模型清单不能夹带 selected_ids；未选项记录为 not_selected |
| 修改冲突 | 选中范围重叠、未知/重复ID或不支持的操作都会拒绝 |
| 范围检查 | 输出前逐段核对所选范围之外的 UTF-8 字节不变 |
| 导出 | 生成新文件；CLI 拒绝已存在的输出目录；网页只下载结果，不写入原文件 |

这里的作者确认是操作流程，不是身份认证。哈希检查一致性，不证明核对来源身份或语义可靠性。
程序首版只支持 **P1/P2 的非空替换**。C/D/E、插入、删除、格式修改和重叠意见合并留作人工处理。
BTI/AEC 是只读阶段，不能作为本执行器的修改输入。

## 命令行：与网页共用同一核心

以下命令在此 README 所在目录执行。每次使用新的输出目录。

```sh
python -m paperchoose prepare --chinese examples/synthetic/source.zh.txt --english examples/synthetic/draft.en.txt --out audit-request
python -m paperchoose check --chinese examples/synthetic/source.zh.txt --english examples/synthetic/draft.en.txt --audit examples/synthetic/audit.v1.json
python -m paperchoose apply --chinese examples/synthetic/source.zh.txt --english examples/synthetic/draft.en.txt --audit examples/synthetic/audit.v1.json --select P1-01 --out revised-demo
python -m paperchoose apply --chinese examples/synthetic/source.zh.txt --english examples/synthetic/draft.en.txt --audit examples/synthetic/audit.v1.json --none --out unchanged-demo
```

`check` 返回每项是否可定位；只要存在被阻止的行就退出 3。结构或版本错误退出 2。
`apply` 只要求选中项全部可执行；未选的定位问题可以保留在报告中。成功退出 0；拒绝退出 2。
显式 `--none` 也需要输入版本正确。没有选择参数时不执行。

采用记录包括输入、核对清单、新稿和预览的哈希、执行范围、未选项、前后工作流词数。
偏移量单位是 Unicode 码点，不是字节或 JavaScript 的 UTF-16 单元。英文结果文件保留准确字节；
人读差异对没有末尾换行的行补充标记。

## 计数工具继续独立可用

```sh
python scripts/wordcount.py examples/synthetic/draft.en.txt
python scripts/wordcount.py examples/synthetic/draft.en.txt --limit 30 --basis full
```

没有默认1000词或补满上限的要求。计数语义沿用上一候选：连字符/英文撇号词作为一个 token，
小数 `2.5` 会拆成两个；中文不支持。`without_cite` 会排除含 19xx/20xx 年份的括号组，
包括非引用内容，需人工核对。工作流计数不等于 Word/教师系统计数。

## 测试与来源

```sh
python -B -m unittest discover -s tests -v
```

测试包括真实 CLI/临时本地 HTTP 服务与 ZIP 导出、版本变化、重复定位、重叠意见、
未选项保留、CRLF/BOM/无末尾换行、中文引文缺失、过期预览、原文件及已有输出保护。
网页脚本另经语法检查；真实浏览器交互尚未验收。没有自动语义核对、实际云模型或翻译引擎验收。

本轮添加 `paperchoose/` 共用核心和本地页，保留 `scripts/wordcount.py` 单一计数来源。
ResearchOS 应引用独立组件，不复制核心。原包 MIT 声明保留；完整许可及版权署名待作者确认。
来源和贡献见 `THIRD_PARTY_NOTICES.md`。本地候选未发布 GitHub、未部署网站、未收费。
