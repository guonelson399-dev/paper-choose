import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Cloud } from 'lucide-react';

export default function ConsentBox({ consent, setConsent, english, mt }) {
  const rows = [
    { k: 'en', t: '允许发送英文原稿', n: english.length },
    { k: 'mt', t: '允许发送中文机翻稿', n: mt.length },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-medium">发送给云端 AI 的内容</h2>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0" />
          核对由云端 AI 完成，需要同时读两份稿件才能对照。只发送你在这里勾选的内容和保护列表，本地程序不自动保存稿件；云端处理与留存遵循服务提供方的政策。论文未公开或涉密时，请只放可以外发的段落。
        </p>
        <div className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <label key={r.k} className="flex cursor-pointer items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-3">
                <Checkbox checked={consent[r.k]} onCheckedChange={(c) => setConsent({ ...consent, [r.k]: !!c })} />
                {r.t}
              </span>
              <span className="text-xs text-muted-foreground">{r.n} 字符</span>
            </label>
          ))}
        </div>
        {!(consent.en && consent.mt) && <p className="mt-2 text-xs text-muted-foreground">两项都勾选后才能开始核对；只给一份无法对照。</p>}
      </div>
    </div>
  );
}