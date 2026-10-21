"""Real filesystem/process transactions with a deterministic local curl fixture.

The driver changes only production paths/user to temporary fixtures. No SSH,
network request, Caddy reload, or live directory is used by these tests.
"""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest


SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("production_packager", SCRIPTS / "package-release.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)
OLD = "a" * 40 + "-101-1"
NEW = "b" * 40 + "-102-1"
THIRD = "c" * 40 + "-103-1"
LEGACY = "prod-20261018T145910Z-8c7625cbd433"

FAKE_CURL = r'''
import json, os, sys, time
from pathlib import Path
from urllib.parse import urlsplit, unquote
args = sys.argv[1:]
url = urlsplit(args[-1])
def option(name):
    return args[args.index(name) + 1]
assert args[0] == '--disable'
assert url.hostname == 'zolotoy.dev' and url.scheme == 'https'
assert '-k' not in args and '--insecure' not in args
assert option('--noproxy') == '*'
assert option('--proto') == '=https' and '--tlsv1.2' in args
assert option('--resolve') == 'zolotoy.dev:443:127.0.0.1'
root = Path(os.environ['FIXTURE_ROOT'])
current = root / 'current'
active = current.resolve().parent.name if current.is_symlink() else ''
path = unquote(url.path)
with (root / 'curl.jsonl').open('a') as trace:
    trace.write(json.dumps({'path': path, 'active': active}) + '\n')
if active == os.environ.get('PAUSE_RELEASE') and path == '/_release':
    (root / 'paused').touch()
    time.sleep(20)
if active == os.environ.get('FAIL_RELEASE') and path == os.environ.get('FAIL_PATH', '/'):
    raise SystemExit(22)
if path == '/_health':
    body = b'ok'
elif path == '/_release':
    body = (current / 'release-id.txt').read_bytes()
    if active == os.environ.get('WRONG_ID_RELEASE'):
        body = b'wrong-release\n'
else:
    if path == '/demo/orders/':
        path = '/demo/'
    relative = path.lstrip('/') + 'index.html' if path.endswith('/') else path.lstrip('/')
    file = current / relative
    if not file.is_file():
        raise SystemExit(22)
    body = file.read_bytes()
sys.stdout.buffer.write(body + b'\n200')
'''


class ProductionTransactions(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="selectel-production-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.releases = self.root / "releases"
        self.releases.mkdir()
        self.dist = self.root / "dist"
        self.dist.mkdir()
        for name in packager.REQUIRED_FILES | {"assets/app-123.js", "assets/app-123.css", ".vite/manifest.json"}:
            path = self.dist / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('<!doctype html><html><script src="/assets/app-123.js"></script>'
                            '<link rel="stylesheet" href="/assets/app-123.css"><div id="app"></div></html>')
        (self.dist / "assets/app-123.js").write_text("console.log('fixture');\n")
        (self.dist / "assets/app-123.css").write_text("body { color: black; }\n")
        (self.dist / "demo/mockServiceWorker.js").write_text("/* Mock Service Worker */\n")
        (self.dist / ".vite/manifest.json").write_text("{}\n")
        binary = self.root / "bin"
        binary.mkdir()
        curl = binary / "curl"
        curl.write_text(f"#!{sys.executable}\n" + FAKE_CURL)
        curl.chmod(0o755)
        self.driver = self.root / "driver.py"
        self.driver.write_text(
            "import importlib.util, os, pathlib, pwd, signal, sys\n"
            f"spec = importlib.util.spec_from_file_location('remote', {str(SCRIPTS / 'production-remote.py')!r})\n"
            "remote = importlib.util.module_from_spec(spec)\n"
            "spec.loader.exec_module(remote)\n"
            "remote.ROOT = pathlib.Path(os.environ['FIXTURE_ROOT'])\n"
            "remote.RELEASES = remote.ROOT / 'releases'\n"
            "remote.USER = pwd.getpwuid(os.geteuid()).pw_name\n"
            "os.umask(0o077)\n"
            "original_switch = remote.switch\n"
            "def interrupt_switch(target):\n"
            "    original_switch(target)\n"
            "    if target.parent.name == os.environ.get('INTERRUPT_AFTER_SWITCH'):\n"
            "        os.kill(os.getpid(), signal.SIGTERM)\n"
            "remote.switch = interrupt_switch\n"
            "try:\n"
            "    getattr(remote, sys.argv[1])(*sys.argv[2:])\n"
            "except Exception as exc:\n"
            "    print(str(exc), file=sys.stderr)\n"
            "    sys.exit(1)\n"
        )
        self.env = {**os.environ, "PATH": str(binary) + os.pathsep + os.environ["PATH"],
                    "FIXTURE_ROOT": str(self.root)}

    def run_remote(self, *args, env=None):
        return subprocess.run([sys.executable, "-B", str(self.driver), *args],
                              env=env or self.env, capture_output=True, text=True, timeout=30)

    def prepare(self, release):
        result = self.run_remote("prepare", release)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        bundle = self.releases / (".incoming-" + release) / "release.tar.gz"
        packager.package(self.dist, bundle, release)
        return bundle

    def apply_args(self, release, bundle):
        return ["apply", release, hashlib.sha256(bundle.read_bytes()).hexdigest()]

    def publish(self, release, *, env=None):
        bundle = self.prepare(release)
        return self.run_remote(*self.apply_args(release, bundle), env=env)

    def assert_active(self, release):
        self.assertEqual((self.root / "current").resolve(), self.releases / release / "site")
        self.assertEqual((self.root / "current/release-id.txt").read_text(), release + "\n")

    def assert_success(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_success_checks_identity_health_deep_route_and_entry_assets(self):
        self.assert_success(self.publish(OLD))
        self.assert_active(OLD)
        paths = [json.loads(line)["path"] for line in (self.root / "curl.jsonl").read_text().splitlines()]
        for path in ("/_health", "/_release", "/demo/orders/", "/assets/app-123.js",
                     "/assets/app-123.css", "/demo/mockServiceWorker.js"):
            self.assertIn(path, paths)
        self.assertEqual(paths.count("/_release"), 2)
        self.assertFalse((self.releases / (".incoming-" + OLD)).exists())

    def test_restrictive_umask_does_not_make_nested_pages_private(self):
        self.assert_success(self.publish(OLD))
        release = self.releases / OLD
        for path in [release, *release.rglob("*")]:
            self.assertEqual(path.stat().st_mode & 0o777, 0o755 if path.is_dir() else 0o644, str(path))

    def test_failed_upgrade_and_failed_first_activation_restore_previous_state(self):
        self.assert_success(self.publish(OLD))
        result = self.publish(NEW, env={**self.env, "FAIL_RELEASE": NEW, "FAIL_PATH": "/assets/app-123.js"})
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(OLD)
        self.assertTrue((self.releases / NEW).is_dir())
        (self.root / "current").unlink()
        result = self.publish(THIRD, env={**self.env, "WRONG_ID_RELEASE": THIRD})
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "current").is_symlink())

    def test_missing_referenced_js_rolls_back_despite_valid_manifest(self):
        self.assert_success(self.publish(OLD))
        (self.dist / "assets/app-123.js").unlink()
        result = self.publish(NEW)
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(OLD)

    def test_signal_immediately_after_atomic_switch_restores_previous(self):
        self.assert_success(self.publish(OLD))
        result = self.publish(NEW, env={**self.env, "INTERRUPT_AFTER_SWITCH": NEW})
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(OLD)

    def test_manual_rollback_checks_stored_integrity_and_recovers_on_smoke_failure(self):
        self.assert_success(self.publish(OLD))
        self.assert_success(self.publish(NEW))
        result = self.run_remote("rollback", OLD, env={**self.env, "FAIL_RELEASE": OLD})
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(NEW)
        self.assert_success(self.run_remote("rollback", OLD))
        self.assert_active(OLD)
        (self.releases / NEW / "site/index.html").write_text("tampered")
        result = self.run_remote("rollback", NEW)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("checksum mismatch", result.stderr)
        self.assert_active(OLD)

    def install_legacy(self):
        site = self.releases / LEGACY / "site"
        shutil.copytree(self.dist, site)
        (site / "release-id.txt").write_text(LEGACY + "\n")
        manifest = {"environment": "selectel-production", "mode": "mock", "release_id": LEGACY,
                    "source_commit": "8c7625cbd433b18802d0ba95006ae2878a7d63cd",
                    "files": {path.relative_to(site).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                              for path in site.rglob("*") if path.is_file()}}
        (site.parent / "manifest.json").write_text(json.dumps(manifest))
        (self.root / "current").symlink_to(site.relative_to(self.root))

    def test_legacy_baseline_auto_and_manual_rollback_validate_production_manifest(self):
        self.install_legacy()
        result = self.publish(OLD, env={**self.env, "FAIL_RELEASE": OLD})
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(LEGACY)
        self.assert_success(self.publish(NEW))
        self.assert_success(self.run_remote("rollback", LEGACY))
        self.assert_active(LEGACY)
        manifest_path = self.releases / LEGACY / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["environment"] = "staging"
        manifest_path.write_text(json.dumps(manifest))
        self.assert_success(self.run_remote("rollback", NEW))
        result = self.run_remote("rollback", LEGACY)
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(NEW)

    def rewrite_bundle(self, bundle, *, replacement=None, extra=None):
        with tarfile.open(bundle, "r:gz") as archive:
            entries = [(member, archive.extractfile(member).read()) for member in archive]
        with tarfile.open(bundle, "w:gz") as archive:
            for member, body in entries:
                if replacement and member.name == replacement[0]:
                    body = replacement[1]
                    member.size = len(body)
                archive.addfile(member, io.BytesIO(body))
            if extra:
                archive.addfile(extra, io.BytesIO(b""))

    def test_archive_and_file_hash_failures_do_not_switch(self):
        bundle = self.prepare(OLD)
        args = self.apply_args(OLD, bundle)
        bundle.write_bytes(bundle.read_bytes() + b"corruption")
        result = self.run_remote(*args)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Archive SHA-256 mismatch", result.stderr)
        bundle = self.prepare(NEW)
        self.rewrite_bundle(bundle, replacement=("site/index.html", b"wrong bytes"))
        result = self.run_remote(*self.apply_args(NEW, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("checksum mismatch", result.stderr)
        self.assertFalse((self.root / "current").exists())
        self.assertFalse((self.releases / NEW).exists())

    def test_traversal_symlinks_and_duplicate_tar_entries_are_rejected(self):
        for release, kind in ((OLD, "traversal"), (NEW, "symlink"), (THIRD, "duplicate")):
            with self.subTest(kind=kind):
                bundle = self.prepare(release)
                member = tarfile.TarInfo({"traversal": "site/../../escaped", "symlink": "site/link",
                                         "duplicate": "site/index.html"}[kind])
                if kind == "symlink":
                    member.type, member.linkname = tarfile.SYMTYPE, "../../escaped"
                self.rewrite_bundle(bundle, extra=member)
                result = self.run_remote(*self.apply_args(release, bundle))
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.releases / release).exists())
                self.assertFalse((self.root / "escaped").exists())

    def test_immutable_release_and_unsafe_current_or_lock_are_rejected(self):
        self.assert_success(self.publish(OLD))
        self.assertNotEqual(self.run_remote("prepare", OLD).returncode, 0)
        (self.root / "current").unlink()
        outside = self.root / "other-site/site"
        outside.mkdir(parents=True)
        (self.root / "current").symlink_to(outside)
        self.assertNotEqual(self.run_remote("prepare", NEW).returncode, 0)
        (self.root / "current").unlink()
        lock = self.releases / ".deploy-production.lock"
        lock.unlink()
        lock.symlink_to(self.root / "outside-lock")
        bundle = self.prepare(NEW)
        self.assertNotEqual(self.run_remote(*self.apply_args(NEW, bundle)).returncode, 0)
        self.assertFalse((self.root / "outside-lock").exists())

    def start_paused(self, release):
        bundle = self.prepare(release)
        process = subprocess.Popen([sys.executable, "-B", str(self.driver), *self.apply_args(release, bundle)],
                                   env={**self.env, "PAUSE_RELEASE": release},
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                   start_new_session=True)
        self.addCleanup(lambda: process.poll() is None and os.killpg(process.pid, signal.SIGKILL))
        deadline = time.monotonic() + 10
        while not (self.root / "paused").exists() and time.monotonic() < deadline:
            if process.poll() is not None:
                self.fail("Deployment exited before smoke: " + str(process.communicate()))
            time.sleep(0.02)
        self.assertTrue((self.root / "paused").exists(), "Deployment never reached smoke")
        return process

    def test_hup_disconnect_restores_first_activation(self):
        process = self.start_paused(OLD)
        self.assert_active(OLD)
        process.send_signal(signal.SIGHUP)
        output, error = process.communicate(timeout=10)
        self.assertNotEqual(process.returncode, 0, output + error)
        self.assertFalse((self.root / "current").is_symlink())

    def test_concurrent_transaction_is_rejected_and_term_restores_previous(self):
        self.assert_success(self.publish(OLD))
        process = self.start_paused(NEW)
        self.assert_active(NEW)
        bundle = self.prepare(THIRD)
        result = self.run_remote(*self.apply_args(THIRD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Another production transaction", result.stderr)
        self.assertFalse((self.releases / THIRD).exists())
        process.send_signal(signal.SIGTERM)
        output, error = process.communicate(timeout=10)
        self.assertNotEqual(process.returncode, 0, output + error)
        self.assert_active(OLD)


if __name__ == "__main__":
    unittest.main()
