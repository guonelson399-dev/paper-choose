# 核对 JSON 格式 v1

这个格式用于助手/人工与确定性执行器之间交换核对意见。
程序不会把 JSON 中的意见视为作者已批准，也不会执行其中的命令或文件路径。

使用 `prepare` 或网页导出的 request.json 取得准确哈希；不要让模型自行计算或改写哈希。
所有字段必填，未知字段及重复键拒绝。编码 UTF-8，文件内不带 Markdown 围栏。
完整可运行样例见 `../examples/synthetic/audit.v1.json`。

| 顶层字段 | 约束 |
|---|---|
| schema_version | 整数 1 |
| mode | translation_audit；BTI/AEC拒绝作为修改输入 |
| chinese_sha256 / english_sha256 | 对原始 UTF-8 文本计算 SHA-256；不统一换行或删除 BOM |
| reviewer | kind 为 human / assistant / synthetic；label 填实际来源。这是填报，不是认证 |
| proposals | 最多200行；空列表仅代表来源未列修改，程序不认证语义正确 |

每行必须且只能包含：

| 字段 | 约束 |
|---|---|
| id | 唯一 P1-01 / P2-01 等编号；后缀至少两位数字 |
| category | meaning、number、negation、modality、scope、attribution、term、technical 之一 |
| before / after | 原跨度与唯一替换文本，均非空且不同；不支持插入或删除 |
| context_before / context_after | 紧邻原跨度的上下文；允许空；用于重复句的唯一定位 |
| source_quote | 在当前中文中精确出现的引文 |
| reason | 供作者审阅的中文说明 |

**定位以原稿为准。** 两个选中跨度重叠时拒绝整次应用。一个替换产生的新短语不会成为另一个修改项的目标。
没有 source_quote 或跨度含糊的项目可以显示为 blocked；其他独立有效项仍可选择。
结构错误、版本不符或重复ID使整份核对清单不可执行。

**选择独立于核对清单。** 网页复选框默认空；CLI 要求 --select ID... 或 --none。
不得让助手向 audit 添加 selected_ids。选择记录仅表示本次操作，不验证真实人类身份。

导出 decisions.json 中的 audit_sha256 使用排序键、无额外空白、非ASCII不转义的规范 JSON，
不等同于任意格式化原文件的字节哈希。plan_sha256绑定整份采用记录；预览后清单或选择变化会拒绝旧预览导出。

**语义边界：** “引用存在”“位置匹配”“修改未越界”均不证明替换正确。
故意错误但位置合法的建议仍可能被作者选择并执行；测试记录了这个边界。
