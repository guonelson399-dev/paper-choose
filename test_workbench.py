import copy
import hashlib
import http.client
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import zipfile

from paperchoose.core import (Rejected, build_plan, inspect_audit, parse_json, request_bundle,
                              write_new_directory, digest, output_files)
from paperchoose.server import LocalServer

ROOT=Path(__file__).resolve().parents[1]
CASE=ROOT/'examples/synthetic'
CN=(CASE/'source.zh.txt').read_bytes().decode('utf-8')
EN=(CASE/'draft.en.txt').read_bytes().decode('utf-8')
AUDIT=json.loads((CASE/'audit.v1.json').read_text(encoding='utf-8'))


def audit_for(english=EN,chinese=CN):
    a=copy.deepcopy(AUDIT)
    a['english_sha256']=digest(english);a['chinese_sha256']=digest(chinese)
    return a


class PatchTests(unittest.TestCase):
    def fails(self,code,fn,*args):
        with self.assertRaises(Rejected) as found:fn(*args)
        self.assertEqual(found.exception.code,code)

    def test_selected_exactly_and_unselected_preserved(self):
        plan=build_plan(CN,EN,AUDIT,['P1-01'])
        self.assertEqual(plan['revised'].encode(),(CASE/'expected.en.txt').read_bytes())
        self.assertIn('The estimate is certain.',plan['revised'])
        self.assertIn('This finding are useful.',plan['revised'])
        self.assertTrue(plan['report']['outside_selected_spans_unchanged'])
        self.assertEqual(plan['report']['count_after']['words'],18)
        self.assertEqual(plan['report']['unselected'][0]['state'],'not_selected')
        self.assertFalse(plan['report']['meaning_verified_by_program'])

    def test_apply_none_byte_identity_crlf_bom_unicode_no_final_newline(self):
        english='\ufeff'+EN.replace('\n','\r\n').rstrip('\r\n')+' — café 😀'
        plan=build_plan(CN,english,audit_for(english),[])
        self.assertEqual(plan['revised'].encode(),english.encode())
        self.assertEqual(plan['diff'],'')

    def test_changed_chinese_or_english_rejected(self):
        self.fails('STALE_INPUT',build_plan,CN,EN+' ',AUDIT,['P1-01'])
        self.fails('STALE_INPUT',build_plan,CN+' ',EN,AUDIT,['P1-01'])
        self.fails('STALE_INPUT',build_plan,CN,EN+' ',AUDIT,[])

    def test_changed_final_line_without_newline_has_readable_diff(self):
        english='The estimate is certain.'
        a=audit_for(english);a['proposals']=a['proposals'][1:]
        plan=build_plan(CN,english,a,['P1-02'])
        self.assertEqual(plan['revised'],'The estimate is uncertain.')
        self.assertIn('-The estimate is certain.\n\\ No newline at end of file\n',plan['diff'])
        self.assertIn('+The estimate is uncertain.\n\\ No newline at end of file\n',plan['diff'])

    def test_missing_quote_blocks_only_its_selected_item(self):
        a=audit_for();a['proposals'][1]['source_quote']='不存在的依据'
        self.assertFalse(inspect_audit(CN,EN,a)['rows'][1]['ready'])
        self.assertEqual(build_plan(CN,EN,a,['P1-01'])['revised'],(CASE/'expected.en.txt').read_text())
        self.fails('SOURCE_QUOTE_MISSING',build_plan,CN,EN,a,['P1-02'])

    def test_repeated_span_rejected_and_context_disambiguates(self):
        english=EN+'The estimate is certain.\n'
        a=audit_for(english)
        self.fails('SPAN_AMBIGUOUS',build_plan,CN,english,a,['P1-02'])
        a['proposals'][1]['context_after']='.\nThis finding are useful.'
        result=build_plan(CN,english,a,['P1-02'])['revised']
        self.assertIn('The estimate is uncertain.\nThis finding are useful.',result)
        self.assertTrue(result.endswith('The estimate is certain.\n'))

    def test_missing_span_rejected(self):
        a=audit_for();a['proposals'][0]['before']='never improves'
        self.fails('SPAN_MISSING',build_plan,CN,EN,a,['P1-01'])

    def test_overlapping_selected_rows_rejected(self):
        a=audit_for();a['proposals'][1]['before']='improves accuracy';a['proposals'][1]['after']='increases accuracy'
        self.fails('OVERLAP',build_plan,CN,EN,a,['P1-01','P1-02'])
        self.assertTrue(build_plan(CN,EN,a,['P1-01'])['report']['outside_selected_spans_unchanged'])

    def test_adjacent_nonoverlapping_replacements_and_source_order(self):
        a=audit_for();a['proposals'][0]['before']='always ';a['proposals'][0]['after']='may '
        a['proposals'][1]['before']='improves';a['proposals'][1]['after']='improve'
        result=build_plan(CN,EN,a,['P1-02','P1-01'])
        self.assertEqual(result['revised'],(CASE/'expected.en.txt').read_text())
        self.assertEqual(result['report']['selected_ids'],['P1-01','P1-02'])

    def test_no_chained_matching_in_replacement_text(self):
        a=audit_for();a['proposals'][1]['before']='may improve';a['proposals'][1]['after']='will improve'
        self.fails('SPAN_MISSING',build_plan,CN,EN,a,['P1-01','P1-02'])

    def test_bad_ids_and_duplicate_ids(self):
        self.fails('UNKNOWN_ID',build_plan,CN,EN,AUDIT,['P1-99'])
        self.fails('SELECTION',build_plan,CN,EN,AUDIT,['P1-01','P1-01'])
        a=audit_for();a['proposals'][1]['id']='P1-01'
        self.fails('DUPLICATE_OR_INVALID_ID',build_plan,CN,EN,a,[])

    def test_reject_read_only_modes_and_unsupported_operations(self):
        for mode in ['BTI','AEC']:
            with self.subTest(mode=mode):
                a=audit_for();a['mode']=mode
                self.fails('READ_ONLY_MODE',build_plan,CN,EN,a,['P1-01'])
        for change in [{'id':'C-01'}, {'before':''}, {'after':''}, {'after':'always improves'}]:
            a=audit_for();a['proposals'][0].update(change)
            with self.assertRaises(Rejected):build_plan(CN,EN,a,['P1-01'])

    def test_model_cannot_put_selection_in_audit(self):
        a=audit_for();a['selected_ids']=['P1-01']
        self.fails('SCHEMA',build_plan,CN,EN,a,['P1-01'])

    def test_duplicate_json_keys_and_invalid_json(self):
        self.fails('DUPLICATE_JSON_KEY',parse_json,'{"mode":"BTI","mode":"translation_audit"}')
        self.fails('INVALID_JSON',parse_json,'```json\n{}\n```')
        self.fails('JSON_NUMBER',parse_json,'{"x":NaN}')

    def test_preview_digest_binds_selected_and_unselected_proposals(self):
        initial=build_plan(CN,EN,AUDIT,['P1-01'])['plan_sha256']
        changed=audit_for();changed['proposals'][1]['reason']='说明发生变化'
        self.assertNotEqual(initial,build_plan(CN,EN,changed,['P1-01'])['plan_sha256'])
        self.assertNotEqual(initial,build_plan(CN,EN,AUDIT,[])['plan_sha256'])

    def test_quote_existence_is_not_semantic_certification(self):
        a=audit_for();a['proposals'][0]['after']='will definitely improve'
        # Intentionally wrong semantic proposal: lexical/position checks cannot judge meaning.
        result=build_plan(CN,EN,a,['P1-01'])
        self.assertFalse(result['report']['meaning_verified_by_program'])
        self.assertIn('will definitely improve',result['revised'])

    def test_request_hashes_and_original_file_preservation(self):
        before=(CASE/'draft.en.txt').read_bytes()
        bundle=request_bundle(CN,EN)
        req=json.loads(bundle['request.json'])
        self.assertEqual(req['english'],EN)
        self.assertEqual(req['audit_template']['english_sha256'],digest(EN))
        self.assertEqual((CASE/'draft.en.txt').read_bytes(),before)

    def test_output_refuses_existing_directory_without_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            dest=Path(temp)/'result';dest.mkdir();keep=dest/'revised.en.txt';keep.write_bytes(b'KEEP')
            self.fails('OUTPUT_EXISTS',write_new_directory,dest,output_files(build_plan(CN,EN,AUDIT,['P1-01'])))
            self.assertEqual(keep.read_bytes(),b'KEEP')
            new=Path(temp)/'new';write_new_directory(new,output_files(build_plan(CN,EN,AUDIT,[])))
            self.assertEqual((new/'revised.en.txt').read_bytes(),EN.encode())


