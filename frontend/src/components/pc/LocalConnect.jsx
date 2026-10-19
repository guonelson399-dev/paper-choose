import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { connect, DEFAULT_URL } from '@/lib/localBackend';
import ConnectSteps from '@/components/pc/ConnectSteps';
import { IS_LOCAL } from '@/lib/localMode';

export default function LocalConnect({ conn, setConn }) {
  const [url, setUrl] = useState(IS_LOCAL ? window.location.origin : DEFAULT_URL);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    setBusy(true); setErr('');
    try { setConn(await connect(url.replace(/\/+$/, ''))); } catch (e) { setConn(null); setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog>
      <DialogTrigger className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${conn ? 'border-emerald-600/40 text-emerald-800' : 'border-border'}`}>
        <span className={`h-2 w-2 rounded-full ${conn ? 'bg-emerald-600' : 'bg-amber-500'}`} />
        {conn ? '本机已连接' : '连接本机'}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>连接你电脑上的 Paper Choose</DialogTitle></DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          定位与执行修改、导出、Argos 翻译都由你电脑上的 Paper Choose 完成，网页只负责界面和云端 AI 核对。
        </p>
        <ConnectSteps />
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border px-3 font-mono text-xs" />
          <Button onClick={go} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : conn ? '重新连接' : '连接'}</Button>
        </div>
        {conn && <p className="text-sm text-emerald-800">已连接 Paper Choose {conn.version}。{conn.translation.message}</p>}
        {err && <p className="text-sm leading-relaxed text-destructive">{err}</p>}
      </DialogContent>
    </Dialog>
  );
}