import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, FlaskConical, AlertTriangle } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';
import MtInput from '@/components/pc/MtInput';
import { CHECK_MAX } from '@/lib/limits';

export default function SourceStep({ conn, english, setEnglish, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, isDemo, setIsDemo, loadDemo, stale, onNext }) {
  const editEn = (v) => { setEnglish(v); setIsDemo(false); };
  return (
    <section>
      <StepTitle title="放入你的两份稿件">
        左边放<b className="text-foreground">英文原稿</b>——这是核对的唯一依据。右边放 Argos 翻出来的<b className="text-foreground">中文机翻稿</b>，不需要你先改它。
      </StepTitle>

      {isDemo && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>演示稿</b>：英文是虚构短稿，中文是人工编写、故意带错的“模拟机翻”，不是 Argos 的真实输出。后面的 AI 核对和本机执行修改是真实运行的。</span>
        </div>
      )}
      {stale && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>稿件在核对后被改动过，之前的建议已失效，需要重新核对。</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="font-medium">英文原稿</label>
            <span className={`text-xs ${english.length > CHECK_MAX ? 'text-amber-700' : 'text-muted-foreground'}`}>
              {english.length} 字符{english.length > CHECK_MAX && `（超过单次核对上限 ${CHECK_MAX}，核对时需分章节）`}
            </span>
          </div>
          <textarea value={english} onChange={(e) => editEn(e.target.value)} placeholder="把英文论文的整篇、一节或几段粘贴到这里"
            className="h-80 w-full resize-none rounded-lg border border-border bg-card p-4 font-serif leading-relaxed outline-none transition focus:border-primary" />
        </div>
        <MtInput {...{ conn, english, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, setIsDemo }} />
      </div>

      <div className="mt-8 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <button onClick={loadDemo} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          第一次用？载入一份演示稿看看流程
        </button>
        <Button size="lg" disabled={!english.trim() || !mt.trim() || !!argosInfo?.job} onClick={onNext}>
          下一步：核对设置 <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}