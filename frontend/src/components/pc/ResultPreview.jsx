import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ResultPreview({ plan, planError, count }) {
  let body;
  if (planError) body = <p className="text-sm leading-relaxed text-destructive">{planError}</p>;
  else if (!plan) body = <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />本机正在生成修改结果…</p>;
  else {
    const text = Array.from(plan.revised);
    const parts = [];
    let pos = 0;
    plan.report.changes.forEach((c) => {
      parts.push(text.slice(pos, c.revised_start).join(''));
      parts.push(<mark key={c.id} className="rounded bg-emerald-100 px-0.5 text-emerald-900">{text.slice(c.revised_start, c.revised_end).join('')}</mark>);
      pos = c.revised_end;
    });
    parts.push(text.slice(pos).join(''));
    body = <div className="whitespace-pre-wrap font-serif leading-loose" data-testid="result-preview">{parts}</div>;
  }
  const unresolved = plan?.report?.unselected?.length || 0;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-xl border border-border bg-[#fffdf8] p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold">修改后英文预览</h2>
          <span className="text-xs text-muted-foreground">{count ? `已采用 ${count} 项` : '未采用任何修改 = 原始 Argos 英文'}</span>
        </div>
        {body}
        {unresolved > 0 && <p className="mt-4 text-xs text-amber-800">还有 {unresolved} 项未采用，相关文字保持 Argos 原样，并在结果包中记为未解决。</p>}
        <p className="mt-4 text-xs text-muted-foreground">由本机 Paper Choose 只在 Argos 英文稿中执行，选区以外的文字逐字节保持不变；英文原稿和中文译稿不会被修改。</p>
      </div>
    </aside>
  );
}