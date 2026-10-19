"""Executable checks for the counter and the fixed, synthetic editing example.

Fixture checks are NOT a general-purpose list-lock enforcement implementation.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'wordcount.py'
CASE = ROOT / 'examples' / 'synthetic'
spec = importlib.util.spec_from_file_location('wordcount', SCRIPT)
wc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wc)


class CounterTests(unittest.TestCase):
    def cli(self, *args, text=None):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)],
                              input=text, text=True, encoding='utf-8', capture_output=True)

    def fields(self, result):
        self.assertEqual(result.returncode, 0, result.stderr)
        return dict(line.split('\t', 1) for line in result.stdout.splitlines())

    def test_no_implicit_cap_and_read_only(self):
        p = CASE / 'draft.en.txt'
        before = p.read_bytes()
        data = self.fields(self.cli(p))
        self.assertEqual(data['words'], '18')
        self.assertEqual(data['limit'], 'not_set')
        self.assertEqual(data['over_limit'], 'not_evaluated')
        self.assertEqual(data['remaining_to_max'], 'not_evaluated')
        self.assertEqual(p.read_bytes(), before)

    def test_explicit_limit(self):
        for limit, over, remaining in [(17, '1', '0'), (18, '0', '0'), (30, '0', '12')]:
            with self.subTest(limit=limit):
                data = self.fields(self.cli(CASE/'draft.en.txt', '--limit', limit, '--basis', 'full'))
                self.assertEqual(data['over_limit'], over)
                self.assertEqual(data['remaining_to_max'], remaining)

    def test_stdin_and_citation_basis(self):
        text = 'Results may improve (Example, 2024).'
        for basis, over in [('full', '2'), ('without_cite', '0')]:
            with self.subTest(basis=basis):
                data = self.fields(self.cli('--limit', 3, '--basis', basis, text=text))
                self.assertEqual(data['words'], '5')
                self.assertEqual(data['words_without_cite_parens'], '3')
                self.assertEqual(data['over_limit'], over)

    def test_known_year_parentheses_limitation(self):
        data = self.fields(self.cli(text='Data (collected in 2024) were used.'))
        self.assertEqual(data['words'], '6')
        self.assertEqual(data['words_without_cite_parens'], '3')
        self.assertEqual(data['year_parentheses_groups'], '1')
        self.assertIn('non-citations', data['heuristic_note'])

    def test_token_conventions(self):
        self.assertEqual(wc.tokenize("risk-based can't can’t A—B C–D non‑breaking"),
                         ['risk-based', "can't", 'can’t', 'A', 'B', 'C', 'D', 'non-breaking'])
        self.assertEqual(wc.tokenize('2.5 中文'), ['2', '5'])

    def test_invalid_options(self):
        for options in [('--limit','30'), ('--limit','0','--basis','full'),
                        ('--limit','-1','--basis','full'), ('--limit','bad'),
                        ('--basis','unknown')]:
            with self.subTest(options=options):
                result=self.cli(*options,text='A test.')
                self.assertEqual(result.returncode, 2)
                self.assertIn('error:',result.stderr)
                self.assertNotIn('Traceback', result.stderr)

    def test_missing_file(self):
        with tempfile.TemporaryDirectory() as d:
            result=self.cli(Path(d)/'missing.txt')
            self.assertEqual(result.returncode, 2)
            self.assertIn('cannot read UTF-8',result.stderr)

    def test_invalid_encoding_and_bom_path(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'with spaces.txt'
            p.write_bytes(b'\xff\xfe\x00')
            result=self.cli(p)
            self.assertEqual(result.returncode, 2)
            self.assertNotIn('Traceback', result.stderr)
            p.write_text('A test.\n',encoding='utf-8-sig')
            self.assertEqual(self.fields(self.cli(p))['words'],'2')

    def test_empty_input(self):
        self.assertEqual(self.fields(self.cli(text=''))['words'],'0')

    def test_help(self):
        result=self.cli('--help')
        self.assertEqual(result.returncode,0)
        self.assertIn('no default cap',result.stdout)


class SyntheticFixtureTests(unittest.TestCase):
    def test_selected_span_and_source_binding(self):
        before=(CASE/'draft.en.txt').read_bytes()
        after=(CASE/'expected.en.txt').read_bytes()
        selection=json.loads((CASE/'selection.json').read_text())
        self.assertEqual(hashlib.sha256(before).hexdigest(),selection['input_sha256'])
        self.assertEqual(selection['selected_ids'],['P1-01'])
        self.assertEqual(before.count(b'always improves'),1)
        start=before.index(b'always improves')
        # Verify both unchanged sides, not just the presence of a desired phrase.
        self.assertEqual(after, before[:start]+b'may improve'+before[start+len(b'always improves'):])
        self.assertIn(b'The estimate is certain.',after)
        self.assertIn(b'This finding are useful.',after)
        self.assertEqual(wc.count_text(before.decode())['words'],18)
        self.assertEqual(wc.count_text(after.decode())['words'],18)


if __name__ == '__main__':
    unittest.main()
