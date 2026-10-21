import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { IS_LOCAL } from '@/lib/localMode';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  // 本机版页面不在 Base44 域名下，云端核对需直接请求 Base44。
  serverUrl: IS_LOCAL ? 'https://base44.app' : '',
  appBaseUrl
});