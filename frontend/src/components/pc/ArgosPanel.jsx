import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Laptop } from 'lucide-react';
import { postJson, hasZhEn } from '@/lib/localBackend';
import { translateMax } from '@/lib/limits';
import { makeBatches, mergeBatches } from '@/lib/batches';
import ArgosHelp from '@/components/pc/ArgosHelp';

// 读取中文译稿，用本机 Argos 译成英文。onUpdate(英文, engine, job, 中文, 期望的当前英文)
// 返回 false 表示输入已变化，旧请求不得再覆盖。job 为 null 表示整篇已译完。
export default function ArgosPanel({ conn, zh, mt, argosInfo, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const mounted = useRef(true);
  const latestUpdate = useRef(onUpdate);
  latestUpdate.current = onUpdate;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const ready = hasZhEn(conn);
  const max = translateMax(conn);
  const count = useMemo(() => (zh.trim() ? makeBatches(zh, max).length : 0), [zh, max]);
  const job = argosInfo?.job;
  const resumable = !!job && job.source === zh;

  const go = async (resume) => {
    setBusy(true); setErr('');
    const { source, batches } = resume ? job : { source: zh, batches: makeBatches(zh, max) };
    let results = resume ? job.results : [];
    let engine = resume ? argosInfo.engine : null;
    let expectedMt = mt;
    const update = (nextJob) => {
      if (!mounted.current) return false;
      const text = mergeBatches(batches, results);
      const ok = latestUpdate.current(text, engine, nextJob, source, expectedMt);
      if (ok) expectedMt = text;
      else setErr('中文译稿或英文稿已经改变，旧翻译已停止，未覆盖当前文字。');
      return ok;
    };
    try {
      while (results.length < batches.length) {
        if (!update({ source, batches, results })) return;
        const text = batches[results.length].text;
        const r = text.trim() ? await postJson(conn, '/api/translate', { text, source: 'zh', target: 'en' })
          : { translated_text: text, engine };
        if (!mounted.current) return;
        results = [...results, r.translated_text];
        engine = r.engine;
      }
      update(null);
    } catch (e) {
      setErr(`第 ${results.length + 1} / ${batches.length} 批翻译失败：${e.message} 已完成的 ${results.length} 批已保留。`);
      if (!update({ source, batches, results })) return;
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
      <p className="flex items-start gap-2 text-muted-foreground">
        <Laptop className="mt-0.5 h-4 w-4 shrink-0" />
        <span>读取上方的中文译稿，用 Paper Choose 自带的 Argos 在你电脑上译成英文，中文不会因翻译发到云端。后面的“核对”会使用云端 AI。</span>
      </p>
      {!conn && <p className="mt-3 text-amber-800">请先点右上角“连接本机”。也可以在本机翻译好后切换到“粘贴 Argos 英文”。</p>}
      {conn && !ready && <p className="mt-3 text-amber-800">已连接，但本机还没有安装中译英模型。{conn.translation.message}</p>}
      {conn && ready && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {resumable && !busy && (
            <Button size="sm" onClick={() => go(true)}>继续翻译（从第 {job.results.length + 1} / {job.batches.length} 批）</Button>
          )}
          <Button size="sm" variant={resumable && !busy ? 'outline' : 'default'} onClick={() => go(false)} disabled={busy || !zh.trim()}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />翻译中 {job ? `${job.results.length + 1} / ${job.batches.length} 批` : ''}（首次需加载模型）</>
              : resumable ? '从头重新翻译' : '中文 → 英文 开始翻译'}
          </Button>
          {!zh.trim() && <span className="text-xs text-muted-foreground">先在上方放入中文译稿。</span>}
          {count > 1 && !busy && !resumable && <span className="text-xs text-muted-foreground">将按段落和句末自动分 {count} 批翻译（每批最多 {max} 字符），按原顺序合并。</span>}
        </div>
      )}
      {job && !resumable && !busy && <p className="mt-2 text-xs text-amber-800">中文译稿在翻译中途被改动，请从头重新翻译。</p>}
      {err && <p className="mt-2 text-xs leading-relaxed text-destructive">{err}</p>}
      {(!conn || !ready) && <ArgosHelp />}
    </div>
  );
}