"""Verify HTTP-01 token readability without widening private ACME state access."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class RenewalPermissions(unittest.TestCase):
    def test_http_token_readable_but_private_state_and_parent_umask_stay_private(self):
        with tempfile.TemporaryDirectory(prefix="zolotoy-renewal-test-") as temporary:
            root = Path(temporary)
            state = root / "state"
            account = state / "accounts/acme-v02.api.letsencrypt.org/zolotoy-dev"
            certificates = state / "certificates"
            webroot = state / "webroot"
            for directory in (account, certificates, webroot):
                directory.mkdir(parents=True)
            state.chmod(0o711)
            (state / "accounts").chmod(0o755)
            certificates.chmod(0o755)
            for file in (account / "account.json", account / "zolotoy-dev.key",
                         certificates / "zolotoy.dev.json", certificates / "zolotoy.dev.crt",
                         certificates / "zolotoy.dev.key"):
                file.write_text("local fixture only")
                file.chmod(0o600)
            binary = root / "bin"
            binary.mkdir()

            def executable(name, code):
                file = binary / name
                file.write_text(f"#!{sys.executable}\n" + code)
                file.chmod(0o755)
                return file

            executable("id", "print('0')\n")
            executable("flock", "import fcntl,sys\nfcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX | fcntl.LOCK_NB)\n")
            lego = executable("lego", r'''
import os
from pathlib import Path
import sys
if sys.argv[1:] == ['--version']:
    print('lego version 5.5.2 fixture')
    raise SystemExit
assert sys.argv[1] == 'run' and '--http' in sys.argv
state = Path(next(arg.split('=', 1)[1] for arg in sys.argv if arg.startswith('--path=')))
webroot = Path(next(arg.split('=', 1)[1] for arg in sys.argv if arg.startswith('--http.webroot=')))
challenge = webroot / '.well-known/acme-challenge'
challenge.mkdir(parents=True, mode=0o755, exist_ok=True)
# These are the permission modes used by lego's HTTP webroot and key writers.
for path, mode in ((challenge / 'test-token', 0o644), (state / 'certificates/new.key', 0o600)):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
    os.write(descriptor, b'local test fixture')
    os.close(descriptor)
''')
            installer = executable("install-certificate", r'''
import json
import os
from pathlib import Path
mask = os.umask(0o077)
Path(os.environ['INSTALLER_UMASK']).write_text(json.dumps(mask))
''')
            source = Path(__file__).with_name("renew-certificate.sh").read_text()
            replacements = {
                "acme_root=/var/lib/zolotoy-dev-acme": "acme_root=" + str(state),
                "lego=/usr/local/libexec/zolotoy-dev/lego": "lego=" + str(lego),
                "installer=/usr/local/libexec/zolotoy-dev/install-certificate": "installer=" + str(installer),
            }
            for before, after in replacements.items():
                self.assertEqual(source.count(before), 1)
                source = source.replace(before, after)
            wrapper = root / "renew-certificate.sh"
            wrapper.write_text(source)
            mask_file = root / "installer-umask"
            result = subprocess.run(["bash", str(wrapper)], capture_output=True, text=True,
                                    env={**os.environ, "PATH": str(binary) + os.pathsep + os.environ["PATH"],
                                         "INSTALLER_UMASK": str(mask_file)})
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            challenge = webroot / ".well-known/acme-challenge"
            self.assertEqual((challenge / "test-token").stat().st_mode & 0o777, 0o644)
            self.assertEqual(challenge.stat().st_mode & 0o777, 0o755)
            self.assertEqual((state / "accounts").stat().st_mode & 0o777, 0o700)
            self.assertEqual(certificates.stat().st_mode & 0o777, 0o700)
            self.assertEqual((certificates / "new.key").stat().st_mode & 0o777, 0o600)
            self.assertEqual((account / "zolotoy-dev.key").stat().st_mode & 0o777, 0o600)
            self.assertEqual(state.stat().st_mode & 0o777, 0o711)
            self.assertEqual(json.loads(mask_file.read_text()), 0o077)


if __name__ == "__main__":
    unittest.main()
