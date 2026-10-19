import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';
import ProposalCard from '@/components/pc/ProposalCard';
import ResultPreview from '@/components/pc/ResultPreview';
import { overlaps } from '@/lib/review';

export default function ReviewStep({ review, selected, setSelected, stale, plan, planError, onBack, onRecheck, onNext }) {
  const { rows } = review;
  const toggle = (p) => {
    const s = new Set(selected);
    s.has(p.id) ? s.delete(p.id) : s.add(p.id);
    setSelected(s);
  };
  const blockedBy = (p) => p.ready && rows.find((q) => q.id !== p.id && selected.has(q.id) && overlaps(q, p));

  if (stale) return (
    <section className="max-w-xl">
      <StepTitle title="稿件已改动，旧建议不能再用">核对之后，英文原稿、机翻稿或保护要求发生了变化。旧建议对应的位置可能已经不对，请重新核对。</StepTitle>
      <div className="flex gap-3"><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />查看稿件</Button><Button onClick={onRecheck}><RotateCcw className="mr-2 h-4 w-4" />重新核对</Button></div>
    </section>
  );

  return (
    <section>
      <StepTitle title={rows.length ? `发现 ${rows.length} 处可能的错误` : '没有发现需要修改的地方'}>
        {rows.length ? '每一条默认不采用。你认为该改的，点“采用”。没选的地方会原样保留。' : 'AI 对照后没有提出修改。你仍可直接导出原始机翻稿。'}
      </StepTitle>

      {review.observations?.length > 0 && (
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">AI 识别的保护内容（仅作记录，不会自动修改）：{review.observations.map((o) => <span key={o.source_quote} className="mx-1 inline-block rounded bg-muted px-2 py-0.5 text-foreground">{o.source_quote} → {o.target_form}</span>)}</p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          {rows.map((p) => <ProposalCard key={p.id} p={p} on={selected.has(p.id)} blocked={blockedBy(p)} onToggle={() => toggle(p)} />)}
        </div>
        <ResultPreview plan={plan} planError={planError} count={selected.size} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />返回稿件</Button>
        <Button size="lg" disabled={!plan} onClick={onNext}>{selected.size ? `采用 ${selected.size} 项，去导出` : '全部不采用，去导出'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>
  );
}