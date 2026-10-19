export async function inputKey(...parts) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parts)));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function buildContext(terms, aiTerms) {
  return {
    source_language: 'en', target_language: 'zh',
    protection_mode: !aiTerms ? 'manual' : terms.length ? 'combined' : 'auto',
    protected_terms: terms, author_notes: '', reference_original: '',
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