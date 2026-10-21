"""三份材料流程：英文原稿 → 中文中间稿 → Argos 英文。夹具为人工构造，不是真实模型输出。"""
import copy
import http.client
import io
import json
from pathlib import Path
import threading
import unittest
import zipfile

from paperchoose import workflow
from paperchoose.core import Rejected
from paperchoose.server import LocalServer

CASE = json.loads((Path(__file__).resolve().parents[1]/'examples/synthetic/roundtrip-audit.json').read_text(encoding='utf-8'))
SRC, PIV, DRAFT = CASE['source'], CASE['pivot'], CASE['draft']
CTX = {'source_language': 'en', 'pivot_language': 'zh', 'target_language': 'en',
       'protection_mode': 'auto', 'protected_terms': [], 'author_notes': ''}
PROV = {'source': {'kind': 'author', 'label': '作者英文原稿'},
        'pivot': {'kind': 'pasted', 'label': '作者粘贴，声明为 DeepSeek 中文'},
        'draft': {'kind': 'argos', 'label': 'Argos Translate zh→en'}}


def audit(source=SRC, pivot=PIV, draft=DRAFT, context=CTX):
    template = json.loads(workflow.round_request_bundle(source, pivot, draft, context)['request.json'])['audit_template']
    return {**template, 'reviewer': CASE['reviewer'], 'proposals': copy.deepcopy(CASE['proposals'])}


class RoundTripTests(unittest.TestCase):
    def fails(self, code, fn, *args):
        with self.assertRaises(Rejected) as found:
            fn(*args)
        self.assertEqual(found.exception.code, code)

    def test_only_number_selected(self):
        plan = workflow.round_plan(SRC, PIV, DRAFT, CTX, audit(), ['P1-01'])
        self.assertEqual(plan['revised'], 'The pilot involved 48 households. The change reduces costs; it proves causation.')
        self.assertEqual([r['id'] for r in plan['report']['unselected']], ['P1-02', 'P1-03'])

    def test_none_selected_is_identical(self):
        plan = workflow.round_plan(SRC, PIV, DRAFT, CTX, audit(), [])
        self.assertEqual(plan['revised'].encode(), DRAFT.encode())
        self.assertEqual(plan['diff'], '')

    def test_each_of_three_texts_and_context_invalidate(self):
        a = audit()
        for args in ((SRC+' ', PIV, DRAFT, CTX), (SRC, PIV+'。', DRAFT, CTX), (SRC, PIV, DRAFT+' ', CTX),
                     (SRC, PIV, DRAFT, {**CTX, 'protection_mode': 'combined', 'protected_terms': ['costs']})):
            self.fails('STALE_INPUT', workflow.round_plan, *args, a, [])

    def test_direction_cannot_be_relabelled(self):
        self.fails('DIRECTION', workflow.round_binding, SRC, PIV, DRAFT, {**CTX, 'pivot_language': 'en'})
        v2 = {'source_language': 'en', 'target_language': 'en', 'protection_mode': 'auto',
              'protected_terms': [], 'author_notes': '', 'reference_original': ''}
        self.fails('DIRECTION', workflow.binding, SRC, DRAFT, v2)
        self.fails('SCHEMA_VERSION', workflow.round_inspect, SRC, PIV, DRAFT, CTX, {**audit(), 'schema_version': 2})

    def test_quote_must_come_from_original_english(self):
        a = audit(); a['proposals'][0]['source_quote'] = '84户家庭'
        row = workflow.round_inspect(SRC, PIV, DRAFT, CTX, a)['rows'][0]
        self.assertFalse(row['ready']); self.assertIn('英文原稿', row['message'])
        self.fails('SOURCE_QUOTE_MISSING', workflow.round_plan, SRC, PIV, DRAFT, CTX, a, ['P1-01'])

    def test_protected_term_cannot_be_reduced(self):
        ctx = {**CTX, 'protection_mode': 'manual', 'protected_terms': ['reduces']}
        self.fails('PROTECTED_TERM', workflow.round_plan, SRC, PIV, DRAFT, ctx, audit(context=ctx), ['P1-02'])

    def test_four_texts_exported(self):
        a = audit(); plan = workflow.round_plan(SRC, PIV, DRAFT, CTX, a, ['P1-01'])
        files = workflow.round_output_files(plan, SRC, PIV, DRAFT, CTX, a, PROV)
        self.assertEqual(files['source.en.txt'], SRC); self.assertEqual(files['pivot.zh.txt'], PIV)
        self.assertEqual(files['machine.argos.en.txt'], DRAFT); self.assertEqual(files['revised.en.txt'], plan['revised'])
        self.assertEqual(json.loads(files['provenance.json'])['files']['pivot.zh.txt'], PROV['pivot'])


class RoundTripHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = LocalServer(0); threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close()

    def post(self, path, data):
        port = self.server.server_port
        conn = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
        conn.request('POST', path, json.dumps(data, ensure_ascii=False).encode(),
                     {'Content-Type': 'application/json', 'X-PaperChoose-Token': self.server.session_token,
                      'Origin': f'http://127.0.0.1:{port}'})
        r = conn.getresponse(); body = r.read(); conn.close()
        return r.status, body

    def test_http_template_preview_export(self):
        base = {'source': SRC, 'pivot': PIV, 'draft': DRAFT, 'context': CTX}
        status, body = self.post('/api/round/template', base); self.assertEqual(status, 200)
        a = {**json.loads(body), 'reviewer': CASE['reviewer'], 'proposals': CASE['proposals']}
        text = json.dumps(a, ensure_ascii=False)
        status, body = self.post('/api/round/preview', {**base, 'audit': text, 'selected_ids': ['P1-01']})
        self.assertEqual(status, 200); plan = json.loads(body)
        status, body = self.post('/api/round/export', {**base, 'audit': text, 'selected_ids': ['P1-01'],
                                                       'plan_sha256': plan['plan_sha256'], 'provenance': PROV})
        self.assertEqual(status, 200)
        z = zipfile.ZipFile(io.BytesIO(body))
        self.assertEqual(z.read('revised.en.txt').decode(), 'The pilot involved 48 households. The change reduces costs; it proves causation.')
        self.assertEqual(z.read('machine.argos.en.txt').decode(), DRAFT)
        status, body = self.post('/api/round/export', {**base, 'audit': text, 'selected_ids': [],
                                                       'plan_sha256': plan['plan_sha256'], 'provenance': PROV})
        self.assertEqual((status, json.loads(body)['error']), (422, 'STALE_PREVIEW'))
        status, body = self.post('/api/round/check', {**base, 'pivot': PIV+'改', 'audit': text})
        self.assertEqual((status, json.loads(body)['error']), (422, 'STALE_INPUT'))


if __name__ == '__main__':
    unittest.main()
