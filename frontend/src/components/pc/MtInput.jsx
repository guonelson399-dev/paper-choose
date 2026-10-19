import React, { useRef } from 'react';
import ArgosPanel from '@/components/pc/ArgosPanel';

const TABS = [{ k: 'paste', t: '粘贴机翻稿' }, { k: 'argos', t: '用本机 Argos 翻译' }];

export default function MtInput({ conn, english, mt, setMt, mtSource, setMtSource, argosInfo, setArgosInfo, setIsDemo }) {
  const tab = mtSource === 'argos' ? 'argos' : 'paste';
  const latest = useRef(null);
  latest.current = { english, mt, tab };
  const edit = (v) => { setMt(v); setIsDemo(false); setArgosInfo(null); };
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="font-medium">中文机翻稿</label>
        <div className="flex gap-1 rounded-md bg-muted p-0.5 text-xs">
          {TABS.map((x) => (
            <button key={x.k} onClick={() => setMtSource(x.k)}
              className={`rounded px-2.5 py-1 transition ${tab === x.k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{x.t}</button>
          ))}
        </div>
      </div>
      {tab === 'argos' && <ArgosPanel conn={conn} english={english} mt={mt} argosInfo={argosInfo}
        onUpdate={(t, engine, job, source, expectedMt) => {
          if (latest.current.english !== source || latest.current.mt !== expectedMt || latest.current.tab !== 'argos') return false;
          latest.current.mt = t;
          setMt(t); setIsDemo(false); setArgosInfo({ engine, job }); setMtSource('argos');
          return true;
        }} />}
      <textarea value={mt} onChange={(e) => edit(e.target.value)}
        placeholder={tab === 'argos' ? '翻译完成后会出现在这里' : '把 Argos 翻译出来的中文粘贴到这里'}
        className={`${tab === 'argos' ? 'h-44' : 'h-80'} w-full resize-none rounded-lg border border-border bg-card p-4 leading-relaxed outline-none transition focus:border-primary`} />
      {argosInfo?.job && (
        <p className="mt-2 text-xs text-amber-800">目前只包含前 {argosInfo.job.results.length} / {argosInfo.job.batches.length} 批的译文，整篇译完后才能进入下一步。</p>
      )}
      {argosInfo?.engine && !argosInfo.job && (
        <p className="mt-2 text-xs text-muted-foreground">
          由本机 {argosInfo.engine.name} {argosInfo.engine.version}（模型 {argosInfo.engine.model_version}）生成。机翻稿未经语义验证，下一步会对照原稿核对。
        </p>
      )}
    </div>
  );
}