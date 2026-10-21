import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Header from '@/components/pc/Header';
import FlowStrip from '@/components/pc/FlowStrip';
import SourceStep from '@/components/pc/SourceStep';
import SettingsStep from '@/components/pc/SettingsStep';
import ReviewStep from '@/components/pc/ReviewStep';
import ExportStep from '@/components/pc/ExportStep';
import { buildContext, buildProvenance, saveBlob } from '@/lib/review';
import { post, postJson, connect } from '@/lib/localBackend';
import { CHECK_MAX } from '@/lib/limits';
import { IS_LOCAL } from '@/lib/localMode';
import { DEMO_ENGLISH, DEMO_ZH, DEMO_MT } from '@/lib/demo';

const errMsg = (e) => e.response?.data?.error || e.message || '操作没有完成，请再试一次。';
const NO_CONSENT = { en: false, zh: false, mt: false };

export default function Workbench() {
  const [conn, setConn] = useState(null);
  const [step, setStep] = useState(0);
  const [english, setEnglish] = useState('');
  const [zh, setZh] = useState('');
  const [mt, setMt] = useState('');
  const [mtSource, setMtSource] = useState('paste');
  const [argosInfo, setArgosInfo] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [terms, setTerms] = useState([]);
  const [aiTerms, setAiTerms] = useState(true);
  const [consent, setConsent] = useState(NO_CONSENT);
  const [review, setReview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  // 本机版：页面与 Paper Choose 同源，打开即自动连接。
  useEffect(() => { if (IS_LOCAL) connect(window.location.origin).then(setConn).catch((e) => setError(errMsg(e))); }, []);

  const context = useMemo(() => buildContext(terms, aiTerms), [terms, aiTerms]);
  // 三份文字与保护设置共同决定建议是否仍然有效（同步计算，避免异步哈希竞态）。
  const currentKey = JSON.stringify([english, zh, mt, context]);
  const latest = useRef(null);
  latest.current = { key: currentKey, consent, conn, selected };
  const stale = !!review && review.key !== currentKey;
  const allConsent = consent.en && consent.zh && consent.mt;
  // Argos 英文对应的是翻译时的中文；中文改动后这份译文不再有效。
  const argosStale = !!argosInfo?.engine && argosInfo.source !== zh;
  useEffect(() => { setConsent(NO_CONSENT); }, [english, zh, mt]);

  useEffect(() => {
    const n = ++seq.current;
    setPlan(null); setPlanError('');
    if (!review || stale || !conn) return;
    const selectionKey = JSON.stringify([...selected]);
    postJson(conn, '/api/round/preview', { ...review.base, audit: review.auditText, selected_ids: [...selected] })
      .then((p) => n === seq.current && setPlan({ ...p, selectionKey }))
      .catch((e) => n === seq.current && setPlanError(errMsg(e)));
    return () => { seq.current++; };
  }, [review, selected, stale, conn]);

  const loadDemo = () => {
    setEnglish(DEMO_ENGLISH); setZh(DEMO_ZH); setMt(DEMO_MT); setMtSource('paste'); setArgosInfo(null); setIsDemo(true);
    setTerms([]); setReview(null); setSelected(new Set());
  };

  const runCheck = async () => {
    if (checking || !conn || !allConsent || argosInfo?.job || argosStale) return;
    if (![english, zh, mt].every((t) => t.trim() && t.length <= CHECK_MAX)) {
      setError(`每份稿件最多核对 ${CHECK_MAX} 字符，请按章节处理。`); return;
    }
    const key = currentKey;
    const l = () => latest.current;
    const valid = () => l().key === key && l().consent.en && l().consent.zh && l().consent.mt && l().conn === conn;
    setPlan(null); setReview(null); setSelected(new Set());
    setChecking(true); setError('');
    try {
      const base = { source: english, pivot: zh, draft: mt, context };
      const template = await postJson(conn, '/api/round/template', base);
      if (!valid()) throw new Error('输入或授权已变化，请重新核对。');
      const res = await base44.functions.invoke('checkTranslation', base);
      if (!Array.isArray(res.data?.proposals) || !Array.isArray(res.data?.protection_observations)) throw new Error('核对失败：AI 返回的结果格式异常，请重试。');
      const audit = { ...template, reviewer: res.data.reviewer, protection_observations: res.data.protection_observations, proposals: res.data.proposals };
      const auditText = JSON.stringify(audit);
      const report = await postJson(conn, '/api/round/check', { ...base, audit: auditText });
      if (!valid()) throw new Error('输入或授权已变化，旧核对结果已丢弃。');
      setReview({ base, auditText, key, provenance: buildProvenance(isDemo, argosInfo), rows: report.rows, observations: report.protection_observations, reviewer: res.data.reviewer });
      setSelected(new Set());
      setStep(2);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setChecking(false);
    }
  };

  const activePlan = !stale && plan?.selectionKey === JSON.stringify([...selected]) ? plan : null;
  const exportZip = async () => {
    if (!review || stale || !activePlan || latest.current.key !== review.key) throw new Error('输入或选择已变化，请重新预览。');
    const key = currentKey;
    const choice = JSON.stringify([...selected]);
    const res = await post(conn, '/api/round/export', { ...review.base, audit: review.auditText, selected_ids: [...selected], plan_sha256: activePlan.plan_sha256, provenance: review.provenance });
    const blob = await res.blob();
    if (latest.current.key !== key || JSON.stringify([...latest.current.selected]) !== choice) throw new Error('输入或选择已变化，旧导出已取消。');
    saveBlob(isDemo ? 'paperchoose-revision-演示.zip' : 'paperchoose-revision.zip', blob);
  };

  const canNext = !!(english.trim() && zh.trim() && mt.trim()) && !argosInfo?.job && !argosStale;
  const maxStep = review && !stale ? 3 : canNext ? 1 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header conn={conn} setConn={setConn} />
      <FlowStrip step={step} onJump={(i) => !checking && i <= maxStep && setStep(i)} />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8">
        {step === 0 && (
          <SourceStep {...{ conn, english, setEnglish, zh, setZh, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, argosStale, isDemo, setIsDemo, loadDemo, stale, canNext }}
            onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <SettingsStep {...{ conn, terms, setTerms, aiTerms, setAiTerms, consent, setConsent, checking, error, english, zh, mt }}
            onBack={() => setStep(0)} onRun={runCheck} />
        )}
        {step === 2 && review && (
          <ReviewStep {...{ review, selected, setSelected, stale, planError }} plan={activePlan}
            onBack={() => setStep(0)} onRecheck={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && review && (
          <ExportStep {...{ review, selected, isDemo, stale }} plan={activePlan} onExport={exportZip} onBack={() => setStep(2)} />
        )}
      </main>
    </div>
  );
}