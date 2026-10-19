# 核对格式 v2

新页面及 `prepare-review / check-review / apply-review` 使用 v2。请求包中的模板是本轮权威字段清单，不手工修改哈希来绕过版本检查。

输入为 `source`（作者原稿）、`draft`（待修改机翻稿）、`context`（设置）。context 必须包含：source_language、target_language、protection_mode、protected_terms、author_notes、reference_original，详见 AGENT_WORKFLOW。

```json
{
  "schema_version": 2,
  "mode": "translation_audit",
  "source_sha256": "复制请求模板",
  "draft_sha256": "复制请求模板",
  "context_sha256": "复制请求模板",
  "reviewer": {"kind": "assistant", "label": "实际核对来源"},
  "protection_observations": [],
  "proposals": []
}
```

哈希是精确 UTF-8 文本的 SHA-256；context 哈希针对排序键、无多余空白、非ASCII保留原文的规范 JSON。它绑定设置，不认证作者身份或语义质量。

每条 `protection_observations` 仅含字符串 `source_quote`、`target_form`、`reason`。引用必须存在于原稿；manual 模式列表为空。这是AI只读观察，不是自动执行约束。

每条 `proposals` 仅含字符串 `id`、`category`、`before`、`after`、`context_before`、`context_after`、`source_quote`、`reason`。

- id：唯一 P1-01 / P2-01 等编号。
- category：meaning、number、negation、modality、scope、attribution、term、technical。
- before / after：机翻稿中的精确最小跨度与唯一替换；非空、不同。
- context_before / context_after：紧邻跨度的原文，用来消除重复定位。
- source_quote：当前原稿的精确引文。参考英文不能代替它。
- reason：具体解释为何需要修改，不能仅说“更自然”。

不接受多余字段、重复JSON键、自动选择、未知模式或BTI/AEC修改。返回零建议可以；未完成核对不能伪装成零问题。最多200条建议和200条观察。

`/api/review/request` 接收 source/draft/context；check 加原始JSON字符串 audit；preview 再加 selected_ids；export 再加预览的 plan_sha256。均需本地会话令牌。具体选区执行复用经过测试的 core.py 算法，公开报告使用 source/draft 语言角色。

旧格式 v1 仍由旧接口支持，只适用于原有 zh→en 输入；不能导入新页面。原有 examples/synthetic/audit.v1.json 保留作历史兼容测试，新页面演示将其转换为当前输入绑定的合成 v2 清单。
