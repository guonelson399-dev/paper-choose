import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const ROWS = [
  { s: '已接入 · 本机', c: 'bg-emerald-600', t: '定位、执行修改与导出', d: '使用 Paper Choose 的 workflow.py 执行器：只在 Argos 英文稿中替换你选中的片段，选区外逐字节不变；三份稿件或保护要求变化后，本机会拒绝旧建议。' },
  { s: '已接入 · 本机（可选安装）', c: 'bg-emerald-600', t: 'Argos 翻译（中文→英文）', d: '使用 Paper Choose 的 translation.py，读取中文译稿译成英文。需在本机安装可选翻译组件；不装也可直接粘贴 Argos 英文。翻译在本地完成。' },
  { s: '未接入 · 仅粘贴', c: 'bg-slate-400', t: 'DeepSeek 中文翻译', d: '网页没有直连 DeepSeek API，也不会把稿件发给 DeepSeek。请在别处（例如 Agent 命令行）生成中文后粘贴。' },
  { s: '已接入 · 云端', c: 'bg-sky-600', t: 'AI 核对', d: '云端 AI 读取三份稿件，只提出建议并记录识别到的保护内容，发送前需要你逐项勾选允许。整个流程并非全部在本地。' },
  { s: '演示', c: 'bg-slate-400', t: '演示稿', d: '三份人工编写的合成材料，不是 DeepSeek 或 Argos 的输出，仅用于熟悉流程。' },
];

export default function StatusDialog() {
  return (
    <Dialog>
      <DialogTrigger className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">功能接入状态</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>哪些在本机，哪些在云端</DialogTitle></DialogHeader>
        <ul className="space-y-4">
          {ROWS.map((r) => (
            <li key={r.t} className="text-sm">
              <div className="flex items-center gap-2 font-medium"><span className={`h-2 w-2 rounded-full ${r.c}`} />{r.t}<span className="text-xs font-normal text-muted-foreground">· {r.s}</span></div>
              <p className="mt-1 pl-4 leading-relaxed text-muted-foreground">{r.d}</p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}