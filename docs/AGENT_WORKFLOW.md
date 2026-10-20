# 助手操作：DeepSeek 中文 → Argos 英文 → 作者择项修改

## 当前主流程

这是作者指定的完整链：**英文原稿 → DeepSeek 忠实中文 → Argos 英文机翻 → Paper Choose 核对 → 作者选择 → 新英文稿**。

- 原始英文是语义依据；DeepSeek 中文不是作者自动确认过的中文原稿。
- Argos 只读取 DeepSeek 中文，方向为 zh→en，不读取英文原稿来套写。
- Paper Choose 同时读三份材料，修改目标只限于 Argos 英文。不能把中文中间稿误当最终修改对象。
- 翻译阶段不纠正原稿、不润色、不重排论证。术语、数字、否定、条件、主体和主张强度在核对中一起检查。

## 已有命令如何串联

在项目根目录保存 `source.en.txt`；密钥、授权与模型配置见 [翻译说明](../references/translation-bridge.md)。以下目标文件必须未存在：

~~~sh
python scripts/translate_bridge.py deepseek-zh --input source.en.txt --output work/draft.ds.zh.txt --allow-cloud
python scripts/translate_bridge.py local --from-lang zh --to-lang en --input work/draft.ds.zh.txt --output work/draft.argos.en.txt
~~~

只在第一条成功且译文完整后执行第二条。DeepSeek 未配置、Argos 未安装或模型缺失，应报告具体停在哪一步，不假称已经运行。中文译稿、DeepSeek 来源记录和 Argos 原始英文都要保留。

把三份文件交给当前获准处理材料的 Agent，读取根目录 SKILL.md：对照原始英文，在 Argos 英文中列最小修改编号。中文用于判断是哪一步出现偏移，不自动改写中文。如果源稿自己有事实错误，另列原稿问题，不把修正研究内容混进翻译保真。

作者选中编号后才输出 `work/revised.en.txt`、实际差异与采用记录。未选部分包括不够漂亮的表达均保持原样。所有稿件及约束按本轮版本记录；任一输入变化后重新核对并取得新选择。

**现有 `prepare-review/check-review/apply-review` 只接受 en→zh 或 zh→en。它们尚不支持把原始英文和 Argos 英文作为 source/draft 的这条链。** 目前此步由 Agent 按择项规则执行并检查实际差异；不冒称程序保证。不要把 DeepSeek 中文填进“作者原稿”来绕过方向校验。


---

# 原有直接双语核对（保留兼容，不是上面的完整链）

作者已提供中文原稿并需要英文译文，或只要英文→中文时，可以使用以下既有 v2 命令。

## 1. 保存输入与设置

原稿保存为 UTF-8 `source.txt`。可选参考英文只用于追溯，不取代当前原稿。建立 `context.json`：

```json
{
  "source_language": "en",
  "target_language": "zh",
  "protection_mode": "combined",
  "protected_terms": ["SFC"],
  "author_notes": "保留可能、不证明因果等主张强度。",
  "reference_original": ""
}
```

方向仅支持 en→zh 或 zh→en。保护方式 `auto`、`manual`、`combined`。auto 时手动 terms 和 notes 留空；填写了手动要求则选择 manual 或 combined。manual 仍检查完整语义，仅不额外添加AI术语表。protected_terms 只放本次目标文本必须精确保留的写法，每项独立一行。

参数和文件路径由实际工作目录确定，不覆盖原稿或已有结果目录。先建立 `work` 父目录。

## 2. 取得待核对译文（仅直接双语路线）

本节不是 DeepSeek→Argos 完整链。

### 原有 Argos 入口

已有机翻稿可直接保存为 `draft.txt`，跳过翻译。否则按照明确方向调用本地 Argos，例如英文→中文：

```sh
python -m paperchoose translate --input source.txt --source en --target zh --out work/mt-01
```

以下命令的 `--draft` 使用实际译文路径，此例为 `work/mt-01/translated.zh.txt`。中文→英文相应使用 `--source zh --target en` 和 `translated.en.txt`。不要把机翻阅读稿自行升级为语义权威。每次本地翻译最多5,000字符，长稿按完整段落/章节处理并保留顺序；不默默截断。

模型未装好时说明实际问题，可使用作者已有译文；不得声称模型已运行。安装步骤见 README 和 LOCAL_TRANSLATION。

## 3. 一轮识别与核对

```sh
python -m paperchoose prepare-review --source-text source.txt --draft work/mt-01/translated.zh.txt --context context.json --out work/request-01
```

读取实际生成的 `AUDIT_PROMPT.md` 与 `request.json`，由当前获准处理材料的助手执行语义核对。一次处理术语、保护内容和翻译偏移；不把AI观察当成作者约束，不以“更好听”为理由修改。返回 `audit.json`，复制模板哈希，不编造哈希、引文或来源。

```sh
python -m paperchoose check-review --source-text source.txt --draft work/mt-01/translated.zh.txt --context context.json --audit audit.json
```

展示作者能看懂的编号、机翻原句、最小改法、原稿依据与中文理由。**等待作者选择**，不能用预设示例、自动识别选项或先前的另一轮选择代替本轮授权。

## 4. 按选择执行

作者选择 P1-01 后：

```sh
python -m paperchoose apply-review --source-text source.txt --draft work/mt-01/translated.zh.txt --context context.json --audit audit.json --select P1-01 --out work/result-01
```

作者全部不采用时用 `--none`，仍导出未改变的机翻稿。执行器阻止版本不符、引用不存在、位置不明确、重叠及已有指定写法减少。最终缺少指定写法会记录在 `missing_protected_terms`；不得称保护检查全部通过。

下载结果同时保留原稿、机翻稿、新稿、上下文、审阅清单与决定。字面检查不能证明术语位置、数字对应或全部语义正确。

输入、方向、保护设置或参考原文发生变化，重新准备请求并取得新选择。完成所选修改后发现新问题，另列下一轮，不能搭便车修复。

## 手动网页与兼容入口

网页使用同一 v2 工作流。作者可保存/恢复项目；恢复不自动选择修改。手动/原界面入口导出请求并导回建议；Base44 新界面有单独配置的云端核对服务，但仍是旧的英文→中文路线。JSON 只是交换格式，不是需要普通作者学习的概念。

旧 `prepare/check/apply --chinese --english` 和 `/api/request` 等 v1 接口仍支持已有 zh→en 案例；新页面不混用 v1 数据。新流程必须使用 `*-review`，不能把英文塞进“中文权威”字段对外宣称完成新流程。

BTI/AEC 为可选独立只读诊断，不调用 apply。无额外 API 的助手模式需要所在客户端具备文件和命令权限；云端助手不能假定能读用户 Windows 本机。
