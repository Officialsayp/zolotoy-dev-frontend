#!/usr/bin/env python3
"""Isolated non-root release transaction for zolotoy.dev."""
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import time
from urllib.parse import quote

ROOT = Path("/var/www/zolotoy-dev-production")
RELEASES = ROOT / "releases"
USER = "zolotoyprod"
HOST = "zolotoy.dev"
MAX_BYTES = 128 * 1024 * 1024
ID_RE = re.compile(r"[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}")
LEGACY_ID_RE = re.compile(r"prod-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}")


def require(ok, msg):
    if not ok:
        raise RuntimeError(msg)


def valid_id(value):
    require(bool(ID_RE.fullmatch(value)), "Invalid release identifier")
    return value


def inside(target, releases=None):
    resolved = target.resolve()
    return resolved.name == "site" and resolved.parent.parent == (releases or RELEASES).resolve()


def layout():
    require(pwd.getpwuid(os.geteuid()).pw_name == USER, "Dedicated non-root user required")
    for directory in (ROOT, RELEASES):
        require(not directory.is_symlink() and directory.is_dir(), "Invalid production directory")
        require(directory.stat().st_uid == os.geteuid(), "Production ownership is not provisioned")
    current = ROOT / "current"
    if current.is_symlink():
        target = current.resolve(strict=True)
        require(inside(target) and target.is_dir(), "Unsafe current symlink")
    else:
        require(not current.exists(), "Current must be a symlink or absent")


def active():
    current = ROOT / "current"
    return current.resolve(strict=True) if current.is_symlink() else None


def switch(target):
    require(target.is_dir() and inside(target.resolve(strict=True)), "Unsafe release")
    temp = ROOT / (".current-next-" + str(os.getpid()))
    require(not temp.exists() and not temp.is_symlink(), "Temporary symlink already exists")
    try:
        temp.symlink_to(target.relative_to(ROOT))
        os.replace(temp, ROOT / "current")
    finally:
        if temp.is_symlink():
            temp.unlink()


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for data in iter(lambda: handle.read(1048576), b""):
            h.update(data)
    return h.hexdigest()


def safe_member(name):
    path = PurePosixPath(name)
    if not name or name.startswith("/") or "\\" in name or any(
        p in ("", ".", "..") for p in name.split("/")
    ):
        return False
    if name in ("manifest.json", "smoke.py"):
        return True
    return len(path.parts) >= 2 and path.parts[0] == "site" and (
        name == "site/.vite/manifest.json" or not any(
            part.startswith(".") for part in path.parts[1:]
        )
    )


def verify_release(directory, release, *, legacy=False):
    manifest_path = directory / "manifest.json"
    require(manifest_path.is_file() and not manifest_path.is_symlink(), "Unsafe release manifest")
    manifest = json.loads(manifest_path.read_text())
    require(isinstance(manifest, dict) and manifest.get("release_id") == release, "Manifest ID mismatch")
    if legacy:
        require(bool(LEGACY_ID_RE.fullmatch(release))
                and manifest.get("environment") == "selectel-production"
                and manifest.get("mode") == "mock", "Untrusted legacy production release")
    else:
        require(manifest.get("version") == 1, "Unsupported manifest version")
        smoke_path = directory / "smoke.py"
        require(smoke_path.is_file() and not smoke_path.is_symlink()
                and digest(smoke_path) == manifest.get("smoke_sha256"), "Smoke code checksum mismatch")
    files = manifest.get("files")
    require(isinstance(files, dict) and bool(files), "Missing manifest entries")
    site = directory / "site"
    require(site.is_dir() and not site.is_symlink(), "Unsafe release site")
    actual = set()
    for path in site.rglob("*"):
        require(not path.is_symlink(), "Symlink in stored release")
        if not path.is_dir():
            require(path.is_file(), "Non-regular release file")
            actual.add(path.relative_to(site).as_posix())
    require(actual == set(files), "Manifest does not enumerate the exact release files")
    for name, expected in files.items():
        require(safe_member("site/" + name), "Unsafe manifest path")
        require(isinstance(expected, str) and bool(re.fullmatch(r"[a-f0-9]{64}", expected)),
                "Invalid manifest checksum")
        require(digest(site / name) == expected, "Release checksum mismatch")
    require((site / "release-id.txt").read_text() == release + "\n", "Release ID mismatch")
    for name in ("index.html", "ru/index.html", "demo/index.html", "robots.txt", "sitemap.xml"):
        require(name in files, "Missing public file")


