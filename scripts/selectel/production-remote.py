#!/usr/bin/env python3
"""Isolated non-root release transaction for zolotoy.dev."""
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

ROOT = Path("/var/www/zolotoy-dev-production")
RELEASES = ROOT / "releases"
USER = "zolotoyprod"
HOST = "zolotoy.dev"
MAX_BYTES = 128 * 1024 * 1024
ID_RE = re.compile(r"[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}")


def require(ok, msg):
    if not ok:
        raise RuntimeError(msg)


def valid_id(value):
    require(bool(ID_RE.fullmatch(value)), "Invalid release identifier")
    return value


def inside(target, releases=RELEASES):
    return target.name == "site" and target.parent.parent == releases.resolve()


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


def unpack(archive, release):
    target = RELEASES / release
    temp = RELEASES / (".extract-" + release)
    require(not target.exists() and not temp.exists() and not temp.is_symlink(), "Release already exists")
    temp.mkdir(mode=0o700)
    try:
        names = set()
        size = 0
        with tarfile.open(archive, "r:gz") as bundle:
            members = bundle.getmembers()
            require(len(members) <= 512, "Too many archive entries")
            for member in members:
                require(member.isfile() and safe_member(member.name), "Unsafe archive member")
                require(member.name not in names, "Duplicate archive path")
                size += member.size
                require(size <= MAX_BYTES, "Archive too large")
                names.add(member.name)
                dest = temp.joinpath(*PurePosixPath(member.name).parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                source = bundle.extractfile(member)
                require(source is not None, "Empty archive member")
                with source, dest.open("xb") as output:
                    shutil.copyfileobj(source, output)
                dest.chmod(0o644)
        manifest = json.loads((temp / "manifest.json").read_text())
        require(manifest.get("version") == 1 and manifest.get("release_id") == release, "Manifest ID mismatch")
        files = manifest.get("files")
        require(isinstance(files, dict), "Missing manifest entries")
        require({"site/" + f for f in files} == {f for f in names if f.startswith("site/")},
                "Manifest does not enumerate the exact release files")
        for name, expected in files.items():
            require(isinstance(expected, str) and bool(re.fullmatch(r"[a-f0-9]{64}", expected)),
                    "Invalid manifest checksum")
            require(digest(temp / "site" / name) == expected, "Release checksum mismatch")
        require((temp / "site" / "release-id.txt").read_text() == release + "\n", "Release ID mismatch")
        require("smoke.py" in names and digest(temp / "smoke.py") == manifest.get("smoke_sha256"),
                "Smoke code checksum mismatch")
        for file in ("index.html", "ru/index.html", "demo/index.html", "robots.txt", "sitemap.xml"):
            require("site/" + file in names, "Missing public file")
        temp.chmod(0o755)
        (temp / "site").chmod(0o755)
        temp.rename(target)
    except BaseException:
        shutil.rmtree(temp, ignore_errors=True)
        raise
    return target / "site"


def smoke(target):
    for path, name in (("/", "index.html"), ("/ru/", "ru/index.html"),
                       ("/demo/", "demo/index.html"), ("/robots.txt", "robots.txt"),
                       ("/sitemap.xml", "sitemap.xml")):
        result = subprocess.run([
            "curl", "--silent", "--show-error", "--fail", "--connect-timeout", "5",
            "--max-time", "15", "--resolve", HOST + ":443:127.0.0.1",
            "https://" + HOST + path,
        ], capture_output=True, check=False, timeout=20)
        require(result.returncode == 0, "Production HTTPS failed: " + path)
        require(result.stdout == (target / name).read_bytes(), "Unexpected production HTML: " + path)


def prepare(release):
    layout()
    (RELEASES / (".incoming-" + valid_id(release))).mkdir(mode=0o700, exist_ok=False)
    print("Upload prepared", release)


def apply(release, archive_sha):
    layout()
    valid_id(release)
    require(bool(re.fullmatch(r"[a-f0-9]{64}", archive_sha)), "Invalid archive digest")
    lock = RELEASES / ".deploy-production.lock"
    require(not lock.is_symlink(), "Unsafe lock")
    with lock.open("a+b") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        layout()
        previous = active()
        incoming = RELEASES / (".incoming-" + release)
        archive = incoming / "release.tar.gz"
        require(incoming.is_dir() and not incoming.is_symlink()
                and archive.is_file() and not archive.is_symlink(), "Archive missing")
        require(digest(archive) == archive_sha, "Archive SHA-256 mismatch")
        candidate = unpack(archive, release)
        def interruption(_sig, _frame):
            raise RuntimeError("Interrupted deployment")
        saved_term = signal.signal(signal.SIGTERM, interruption)
        saved_int = signal.signal(signal.SIGINT, interruption)
        try:
            switch(candidate)
            try:
                smoke(candidate)
            except BaseException:
                if previous is not None:
                    switch(previous)
                    smoke(previous)
                else:
                    (ROOT / "current").unlink(missing_ok=True)
                raise
            print("Deployed", release, "previous", previous or "none")
        finally:
            signal.signal(signal.SIGTERM, saved_term)
            signal.signal(signal.SIGINT, saved_int)
            shutil.rmtree(incoming, ignore_errors=True)


def rollback(release):
    layout()
    target = RELEASES / valid_id(release) / "site"
    require(target.is_dir() and inside(target.resolve(strict=True)), "Rollback target is missing")
    lock = RELEASES / ".deploy-production.lock"
    require(not lock.is_symlink(), "Unsafe lock")
    with lock.open("a+b") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        previous = active()
        switch(target)
        try:
            smoke(target)
        except BaseException:
            if previous:
                switch(previous)
            raise
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
