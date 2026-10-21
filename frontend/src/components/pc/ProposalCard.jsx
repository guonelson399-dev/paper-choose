import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CATEGORY_LABEL } from '@/lib/review';

export default function ProposalCard({ p, on, blocked, onToggle }) {
  const disabled = !p.ready || !!blocked;
  return (
    <motion.article layout className={`rounded-xl border bg-card p-5 transition-colors ${on ? 'border-emerald-600/60 shadow-sm' : 'border-border'} ${!p.ready ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{CATEGORY_LABEL[p.category]}</span>
        <button onClick={onToggle} disabled={disabled} data-proposal={p.id}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm transition disabled:opacity-40 ${on ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-border hover:border-foreground'}`}>
          {on && <Check className="h-3.5 w-3.5" />}{on ? '已采用' : p.ready ? '采用' : '无法套用'}
        </button>
      </div>
      <p className="mt-4 font-serif text-sm italic text-muted-foreground">英文原稿：“{p.source_quote}”</p>
      <p className="mt-3 text-base leading-relaxed">
        <span className="rounded bg-red-50 px-1 text-red-800 line-through decoration-red-400">{p.before}</span>
        <span className="mx-2 text-muted-foreground">→</span>
        <span className="rounded bg-emerald-50 px-1 text-emerald-900">{p.after}</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.reason}</p>
      {!p.ready && <p className="mt-2 text-xs text-amber-700">本机检查未通过：{p.message} 这条不能采用。</p>}
      {blocked && <p className="mt-2 text-xs text-amber-700">这条与已采用的 {blocked.id} 改的是同一段文字，只能二选一。</p>}
    </motion.article>
  );
}