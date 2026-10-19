import React, { useState } from 'react';

export default function ConnectSteps() {
  const origin = window.location.origin;
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(origin); setCopied(true); };
  return (
    <ol className="space-y-3 text-sm leading-relaxed">
      <li>1. 下载并解压包含“网页连接”更新的 Paper Choose（只需 Python 3.10+，不需要额外安装其他程序）。</li>
      <li>
        2. Windows：双击 <b>start_cloud_windows.cmd</b>，把下面这个本页地址粘贴进去，按回车。
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{origin}</code>
          <button onClick={copy} className="text-xs underline underline-offset-4">{copied ? '已复制' : '复制'}</button>
        </div>
        <span className="mt-1 block text-xs text-muted-foreground">Mac / Linux：在项目目录运行 python3 -m paperchoose serve --allow-origin {origin}</span>
      </li>
      <li>3. 保持终端窗口打开。浏览器若询问“是否允许访问本地网络 / 本机设备”，请点“允许”。</li>
      <li>4. 点下面的“连接”。建议使用 Chrome 或 Edge；Safari 可能拦截网页访问本机。</li>
    </ol>
  );
}