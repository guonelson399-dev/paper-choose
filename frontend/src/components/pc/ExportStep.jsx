import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';

const FILES = [
  ['revised.zh.txt', '修改结果'], ['machine.zh.txt', '原始机翻稿'], ['source.en.txt', '英文原稿'],
  ['changes.diff', '改动对照'], ['decisions.json 等', '核对与选择记录'],
];

export default function ExportStep({ review, selected, plan, isDemo, stale, onExport, onBack }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = selected.size;

  const go = async () => {
    setBusy(true); setErr('');
    try { await onExport(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (stale || !plan) return <StepTitle title="需要重新生成结果">请回到“逐条选择”，等修改结果预览出现后再导出。</StepTitle>;

  return (
    <section>
      <StepTitle title={n ? `已采用 ${n} 项修改` : '未采用任何修改'}>
        {n ? '只有你选中的地方被替换，其余文字与机翻稿完全一致。' : '导出的“修改结果”就是未经改动的原始机翻稿。'}
        {isDemo && ' 本次为演示稿。'}
      </StepTitle>
      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="whitespace-pre-wrap rounded-xl border border-border bg-[#fffdf8] p-6 leading-loose" data-testid="final-text">{plan.revised}</div>
        <div className="space-y-3">
          <Button className="w-full" onClick={go} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}下载结果包
          </Button>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {FILES.map(([f, t]) => <li key={f} className="flex justify-between gap-2"><span>{t}</span><span className="font-mono">{f}</span></li>)}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">原稿、机翻稿和修改结果分别保存，互不覆盖。核对来源：{review.reviewer.label}。</p>
          {err && <p className="text-xs leading-relaxed text-destructive">{err}</p>}
        </div>
      </div>
      <Button variant="ghost" className="mt-10" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />回去调整选择</Button>
    </section>
  );
}