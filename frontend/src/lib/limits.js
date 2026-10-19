// 两个限制互不相关：
// 翻译：本机 Argos 单次请求的上限（由 Paper Choose 报告，默认 5000），整篇按段落自动分批，不限总长度。
// 核对：云端 AI 单次核对上限，英文原稿和机翻稿各自计算；与 base44/functions/checkTranslation 中的 MAX 保持一致。
export const CHECK_MAX = 15000;

export const translateMax = (conn) => conn?.translation?.max_chars || 5000;