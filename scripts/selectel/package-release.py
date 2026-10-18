#!/usr/bin/env python3
"""Package a checked mock build and its exact file hashes without editing dist."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile


RELEASE_PATTERN = re.compile(r"[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}")
PUBLIC_DOCUMENTS = (
    "index.html", "architecture/index.html", "services/order/index.html",
    "services/auth/index.html", "services/notification/index.html",
    "services/url-shortener/index.html",
)
REQUIRED_FILES = set(PUBLIC_DOCUMENTS) | {"ru/" + path for path in PUBLIC_DOCUMENTS} | {
    "404.html", "ru/404.html", "demo/index.html", "demo/mockServiceWorker.js",
    "robots.txt", "sitemap.xml",
}


def package(dist: Path, output: Path, release_id: str) -> None:
    if RELEASE_PATTERN.fullmatch(release_id) is None:
        raise ValueError("Release id must be commit SHA-run id-run attempt")
    if not dist.is_dir() or dist.is_symlink():
        raise ValueError("dist must be a regular directory")
    contents = {}
    for path in sorted(dist.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlink in build: {path}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f"Non-regular build entry: {path}")
        relative = path.relative_to(dist).as_posix()
        if relative != ".vite/manifest.json" and any(part.startswith(".") for part in path.relative_to(dist).parts):
            raise ValueError(f"Hidden build entry: {relative}")
        contents[relative] = path.read_bytes()
    missing = REQUIRED_FILES - contents.keys()
    if missing:
        raise ValueError(f"Incomplete build: {', '.join(sorted(missing))}")
    if "release-id.txt" in contents:
        raise ValueError("Build must not provide its own release identity")
    contents["release-id.txt"] = (release_id + "\n").encode()
    smoke = Path(__file__).with_name("smoke.py").read_bytes()
    manifest = {
        "version": 1,
        "release_id": release_id,
        "files": {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()},
        "smoke_sha256": hashlib.sha256(smoke).hexdigest(),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, "x:gz") as archive:
        members = {"site/" + name: data for name, data in contents.items()}
        members["manifest.json"] = (json.dumps(manifest, sort_keys=True) + "\n").encode()
        members["smoke.py"] = smoke
        for name, data in sorted(members.items()):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = 0o644
            info.mtime = 0
            archive.addfile(info, io.BytesIO(data))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--release", required=True)
    args = parser.parse_args()
    package(args.dist, args.output, args.release)
    print(f"Packaged {args.release}: {hashlib.sha256(args.output.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
