import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, FlaskConical, AlertTriangle } from 'lucide-react';
import StepTitle from '@/components/pc/StepTitle';
import MtInput from '@/components/pc/MtInput';
import PivotInput from '@/components/pc/PivotInput';
import { CHECK_MAX } from '@/lib/limits';

export default function SourceStep({ conn, english, setEnglish, zh, setZh, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, argosStale, isDemo, setIsDemo, loadDemo, stale, canNext, onNext }) {
  const editEn = (v) => { setEnglish(v); setIsDemo(false); };
  return (
    <section>
      <StepTitle title="放入你的三份稿件">
        <b className="text-foreground">英文原稿</b>决定意思；<b className="text-foreground">DeepSeek 中文译稿</b>用来解释中间偏差；<b className="text-foreground">Argos 英文机翻稿</b>由中文译回，是唯一会被修改的稿件。
      </StepTitle>

      {isDemo && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>演示稿</b>：三份都是人工编写的合成材料，中文不是 DeepSeek 的真实输出，英文机翻也不是 Argos 的真实输出。后面的 AI 核对和本机执行修改是真实运行的。</span>
        </div>
      )}
      {stale && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>稿件或保护要求在核对后被改动过，之前的建议和选择已失效，需要重新核对。</span>
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
        <PivotInput {...{ zh, setZh, setIsDemo }} />
      </div>
      <div className="mt-6">
        <MtInput {...{ conn, zh, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, setIsDemo, argosStale }} />
      </div>

      <div className="mt-8 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <button onClick={loadDemo} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          第一次用？载入一份演示稿看看流程
        </button>
        <Button size="lg" disabled={!canNext} onClick={onNext}>
          下一步：核对设置 <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}