import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  // 本机版页面不在 Base44 域名下，云端核对需直接请求 Base44。
  serverUrl: import.meta.env.VITE_PC_LOCAL === '1' ? 'https://base44.app' : '',
  appBaseUrl
});