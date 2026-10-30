"""Exercise the real deploy transaction against local files and a fake HTTP origin.

No SSH connection, web-server reload, or remote write is performed. The shell script is
sourced with fixture paths; production's direct entry point uses fixed paths.
"""

import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest


SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("package_release", SCRIPTS / "package-release.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)
OLD = "a" * 40 + "-101-1"
NEW = "b" * 40 + "-102-1"
THIRD = "c" * 40 + "-103-1"

FAKE_CURL = r'''
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit
args = sys.argv[1:]
def option(name):
    return args[args.index(name) + 1]
url = urlsplit(args[-1])
assert url.hostname == 'origin.zolotoy.dev'
assert '-k' not in args and '--insecure' not in args
assert option('--proto') == '=' + url.scheme
if url.scheme == 'https':
    assert '--tlsv1.2' in args
root = Path(os.environ['FIXTURE_ROOT'])
current = root / 'current'
active = os.readlink(current) if current.is_symlink() else ''
public = '--resolve' not in args
path = url.path
method = 'HEAD' if '--head' in args else option('--request') if '--request' in args else 'GET'
with Path(os.environ['CURL_TRACE']).open('a') as trace:
    trace.write(json.dumps({'path': path, 'active': active, 'public': public, 'method': method}) + '\n')
if active == os.environ.get('SMOKE_PAUSE_RELEASE') and path == '/_release':
    marker = Path(os.environ['PAUSE_MARKER'])
    if not marker.exists():
        marker.touch()
        time.sleep(10)
status = 200
body = b''
headers = {'X-Robots-Tag': 'noindex,nofollow', 'Content-Type': 'text/html; charset=utf-8'}
cache = 'public, max-age=0, must-revalidate'
query = ('?' + url.query) if url.query else ''
redirects = {
    '/demo': ('/demo/', 308),
    '/demo/index.html': ('/demo/', 308),
    '/orders/smoke-id': ('/demo/orders/smoke-id', 308),
    '/auth/login': ('/demo/auth/login', 308),
    '/architecture': ('/architecture/', 307),
    '/ru/services/order/index.html': ('/ru/services/order/', 307),
}
if url.scheme == 'http':
    status = 308
    headers['Location'] = 'https://' + url.netloc + path + query
elif path == '/_health':
    body = b'ok'
    headers['Cache-Control'] = 'no-store'
elif not active:
    status = 503
    headers['Cache-Control'] = 'no-store'
elif path == '/_release':
    body = (current / 'release-id.txt').read_bytes()
    headers['Cache-Control'] = 'no-store'
elif method == 'POST':
    status = 405
elif path in redirects:
    target, status = redirects[path]
    headers['Location'] = target + query
elif path in ('/demo/', '/demo/orders/', '/demo/orders/new', '/demo/orders/smoke-id', '/demo/auth/login', '/demo/notifications/events/smoke-id', '/demo/shortener/smoke-id'):
    body = (current / 'demo/index.html').read_bytes()
    headers['Cache-Control'] = cache
else:
    file = current / (path.lstrip('/') + 'index.html' if path.endswith('/') else path.lstrip('/'))
    if file.is_file():
        body = file.read_bytes()
        headers['Cache-Control'] = cache
        if path.endswith('.js'):
            headers['Content-Type'] = 'text/javascript; charset=utf-8'
    else:
        status = 404
if (active == os.environ.get('SMOKE_FAIL_RELEASE') and path == os.environ.get('SMOKE_FAIL_PATH', '/')
        and (not os.environ.get('SMOKE_FAIL_PUBLIC') or public)):
    status = 500
if active == os.environ.get('SMOKE_WRONG_ID') and path == '/_release':
    body = b'wrong-release\n'
if active == os.environ.get('SMOKE_MISSING_NOINDEX'):
    headers.pop('X-Robots-Tag')
Path(option('--dump-header')).write_text('HTTP/2 ' + str(status) + '\r\n' + ''.join(key + ': ' + value + '\r\n' for key, value in headers.items()) + '\r\n')
Path(option('--output')).write_bytes(b'' if method == 'HEAD' else body)
sys.stdout.write(str(status))
'''


class Transactions(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="selectel-transactions-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.releases = self.root / "releases"
        self.releases.mkdir()
        self.config = self.root / "reviewed.conf"
        self.config.write_text("fixture config\n")
        self.config_hash = hashlib.sha256(self.config.read_bytes()).hexdigest()
        self.router = self.root / "reviewed.js"
        self.router.write_text("fixture router\n")
        self.router_hash = hashlib.sha256(self.router.read_bytes()).hexdigest()
        self.dist = self.root / "dist"
        self.dist.mkdir()
        for name in packager.REQUIRED_FILES | {"assets/app-123.js", ".vite/manifest.json"}:
            file = self.dist / name
            file.parent.mkdir(parents=True, exist_ok=True)
            language = "ru" if name.startswith("ru/") else "en"
            file.write_text(f'<!doctype html><html lang="{language}"><script src="/assets/app-123.js"></script><div id="app"></div></html>')
        (self.dist / "demo/mockServiceWorker.js").write_text("/* Mock Service Worker */\n")
        (self.dist / "assets/app-123.js").write_text("console.log('mock fixture');\n")
        (self.dist / ".vite/manifest.json").write_text("{}\n")
        binary = self.root / "bin"
        binary.mkdir()
        self.write_executable(binary / "curl", FAKE_CURL)
        # Exercise an actual OS advisory lock even on macOS without GNU flock.
        self.write_executable(binary / "flock", "import fcntl,sys\ntry:\n fcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX | fcntl.LOCK_NB)\nexcept BlockingIOError:\n sys.exit(1)\n")
        self.write_executable(binary / "sha256sum", "import hashlib,pathlib,sys\np=pathlib.Path(sys.argv[1])\nprint(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + str(p))\n")
        self.write_executable(binary / "nginx", "import sys\nassert sys.argv[1:] == ['-v']\nprint('nginx version: nginx/1.28.0')\n")
        self.write_executable(binary / "systemctl", "import os,sys\nassert sys.argv[1:] == ['is-active', '--quiet', 'nginx']\nsys.exit(1 if os.environ.get('NGINX_INACTIVE') else 0)\n")
        self.driver = self.root / "driver.sh"
        self.driver.write_text(
            f"source {shlex.quote(str(SCRIPTS / 'remote.sh'))}\n"
            f"RELEASES_ROOT={shlex.quote(str(self.releases))}\n"
            f"NGINX_CONFIG={shlex.quote(str(self.config))}\n"
            f"NGINX_ROUTER={shlex.quote(str(self.router))}\n"
            f"CONFIG_OWNER_UID={os.getuid()}\n"
            'DEPLOY_USER=$(id -un)\n'
            'main "$@"\n'
        )
        self.env = {
            **os.environ,
            "PATH": str(binary) + os.pathsep + os.environ["PATH"],
            "FIXTURE_ROOT": str(self.releases),
            "CURL_TRACE": str(self.root / "curl.jsonl"),
            "PAUSE_MARKER": str(self.root / "paused"),
        }

    def write_executable(self, path, code):
        path.write_text(f"#!{sys.executable}\n" + code)
        path.chmod(0o755)

    def run_remote(self, *args, env=None):
        return subprocess.run(["bash", str(self.driver), *args], env=env or self.env, capture_output=True, text=True)

    def prepare(self, release_id):
        result = self.run_remote("prepare", release_id, "origin.zolotoy.dev")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        bundle = self.releases / (".incoming-" + release_id) / "release.tar.gz"
        packager.package(self.dist, bundle, release_id)
        return bundle

    def apply_args(self, release_id, bundle):
        return ["apply", release_id, "origin.zolotoy.dev", hashlib.sha256(bundle.read_bytes()).hexdigest(), self.config_hash, self.router_hash]

    def publish(self, release_id, *, env=None):
        bundle = self.prepare(release_id)
        result = self.run_remote(*self.apply_args(release_id, bundle), env=env)
        return result

    def assert_active(self, release_id):
        self.assertTrue((self.releases / "current").is_symlink())
        self.assertEqual(os.readlink(self.releases / "current"), release_id)
        self.assertEqual((self.releases / "current/release-id.txt").read_text(), release_id + "\n")

    def test_success_preserves_hidden_vite_metadata_and_checks_both_origins(self):
        result = self.publish(OLD)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assert_active(OLD)
        self.assertEqual((self.releases / "current/.vite/manifest.json").read_text(), "{}\n")
        self.assertFalse((self.releases / "current/manifest.json").exists())
        self.assertIn("loopback TLS", result.stdout)
        self.assertIn("public DNS/TLS", result.stdout)

    def test_failed_first_public_smoke_removes_current_and_checks_503(self):
        result = self.publish(NEW, env={**self.env, "SMOKE_FAIL_RELEASE": NEW, "SMOKE_FAIL_PUBLIC": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.releases / "current").is_symlink())
        self.assertTrue((self.releases / NEW).is_dir())
        trace = [json.loads(line) for line in (self.root / "curl.jsonl").read_text().splitlines()]
        self.assertTrue(any(item["path"] == "/" and item["active"] == "" for item in trace))

    def test_failed_upgrade_restores_previous_identity_and_retains_both_releases(self):
        self.assertEqual(self.publish(OLD).returncode, 0)
        result = self.publish(NEW, env={**self.env, "SMOKE_FAIL_RELEASE": NEW, "SMOKE_FAIL_PATH": "/services/auth/"})
        self.assertNotEqual(result.returncode, 0)
        self.assert_active(OLD)
        self.assertTrue((self.releases / NEW).is_dir())
        self.assertIn("restoring previous release", result.stderr)
        self.assertIn(OLD, result.stdout)

    def test_identity_mismatch_and_missing_noindex_fail_closed(self):
        for release_id, setting in ((OLD, "SMOKE_WRONG_ID"), (NEW, "SMOKE_MISSING_NOINDEX")):
            with self.subTest(setting=setting):
                result = self.publish(release_id, env={**self.env, setting: release_id})
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.releases / "current").is_symlink())

    def test_manual_rollback_checks_stored_hashes_and_smoke(self):
        self.assertEqual(self.publish(OLD).returncode, 0)
        self.assertEqual(self.publish(NEW).returncode, 0)
        result = self.run_remote("rollback", OLD, "origin.zolotoy.dev", self.config_hash, self.router_hash)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assert_active(OLD)
        (self.releases / NEW / "index.html").write_text("tampered")
        result = self.run_remote("rollback", NEW, "origin.zolotoy.dev", self.config_hash, self.router_hash)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("integrity mismatch", result.stderr)
        self.assert_active(OLD)

    def test_wrong_installed_config_stops_before_unpack_or_switch(self):
        bundle = self.prepare(OLD)
        self.config.write_text("different active-site file")
        result = self.run_remote(*self.apply_args(OLD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("differs from the reviewed", result.stderr)
        self.assertFalse((self.releases / OLD).exists())
        self.assertFalse((self.releases / "current").is_symlink())

    def test_wrong_router_stops_before_unpack(self):
        bundle = self.prepare(OLD)
        self.router.write_text("unreviewed routing change")
        result = self.run_remote(*self.apply_args(OLD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("differs from the reviewed", result.stderr)
        self.assertFalse((self.releases / OLD).exists())

    def test_writable_or_symlinked_routing_file_is_rejected(self):
        bundle = self.prepare(OLD)
        self.router.chmod(0o666)
        result = self.run_remote(*self.apply_args(OLD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unsafe Nginx", result.stderr)
        self.router.unlink()
        self.router.symlink_to(self.config)
        result = self.run_remote(*self.apply_args(OLD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unsafe Nginx", result.stderr)
        self.assertFalse((self.releases / OLD).exists())

    def test_inactive_nginx_stops_before_upload_preparation(self):
        result = self.run_remote("prepare", OLD, "origin.zolotoy.dev", env={**self.env, "NGINX_INACTIVE": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Nginx service must be active", result.stderr)
        self.assertFalse((self.releases / (".incoming-" + OLD)).exists())

    def test_bad_archive_checksum_stops_before_unpack(self):
        bundle = self.prepare(OLD)
        args = self.apply_args(OLD, bundle)
        bundle.write_bytes(bundle.read_bytes() + b"corruption")
        result = self.run_remote(*args)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("checksum mismatch", result.stderr)
        self.assertFalse((self.releases / OLD).exists())

    def rewrite_bundle(self, bundle, *, replacement=None, extra=None):
        with tarfile.open(bundle, "r:gz") as source:
            members = [(member, source.extractfile(member).read()) for member in source]
        bundle.unlink()
        with tarfile.open(bundle, "w:gz") as target:
            for member, data in members:
                if replacement and member.name == replacement[0]:
                    data = replacement[1]
                    member.size = len(data)
                target.addfile(member, io.BytesIO(data))
            if extra:
                target.addfile(*extra)

    def test_manifest_detects_changed_file_even_with_valid_archive_checksum(self):
        bundle = self.prepare(OLD)
        self.rewrite_bundle(bundle, replacement=("site/index.html", b"changed html"))
        result = self.run_remote(*self.apply_args(OLD, bundle))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("file checksum mismatch", result.stderr)
        self.assertFalse((self.releases / OLD).exists())

    def test_tar_traversal_and_symlinks_are_rejected(self):
        for release_id, link in ((OLD, False), (NEW, True)):
            with self.subTest(link=link):
                bundle = self.prepare(release_id)
                member = tarfile.TarInfo("site/../../escaped" if not link else "site/escape")
                if link:
                    member.type = tarfile.SYMTYPE
                    member.linkname = "../../escaped"
                self.rewrite_bundle(bundle, extra=(member, io.BytesIO(b"")))
                result = self.run_remote(*self.apply_args(release_id, bundle))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Unsafe", result.stderr)
                self.assertFalse((self.releases / release_id).exists())
                self.assertFalse((self.root / "escaped").exists())

    def test_immutable_release_and_unsafe_current_are_rejected(self):
        self.assertEqual(self.publish(OLD).returncode, 0)
        result = self.run_remote("prepare", OLD, "origin.zolotoy.dev")
        self.assertNotEqual(result.returncode, 0)
        (self.releases / "current").unlink()
        (self.releases / "current").mkdir()
        result = self.publish(NEW)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("current must be absent", result.stderr)
        self.assertTrue((self.releases / "current").is_dir())

    def test_production_origin_and_invalid_id_are_rejected_without_writes(self):
        for args in (("prepare", OLD, "zolotoy.dev"), ("prepare", "../../bad", "origin.zolotoy.dev")):
            result = self.run_remote(*args)
            self.assertNotEqual(result.returncode, 0)
        self.assertEqual(list(self.releases.iterdir()), [])

    def start_paused(self, release_id):
        bundle = self.prepare(release_id)
        process = subprocess.Popen(
            ["bash", str(self.driver), *self.apply_args(release_id, bundle)],
            env={**self.env, "SMOKE_PAUSE_RELEASE": release_id},
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True,
        )
        self.addCleanup(lambda: process.poll() is None and os.killpg(process.pid, signal.SIGKILL))
        deadline = time.monotonic() + 10
        while not (self.root / "paused").exists() and time.monotonic() < deadline:
            if process.poll() is not None:
                self.fail("Paused deployment exited early: " + str(process.communicate()))
            time.sleep(0.02)
        self.assertTrue((self.root / "paused").exists(), "Deployment did not reach smoke check")
        return process

    def test_hup_disconnect_rolls_back_first_activation(self):
        process = self.start_paused(OLD)
        self.assert_active(OLD)
        process.send_signal(signal.SIGHUP)
        output, error = process.communicate(timeout=10)
        self.assertNotEqual(process.returncode, 0, output + error)
        self.assertFalse((self.releases / "current").is_symlink())
        self.assertIn("restoring previous release", error)

    def test_lock_rejects_concurrency_and_term_restores_previous(self):
        self.assertEqual(self.publish(OLD).returncode, 0)
        process = self.start_paused(NEW)
        self.assert_active(NEW)
        bundle = self.prepare(THIRD)
        second = self.run_remote(*self.apply_args(THIRD, bundle))
        self.assertNotEqual(second.returncode, 0)
        self.assertIn("Another staging deployment", second.stderr)
        self.assertFalse((self.releases / THIRD).exists())
        os.killpg(process.pid, signal.SIGTERM)
        output, error = process.communicate(timeout=10)
        self.assertNotEqual(process.returncode, 0, output + error)
        self.assert_active(OLD)

    def test_packager_rejects_symlinks_and_unexpected_hidden_files(self):
        (self.dist / "leak").symlink_to(self.config)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            packager.package(self.dist, self.root / "bad.tar.gz", OLD)
        (self.dist / "leak").unlink()
        (self.dist / ".env").write_text("fake=secret")
        with self.assertRaisesRegex(ValueError, "Hidden"):
            packager.package(self.dist, self.root / "bad.tar.gz", OLD)

    def client_fixture(self):
        key = self.root / "fixture-key"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(key)], check=True)
        public_key = " ".join(key.with_suffix(".pub").read_text().split()[:2])
        runner = self.root / "runner"
        runner.mkdir()
        bundle = self.root / "upload.tar.gz"
        packager.package(self.dist, bundle, OLD)
        checker = r'''
import json,os,pathlib,sys
args = sys.argv[1:]
options = {args[index + 1].split('=', 1)[0]: args[index + 1].split('=', 1)[1]
           for index, arg in enumerate(args) if arg == '-o'}
for key, value in {
    'StrictHostKeyChecking': 'yes', 'HostKeyAlgorithms': 'ssh-ed25519',
    'IdentitiesOnly': 'yes', 'IdentityAgent': 'none', 'GlobalKnownHostsFile': '/dev/null',
    'BatchMode': 'yes', 'PasswordAuthentication': 'no', 'KbdInteractiveAuthentication': 'no',
}.items():
    assert options[key] == value, (key, options)
key = pathlib.Path(args[args.index('-i') + 1])
assert key.stat().st_mode & 0o077 == 0
known = pathlib.Path(options['UserKnownHostsFile'])
assert known.stat().st_mode & 0o077 == 0
assert known.read_text().startswith('135.106.186.27 ssh-ed25519 ')
with pathlib.Path(os.environ['SSH_TRACE']).open('a') as trace:
    trace.write(json.dumps({'command': pathlib.Path(sys.argv[0]).name, 'args': args}) + '\n')
if pathlib.Path(sys.argv[0]).name == 'ssh':
    source = sys.stdin.read()
    assert 'RELEASES_ROOT=/var/www/zolotoy-dev/releases' in source
    if os.environ.get('FAKE_SSH_FAIL'):
        raise SystemExit(255)
'''
        self.write_executable(self.root / "bin/ssh", checker)
        self.write_executable(self.root / "bin/scp", checker)
        env = {
            **self.env,
            "GITHUB_REF": "refs/heads/main", "GITHUB_EVENT_NAME": "workflow_dispatch",
            "VPS_HOST": "135.106.186.27", "VPS_USER": "zolotoydeploy",
            "VPS_ORIGIN_HOST": "origin.zolotoy.dev", "VPS_SSH_KEY": key.read_text(),
            "VPS_KNOWN_HOSTS": "135.106.186.27 " + public_key,
            "RUNNER_TEMP": str(runner), "SSH_TRACE": str(self.root / "ssh.jsonl"),
        }
        return bundle, env

    def run_client(self, bundle, env):
        return subprocess.run(["bash", str(SCRIPTS / "deploy.sh"), OLD, str(bundle)],
                              env=env, capture_output=True, text=True)

    def test_client_uses_verified_ssh_options_and_cleans_private_files(self):
        bundle, env = self.client_fixture()
        result = self.run_client(bundle, env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        trace = [json.loads(line) for line in (self.root / "ssh.jsonl").read_text().splitlines()]
        self.assertEqual([item["command"] for item in trace], ["ssh", "scp", "ssh"])
        self.assertIn("prepare " + OLD, trace[0]["args"][-1])
        self.assertIn("apply " + OLD, trace[2]["args"][-1])
        self.assertEqual(list((self.root / "runner").iterdir()), [])
        self.assertNotIn(env["VPS_SSH_KEY"], result.stdout + result.stderr)

    def test_client_rejects_unknown_host_before_connection(self):
        bundle, env = self.client_fixture()
        env["VPS_KNOWN_HOSTS"] = env["VPS_KNOWN_HOSTS"].replace("135.106.186.27", "192.0.2.1")
        result = self.run_client(bundle, env)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "ssh.jsonl").exists())
        self.assertEqual(list((self.root / "runner").iterdir()), [])

    def test_client_stops_before_upload_if_verified_ssh_fails(self):
        bundle, env = self.client_fixture()
        result = self.run_client(bundle, {**env, "FAKE_SSH_FAIL": "1"})
        self.assertNotEqual(result.returncode, 0)
        trace = [json.loads(line) for line in (self.root / "ssh.jsonl").read_text().splitlines()]
        self.assertEqual([item["command"] for item in trace], ["ssh"])
        self.assertEqual(list((self.root / "runner").iterdir()), [])

    def test_client_requires_manual_main_and_exact_staging_destination(self):
        bundle, env = self.client_fixture()
        for key, value in (("GITHUB_REF", "refs/heads/feature"), ("GITHUB_EVENT_NAME", "push"),
                           ("VPS_ORIGIN_HOST", "zolotoy.dev"), ("VPS_USER", "root")):
            with self.subTest(key=key):
                result = self.run_client(bundle, {**env, key: value})
                self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "ssh.jsonl").exists())
        self.assertEqual(list((self.root / "runner").iterdir()), [])


class RemoteEntrypoint(unittest.TestCase):
    def test_file_and_stdin_execution_reach_argument_validation(self):
        source = (SCRIPTS / "remote.sh").read_text()
        for transport, command, data in (
            ("file", ["bash", str(SCRIPTS / "remote.sh")], None),
            ("ssh-stdin", ["bash", "-s", "--"], source),
        ):
            with self.subTest(transport=transport):
                result = subprocess.run(command, input=data, capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 1)
                self.assertIn("Usage: remote.sh", result.stderr)
                self.assertNotIn("unbound variable", result.stderr)

    def test_stdin_execution_preserves_remote_arguments(self):
        result = subprocess.run(
            ["bash", "-s", "--", "prepare", "invalid-release", "origin.zolotoy.dev"],
            input=(SCRIPTS / "remote.sh").read_text(), capture_output=True, text=True, timeout=5,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("Invalid release id", result.stderr)
        self.assertNotIn("unbound variable", result.stderr)


if __name__ == "__main__":
    unittest.main()
