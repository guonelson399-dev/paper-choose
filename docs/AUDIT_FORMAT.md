# 最小纠错 JSON 格式 v4

从当前 request.json 的 audit_template 复制模板，不能凭记忆写哈希。
必需字段：schema_version=4、mode="minimal_correction"、source_sha256、draft_sha256、context_sha256、reviewer、protection_observations、proposals。
reviewer 包含 kind（human/assistant/synthetic）与实际 label。
每项proposal必须且只能包含 id、category、before、after、context_before、context_after、source_quote、reason，全部为字符串。
id为唯一P1-01/P2-01格式；category为meaning/number/negation/modality/scope/attribution/term/technical之一。
before/after非空且不同。source_quote必须精确出现在原稿。context_before/context_after必须紧邻before；唯一定位时可为空。
主语、宾语和指代归meaning；术语归term。AI不得加入selected_ids。作者选择独立于建议。
protection_observations每项为source_quote、target_form、reason；只记录、不执行。manual模式为空。
旧v2/v3核对与本版本不兼容，须重新生成。两稿或设置变化后STALE_INPUT；选择变化后须重新预览才能导出。
