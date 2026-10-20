"""Offline API-contract tests. Replies are fixtures, not DeepSeek quality evidence."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "translate_bridge.py"
spec = importlib.util.spec_from_file_location("deepseek_bridge_under_test", SCRIPT)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def response(content="结果可能改善，但未证明因果。", finish="stop"):
    return io.StringIO(json.dumps({"model": "fixture-model",
        "choices": [{"finish_reason": finish, "message": {"content": content}}]}))


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"DEEPSEEK_API_KEY": "synthetic-test-key"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_request_and_provenance(self):
        source = "Results may improve, but do not prove causation."
        with patch.object(bridge, "build_opener") as factory:
            factory.return_value.open.return_value = response()
            text, meta = bridge.deepseek_chinese(source, "deepseek-v4-pro", True)
            req = factory.return_value.open.call_args.args[0]
            payload = json.loads(req.data)
            self.assertEqual(req.full_url, bridge.ENDPOINT)
            self.assertEqual(payload["messages"][1]["content"], source)
            self.assertEqual(payload["messages"][0]["content"], bridge.read_input(bridge.PROMPT_PATH))
            self.assertFalse(meta["semantic_fidelity_verified"])
            self.assertEqual(meta["returned_model"], "fixture-model")
            self.assertEqual(meta["translation_sha256"], bridge.sha256(text))
            self.assertNotIn("synthetic-test-key", json.dumps(meta))

    def test_no_consent_no_network(self):
        with patch.object(bridge, "build_opener") as network:
            with self.assertRaisesRegex(RuntimeError, "allow-cloud"):
                bridge.deepseek_chinese("Example.", "deepseek-v4-pro", False)
            network.assert_not_called()

    def test_missing_key_no_network(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}), patch.object(bridge, "build_opener") as network:
            with self.assertRaisesRegex(RuntimeError, "not set"):
                bridge.deepseek_chinese("Example.", "deepseek-v4-pro", True)
            network.assert_not_called()

    def test_long_input_not_truncated(self):
        with patch.object(bridge, "build_opener") as network:
            with self.assertRaisesRegex(ValueError, "12000"):
                bridge.deepseek_chinese("x" * 12001, "deepseek-v4-pro", True)
            network.assert_not_called()

    def test_bad_finish_rejected(self):
        for finish in ("length", "content_filter", None):
            with self.subTest(finish=finish), patch.object(bridge, "build_opener") as factory:
                factory.return_value.open.return_value = response(finish=finish)
                with self.assertRaisesRegex(RuntimeError, "finish normally"):
                    bridge.deepseek_chinese("Example.", "deepseek-v4-pro", True)

    def test_empty_reply_rejected(self):
        with patch.object(bridge, "build_opener") as factory:
            factory.return_value.open.return_value = response(content=" ")
            with self.assertRaisesRegex(RuntimeError, "no translated"):
                bridge.deepseek_chinese("Example.", "deepseek-v4-pro", True)

    def test_http_error_does_not_leak_response(self):
        with patch.object(bridge, "build_opener") as factory:
            factory.return_value.open.side_effect = HTTPError(bridge.ENDPOINT, 401, "private body", {}, None)
            with self.assertRaisesRegex(RuntimeError, "^DeepSeek API returned HTTP 401$"):
                bridge.deepseek_chinese("Example.", "deepseek-v4-pro", True)

    def test_redirect_refused(self):
        with self.assertRaisesRegex(RuntimeError, "redirect refused"):
            bridge.NoRedirect().redirect_request(None, None, 307, "", {}, "https://example.invalid")

    def test_existing_output_prevents_network(self):
        with tempfile.TemporaryDirectory() as temp:
            src, out = Path(temp)/"src.txt", Path(temp)/"out.txt"
            src.write_text("Example."); out.write_text("Keep me")
            argv = ["bridge", "deepseek-zh", "--input", str(src), "--output", str(out), "--allow-cloud"]
            with patch.object(sys, "argv", argv), patch.object(bridge, "build_opener") as network, contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(bridge.main(), 1)
                network.assert_not_called()
            self.assertEqual(out.read_text(), "Keep me")

    def test_cli_saves_separate_files(self):
        with tempfile.TemporaryDirectory() as temp:
            src, out = Path(temp)/"src.txt", Path(temp)/"out.txt"
            original = b"Results may improve.\r\n"
            src.write_bytes(original)
            argv = ["bridge", "v4-zh", "--input", str(src), "--output", str(out), "--allow-cloud", "--model", "deepseek-flash"]
            with patch.object(sys, "argv", argv), patch.object(bridge, "build_opener") as factory, contextlib.redirect_stdout(io.StringIO()):
                factory.return_value.open.return_value = response()
                self.assertEqual(bridge.main(), 0)
            self.assertEqual(src.read_bytes(), original)
            meta = json.loads(out.with_name(out.name+".metadata.json").read_text())
            self.assertEqual(meta["requested_model"], "deepseek-flash")
            self.assertEqual(meta["returned_model"], "fixture-model")
            self.assertEqual(out.read_text(), "结果可能改善，但未证明因果。")
            self.assertEqual(meta["source_sha256"], bridge.sha256(original.decode("utf-8")))

    def test_existing_metadata_prevents_network(self):
        with tempfile.TemporaryDirectory() as temp:
            src, out = Path(temp)/"src.txt", Path(temp)/"out.txt"
            src.write_text("Example.")
            out.with_name(out.name+".metadata.json").write_text("{}")
            argv = ["bridge", "deepseek-zh", "--input", str(src), "--output", str(out), "--allow-cloud"]
            with patch.object(sys, "argv", argv), patch.object(bridge, "build_opener") as network, contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(bridge.main(), 1)
                network.assert_not_called()

    def test_same_source_output_prevents_network(self):
        with tempfile.TemporaryDirectory() as temp:
            src=Path(temp)/"src.txt"; src.write_text("Example.")
            argv = ["bridge", "deepseek-zh", "--input", str(src), "--output", str(src), "--allow-cloud"]
            with patch.object(sys, "argv", argv), patch.object(bridge, "build_opener") as network, contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(bridge.main(), 1)
                network.assert_not_called()


if __name__ == "__main__":
    unittest.main()