def unpack(archive, release):
    target = RELEASES / release
    temp = RELEASES / (".extract-" + release)
    require(not target.exists() and not target.is_symlink()
            and not temp.exists() and not temp.is_symlink(), "Release already exists")
    temp.mkdir(mode=0o700)
    try:
        names = set()
        size = 0
        with tarfile.open(archive, "r:gz") as bundle:
            for count, member in enumerate(bundle, start=1):
                require(count <= 512, "Too many archive entries")
                require(member.isfile() and safe_member(member.name), "Unsafe archive member")
                require(member.name not in names, "Duplicate archive path")
                size += member.size
                require(0 <= member.size <= MAX_BYTES and size <= MAX_BYTES, "Archive too large")
                names.add(member.name)
                dest = temp.joinpath(*PurePosixPath(member.name).parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                source = bundle.extractfile(member)
                require(source is not None, "Empty archive member")
                with source, dest.open("xb") as output:
                    shutil.copyfileobj(source, output)
                dest.chmod(0o644)
        verify_release(temp, release)
        # Caddy runs as a different user. All ancestors must be traversable even
        # when the SSH account has a restrictive umask.
        for directory in (path for path in temp.rglob("*") if path.is_dir()):
            directory.chmod(0o755)
        temp.chmod(0o755)
        temp.rename(target)
    except BaseException:
        shutil.rmtree(temp, ignore_errors=True)
        raise
    return target / "site"


def smoke(target):
    deadline = time.monotonic() + 120

    def request(path, expected):
        remaining = deadline - time.monotonic()
        require(remaining > 0, "Production smoke exceeded its deadline")
        result = subprocess.run([
            "curl", "--disable", "--silent", "--show-error", "--fail",
            "--noproxy", "*", "--proto", "=https", "--tlsv1.2", "--connect-timeout", "5",
            "--max-time", "15", "--write-out", "\n%{http_code}",
            "--resolve", HOST + ":443:127.0.0.1", "https://" + HOST + path,
        ], capture_output=True, check=False, timeout=min(20, remaining))
        require(result.returncode == 0, "Production HTTPS failed: " + path)
        body, _, status = result.stdout.rpartition(b"\n")
        require(status == b"200", "Unexpected production status: " + path)
        require(body == expected, "Unexpected production content: " + path)

    request("/_health", b"ok")
    identity = (target / "release-id.txt").read_bytes()
    request("/_release", identity)
    assets = {"demo/mockServiceWorker.js"}
    for path, name in (("/", "index.html"), ("/ru/", "ru/index.html"),
                       ("/demo/", "demo/index.html"), ("/demo/orders/", "demo/index.html"),
                       ("/robots.txt", "robots.txt"), ("/sitemap.xml", "sitemap.xml")):
        expected = (target / name).read_bytes()
        request(path, expected)
        if name.endswith(".html"):
            entries = re.findall(rb"""(?:src|href)=["'](/assets/[^"'?#]+\.(?:js|css))["']""", expected)
            require(bool(entries), "Built HTML contains no JS/CSS entry: " + name)
            assets.update(entry.decode().lstrip("/") for entry in entries)
    for name in sorted(assets):
        require(safe_member("site/" + name), "Unsafe asset reference")
        request("/" + quote(name, safe="/"), (target / name).read_bytes())
    request("/_release", identity)


@contextmanager
def deployment_lock():
    lock = RELEASES / ".deploy-production.lock"
    descriptor = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "a+b") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise RuntimeError("Another production transaction is active") from exc
        layout()
        yield


def activate(target):
    previous = active()

    def interruption(_sig, _frame):
        raise RuntimeError("Interrupted deployment")

    saved = {sig: signal.signal(sig, interruption)
             for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP)}
    try:
        # Include switch itself: interruption just after rename must still undo it.
        try:
            switch(target)
            smoke(target)
        except BaseException:
            # A second disconnect/termination must not interrupt the restoration.
            for sig in saved:
                signal.signal(sig, signal.SIG_IGN)
            if previous is not None:
                switch(previous)
                smoke(previous)
            else:
                (ROOT / "current").unlink(missing_ok=True)
            raise
    finally:
        for sig, handler in saved.items():
            signal.signal(sig, handler)
    return previous


def prepare(release):
    layout()
    valid_id(release)
    target = RELEASES / release
    incoming = RELEASES / (".incoming-" + release)
    require(not target.exists() and not target.is_symlink()
            and not incoming.exists() and not incoming.is_symlink(),
            "Release/upload already exists; start a new workflow run or re-run all jobs")
    incoming.mkdir(mode=0o700, exist_ok=False)
    print("Upload prepared", release)


def apply(release, archive_sha):
    layout()
    valid_id(release)
    require(bool(re.fullmatch(r"[a-f0-9]{64}", archive_sha)), "Invalid archive digest")
    with deployment_lock():
        incoming = RELEASES / (".incoming-" + release)
        archive = incoming / "release.tar.gz"
        require(incoming.is_dir() and not incoming.is_symlink()
                and archive.is_file() and not archive.is_symlink(), "Archive missing")
        try:
            require(archive.stat().st_size <= MAX_BYTES, "Archive too large")
            require(digest(archive) == archive_sha, "Archive SHA-256 mismatch")
            candidate = unpack(archive, release)
            previous = activate(candidate)
            print("Deployed", release, "previous", previous or "none")
        finally:
            shutil.rmtree(incoming, ignore_errors=True)


def rollback(release):
    layout()
    legacy = bool(LEGACY_ID_RE.fullmatch(release))
    require(legacy or bool(ID_RE.fullmatch(release)), "Invalid rollback identifier")
    target = RELEASES / release / "site"
    require(target.is_dir() and inside(target.resolve(strict=True)), "Rollback target is missing")
    with deployment_lock():
        verify_release(target.parent, release, legacy=legacy)
        activate(target)
        print("Rolled back to", release)


if __name__ == "__main__":
    try:
        require(len(sys.argv) >= 3, "Usage: SCRIPT prepare|apply|rollback RELEASE [SHA256]")
        command, release = sys.argv[1:3]
        if command == "prepare" and len(sys.argv) == 3:
            prepare(release)
        elif command == "apply" and len(sys.argv) == 4:
            apply(release, sys.argv[3])
        elif command == "rollback" and len(sys.argv) == 3:
            rollback(release)
        else:
            raise RuntimeError("Unknown production operation")
    except Exception as exc:
        print("Production deployment failed:", exc, file=sys.stderr)
        sys.exit(1)
