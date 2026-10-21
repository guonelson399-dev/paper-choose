import http.client
import json
import threading
import tempfile
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

from paperchoose import translation as t
from paperchoose.core import Rejected, digest
from paperchoose.server import LocalServer


class TranslationTests(unittest.TestCase):
    def setUp(self):
        t.TRANSLATORS.clear()

    def tearDown(self):
        t.TRANSLATORS.clear()

    def test_missing_install_keeps_base_app_available(self):
        with patch.object(t, 'packages', side_effect=Rejected('TRANSLATION_SETUP', 'missing')):
            self.assertEqual(t.status()['pairs'], [])

    def test_empty_long_and_invalid_direction_before_engine_load(self):
        with patch.object(t, 'load_translator') as load:
            for text, source, target in [('', 'zh', 'en'), ('x'*5001, 'zh', 'en'),
                                          ('text', 'en', 'en'), ('text', [], 'en'), (None, 'zh', 'en')]:
                with self.subTest(source=source, text=str(text)[:20]), self.assertRaises(Rejected):
                    t.translate_text(text, source, target)
            load.assert_not_called()

    def test_record_binds_original_and_engine_without_treating_it_as_verified(self):
        text='这项结果可能改善准确率。'
        engine=Mock();engine.translate.return_value='This result may improve accuracy.'
        with patch.object(t, 'load_translator', return_value=(engine, {'name':'TEST DOUBLE'})):
            result=t.translate_text(text, 'zh', 'en')
        engine.translate.assert_called_once_with(text)
        self.assertEqual(result['source_sha256'],digest(text))
        self.assertFalse(result['meaning_verified'])
        self.assertEqual(result['source_text'],text)

    def test_engine_failure_does_not_disclose_input_and_releases_lock(self):
        engine=Mock();engine.translate.side_effect=RuntimeError('PRIVATE_MANUSCRIPT')
        with patch.object(t, 'load_translator',return_value=(engine,{})):
            with self.assertRaises(Rejected) as error:t.translate_text('private','en','zh')
        self.assertNotIn('PRIVATE_MANUSCRIPT',str(error.exception))
        self.assertTrue(t.LOCK.acquire(blocking=False));t.LOCK.release()

    def test_busy_fails_without_starting_second_job(self):
        t.LOCK.acquire()
        try:
            with self.assertRaises(Rejected) as error:t.translate_text('text','en','zh')
            self.assertEqual(error.exception.code,'TRANSLATION_BUSY')
        finally:t.LOCK.release()

    def test_cli_writes_new_translation_and_refuses_existing_output(self):
        from paperchoose.__main__ import main
        import contextlib
        import io
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source.txt';source.write_text('原稿',encoding='utf-8')
            out=root/'translated'
            argv=['paperchoose','translate','--input',str(source),'--source','zh','--target','en','--out',str(out)]
            fake=Mock();fake.translate.return_value='Translated draft'
            with patch.object(sys,'argv',argv), patch.object(t,'load_translator',return_value=(fake,{'name':'TEST DOUBLE'})), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(),0)
            self.assertEqual((out/'translated.en.txt').read_text(encoding='utf-8'),'Translated draft')
            self.assertEqual(json.loads((out/'translation.json').read_text(encoding='utf-8'))['source_text'],'原稿')
            self.assertEqual(source.read_text(encoding='utf-8'),'原稿')
            with patch.object(sys,'argv',argv),patch.object(t,'translate_text') as translate,contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(main(),2)
                translate.assert_not_called()

    def test_http_auth_and_translation_response(self):
        server=LocalServer(0)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def request(token,origin=None):
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5)
            headers={'Content-Type':'application/json','X-PaperChoose-Token':token}
            if origin:headers['Origin']=origin
            conn.request('POST','/api/translate',json.dumps({'text':'测试','source':'zh','target':'en'}),headers)
            response=conn.getresponse();out=(response.status,json.loads(response.read()));conn.close();return out
        try:
            with patch.object(t,'load_translator',return_value=(Mock(translate=Mock(return_value='Test')),{'name':'TEST DOUBLE'})) as load:
                self.assertEqual(request('')[0],403)
                self.assertEqual(request(server.session_token,'https://other.invalid')[0],403)
                load.assert_not_called()
                code,data=request(server.session_token)
                self.assertEqual(code,200)
                self.assertEqual(data['translated_text'],'Test')
                self.assertFalse(data['meaning_verified'])
        finally:server.shutdown();server.server_close();thread.join(3)


if __name__=='__main__':unittest.main()
