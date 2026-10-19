import React from 'react';
import StatusDialog from '@/components/pc/StatusDialog';
import LocalConnect from '@/components/pc/LocalConnect';

export default function Header({ conn, setConn }) {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-2xl font-semibold tracking-tight">Paper Choose</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">英文论文 · 机翻核对</span>
        </div>
        <div className="flex items-center gap-5">
          <StatusDialog />
          <LocalConnect conn={conn} setConn={setConn} />
        </div>
      </div>
    </header>
  );
}