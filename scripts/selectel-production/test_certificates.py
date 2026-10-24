"""Real OpenSSL certificate checks with isolated files and a fake Caddy command."""

import hashlib
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("install-certificate.sh").resolve()


class CertificateInstallation(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="zolotoy-certificate-test-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.acme = self.root / "acme"
        self.certificates = self.acme / "certificates"
        self.certificates.mkdir(parents=True)
        self.tls = self.root / "tls"
        self.binary = self.root / "bin"
        self.binary.mkdir()
        self.ca = self.root / "ca.pem"
        self.ca_key = self.root / "ca.key"
        self.openssl("req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1",
                     "-nodes", "-days", "365", "-subj", "/CN=Local test CA",
                     "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign",
                     "-keyout", str(self.ca_key), "-out", str(self.ca))
        self.write_executable("flock", "import fcntl,sys\nfcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX | fcntl.LOCK_NB)\n")
        self.write_executable("sha256sum", "import hashlib,sys\nprint(hashlib.sha256(sys.stdin.buffer.read()).hexdigest() + '  -')\n")
        self.write_executable("timeout", "import os,sys\nos.execvp(sys.argv[4], sys.argv[4:])\n")
        self.write_executable("caddy", r'''
import os
from pathlib import Path
import sys
root = Path(os.environ['CERT_TEST_ROOT'])
operation = sys.argv[1]
assert operation in ('validate', 'reload')
assert '--config' in sys.argv and '--adapter' in sys.argv
if operation == 'reload':
    assert '--force' in sys.argv
with (root / 'calls').open('a') as calls:
    calls.write(operation + '\n')
marker = root / ('fail-' + operation)
if marker.exists():
    marker.unlink()
    raise SystemExit(1)
if operation == 'reload':
    (root / 'served').write_text(os.readlink(root / 'tls/current'))
''')
        self.driver = self.root / "driver.sh"
        self.driver.write_text(
            f"source {shlex.quote(str(SCRIPT))}\n"
            f"ACME_ROOT={shlex.quote(str(self.acme))}\n"
            f"TLS_ROOT={shlex.quote(str(self.tls))}\n"
            f"CADDY_BIN={shlex.quote(str(self.binary / 'caddy'))}\n"
            'TLS_OWNER=$(id -un)\nTLS_GROUP=$(id -gn)\n'
            'require_root() { :; }\n'
            f"served_fingerprint() {{ cat {shlex.quote(str(self.root / 'served'))}; }}\n"
            'main "$@"\n'
        )
        self.env = {**os.environ, "PATH": str(self.binary) + os.pathsep + os.environ["PATH"],
                    "SSL_CERT_FILE": str(self.ca), "CERT_TEST_ROOT": str(self.root)}

    def openssl(self, *args):
        return subprocess.run(["openssl", *args], check=True, capture_output=True).stdout

    def write_executable(self, name, code):
        file = self.binary / name
        file.write_text(f"#!{sys.executable}\n" + code)
        file.chmod(0o755)

    def issue(self, *, domain="zolotoy.dev", days=90):
        key = self.certificates / "zolotoy.dev.key"
        csr, leaf = self.root / "leaf.csr", self.root / "leaf.pem"
        self.openssl("req", "-new", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1",
                     "-nodes", "-subj", "/CN=" + domain, "-keyout", str(key), "-out", str(csr))
        extensions = self.root / "extensions"
        extensions.write_text(f"subjectAltName=DNS:{domain}\nbasicConstraints=critical,CA:FALSE\nextendedKeyUsage=serverAuth\nkeyUsage=critical,digitalSignature\n")
        self.openssl("x509", "-req", "-in", str(csr), "-CA", str(self.ca), "-CAkey", str(self.ca_key),
                     "-CAcreateserial", "-days", str(days), "-extfile", str(extensions), "-out", str(leaf))
        (self.certificates / "zolotoy.dev.crt").write_bytes(leaf.read_bytes() + self.ca.read_bytes())
        return hashlib.sha256(self.openssl("x509", "-in", str(leaf), "-outform", "DER")).hexdigest()

    def install(self, *args):
        return subprocess.run(["bash", str(self.driver), *args], env=self.env, capture_output=True, text=True)

    def bootstrap(self):
        fingerprint = self.issue()
        result = self.install("--no-reload")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        (self.root / "served").write_text(fingerprint)
        return fingerprint

    def test_initial_install_and_idempotency_keep_private_permissions(self):
        fingerprint = self.bootstrap()
        self.assertEqual(os.readlink(self.tls / "current"), fingerprint)
        self.assertEqual((self.tls / fingerprint).stat().st_mode & 0o777, 0o750)
        self.assertEqual((self.tls / fingerprint / "privkey.pem").stat().st_mode & 0o777, 0o640)
        self.assertFalse((self.root / "calls").exists())
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / "calls").exists(), "Unchanged certificate must not reload Caddy")

    def test_successful_rotation_forces_reload_and_preserves_old_version(self):
        previous = self.bootstrap()
        current = self.issue()
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(os.readlink(self.tls / "current"), current)
        self.assertEqual((self.root / "served").read_text(), current)
        self.assertTrue((self.tls / previous / "privkey.pem").exists())
        self.assertEqual((self.root / "calls").read_text().splitlines(), ["validate", "reload"])

    def test_reload_failure_restores_previous_link_and_certificate(self):
        previous = self.bootstrap()
        self.issue()
        (self.root / "fail-reload").touch()
        result = self.install()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(os.readlink(self.tls / "current"), previous)
        self.assertEqual((self.root / "served").read_text(), previous)
        self.assertEqual((self.root / "calls").read_text().splitlines(), ["validate", "reload", "validate", "reload"])

    def test_invalid_san_and_expiry_do_not_touch_active_certificate(self):
        previous = self.bootstrap()
        for kwargs, message in (({"domain": "other.example"}, "SAN"), ({"days": 1}, "expires")):
            with self.subTest(kwargs=kwargs):
                self.issue(**kwargs)
                result = self.install()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)
                self.assertEqual(os.readlink(self.tls / "current"), previous)
        self.assertFalse((self.root / "calls").exists())

    def test_key_mismatch_and_config_failure_preserve_active_version(self):
        previous = self.bootstrap()
        previous_key = (self.tls / previous / "privkey.pem").read_bytes()
        self.issue()
        (self.certificates / "zolotoy.dev.key").write_bytes(previous_key)
        result = self.install()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("do not match", result.stderr)
        self.assertEqual(os.readlink(self.tls / "current"), previous)
        self.issue()
        (self.root / "fail-validate").touch()
        result = self.install()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(os.readlink(self.tls / "current"), previous)
        self.assertEqual((self.root / "calls").read_text().splitlines(), ["validate"])


if __name__ == "__main__":
    unittest.main()
