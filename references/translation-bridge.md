# 翻译流程：英文 → DeepSeek 中文 → Argos 英文 → Paper Choose

## 四份文件，各有用途

| 文件 | 谁生成 | 用来做什么 |
| --- | --- | --- |
| `source.en.txt` | 作者提供，可为 AI 起草稿 | 核对原意、专有名词和论证强度，保留不覆盖 |
| `work/draft.ds.zh.txt` | DeepSeek | 忠实中文中间稿，交给 Argos；不能自动当作作者确认的原意 |
| `work/draft.argos.en.txt` | Argos | 从上述中文译出的英文，是 Paper Choose 要修改的对象 |
| `work/revised.en.txt` | 作者选择后由 Agent 生成 | 只包含作者采用的最小修改 |

完整流程不在中文译稿处结束。只有明确要求“仅翻成中文”时才在 DeepSeek 后停止。
使用 [忠实翻译提示词](faithful-en-zh-prompt.txt)，第一步只保留作者声音和原意；润色、纠正原稿、重排结构、anti-defensive 另行处理。

这是 Agent 操作规程与已有翻译命令的组合。当前网页仍为英文→中文核对，尚未实现此三份输入的完整链；不要往旧页面错放材料。操作步骤见 [助手使用说明](../docs/AGENT_WORKFLOW.md)。

## 配置

Python 3.10+，DeepSeek 路径只用标准库。密钥由用户在本机通过系统环境变量或秘密管理器设置，不发到聊天，不写入仓库、Skill、提示词、命令参数或日志：

- DEEPSEEK_API_KEY：用户自己的密钥。
- DEEPSEEK_MODEL：可选；默认 deepseek-v4-pro；也可选择账户可用的 deepseek-flash。实际返回模型记录在 metadata 中，不凭别名推断精确版本。
- 固定请求地址：`https://api.deepseek.com/chat/completions`；拒绝重定向，不支持偷偷改为第三方代理。

设置后重新启动运行 Agent 的终端/客户端，使它能读取环境变量。检查时只报告“已配置/未配置”，不显示值。

官方接口依据（2026-10-21 查阅）：
https://api-docs.deepseek.com/zh-cn/
https://api-docs.deepseek.com/api/create-chat-completion/

## 第一步：DeepSeek 将英文译成中文

先确认用户允许将本次英文发送给 DeepSeek，调用可能产生 API 费用。既有明确授权可沿用，不重复询问；仅安装配置不代表允许发送任意私人稿件。

从 Skill 或项目根目录运行：

~~~bash
python scripts/translate_bridge.py deepseek-zh --input source.en.txt --output work/draft.ds.zh.txt --allow-cloud
~~~

可用 --model 指定模型；旧命令 v4-zh 保留为别名，也需要 --allow-cloud。这个参数记录执行端的授权判断，程序本身不能认证用户身份。

输出：
- draft.ds.zh.txt：模型返回的中文译文；
- draft.ds.zh.txt.metadata.json：提供方、请求/返回模型、原稿/译文/提示词摘要、结束状态；不保存密钥或完整请求。

输出必须是新文件，不能覆盖原稿、已有译文或记录。缺密钥、拒绝云端、请求失败、空回复、非 stop 结束（含输出截断）都会报错，不伪装成成功。不自动换模型、重试付费请求或改用当前助手代译。
客户端单次最多 12000 字符（含空格），这是本脚本的保守范围，不是 DeepSeek 官方上限。长稿按完整章节拆分并保存顺序；不截断，不承诺自动整篇处理。

## 第二步：Argos 读取中文，译成英文

在本机安装 Argos 与 zh→en 直连模型后执行：

~~~bash
python scripts/translate_bridge.py local --from-lang zh --to-lang en --input work/draft.ds.zh.txt --output work/draft.argos.en.txt
~~~

输入是 DeepSeek 的中文输出，不是原始英文。保留中文及其 metadata，不自动润色或修复中间稿。模型未安装就报告该阶段未运行，不能用 Agent 代译冒充 Argos。

## 第三步：Paper Choose 核对英文机翻稿

Agent 同时读取原始英文、DeepSeek 中文和 Argos 英文。原始英文决定原意，中文帮助定位错误来源，Argos 英文是唯一修改对象。DeepSeek 本身的误译也要识别；不能把中间稿中的错误传到最终英文。

在一轮核对中识别保护内容、列必要修改编号。每项展示 Argos 英文原片段、最小改法、原始英文依据及中文理由；需要时并列中文中间稿。含义正确的不同表述不改，不把整篇恢复成原始英文。

等作者选择后，生成新的英文稿、实际差异和采用记录；未选部分保持原样，全部不选就保留 Argos 英文。原始英文、中文中间稿、原始 Argos 英文不覆盖。稿件或约束变化后，旧建议和选择失效。

当前 v2 执行器只支持中→英／英→中，不能直接接受这条英→英核对链。上述择项步骤目前由 Agent 按规则执行并检查差异；不能把它称为已经接入网页的自动执行器，也不能把 DeepSeek 中文塞进“作者中文原稿”字段来绕过限制。

## 原有 BTI / AEC 独立诊断

本地 Argos 保持独立：安装 argostranslate 与对应直连语言模型后运行：

~~~bash
python scripts/translate_bridge.py local --from-lang en --to-lang zh --input author-edited-en.txt --output bti-argos-zh.txt
python scripts/translate_bridge.py deepseek-zh --input author-edited-en.txt --output bti-ds-zh.txt --allow-cloud
python scripts/translate_bridge.py local --from-lang zh --to-lang en --input author-revised-zh.txt --output aec-argos-en.txt
~~~

BTI 只把作者当前英文给两个翻译引擎；原始中文仅在后续核对阶段使用，不作为翻译输入。DeepSeek 输出与 Argos 输出分别标明来源；有作者中文原稿时该原稿仍是该路线的依据。没有作者中文时不虚构 BTI 中文权威。
AEC 只翻译作者修改后的中文，再与原始 AI 英文作只读对照；作者改稿已经是英文时直接比较，不强制往返翻译。
BTI/AEC 不修改稿件。独立 Argos 缺失时不能用 DeepSeek 冒充独立机翻。
