"""Opt-in connection from one named https page; executor behaviour unchanged."""
import http.client
import io
import json
import threading
import unittest
import zipfile
from paperchoose.server import LocalServer

CLOUD='https://paper-choose.example.app'
SOURCE='We recruited 48 participants. The treatment did not reduce mortality.\n'
DRAFT='我们招募了84名参与者。该治疗降低了死亡率。\n'
CONTEXT=dict(source_language='en',target_language='zh',protection_mode='combined',protected_terms=['死亡率'],author_notes='',reference_original='')
PROPOSALS=[dict(id='P1-01',category='number',before='84',after='48',context_before='',context_after='',source_quote='48 participants',reason='数字错误'),
           dict(id='P1-02',category='negation',before='降低了',after='没有降低',context_before='',context_after='',source_quote='did not reduce',reason='漏掉否定')]


class CloudOriginTests(unittest.TestCase):
    def start(self,allow=None):
        server=LocalServer(0,allow);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        self.addCleanup(lambda:(server.shutdown(),server.server_close(),thread.join(3)))
        return server
    def call(self,server,method,path,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5)
        h={'Origin':CLOUD};h.update(headers or {})
        if body is not None:
            h.update({'Content-Type':'application/json','X-PaperChoose-Token':server.session_token});body=json.dumps(body,ensure_ascii=False).encode()
        conn.request(method,path,body,h);r=conn.getresponse();out=(r.status,dict(r.getheaders()),r.read());conn.close();return out
    def preflight(self,server,origin=CLOUD):
        return self.call(server,'OPTIONS','/api/review/check',headers={'Origin':origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-paperchoose-token'})

    def test_closed_by_default(self):
        s=self.start()
        self.assertEqual(self.preflight(s)[0],403)
        self.assertEqual(self.call(s,'POST','/api/review/template',dict(source=SOURCE,draft=DRAFT,context=CONTEXT))[0],403)
        self.assertNotIn('Access-Control-Allow-Origin',self.call(s,'GET','/api/session')[1])

    def test_only_https_origin_accepted(self):
        for bad in ['http://paper-choose.example.app','https://x.app/path','https://x.app/?q=1','file:///x','https://******@x.app']:
            with self.subTest(bad=bad),self.assertRaises(ValueError):LocalServer(0,bad)

    def test_named_origin_full_flow_and_stale(self):
        s=self.start(CLOUD+'/')
        status,h,_=self.preflight(s)
        self.assertEqual(status,204);self.assertEqual(h['Access-Control-Allow-Origin'],CLOUD)
        self.assertEqual(h['Access-Control-Allow-Private-Network'],'true')
        self.assertEqual(self.preflight(s,'https://other.invalid')[0],403)
        self.assertEqual(self.call(s,'POST','/api/review/template',dict(source=SOURCE,draft=DRAFT,context=CONTEXT),{'Origin':'https://other.invalid'})[0],403)
        _,h,body=self.call(s,'GET','/api/session');self.assertEqual(h['Access-Control-Allow-Origin'],CLOUD)
        self.assertEqual(json.loads(body)['token'],s.session_token)
        base=dict(source=SOURCE,draft=DRAFT,context=CONTEXT)
        status,h,body=self.call(s,'POST','/api/review/template',base)
        self.assertEqual(status,200);audit=json.loads(body)
        self.assertEqual(audit['proposals'],[]);self.assertEqual(audit['schema_version'],2)
        audit.update(reviewer={'kind':'assistant','label':'test'},proposals=PROPOSALS)
        data=base|{'audit':json.dumps(audit,ensure_ascii=False)}
        rows=json.loads(self.call(s,'POST','/api/review/check',data)[2])['rows']
        self.assertTrue(all(r['ready'] for r in rows))
        one=json.loads(self.call(s,'POST','/api/review/preview',data|{'selected_ids':['P1-01']})[2])
        self.assertEqual(one['revised'],'我们招募了48名参与者。该治疗降低了死亡率。\n')
        none=json.loads(self.call(s,'POST','/api/review/preview',data|{'selected_ids':[]})[2])
        self.assertEqual(none['revised'].encode(),DRAFT.encode())
        status,h,blob=self.call(s,'POST','/api/review/export',data|{'selected_ids':['P1-01'],'plan_sha256':one['plan_sha256']})
        self.assertEqual(status,200);self.assertEqual(h['Access-Control-Allow-Origin'],CLOUD)
        files=zipfile.ZipFile(io.BytesIO(blob))
        self.assertEqual(files.read('machine.zh.txt').decode(),DRAFT)
        self.assertEqual(files.read('source.en.txt').decode(),SOURCE)
        changed=data|{'draft':DRAFT.replace('我们','本研究'),'selected_ids':['P1-01']}
        status,_,body=self.call(s,'POST','/api/review/preview',changed)
        self.assertEqual(status,422);self.assertEqual(json.loads(body)['error'],'STALE_INPUT')


if __name__=='__main__':unittest.main()
