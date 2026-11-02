# Agent 工作流

只核对同语种原稿与717处理稿；不翻译、不润色。先读根目录 SKILL.md。

1. 用网页“下载Agent核对请求”，或命令行 prepare-review 生成 request.json 和 AUDIT_PROMPT.md。
2. 作者自行决定把请求交给哪个Agent。Agent复制 audit_template 的 schema_version=4、mode=minimal_correction 和三个哈希；填写实际reviewer、protection_observations、proposals。
3. 导入网页或用 check-review 检查。只有格式、依据引文、位置都有效的建议可被选择。
4. 作者选择编号，或全部不采用。apply-review 必须显式 --select ID 或 --none。
5. 导出 source.en.txt、draft.717.en.txt、revised.en.txt、changes.diff、context.json、audit.json、decisions.json、NOTICE.txt；中文同语种时扩展名为zh。

context.json 示例：
```json
{"source_language":"en","target_language":"en","protection_mode":"combined","protected_terms":["Sharpe ratio"],"author_notes":""}
```

原稿、717稿和context都参与哈希绑定。已有核对不随输入更新。程序不调用717、不验证其输出来源，也不证明Agent建议语义正确。
