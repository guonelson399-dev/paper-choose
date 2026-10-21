import React from 'react';
import { CHECK_MAX } from '@/lib/limits';

// 中文中间稿：只解释偏差，不是作者批准的意思，也不会被修改。
export default function PivotInput({ zh, setZh, setIsDemo }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="font-medium">DeepSeek 中文译稿</label>
        <span className={`text-xs ${zh.length > CHECK_MAX ? 'text-amber-700' : 'text-muted-foreground'}`}>
          {zh.length} 字符{zh.length > CHECK_MAX && `（超过单次核对上限 ${CHECK_MAX}）`}
        </span>
      </div>
      <textarea value={zh} onChange={(e) => { setZh(e.target.value); setIsDemo(false); }}
        placeholder="粘贴由 DeepSeek 或 Agent 生成的忠实中文译稿"
        className="h-80 w-full resize-none rounded-lg border border-border bg-card p-4 leading-relaxed outline-none transition focus:border-primary" />
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">本网页没有直连 DeepSeek，不会把稿件发给 DeepSeek；请在别处生成后粘贴。中文只用来解释中间偏差，不会被修改。</p>
    </div>
  );
}