class CLITests(unittest.TestCase):
    def run_cli(self,*args):
        return subprocess.run([sys.executable,'-B','-m','paperchoose',*map(str,args)],cwd=ROOT,capture_output=True,text=True)

    def args(self):
        return ['--chinese',CASE/'source.zh.txt','--english',CASE/'draft.en.txt','--audit',CASE/'audit.v1.json']

    def test_prepare_check_apply_export_actual_cli(self):
        with tempfile.TemporaryDirectory(prefix='paper choose ') as tmp:
            tmp=Path(tmp)
            result=self.run_cli('prepare','--chinese',CASE/'source.zh.txt','--english',CASE/'draft.en.txt','--out',tmp/'request')
            self.assertEqual(result.returncode,0,result.stderr)
            result=self.run_cli('check',*self.args());self.assertEqual(result.returncode,0,result.stderr)
            result=self.run_cli('apply',*self.args(),'--select','P1-01','--out',tmp/'result')
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual((tmp/'result/revised.en.txt').read_bytes(),(CASE/'expected.en.txt').read_bytes())
            result=self.run_cli('apply',*self.args(),'--none','--out',tmp/'none')
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual((tmp/'none/revised.en.txt').read_bytes(),(CASE/'draft.en.txt').read_bytes())
            result=self.run_cli('apply',*self.args(),'--none','--out',tmp/'none')
            self.assertEqual(result.returncode,2)
            self.assertIn('OUTPUT_EXISTS',result.stderr)

    def test_missing_author_choice_and_invalid_id_leave_no_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'out'
            result=self.run_cli('apply',*self.args(),'--out',out)
            self.assertEqual(result.returncode,2);self.assertFalse(out.exists())
            result=self.run_cli('apply',*self.args(),'--select','P1-404','--out',out)
            self.assertEqual(result.returncode,2);self.assertFalse(out.exists())

    def test_actual_cli_preserves_crlf_and_bom(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp);en='\ufeff'+EN.replace('\n','\r\n').rstrip('\r\n')
            (tmp/'en.txt').write_bytes(en.encode())
            (tmp/'audit.json').write_text(json.dumps(audit_for(en),ensure_ascii=False),encoding='utf-8')
            result=self.run_cli('apply','--chinese',CASE/'source.zh.txt','--english',tmp/'en.txt','--audit',tmp/'audit.json','--select','P1-01','--out',tmp/'result')
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual((tmp/'result/revised.en.txt').read_bytes(),en.replace('always improves','may improve').encode())
            self.assertEqual((tmp/'en.txt').read_bytes(),en.encode())


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Short-lived loopback integration server, not a browser preview.
        cls.server=LocalServer(0);cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.port=cls.server.server_port;cls.token=cls.server.session_token

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=3)

    def get(self,path,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=5)
        conn.request('GET',path,headers=headers or {});response=conn.getresponse();result=(response.status,dict(response.getheaders()),response.read());conn.close();return result

    def post(self,path,data,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=5)
        h={'Content-Type':'application/json','X-PaperChoose-Token':self.token,'Origin':f'http://127.0.0.1:{self.port}'}
        if headers:h.update(headers)
        conn.request('POST',path,json.dumps(data,ensure_ascii=False).encode(),headers=h)
        response=conn.getresponse();result=(response.status,dict(response.getheaders()),response.read());conn.close();return result

    def body(self):return {'chinese':CN,'english':EN,'audit':json.dumps(AUDIT,ensure_ascii=False)}

    def test_static_and_session_endpoints(self):
        status,headers,body=self.get('/')
        self.assertEqual(status,200);self.assertIn('逐项'.encode(),body)
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])
        self.assertEqual(headers['Cache-Control'],'no-store')
        for path in ['/app.js','/style.css','/api/example']:
            self.assertEqual(self.get(path)[0],200)
        self.assertEqual(json.loads(self.get('/api/session')[2])['token'],self.token)
        self.assertEqual(self.get('/../../SKILL.md')[0],404)

    def test_no_token_foreign_origin_and_host_rejected(self):
        self.assertEqual(self.post('/api/check',self.body(),{'X-PaperChoose-Token':''})[0],403)
        self.assertEqual(self.post('/api/check',self.body(),{'Origin':'https://other.invalid'})[0],403)
        self.assertEqual(self.get('/',{'Host':'other.invalid'})[0],403)

    def test_actual_request_preview_and_download_zip(self):
        status,_,blob=self.post('/api/request',{'chinese':CN,'english':EN})
        self.assertEqual(status,200)
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            self.assertEqual(json.loads(z.read('request.json'))['english'],EN)
        self.assertEqual(self.post('/api/check',self.body())[0],200)
        data=self.body()|{'selected_ids':['P1-01']}
        status,_,raw=self.post('/api/preview',data);self.assertEqual(status,200)
        preview=json.loads(raw)
        status,headers,blob=self.post('/api/export',data|{'plan_sha256':preview['plan_sha256']})
        self.assertEqual(status,200);self.assertEqual(headers['Content-Type'],'application/zip')
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            self.assertIsNone(z.testzip())
            self.assertEqual(set(z.namelist()),{'revised.en.txt','changes.diff','decisions.json'})
            self.assertEqual(z.read('revised.en.txt'),(CASE/'expected.en.txt').read_bytes())
            self.assertEqual(json.loads(z.read('decisions.json'))['selected_ids'],['P1-01'])

    def test_stale_preview_and_changed_input_rejected(self):
        data=self.body()|{'selected_ids':['P1-01']}
        preview=json.loads(self.post('/api/preview',data)[2])
        status,_,raw=self.post('/api/export',data|{'selected_ids':[],'plan_sha256':preview['plan_sha256']})
        self.assertEqual(status,422);self.assertEqual(json.loads(raw)['error'],'STALE_PREVIEW')
        status,_,raw=self.post('/api/preview',data|{'english':EN+' '})
        self.assertEqual(status,422);self.assertEqual(json.loads(raw)['error'],'STALE_INPUT')

    def test_duplicate_audit_keys_rejected_over_http(self):
        data=self.body();data['audit']='{"mode":"BTI","mode":"translation_audit"}'
        status,_,raw=self.post('/api/check',data)
        self.assertEqual(status,422);self.assertEqual(json.loads(raw)['error'],'DUPLICATE_JSON_KEY')


if __name__=='__main__':unittest.main()
