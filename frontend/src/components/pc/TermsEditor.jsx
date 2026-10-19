import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function TermsEditor({ terms, setTerms }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim();
    if (t && !terms.includes(t)) setTerms([...terms, t]);
    setV('');
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">例如缩写、模型名、基因名，或“统一译为‘显著性’”这类要求。每次输入一条，按回车添加。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {terms.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
            {t}
            <button onClick={() => setTerms(terms.filter((x) => x !== t))} aria-label="删除"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} onBlur={add}
          placeholder="输入后按回车" className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none" />
      </div>
    </div>
  );
}