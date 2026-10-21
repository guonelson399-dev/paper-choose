// 本机版构建：`vite build --mode pclocal`（或设置 VITE_PC_LOCAL=1），不需要 .env 文件。
// 网页由本机 Paper Choose 在 http://127.0.0.1:8765/ 提供。
export const IS_LOCAL = import.meta.env.VITE_PC_LOCAL === '1' || import.meta.env.MODE === 'pclocal';

// 云端应用 ID 是公开标识，不是密钥；本机版没有平台注入时用它连接云端核对。
export const LOCAL_APP_ID = '6ad65bbfd2b5e028c45def51';