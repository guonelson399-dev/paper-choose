// 连接用户电脑上运行的 Paper Choose（paperchoose/server.py）。所有请求从浏览器直接发到本机。
export const DEFAULT_URL = 'http://127.0.0.1:8765';

export class LocalError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function call(base, path, init) {
  let res;
  try {
    res = await fetch(base + path, init);
  } catch {
    throw new LocalError('UNREACHABLE', '连不上本机的 Paper Choose。请确认它正在运行、终端窗口没有关闭，并且启动时填入的是本页地址。');
  }
  if (res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (data.error === 'ORIGIN') throw new LocalError('ORIGIN', '本机程序没有允许这个网页连接。请关闭终端，按“连接本机”里的方法重新启动。');
  if (data.error === 'SESSION') throw new LocalError('SESSION', '本机程序重启过，请点“重新连接”。');
  throw new LocalError(data.error || 'ERROR', data.message || `本机程序返回错误（${res.status}）。`);
}

export async function connect(base) {
  const session = await (await call(base, '/api/session')).json();
  const status = await (await call(base, '/api/translation/status')).json();
  return { base, token: session.token, version: session.version, translation: status };
}

export async function post(conn, path, body) {
  return call(conn.base, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PaperChoose-Token': conn.token },
    body: JSON.stringify(body),
  });
}

export const postJson = async (conn, path, body) => (await post(conn, path, body)).json();

export const hasEnZh = (conn) => !!conn?.translation?.pairs?.some((p) => p.source === 'en' && p.target === 'zh');