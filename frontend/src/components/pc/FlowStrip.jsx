import React from 'react';

const STEPS = [
  { t: '放入稿件', d: '英文原稿 + 机翻稿' },
  { t: '核对设置', d: '保护内容与授权' },
  { t: '逐条选择', d: '你决定改哪些' },
  { t: '导出结果', d: '下载修改后的译稿' },
];

export default function FlowStrip({ step, onJump }) {
  return (
    <nav className="border-b border-border/70">
      <ol className="mx-auto grid max-w-5xl grid-cols-4 px-5 sm:px-8">
        {STEPS.map((s, i) => (
          <li key={s.t}>
            <button onClick={() => onJump(i)}
              className={`group w-full border-b-2 py-4 text-left transition-colors ${i === step ? 'border-primary' : 'border-transparent'}`}>
              <span className={`font-mono text-xs ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>0{i + 1}</span>
              <span className={`block text-sm font-medium sm:text-base ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s.t}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{s.d}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}