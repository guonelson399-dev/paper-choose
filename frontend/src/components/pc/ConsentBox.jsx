import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Cloud } from 'lucide-react';

export default function ConsentBox({ consent, setConsent, english, zh, mt }) {
  const rows = [
    { k: 'en', t: '允许发送英文原稿', n: english.length },
    { k: 'zh', t: '允许发送 DeepSeek 中文译稿', n: zh.length },
    { k: 'mt', t: '允许发送 Argos 英文机翻稿', n: mt.length },
  ];
  const all = rows.every((r) => consent[r.k]);
  return (
    <div className="space-y-5">
      <h2 className="font-medium">发送给云端 AI 的内容</h2>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            点击“开始核对”后，勾选的三份文字和保护列表会发送到 <b className="text-foreground">Base44 云端核对服务</b>（由 Base44 内置 AI 模型处理），用于对照找错。本地程序不自动保存稿件；云端处理与留存遵循服务提供方的政策。论文未公开或涉密时，请只放可以外发的段落。
          </span>
        </p>
        <div className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <label key={r.k} className="flex cursor-pointer items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-3">
                <Checkbox checked={!!consent[r.k]} onCheckedChange={(c) => setConsent({ ...consent, [r.k]: !!c })} />
                {r.t}
              </span>
              <span className="text-xs text-muted-foreground">{r.n} 字符</span>
            </label>
          ))}
        </div>
        {!all && <p className="mt-2 text-xs text-muted-foreground">三项都勾选后才能开始核对；少一份就无法对照。</p>}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">这里的同意只用于云端核对，不代表允许 DeepSeek 使用你的稿件。本页不会调用 DeepSeek。</p>
      </div>
    </div>
  );
}