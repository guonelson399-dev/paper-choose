import React, { useRef } from 'react';
import ArgosPanel from '@/components/pc/ArgosPanel';

const TABS = [{ k: 'paste', t: '粘贴 Argos 英文' }, { k: 'argos', t: '用本机 Argos 翻译' }];

// Argos 英文机翻稿：唯一会被修改的稿件。由中文译稿译回英文，或直接粘贴。
export default function MtInput({ conn, zh, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, setIsDemo, argosStale }) {
  const tab = mtSource === 'argos' ? 'argos' : 'paste';
  const latest = useRef(null);
  latest.current = { zh, mt, tab };
  const edit = (v) => { setMt(v); setIsDemo(false); setArgosInfo(null); };
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="font-medium">Argos 英文机翻稿 <span className="text-sm font-normal text-muted-foreground">（待修改稿）</span></label>
        <div className="flex gap-1 rounded-md bg-muted p-0.5 text-xs">
          {TABS.map((x) => (
            <button key={x.k} onClick={() => setMtSource(x.k)}
              className={`rounded px-2.5 py-1 transition ${tab === x.k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{x.t}</button>
          ))}
        </div>
      </div>
      {tab === 'argos' && <ArgosPanel conn={conn} zh={zh} mt={mt} argosInfo={argosInfo}
        onUpdate={(t, engine, job, source, expectedMt) => {
          if (latest.current.zh !== source || latest.current.mt !== expectedMt || latest.current.tab !== 'argos') return false;
          latest.current.mt = t;
          setMt(t); setIsDemo(false); setArgosInfo({ engine, job, source }); setMtSource('argos');
          return true;
        }} />}
      <textarea value={mt} onChange={(e) => edit(e.target.value)}
        placeholder={tab === 'argos' ? '翻译完成后，英文会出现在这里' : '把 Argos 由中文译回的英文粘贴到这里'}
        className={`${tab === 'argos' ? 'h-44' : 'h-60'} w-full resize-none rounded-lg border border-border bg-card p-4 font-serif leading-relaxed outline-none transition focus:border-primary`} />
      {argosStale && (
        <p className="mt-2 text-xs text-destructive">中文译稿在翻译后被改动过，这份英文不再对应当前中文，请重新翻译（或手动改写英文后继续）。</p>
      )}
      {argosInfo?.job && (
        <p className="mt-2 text-xs text-amber-800">目前只包含前 {argosInfo.job.results.length} / {argosInfo.job.batches.length} 批的译文，整篇译完后才能进入下一步。</p>
      )}
      {argosInfo?.engine && !argosInfo.job && !argosStale && (
        <p className="mt-2 text-xs text-muted-foreground">
          由本机 {argosInfo.engine.name} {argosInfo.engine.version}（模型 {argosInfo.engine.model_version}）从中文译成英文。未经语义验证，下一步会对照英文原稿核对。
        </p>
      )}
    </div>
  );
}