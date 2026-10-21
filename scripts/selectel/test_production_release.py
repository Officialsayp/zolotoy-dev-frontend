"""Safe, offline unit tests for dedicated production deploy primitives."""
import importlib.util
from pathlib import Path
import unittest

module_file = Path(__file__).with_name("production-remote.py")
spec = importlib.util.spec_from_file_location("production_remote", module_file)
remote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(remote)


class ProductionSafetyTests(unittest.TestCase):
    def test_valid_release(self):
        expected = "a" * 40 + "-321-1"
        self.assertEqual(remote.valid_id(expected), expected)
        for invalid in ("../../tmp", "prod-20261018", "a" * 40, "A" * 40 + "-1-1"):
            with self.subTest(invalid=invalid), self.assertRaises(RuntimeError):
                remote.valid_id(invalid)

    def test_safe_archive_members(self):
        for name in ("site/index.html", "site/ru/index.html", "site/.vite/manifest.json",
                     "manifest.json", "smoke.py"):
            with self.subTest(name=name):
                self.assertTrue(remote.safe_member(name))
        for name in ("../etc/passwd", "/site/index.html", "site/../secrets",
                     "site/.ssh/authorized_keys", "site/foo\\bar",
                     "site/./index.html", "site/a//b", "arbitrary.txt"):
            with self.subTest(name=name):
                self.assertFalse(remote.safe_member(name))

    def test_production_isolation(self):
        releases = Path("/var/www/zolotoy-dev-production/releases")
        self.assertTrue(remote.inside(releases / "legacy-prod" / "site", releases))
        self.assertFalse(remote.inside(Path("/var/www/maxzolotoy/releases/123/site"), releases))
        self.assertFalse(remote.inside(Path("/var/www/zolotoy-dev/releases/123/site"), releases))
        self.assertFalse(remote.inside(releases / "bad-parent", releases))


if __name__ == "__main__":
    unittest.main()
