import json
import tempfile
import unittest
from pathlib import Path

from health_report import PAGES, inspect, markdown


class ReportTests(unittest.TestCase):
    def make_root(self, missing=None):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        for rel in PAGES.values():
            if rel == missing:
                continue
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('<!DOCTYPE html><html lang="ko"><title>울모아</title></html>', encoding="utf-8")
        return tmp, root

    def test_complete_structure(self):
        tmp, root = self.make_root()
        with tmp:
            result = inspect(root, "https://example.com", "test/repo")
            self.assertEqual(result["counts"], {"PASS": 5, "WARN": 0, "FAIL": 0})

    def test_missing_file_fails(self):
        tmp, root = self.make_root("boomwhacker/index.html")
        with tmp:
            result = inspect(root, "https://example.com", "test/repo")
            self.assertEqual(result["counts"]["FAIL"], 1)
            self.assertIn("FAIL", markdown(result))

    def test_recent_qa_is_not_claimed_if_absent(self):
        tmp, root = self.make_root()
        def get(url, token=None, max_bytes=None):
            data = {"workflow_runs": [{"name": "pages build and deployment", "status": "completed", "conclusion": "success", "head_sha": "abcdef", "created_at": "now", "html_url": "https://example.com/runs/1"}]}
            return 200, json.dumps(data).encode()
        with tmp:
            report = inspect(root, "https://example.com", "test/repo", github=True, getter=get)
            self.assertEqual(report["counts"]["WARN"], 3)
            self.assertEqual(report["counts"]["FAIL"], 0)

    def test_live_failure_is_not_a_pass(self):
        tmp, root = self.make_root()
        def get(url, token=None, max_bytes=None):
            return 404, b"not found"
        with tmp:
            report = inspect(root, "https://example.com", "test/repo", live=True, getter=get)
            self.assertEqual(report["counts"]["FAIL"], 5)

if __name__ == "__main__":
    unittest.main()
