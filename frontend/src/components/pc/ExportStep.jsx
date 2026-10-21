import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';

const FILES = [
  ['revised.en.txt', '修改后英文'], ['machine.argos.en.txt', '原始 Argos 英文'], ['pivot.zh.txt', '中文译稿'],
  ['source.en.txt', '英文原稿'], ['changes.diff', '改动对照'], ['provenance.json', '来源记录'],
  ['decisions.json 等', '核对与采用记录'],
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
  const unresolved = plan.report.unselected.length;

  return (
    <section>
      <StepTitle title={n ? `已采用 ${n} 项修改` : '未采用任何修改'}>
        {n ? '只有你选中的地方被替换，其余文字与 Argos 英文稿完全一致。' : '导出的“修改后英文”与原始 Argos 英文稿逐字相同。'}
        {unresolved > 0 && ` 未采用的 ${unresolved} 项保持原样，记为未解决。`}
        {isDemo && ' 本次为演示稿。'}
      </StepTitle>
      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="whitespace-pre-wrap rounded-xl border border-border bg-[#fffdf8] p-6 font-serif leading-loose" data-testid="final-text">{plan.revised}</div>
        <div className="space-y-3">
          <Button className="w-full" onClick={go} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}下载结果包
          </Button>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {FILES.map(([f, t]) => <li key={f} className="flex justify-between gap-2"><span>{t}</span><span className="font-mono">{f}</span></li>)}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">四份文字分别保存，互不覆盖。核对来源：{review.reviewer.label}。</p>
          {err && <p className="text-xs leading-relaxed text-destructive">{err}</p>}
        </div>
      </div>
      <Button variant="ghost" className="mt-10" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />回去调整选择</Button>
    </section>
  );
}