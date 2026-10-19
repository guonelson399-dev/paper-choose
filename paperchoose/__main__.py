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
    parser=argparse.ArgumentParser(description='Paper Choose：本地作者择项修改工具；可选本地机翻，不自动调用云端。')
    commands=parser.add_subparsers(dest='command',required=True)
    for name in ('prepare-review','check-review','apply-review'):
        sub=commands.add_parser(name,help='原稿→机翻稿短流程（双向，v2）')
        sub.add_argument('--source-text',required=True)
        sub.add_argument('--draft',required=True)
        sub.add_argument('--context',required=True,help='方向与保护要求JSON；见 docs/AGENT_WORKFLOW.md')
        if name!='prepare-review':sub.add_argument('--audit',required=True)
        if name!='check-review':sub.add_argument('--out',required=True)
        if name=='apply-review':
            group=sub.add_mutually_exclusive_group(required=True)
            group.add_argument('--select',nargs='+',metavar='ID')
            group.add_argument('--none',action='store_true')
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
    translation=commands.add_parser('translate',help='生成独立机翻稿和记录，不覆盖原稿')
    translation.add_argument('--input',required=True,help='UTF-8 纯文本输入')
    translation.add_argument('--source',choices=['zh','en'],required=True)
    translation.add_argument('--target',choices=['zh','en'],required=True)
    translation.add_argument('--out',required=True,help='新的输出目录，不覆盖已存在目录')
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
        if args.command=='translate':
            from .translation import translate_text
            from .core import reject
            out=Path(args.out)
            if out.exists() or out.is_symlink():reject('OUTPUT_EXISTS','输出目录已存在，请选择新目录。')
            if not out.parent.is_dir():reject('OUTPUT_PARENT','请先创建输出目录的父目录。')
            record=translate_text(read_text(args.input),args.source,args.target)
            filename=f'translated.{args.target}.txt'
            write_new_directory(out,{filename:record['translated_text'],
                                    'translation.json':json.dumps(record,ensure_ascii=False,indent=2)+'\n'})
            print(json.dumps({'output':str(out.resolve()),'translation':filename,
                              'record':'translation.json','engine':record['engine'],
                              'meaning_verified':False},ensure_ascii=False))
            return 0
        if args.command=='serve':
            from .server import run
            if not 0<=args.port<=65535:parser.error('端口须在0–65535范围内')
            run(args.port,args.open,args.allow_origin);return 0
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
