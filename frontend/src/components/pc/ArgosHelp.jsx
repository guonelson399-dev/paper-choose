import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export default function ArgosHelp() {
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="group flex items-center gap-1 text-xs font-medium">
        怎样安装本机翻译（可选） <ChevronDown className="h-3 w-3 transition group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>翻译是 Paper Choose 的可选组件，不装也能核对和修改（直接粘贴机翻稿即可）。</p>
        <p>1. 安装 Python 3.12（python.org 下载，安装时勾选 “Add to PATH”）。</p>
        <p>2. 在 Paper Choose 文件夹里双击 <b>setup_local_translation.cmd</b>。提示联网下载时按 Y，等待完成（需下载几百 MB）。</p>
        <p>3. 关闭原来的终端窗口，重新双击 <b>start_cloud_windows.cmd</b> 启动，再回到这里重新连接。</p>
        <p>Mac / Linux 请按项目 docs/LOCAL_TRANSLATION.md 的命令安装。翻译时不会联网下载，模型缺失只会提示错误。</p>
      </CollapsibleContent>
    </Collapsible>
  );
}