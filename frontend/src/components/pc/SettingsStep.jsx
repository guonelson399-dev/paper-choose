import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';
import TermsEditor from '@/components/pc/TermsEditor';
import ConsentBox from '@/components/pc/ConsentBox';
import { CHECK_MAX } from '@/lib/limits';

export default function SettingsStep({ conn, terms, setTerms, aiTerms, setAiTerms, consent, setConsent, checking, error, english, mt, onBack, onRun }) {
  const tooLong = english.length > CHECK_MAX || mt.length > CHECK_MAX;
  const ok = consent.en && consent.mt && !!conn && !tooLong;
  return (
    <section>
      <StepTitle title="核对前，两件小事">
        告诉我哪些内容不能动，并确认允许 AI 读取哪些文字。核对只会提出意思上的必要修改，不会润色你的论文。
      </StepTitle>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <h2 className="font-medium">需要保护的内容 <span className="text-sm font-normal text-muted-foreground">（可选）</span></h2>
          <TermsEditor terms={terms} setTerms={setTerms} />
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium"><Sparkles className="h-4 w-4" />让 AI 一并识别术语</span>
              <span className="mt-1 block text-muted-foreground">和核对同时完成，不需要你额外确认。识别结果会在下一页列出。</span>
            </span>
            <Switch checked={aiTerms} onCheckedChange={setAiTerms} />
          </label>
        </div>
        <ConsentBox consent={consent} setConsent={setConsent} english={english} mt={mt} />
      </div>

      {!conn && <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">开始核对前，请先点右上角“连接本机”。定位和执行修改由你电脑上的 Paper Choose 完成，网页不会自己改稿。</p>}
      {tooLong && (
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          单次核对上限是英文原稿、机翻稿各 {CHECK_MAX} 字符（当前英文 {english.length}、中文 {mt.length}）。为保证不漏查，网页不会截断稿件；请返回上一步，只保留要核对的一个章节或几段。
        </p>
      )}
      {error && <p className="mt-6 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />返回稿件</Button>
        <Button size="lg" disabled={!ok || checking} onClick={onRun}>
          {checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在逐句对照…</> : '开始核对'}
        </Button>
      </div>
    </section>
  );
}