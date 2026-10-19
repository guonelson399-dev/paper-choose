"""Loopback-only local UI. No external requests, storage, model calls or file browser."""
from __future__ import annotations
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import secrets
import threading
import webbrowser
from urllib.parse import urlsplit
from . import __version__
from .core import Rejected, reject, parse_json, require_keys, inspect_audit, request_bundle, build_plan, output_files, zip_bytes

WEB=Path(__file__).parent/'web'
MAX_REQUEST=3_000_000


class LocalServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,port=8765):
        super().__init__(('127.0.0.1',port),Handler)
        self.session_token=secrets.token_urlsafe(32)
        self.allowed_hosts={f'127.0.0.1:{self.server_port}',f'localhost:{self.server_port}'}
        self.allowed_origins={f'http://{host}' for host in self.allowed_hosts}


class Handler(BaseHTTPRequestHandler):
    server_version='PaperChooseLocal'
    def log_message(self,*args):
        pass  # Do not log manuscript text, request paths or tokens.

    def send_bytes(self,status,data,mime,filename=None):
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
        if filename:self.send_header('Content-Disposition',f'attachment; filename="{filename}"')
        self.end_headers();self.wfile.write(data)

    def send_json(self,status,value):
        import json
        self.send_bytes(status,json.dumps(value,ensure_ascii=False).encode('utf-8'),'application/json; charset=utf-8')

    def valid_host(self):
        if self.headers.get('Host') not in self.server.allowed_hosts:
            self.send_json(403,{'error':'HOST','message':'只接受本机地址。'});return False
        return True

    def do_GET(self):
        if not self.valid_host():return
        route=urlsplit(self.path).path
        if route=='/api/session':
            self.send_json(200,{'token':self.server.session_token,'version':__version__});return
        known={'/':('index.html','text/html; charset=utf-8'),'/app.js':('app.js','text/javascript; charset=utf-8'),'/style.css':('style.css','text/css; charset=utf-8')}
        if route in known:
            name,mime=known[route];self.send_bytes(200,(WEB/name).read_bytes(),mime);return
        if route=='/api/example':
            import json
            root=Path(__file__).resolve().parents[1]/'examples/synthetic'
            self.send_json(200,{'chinese':(root/'source.zh.txt').read_bytes().decode('utf-8'),
                                'english':(root/'draft.en.txt').read_bytes().decode('utf-8'),
                                'audit':json.loads((root/'audit.v1.json').read_text(encoding='utf-8'))});return
        self.send_json(404,{'error':'NOT_FOUND','message':'入口不存在。'})

    def do_POST(self):
        if not self.valid_host():return
        origin=self.headers.get('Origin')
        if origin is not None and origin not in self.server.allowed_origins:
            self.send_json(403,{'error':'ORIGIN','message':'不接受其他网页的请求。'});return
        token=self.headers.get('X-PaperChoose-Token','')
        if not secrets.compare_digest(token,self.server.session_token):
            self.send_json(403,{'error':'SESSION','message':'会话已变化，请刷新本地页面。'});return
        try:
            if self.headers.get_content_type()!='application/json':reject('CONTENT_TYPE','请求必须是 JSON。')
            size=int(self.headers.get('Content-Length','-1'))
            if not 0<=size<=MAX_REQUEST:reject('REQUEST_SIZE','请求大小无效或超过本地处理上限。')
            self.connection.settimeout(10)
            raw=self.rfile.read(size)
            if len(raw)!=size:reject('REQUEST_SIZE','请求不完整。')
            data=parse_json(raw.decode('utf-8'))
            route=urlsplit(self.path).path
            if route=='/api/request':
                require_keys(data,{'chinese','english'},'request')
                self.send_bytes(200,zip_bytes(request_bundle(data['chinese'],data['english'])),'application/zip','paperchoose-audit-request.zip');return
            if route not in ('/api/check','/api/preview','/api/export'):
                self.send_json(404,{'error':'NOT_FOUND','message':'入口不存在。'});return
            keys={'chinese','english','audit'}
            if route!='/api/check':keys.add('selected_ids')
            if route=='/api/export':keys.add('plan_sha256')
            require_keys(data,keys,'request')
            # Audit is sent as raw JSON text so duplicate keys remain detectable.
            audit=parse_json(data['audit'])
            if route=='/api/check':
                self.send_json(200,inspect_audit(data['chinese'],data['english'],audit));return
            plan=build_plan(data['chinese'],data['english'],audit,data['selected_ids'])
            if route=='/api/preview':
                self.send_json(200,plan);return
            if data['plan_sha256']!=plan['plan_sha256']:
                reject('STALE_PREVIEW','选择、核对结果或输入已变化，请重新查看修改预览。')
            self.send_bytes(200,zip_bytes(output_files(plan)),'application/zip','paperchoose-revision.zip')
        except Rejected as exc:
            self.send_json(422,{'error':exc.code,'message':str(exc)})
        except (UnicodeError,ValueError,TypeError):
            self.send_json(422,{'error':'INVALID_REQUEST','message':'请求格式或 UTF-8 编码无效。'})
        except (TimeoutError,ConnectionError):
            return


def run(port=8765,open_browser=False):
    server=LocalServer(port)
    url=f'http://127.0.0.1:{server.server_port}/'
    print(f'Paper Choose {__version__} — {url}',flush=True)
    print('本地内存处理，无模型或云端调用；关闭终端即可停止。',flush=True)
    if open_browser:
        threading.Timer(0.4,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    finally:server.server_close()
