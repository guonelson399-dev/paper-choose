"""Loopback-only local UI. Optional local translation; no automatic cloud calls or file browser."""
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
APP=Path(__file__).parent/'webapp'  # paperchoose-webapp
APP_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://base44.app; img-src 'self' data: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
APP_MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}
MAX_REQUEST=3_000_000


class LocalServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,port=8765,allow_origin=None):
        super().__init__(('127.0.0.1',port),Handler)
        self.cloud_origins=set()
        if allow_origin:
            parts=urlsplit(allow_origin.strip())
            if parts.scheme!='https' or not parts.hostname or parts.path not in ('','/') or parts.query or parts.fragment or parts.username:
                self.server_close()
                raise ValueError('--allow-origin 只接受 https://域名 形式的网页地址。')
            self.cloud_origins.add(f'https://{parts.netloc.lower()}')
        self.session_token=secrets.token_urlsafe(32)
        self.allowed_hosts={f'127.0.0.1:{self.server_port}',f'localhost:{self.server_port}'}
        self.allowed_origins={f'http://{host}' for host in self.allowed_hosts}


class Handler(BaseHTTPRequestHandler):
    server_version='PaperChooseLocal'
    def log_message(self,*args):
        pass  # Do not log manuscript text, request paths or tokens.

    def send_bytes(self,status,data,mime,filename=None,csp=None):
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',csp or "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
        if filename:self.send_header('Content-Disposition',f'attachment; filename="{filename}"')
        origin=self.cloud_origin()
        if origin:
            self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
            self.send_header('Access-Control-Expose-Headers','Content-Disposition')
        self.end_headers();self.wfile.write(data)

    def cloud_origin(self):
        # Only the single https page the author named at startup; never a wildcard.
        origin=self.headers.get('Origin')
        return origin if origin in self.server.cloud_origins else None

    def do_OPTIONS(self):
        if not self.valid_host():return
        origin=self.cloud_origin()
        if not origin or self.headers.get('Access-Control-Request-Method') not in ('GET','POST'):
            self.send_json(403,{'error':'ORIGIN','message':'不接受其他网页的请求。'});return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Methods','GET, POST')
        self.send_header('Access-Control-Allow-Headers','Content-Type, X-PaperChoose-Token')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('Access-Control-Max-Age','600');self.send_header('Content-Length','0')
        self.end_headers()

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
        if route=='/api/translation/status':
            from .translation import status
            self.send_json(200,status());return
        if route=='/api/session':
            self.send_json(200,{'token':self.server.session_token,'version':__version__});return
        if APP.is_dir() and (route=='/' or route.startswith('/assets/')):
            # 核校网页（静态文件）；原界面改到 /classic。
            path=(APP/('index.html' if route=='/' else route[1:])).resolve()
            if APP.resolve() in path.parents and path.is_file():
                self.send_bytes(200,path.read_bytes(),APP_MIME.get(path.suffix,'application/octet-stream'),csp=APP_CSP);return
        if route=='/classic':route='/'
        known={'/':('index.html','text/html; charset=utf-8'),'/app.js':('app.js','text/javascript; charset=utf-8'),'/style.css':('style.css','text/css; charset=utf-8'),'/translation.js':('translation.js','text/javascript; charset=utf-8')}
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
        if origin is not None and origin not in self.server.allowed_origins and origin not in self.server.cloud_origins:
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
            if route=='/api/translate':
                require_keys(data,{'text','source','target'},'translation request')
                from .translation import translate_text
                self.send_json(200,translate_text(data['text'],data['source'],data['target']));return
            if route.startswith('/api/review/'):
                from . import workflow
                action=route.removeprefix('/api/review/')
                if action not in ('request','template','check','preview','export'):
                    reject('NOT_FOUND','入口不存在。')
                keys={'source','draft','context'}
                if action not in ('request','template'):keys.add('audit')
                if action in ('preview','export'):keys.add('selected_ids')
                if action=='export':keys.add('plan_sha256')
                require_keys(data,keys,'review request')
                args=(data['source'],data['draft'],data['context'])
                if action=='template':
                    # Same binding as the request bundle, as JSON, so a web page can attach proposals to it.
                    self.send_json(200,parse_json(workflow.request_bundle(*args)['request.json'])['audit_template']);return
                if action=='request':
                    self.send_bytes(200,zip_bytes(workflow.request_bundle(*args)),'application/zip','paperchoose-audit-request.zip');return
                audit=parse_json(data['audit'])
                if action=='check':
                    self.send_json(200,workflow.inspect_audit(*args,audit));return
                plan=workflow.build_plan(*args,audit,data['selected_ids'])
                if action=='preview':
                    self.send_json(200,plan);return
                if data['plan_sha256']!=plan['plan_sha256']:
                    reject('STALE_PREVIEW','输入、保护要求或选择已变化，请重新预览。')
                self.send_bytes(200,zip_bytes(workflow.output_files(plan,*args,audit)),'application/zip','paperchoose-revision.zip');return
            if route.startswith('/api/round/'):
                # 英文原稿 → 中文中间稿 → Argos 英文：三份材料都参与绑定，只修改 Argos 英文。
                from . import workflow
                action=route.removeprefix('/api/round/')
                if action not in ('request','template','check','preview','export'):
                    reject('NOT_FOUND','入口不存在。')
                keys={'source','pivot','draft','context'}
                if action not in ('request','template'):keys.add('audit')
                if action in ('preview','export'):keys.add('selected_ids')
                if action=='export':keys|={'plan_sha256','provenance'}
                require_keys(data,keys,'round review request')
                args=(data['source'],data['pivot'],data['draft'],data['context'])
                if action=='template':
                    self.send_json(200,parse_json(workflow.round_request_bundle(*args)['request.json'])['audit_template']);return
                if action=='request':
                    self.send_bytes(200,zip_bytes(workflow.round_request_bundle(*args)),'application/zip','paperchoose-audit-request.zip');return
                audit=parse_json(data['audit'])
                if action=='check':
                    self.send_json(200,workflow.round_inspect(*args,audit));return
                plan=workflow.round_plan(*args,audit,data['selected_ids'])
                if action=='preview':
                    self.send_json(200,plan);return
                if data['plan_sha256']!=plan['plan_sha256']:
                    reject('STALE_PREVIEW','三份材料、保护要求或选择已变化，请重新预览。')
                self.send_bytes(200,zip_bytes(workflow.round_output_files(plan,*args,audit,data['provenance'])),'application/zip','paperchoose-revision.zip');return
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


def run(port=8765,open_browser=False,allow_origin=None):
    server=LocalServer(port,allow_origin)
    url=f'http://127.0.0.1:{server.server_port}/'
    print(f'Paper Choose {__version__} — {url}',flush=True)
    print('本地内存处理，可选本地机翻；不自动调用云端。关闭终端即可停止。',flush=True)
    if APP.is_dir():
        print('已装入论文核校网页（原界面：'+url+'classic）。只有你在网页上勾选同意并点击核对时，所选文字才会发给云端 AI。',flush=True)
    for origin in sorted(server.cloud_origins):
        print(f'已允许此网页连接本机：{origin}。该网页可调用本机翻译与修改执行；它是否把文字发给云端 AI，由你在该网页上选择。',flush=True)
    if open_browser:
        threading.Timer(0.4,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    finally:server.server_close()
