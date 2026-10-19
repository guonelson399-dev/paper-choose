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
    parser=argparse.ArgumentParser(description='Paper Choose：本地作者择项修改工具；不调用模型。')
    commands=parser.add_subparsers(dest='command',required=True)
    for name in ('prepare','check','apply'):
        sub=commands.add_parser(name)
        sub.add_argument('--chinese',required=True)
        sub.add_argument('--english',required=True)
        if name!='prepare':sub.add_argument('--audit',required=True)
        if name!='check':sub.add_argument('--out',required=True,help='新的输出目录，不覆盖已存在目录')
        if name=='apply':
            group=sub.add_mutually_exclusive_group(required=True)
            group.add_argument('--select',nargs='+',metavar='ID')
            group.add_argument('--none',action='store_true')
    serve=commands.add_parser('serve')
    serve.add_argument('--port',type=int,default=8765)
    serve.add_argument('--open',action='store_true',help='启动后打开系统浏览器')
    args=parser.parse_args()
    try:
        if args.command=='serve':
            from .server import run
            if not 0<=args.port<=65535:parser.error('端口须在0–65535范围内')
            run(args.port,args.open);return 0
        chinese=read_text(args.chinese);english=read_text(args.english)
        if args.command=='prepare':
            write_new_directory(args.out,request_bundle(chinese,english))
            print('已生成核对请求。请自行决定是否交给现有助手；未自动发送。')
        else:
            audit=parse_json(read_text(args.audit))
            if args.command=='check':
                report=inspect_audit(chinese,english,audit)
                print(json.dumps(report,ensure_ascii=False,indent=2))
                return 3 if any(not r['ready'] for r in report['rows']) else 0
            plan=build_plan(chinese,english,audit,[] if args.none else args.select)
            write_new_directory(args.out,output_files(plan))
            print(json.dumps({'output':str(Path(args.out).resolve()),'selected_ids':plan['report']['selected_ids'],
                              'outside_selected_spans_unchanged':True,'plan_sha256':plan['plan_sha256']},ensure_ascii=False))
        return 0
    except Rejected as exc:
        print(f'{exc.code}: {exc}',file=sys.stderr);return 2
    except (OSError,UnicodeError) as exc:
        print(f'FILE_ERROR: {exc}',file=sys.stderr);return 2
    except KeyboardInterrupt:
        return 130

if __name__=='__main__':
    sys.exit(main())
