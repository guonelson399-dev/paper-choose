# 助手操作：原稿 → 机翻 → 一次核对 → 作者选择

使用者提供原稿和目标语言。方向明确就直接处理；不明确才问。不强制制作中文阅读稿，不要求先审核完整术语表。完整规则见根目录 SKILL.md。

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

## 2. 取得待核对译文

只有英文原稿、希望用 DeepSeek 翻中文时，读取 `references/translation-bridge.md`，在本次材料获准发送后运行：

~~~sh
python scripts/translate_bridge.py deepseek-zh --input source.txt --output work/draft.ds.zh.txt --allow-cloud
~~~

该入口只做忠实翻译，保留作者声音，不执行纠错、润色、结构调整或 anti-defensive。仅请求翻译时交付后停止。若还请求核对，以下步骤的 `--draft` 改用实际 DeepSeek 译文路径；source 仍是英文，context 使用 en→zh，保留 metadata 说明来源。DeepSeek 输出不能标成 Argos 或独立离线机翻。

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

网页使用同一 v2 工作流。作者可保存/恢复项目；恢复不自动选择修改。网页没有自动AI后端，手动使用时仍导出请求并导回建议。JSON 只是交换格式，不是需要普通作者学习的概念。

旧 `prepare/check/apply --chinese --english` 和 `/api/request` 等 v1 接口仍支持已有 zh→en 案例；新页面不混用 v1 数据。新流程必须使用 `*-review`，不能把英文塞进“中文权威”字段对外宣称完成新流程。

BTI/AEC 为可选独立只读诊断，不调用 apply。无额外 API 的助手模式需要所在客户端具备文件和命令权限；云端助手不能假定能读用户 Windows 本机。

