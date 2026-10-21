export async function inputKey(...parts) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parts)));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function buildContext(terms, aiTerms) {
  return {
    source_language: 'en', pivot_language: 'zh', target_language: 'en',
    protection_mode: !aiTerms ? 'manual' : terms.length ? 'combined' : 'auto',
    protected_terms: terms, author_notes: '',
  };
}

// 写入结果包的来源记录：是页面记录的声明，程序不验证中文是否确由 DeepSeek 生成。
export function buildProvenance(isDemo, argosInfo) {
  const synthetic = { kind: 'synthetic', label: '合成演示材料，人工编写，不是模型输出' };
  const e = argosInfo?.engine;
  return {
    source: isDemo ? synthetic : { kind: 'author', label: '作者提供的英文原稿' },
    pivot: isDemo ? synthetic : { kind: 'pasted', label: '作者粘贴的中文译稿（声明为 DeepSeek 或 Agent 生成，程序未验证）' },
    draft: e ? { kind: 'argos', label: `本机 ${e.name} ${e.version}（模型 ${e.model_version}），中文→英文` }
      : isDemo ? synthetic : { kind: 'pasted', label: '作者粘贴的 Argos 英文机翻稿（程序未验证来源）' },
  };
}

export const CATEGORY_LABEL = {
  meaning: '意思', number: '数字', negation: '否定', modality: '条件/强度',
  scope: '范围', attribution: '归属', term: '术语', technical: '技术性',
};

export function saveBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}