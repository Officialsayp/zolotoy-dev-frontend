#!/usr/bin/env bash
# Sent over a verified SSH connection; never uploaded into a public release.
# Sourceable so local transaction tests can substitute an isolated filesystem.
set -Eeuo pipefail
umask 022

RELEASES_ROOT=/var/www/zolotoy-dev/releases
NGINX_CONFIG=/etc/nginx/zolotoy-routes.conf
NGINX_ROUTER=/etc/nginx/zolotoy-routes.js
CONFIG_OWNER_UID=0
ORIGIN_HOST=origin.zolotoy.dev
DEPLOY_USER=zolotoydeploy
release_id=
previous_release=
switched=0
committed=0
smoke_pid=

fail() { printf '%s\n' "$*" >&2; exit 1; }

validate_release_id() {
  [[ "$1" =~ ^[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}$ ]] || fail 'Invalid release id'
}

check_environment() {
  [[ "$(id -un)" == "$DEPLOY_USER" ]] || fail 'Use the unprivileged staging deploy user'
  [[ "$1" == "$ORIGIN_HOST" ]] || fail 'Only origin.zolotoy.dev is supported'
  [[ -d "$RELEASES_ROOT" && ! -L "$RELEASES_ROOT" ]] || fail 'Releases directory is missing or is a symlink'
  [[ -w "$RELEASES_ROOT" ]] || fail 'Releases directory is not writable'
  command -v python3 >/dev/null || fail 'python3 is required'
  command -v flock >/dev/null || fail 'flock is required'
  command -v curl >/dev/null || fail 'curl is required'
  command -v sha256sum >/dev/null || fail 'sha256sum is required'
  command -v nginx >/dev/null || fail 'nginx is required for the version preflight'
  [[ "$(nginx -v 2>&1)" == nginx\ version:\ nginx/* ]] || fail 'Cannot identify the installed Nginx binary'
  # Syntax/TLS configuration validation belongs to the administrator: nginx -t
  # would require access to private TLS keys unavailable to this deploy user.
  systemctl is-active --quiet nginx || fail 'The Nginx service must be active'
}

check_config() {
  [[ "$1" =~ ^[0-9a-f]{64}$ && "$2" =~ ^[0-9a-f]{64}$ ]] || fail 'Invalid Nginx configuration checksum'
  python3 - "$NGINX_CONFIG" "$NGINX_ROUTER" "$CONFIG_OWNER_UID" "$1" "$2" <<'PY'
import hashlib
from pathlib import Path
import stat
import sys
owner = int(sys.argv[3])
for name, expected in zip(sys.argv[1:3], sys.argv[4:6]):
    path = Path(name)
    for target, kind in ((path.parent, stat.S_ISDIR), (path, stat.S_ISREG)):
        metadata = target.lstat()
        if not kind(metadata.st_mode) or metadata.st_uid != owner or metadata.st_mode & 0o022:
            raise SystemExit('Unsafe Nginx routing file or parent directory')
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise SystemExit('Installed Nginx routing differs from the reviewed profile; administrator installation/reload is required')
PY
}

read_current() {
  previous_release=
  if [[ -L "$RELEASES_ROOT/current" ]]; then
    previous_release=$(readlink "$RELEASES_ROOT/current")
    validate_release_id "$previous_release"
    [[ -d "$RELEASES_ROOT/$previous_release" && ! -L "$RELEASES_ROOT/$previous_release" ]] || fail 'Current release points outside an existing release'
  elif [[ -e "$RELEASES_ROOT/current" ]]; then
    fail 'current must be absent or a relative release symlink'
  fi
}

replace_current() {
  # Same-directory os.replace is atomic on the VPS filesystem. A regular file
  # or directory named current is rejected above, never recursively removed.
  python3 - "$RELEASES_ROOT" "$1" "$release_id" <<'PY'
import os
import pathlib
import sys
root, target, transaction = map(pathlib.Path, sys.argv[1:])
temporary = root / ('.switch-' + str(transaction))
os.symlink(str(target), temporary)
try:
    os.replace(temporary, root / 'current')
finally:
    if temporary.is_symlink():
        temporary.unlink()
PY
}

transaction_exit() {
  local status=$?
  trap - EXIT HUP INT TERM
  set +e
  if [[ -n "$smoke_pid" ]]; then
    kill -TERM "$smoke_pid" 2>/dev/null
    wait "$smoke_pid" 2>/dev/null
    smoke_pid=
  fi
  if [[ "$switched" == 1 && "$committed" == 0 ]]; then
    printf 'Deployment failed; restoring previous release.\n' >&2
    if [[ -n "$previous_release" ]]; then
      replace_current "$previous_release" || status=1
    else
      python3 - "$RELEASES_ROOT/current" "$release_id" <<'PY'
import os
import sys
if not os.path.islink(sys.argv[1]) or os.readlink(sys.argv[1]) != sys.argv[2]:
    raise SystemExit('Refusing to remove a changed current link')
os.unlink(sys.argv[1])
PY
      [[ $? == 0 ]] || status=1
    fi
    # A failed first install restores the deliberate 503 missing-root state.
    # Existing release files and the failed candidate are retained for inspection.
    if [[ -n "$previous_release" ]]; then
      python3 "$RELEASES_ROOT/.metadata-$previous_release/smoke.py" --host "$ORIGIN_HOST" --release "$previous_release" --resolve 127.0.0.1 --identity-only || {
        printf 'Rollback link restored, but rollback HTTP verification failed.\n' >&2
        status=1
      }
    else
      python3 "$RELEASES_ROOT/.metadata-$release_id/smoke.py" --host "$ORIGIN_HOST" --release "$release_id" --resolve 127.0.0.1 --unavailable || {
        printf 'First-release rollback HTTP verification failed.\n' >&2
        status=1
      }
    fi
    [[ "$status" != 0 ]] || status=1
  fi
  exit "$status"
}

run_smoke() {
  # Waiting on a background child lets HUP/TERM interrupt Bash promptly, instead
  # of deferring rollback until an entire foreground HTTP smoke run finishes.
  python3 "$RELEASES_ROOT/.metadata-$release_id/smoke.py" --host "$ORIGIN_HOST" --release "$release_id" "$@" &
  smoke_pid=$!
  local status=0
  wait "$smoke_pid" || status=$?
  smoke_pid=
  return "$status"
}

unpack_release() {
  local bundle_hash=$1
  [[ "$bundle_hash" =~ ^[0-9a-f]{64}$ ]] || fail 'Invalid archive checksum'
  local incoming="$RELEASES_ROOT/.incoming-$release_id"
  [[ -d "$incoming" && ! -L "$incoming" ]] || fail 'Prepared upload directory is absent'
  [[ -f "$incoming/release.tar.gz" && ! -L "$incoming/release.tar.gz" ]] || fail 'Release archive is missing'
  [[ ! -e "$RELEASES_ROOT/$release_id" && ! -L "$RELEASES_ROOT/$release_id" ]] || fail 'Release id already exists; use a new workflow attempt'
  [[ ! -e "$RELEASES_ROOT/.metadata-$release_id" && ! -L "$RELEASES_ROOT/.metadata-$release_id" ]] || fail 'Release metadata already exists'
  python3 - "$incoming" "$release_id" "$bundle_hash" <<'PY'
import hashlib
import json
import pathlib
import re
import tarfile
import sys

incoming, release_id, expected_hash = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
bundle = incoming / 'release.tar.gz'
if bundle.stat().st_size > 200 * 1024 * 1024:
    raise SystemExit('Release archive exceeds 200 MiB')
if hashlib.sha256(bundle.read_bytes()).hexdigest() != expected_hash:
    raise SystemExit('Release archive checksum mismatch')
files = {}
total_size = 0
with tarfile.open(bundle, 'r:gz') as archive:
    for member in archive:
        path = pathlib.PurePosixPath(member.name)
        if (not member.isfile() or path.is_absolute() or '..' in path.parts
                or (member.name != 'site/.vite/manifest.json' and any(part.startswith('.') for part in path.parts))
                or str(path) != member.name or member.name in files
                or not (member.name in ('manifest.json', 'smoke.py') or member.name.startswith('site/'))):
            raise SystemExit('Unsafe or duplicate archive member: ' + member.name)
        total_size += member.size
        if len(files) >= 5000 or total_size > 512 * 1024 * 1024:
            raise SystemExit('Expanded release exceeds limits')
        files[member.name] = archive.extractfile(member).read()
manifest = json.loads(files['manifest.json'])
if manifest.get('version') != 1 or manifest.get('release_id') != release_id:
    raise SystemExit('Invalid release manifest')
expected = manifest.get('files')
if not isinstance(expected, dict) or set(files) != {'manifest.json', 'smoke.py'} | {'site/' + path for path in expected}:
    raise SystemExit('Release manifest file list mismatch')
for name, digest in expected.items():
    if re.fullmatch('[0-9a-f]{64}', digest) is None or hashlib.sha256(files['site/' + name]).hexdigest() != digest:
        raise SystemExit('Release file checksum mismatch: ' + name)
if hashlib.sha256(files['smoke.py']).hexdigest() != manifest.get('smoke_sha256'):
    raise SystemExit('Smoke script checksum mismatch')
if files.get('site/release-id.txt') != (release_id + '\n').encode():
    raise SystemExit('Release identity mismatch')
public = ('index.html', 'architecture/index.html', 'services/order/index.html', 'services/auth/index.html', 'services/notification/index.html', 'services/url-shortener/index.html')
required = set(public) | {'ru/' + path for path in public} | {'404.html', 'ru/404.html', 'demo/index.html', 'demo/mockServiceWorker.js', 'robots.txt', 'sitemap.xml'}
if not required <= expected.keys():
    raise SystemExit('Incomplete frontend release')
destination = incoming / 'unpacked'
destination.mkdir(mode=0o755)
for name, data in files.items():
    path = destination / name
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
    with path.open('xb') as output:
        output.write(data)
    path.chmod(0o644)
PY
  # These paths are new and owned by this release; never overwrite old releases.
  mv "$incoming/unpacked/site" "$RELEASES_ROOT/$release_id"
  mv "$incoming/unpacked" "$RELEASES_ROOT/.metadata-$release_id"
}

verify_stored_release() {
  python3 - "$RELEASES_ROOT" "$release_id" <<'PY'
import hashlib
import json
import pathlib
import sys
root, release_id = pathlib.Path(sys.argv[1]), sys.argv[2]
site = root / release_id
metadata = root / ('.metadata-' + release_id)
if not site.is_dir() or site.is_symlink() or not metadata.is_dir() or metadata.is_symlink():
    raise SystemExit('Stored release or metadata is missing')
manifest_path = metadata / 'manifest.json'
smoke = metadata / 'smoke.py'
if manifest_path.is_symlink() or smoke.is_symlink():
    raise SystemExit('Metadata must be regular files')
manifest = json.loads(manifest_path.read_text())
if manifest.get('version') != 1 or manifest.get('release_id') != release_id:
    raise SystemExit('Stored release identity mismatch')
actual = {}
for path in site.rglob('*'):
    if path.is_symlink():
        raise SystemExit('Symlink in stored release')
    if path.is_file():
        actual[path.relative_to(site).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    elif not path.is_dir():
        raise SystemExit('Non-regular file in stored release')
if actual != manifest.get('files') or hashlib.sha256(smoke.read_bytes()).hexdigest() != manifest.get('smoke_sha256'):
    raise SystemExit('Stored release integrity mismatch')
if (site / 'release-id.txt').read_text() != release_id + '\n':
    raise SystemExit('Stored release marker mismatch')
PY
}

activate_release() {
  read_current
  [[ "$previous_release" != "$release_id" ]] || fail 'Requested release is already active'
  trap transaction_exit EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  # Set intent before the atomic operation so a signal arriving immediately after
  # replacement cannot leave a live, unverified candidate without rollback.
  switched=1
  replace_current "$release_id"
  run_smoke --resolve 127.0.0.1
  run_smoke
  committed=1
  printf 'Activated staging release %s (previous: %s).\n' "$release_id" "${previous_release:-none}"
}

main() {
  [[ $# -ge 3 ]] || fail 'Usage: remote.sh prepare ID HOST | apply ID HOST ARCHIVE_SHA256 CONFIG_SHA256 ROUTER_SHA256 | rollback ID HOST CONFIG_SHA256 ROUTER_SHA256'
  local operation=$1
  release_id=$2
  validate_release_id "$release_id"
  check_environment "$3"
  case "$operation" in
    prepare)
      [[ $# == 3 ]] || fail 'Unexpected prepare arguments'
      [[ ! -e "$RELEASES_ROOT/$release_id" && ! -L "$RELEASES_ROOT/$release_id" ]] || fail 'Release id already exists'
      mkdir -m 755 "$RELEASES_ROOT/.incoming-$release_id"
      ;;
    apply|rollback)
      # One remote transaction owns the old/new symlink until commit or rollback.
      # A second workflow or manual operation fails instead of racing the first.
      [[ ! -L "$RELEASES_ROOT/.deploy.lock" ]] || fail 'Deployment lock must not be a symlink'
      [[ ! -e "$RELEASES_ROOT/.deploy.lock" || -f "$RELEASES_ROOT/.deploy.lock" ]] || fail 'Deployment lock must be a regular file'
      exec 9>"$RELEASES_ROOT/.deploy.lock"
      flock -n 9 || fail 'Another staging deployment is in progress'
      if [[ "$operation" == apply ]]; then
        [[ $# == 6 ]] || fail 'Unexpected apply arguments'
        check_config "$5" "$6"
        unpack_release "$4"
      else
        [[ $# == 5 ]] || fail 'Unexpected rollback arguments'
        check_config "$4" "$5"
      fi
      verify_stored_release
      activate_release
      ;;
    *) fail 'Unknown deployment operation' ;;
  esac
}

# bash -s (the SSH transport) has no BASH_SOURCE entry. Both direct-file and
# stdin execution must invoke main; sourcing from transaction tests must not.
if [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
  main "$@"
fi
