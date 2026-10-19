"""Runtime checks for source/target binding, constrained execution and HTTP/CLI."""
import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
import zipfile
from paperchoose import workflow as w
from paperchoose.core import Rejected, parse_json
from paperchoose.server import LocalServer


def case(direction='en-zh'):
    src,tgt=direction.split('-')
    source='The SFC model may help. It does not prove causality.\r\n' if src=='en' else 'SFC模型可能有帮助。它不证明因果关系。\r\n'
    draft='SFC模型一定有帮助。它不证明因果关系。\r\n' if tgt=='zh' else 'The SFC model always helps. It does not prove causality.\r\n'
    context=dict(source_language=src,target_language=tgt,protection_mode='combined',protected_terms=['SFC'],author_notes='保留强度',reference_original='')
    request=parse_json(w.request_bundle(source,draft,context)['request.json']);audit=request['audit_template']
    audit['reviewer']={'kind':'synthetic','label':'Synthetic test fixture'}
    audit['proposals']=[dict(id='P1-01',category='modality',before='一定' if tgt=='zh' else 'always helps',after='可能' if tgt=='zh' else 'may help',context_before='',context_after='',source_quote='may help' if src=='en' else '可能有帮助',reason='恢复原稿的不确定性')]
    return source,draft,context,audit


class WorkflowTests(unittest.TestCase):
    def test_both_directions_exact_selected_and_none(self):
        for direction in ['en-zh','zh-en']:
            s,d,c,a=case(direction);p=w.build_plan(s,d,c,a,['P1-01'])
            row=a['proposals'][0]
            self.assertEqual(p['revised'],d.replace(row['before'],row['after']))
            self.assertTrue(p['report']['outside_selected_spans_unchanged'])
            self.assertEqual(w.build_plan(s,d,c,a,[])['revised'].encode(),d.encode())
            files=w.output_files(p,s,d,c,a)
            self.assertEqual(files['source.'+c['source_language']+'.txt'],s)
            self.assertEqual(files['machine.'+c['target_language']+'.txt'],d)
            self.assertIn('revised.'+c['target_language']+'.txt',files)
            self.assertNotIn('chinese_sha256',p['report'])

    def test_every_input_and_constraint_is_bound(self):
        s,d,c,a=case()
        variants=[(s+' ',d,c),(s,d+' ',c)]
        for field,value in [('source_language','zh'),('target_language','en'),('protection_mode','manual'),('protected_terms',['SFC','ABC']),('author_notes','changed'),('reference_original','Old English')]:
            updated=copy.deepcopy(c);updated[field]=value;variants.append((s,d,updated))
        for args in variants:
            with self.assertRaises(Rejected):w.build_plan(*args,a,['P1-01'])

    def test_exact_term_cannot_be_removed_by_selected_patch(self):
        s,d,c,a=case();a['proposals'][0].update(before='SFC',after='另一个模型',source_quote='SFC')
        with self.assertRaises(Rejected) as ctx:w.build_plan(s,d,c,a,['P1-01'])
        self.assertEqual(ctx.exception.code,'PROTECTED_TERM')
        self.assertEqual(w.build_plan(s,d,c,a,[])['revised'],d)

    def test_missing_term_reported_without_silent_insertion(self):
        s,d,c,a=case();c['protected_terms'].append('RequiredName')
        a.update(w.binding(s,d,c));p=w.build_plan(s,d,c,a,[])
        self.assertEqual(p['report']['missing_protected_terms'],['RequiredName'])
        self.assertEqual(p['revised'],d)

    def test_automatic_observations_do_not_authorize_changes(self):
        s,d,c,a=case();a['protection_observations']=[dict(source_quote='SFC',target_form='SFC',reason='模型名')]
        self.assertEqual(w.build_plan(s,d,c,a,[])['revised'],d)
        a['protection_observations'][0]['source_quote']='invented source'
        with self.assertRaises(Rejected):w.inspect_audit(s,d,c,a)

    def test_manual_does_not_add_ai_term_list(self):
        s,d,c,a=case();c['protection_mode']='manual';a.update(w.binding(s,d,c))
        w.inspect_audit(s,d,c,a)
        a['protection_observations']=[dict(source_quote='SFC',target_form='SFC',reason='模型名')]
        with self.assertRaises(Rejected):w.inspect_audit(s,d,c,a)

    def test_overlap_and_bad_source_quote_rejected(self):
        s,d,c,a=case();a['proposals'].append(dict(a['proposals'][0],id='P1-02',after='或许'))
        with self.assertRaises(Rejected):w.build_plan(s,d,c,a,['P1-01','P1-02'])
        a['proposals'][0]['source_quote']='not in source'
        self.assertFalse(w.inspect_audit(s,d,c,a)['rows'][0]['ready'])
        with self.assertRaises(Rejected):w.build_plan(s,d,c,a,['P1-01'])

    def test_read_only_mode_not_executable(self):
        s,d,c,a=case();a['mode']='AEC'
        with self.assertRaises(Rejected):w.build_plan(s,d,c,a,[])

    def test_cli_prepare_check_apply(self):
        s,d,c,a=case()
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            for name,value in [('source.txt',s),('draft.txt',d),('context.json',json.dumps(c)),('audit.json',json.dumps(a))]:
                (root/name).write_bytes(value.encode())
            common=['--source-text',str(root/'source.txt'),'--draft',str(root/'draft.txt'),'--context',str(root/'context.json')]
            for cmd,extra in [('prepare-review',['--out',str(root/'request')]),('check-review',['--audit',str(root/'audit.json')]),('apply-review',['--audit',str(root/'audit.json'),'--select','P1-01','--out',str(root/'result')])]:
                run=subprocess.run([sys.executable,'-m','paperchoose',cmd,*common,*extra],capture_output=True,text=True)
                self.assertEqual(run.returncode,0,run.stderr)
            self.assertEqual((root/'result/revised.zh.txt').read_bytes(),d.replace('一定','可能').encode())
            self.assertEqual((root/'source.txt').read_bytes(),s.encode())


class HttpFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=LocalServer(0);cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.base=f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def post(self,action,data):
        request=urllib.request.Request(self.base+'/api/review/'+action,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','X-PaperChoose-Token':self.server.session_token})
        return urllib.request.urlopen(request)
    def test_request_check_preview_export_and_stale_preview(self):
        s,d,c,a=case();data=dict(source=s,draft=d,context=c)
        with self.post('request',data) as response:
            with zipfile.ZipFile(io.BytesIO(response.read())) as z:
                request=json.loads(z.read('request.json'));self.assertEqual(request['source'],s)
        data['audit']=json.dumps(a)
        with self.post('check',data) as r:self.assertTrue(json.load(r)['rows'][0]['ready'])
        data['selected_ids']=['P1-01']
        with self.post('preview',data) as r:plan=json.load(r)
        data['plan_sha256']=plan['plan_sha256']
        with self.post('export',data) as r:
            with zipfile.ZipFile(io.BytesIO(r.read())) as z:self.assertEqual(z.read('revised.zh.txt'),d.replace('一定','可能').encode())
        data['selected_ids']=[]
        with self.assertRaises(urllib.error.HTTPError) as err:self.post('export',data)
        self.assertEqual(err.exception.code,422)

if __name__=='__main__':unittest.main()
