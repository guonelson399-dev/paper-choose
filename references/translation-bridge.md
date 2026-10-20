# 翻译桥接：先忠实翻译，再按需要审阅

## 只有英文原稿时

英文原稿（包括 AI 起草的英文）是依据。无需先准备中文，也不要求用户先确认整份中文原意。
使用 [忠实翻译提示词](faithful-en-zh-prompt.txt)：保留作者声音与研究含义。只为正常中文语法调整局部语序，不纠正原稿事实、不润色、不删免责、不重排结构。提示词是约束，不保证模型零误差。

此脚本仅提供 Agent/命令行入口，不代表网页新增了 DeepSeek 按钮。网页 Argos 入口保持原状。DeepSeek 是云端生成式翻译，不是 Argos 独立离线机翻。

## 配置

Python 3.10+，DeepSeek 路径只用标准库。密钥由用户在本机通过系统环境变量或秘密管理器设置，不发到聊天，不写入仓库、Skill、提示词、命令参数或日志：

- DEEPSEEK_API_KEY：用户自己的密钥。
- DEEPSEEK_MODEL：可选；默认 deepseek-v4-pro；也可选择账户可用的 deepseek-flash。实际返回模型记录在 metadata 中，不凭别名推断精确版本。
- 固定请求地址：`https://api.deepseek.com/chat/completions`；拒绝重定向，不支持偷偷改为第三方代理。

设置后重新启动运行 Agent 的终端/客户端，使它能读取环境变量。检查时只报告“已配置/未配置”，不显示值。

官方接口依据（2026-10-21 查阅）：
https://api-docs.deepseek.com/zh-cn/
https://api-docs.deepseek.com/api/create-chat-completion/

## 运行

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

只有翻译任务时到此停止。后续核对保留原始译文，对照英文列编号，用户选择后才生成新稿。网页若导入此译文，应注明 DeepSeek 来源；不要把它称为 Argos 输出。原稿纠错、润色、结构调整与 anti-defensive 编辑属于另行请求的阶段，不由翻译自动触发。

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
