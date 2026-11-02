from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
from .core import Rejected, parse_json, inspect_audit, request_bundle, build_plan, output_files, write_new_directory


def read_text(path):
    # read_bytes avoids newline translation and preserves a UTF-8 BOM if present.
    return Path(path).read_bytes().decode('utf-8')


def main():
    parser=argparse.ArgumentParser(description='Paper Choose：本地作者择项修改工具；717处理后的P1/P2纠错，不自动调用云端。')
    commands=parser.add_subparsers(dest='command',required=True)
    for name in ('prepare-review','check-review','apply-review'):
        sub=commands.add_parser(name,help='原稿与717处理稿同语种核对（v4）')
        sub.add_argument('--source-text',required=True)
        sub.add_argument('--draft',required=True)
        sub.add_argument('--context',required=True,help='方向与保护要求JSON；见 docs/AGENT_WORKFLOW.md')
        if name!='prepare-review':sub.add_argument('--audit',required=True)
        if name!='check-review':sub.add_argument('--out',required=True)
        if name=='apply-review':
            group=sub.add_mutually_exclusive_group(required=True)
            group.add_argument('--select',nargs='+',metavar='ID')
            group.add_argument('--none',action='store_true')
    serve=commands.add_parser('serve')
    serve.add_argument('--port',type=int,default=8765)
    serve.add_argument('--open',action='store_true',help='启动后打开系统浏览器')
    serve.add_argument('--allow-origin',help='允许指定的 https 网页连接本机（例如云端版 Paper Choose 的地址）')
    args=parser.parse_args()
    try:
        if args.command.endswith('-review'):
            from . import workflow
            source=read_text(args.source_text);draft=read_text(args.draft)
            context=parse_json(read_text(args.context))
            if args.command=='prepare-review':
                write_new_directory(args.out,workflow.request_bundle(source,draft,context))
                print('已准备一次核对请求：识别保护内容并列出最小修改。未自动发送。')
            else:
                audit=parse_json(read_text(args.audit))
                if args.command=='check-review':
                    report=workflow.inspect_audit(source,draft,context,audit)
                    print(json.dumps(report,ensure_ascii=False,indent=2))
                    return 3 if any(not row['ready'] for row in report['rows']) else 0
                plan=workflow.build_plan(source,draft,context,audit,[] if args.none else args.select)
                write_new_directory(args.out,workflow.output_files(plan,source,draft,context,audit))
                print(json.dumps(plan['report'],ensure_ascii=False,indent=2))
            return 0
        if args.command=='serve':
            from .server import run
            if not 0<=args.port<=65535:parser.error('端口须在0–65535范围内')
            run(args.port,args.open,args.allow_origin);return 0
        return 0
    except Rejected as exc:
        print(f'{exc.code}: {exc}',file=sys.stderr);return 2
    except (OSError,UnicodeError) as exc:
        print(f'FILE_ERROR: {exc}',file=sys.stderr);return 2
    except KeyboardInterrupt:
        return 130

if __name__=='__main__':
    sys.exit(main())
