#!/usr/bin/env bash
# Install only zolotoy.dev's already-issued lego certificate. Never issue a cert,
# edit Caddy configuration, change DNS, or print private-key material here.
set +x
set -Eeuo pipefail
umask 077

ACME_ROOT=/var/lib/zolotoy-dev-acme
TLS_ROOT=/etc/caddy/zolotoy-dev-tls
TLS_OWNER=root
TLS_GROUP=caddy
CADDY_CONFIG=/etc/caddy/Caddyfile
CADDY_BIN=/usr/bin/caddy
DOMAIN=zolotoy.dev
candidate=
previous=
fingerprint=
switched=0
committed=0
reload_attempted=0

fail() { printf '%s\n' "$*" >&2; exit 1; }
require_root() { [[ "$(id -u)" == 0 ]] || fail 'Certificate installation requires root'; }

certificate_fingerprint() {
  openssl x509 -in "$1" -noout -fingerprint -sha256 2>/dev/null |
    cut -d = -f 2 | tr -d ':' | tr 'A-F' 'a-f'
}

served_fingerprint() {
  timeout --signal=TERM --kill-after=2s 15s \
    openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" \
    -verify_hostname "$DOMAIN" -verify_return_error -showcerts </dev/null 2>/dev/null |
    openssl x509 -noout -fingerprint -sha256 2>/dev/null |
    cut -d = -f 2 | tr -d ':' | tr 'A-F' 'a-f'
}

validate_pair() {
  local chain=$1 key=$2 san certificate_public_key private_public_key
  [[ -f "$chain" && ! -L "$chain" && -f "$key" && ! -L "$key" ]] || fail 'Expected regular certificate and key files'
  # Only a PEM certificate chain is allowed in the public certificate file.
  python3 - "$chain" <<'PY'
from pathlib import Path
import re
import sys
data = Path(sys.argv[1]).read_bytes()
pattern = rb'-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----'
certificates = re.findall(pattern, data)
if len(certificates) < 2 or re.sub(pattern, b'', data).strip():
    raise SystemExit('Expected a leaf certificate plus issuer chain, with no other PEM material')
PY
  san=$(openssl x509 -in "$chain" -noout -ext subjectAltName 2>/dev/null)
  [[ "$san" =~ (^|[[:space:],])DNS:zolotoy[.]dev($|[[:space:],]) ]] || fail 'Certificate SAN must explicitly include zolotoy.dev'
  openssl x509 -in "$chain" -noout -checkhost "$DOMAIN" >/dev/null 2>&1 || fail 'Certificate hostname mismatch'
  openssl x509 -in "$chain" -noout -checkend 604800 >/dev/null 2>&1 || fail 'Certificate expires within seven days'
  # This also rejects not-yet-valid, expired, untrusted and incomplete chains.
  openssl verify -purpose sslserver -verify_hostname "$DOMAIN" -untrusted "$chain" "$chain" >/dev/null 2>&1 || fail 'Certificate chain verification failed'
  openssl pkey -in "$key" -passin pass: -check -noout >/dev/null 2>&1 || fail 'Invalid or encrypted certificate private key'
  certificate_public_key=$(openssl x509 -in "$chain" -pubkey -noout 2>/dev/null | openssl pkey -pubin -outform DER 2>/dev/null | sha256sum | cut -d ' ' -f 1)
  private_public_key=$(openssl pkey -in "$key" -passin pass: -pubout -outform DER 2>/dev/null | sha256sum | cut -d ' ' -f 1)
  [[ "$certificate_public_key" == "$private_public_key" ]] || fail 'Certificate and private key do not match'
}

replace_current() {
  python3 - "$TLS_ROOT" "$1" <<'PY'
import os
from pathlib import Path
import sys
import uuid
root, target = Path(sys.argv[1]), sys.argv[2]
temporary = root / ('.current-' + uuid.uuid4().hex)
os.symlink(target, temporary)
try:
    os.replace(temporary, root / 'current')
finally:
    if temporary.is_symlink():
        temporary.unlink()
PY
}

validate_caddy() {
  timeout --signal=TERM --kill-after=5s 45s "$CADDY_BIN" validate --config "$CADDY_CONFIG" --adapter caddyfile
}

reload_caddy() {
  # The JSON configuration still points at current/*.pem. --force is essential
  # when only the underlying certificate files changed.
  timeout --signal=TERM --kill-after=5s 60s "$CADDY_BIN" reload --config "$CADDY_CONFIG" --adapter caddyfile --force
}

finish() {
  local status=$?
  trap - EXIT HUP INT TERM
  set +e
  if [[ "$switched" == 1 && "$committed" == 0 ]]; then
    if [[ -n "$previous" ]]; then
      replace_current "$previous" || status=1
      if [[ "$reload_attempted" == 1 ]]; then
        if ! validate_caddy || ! reload_caddy || [[ "$(served_fingerprint)" != "$previous" ]]; then
          printf 'CRITICAL: previous certificate link restored, but Caddy rollback verification failed.\n' >&2
          status=1
        fi
      fi
    else
      python3 - "$TLS_ROOT/current" "$fingerprint" <<'PY'
import os
import sys
if not os.path.islink(sys.argv[1]) or os.readlink(sys.argv[1]) != sys.argv[2]:
    raise SystemExit('Refusing to remove an unexpectedly changed certificate link')
os.unlink(sys.argv[1])
PY
      [[ $? == 0 ]] || status=1
    fi
    printf 'Certificate activation failed; previous certificate link restored.\n' >&2
    [[ "$status" != 0 ]] || status=1
  fi
  if [[ -n "$candidate" && -d "$candidate" ]]; then
    rm -f "$candidate/fullchain.pem" "$candidate/privkey.pem"
    rmdir "$candidate"
  fi
  exit "$status"
}

main() {
  local no_reload=0
  case "${1:-}" in
    '') [[ $# == 0 ]] || fail 'Usage: install-certificate [--no-reload]' ;;
    --no-reload) [[ $# == 1 ]] || fail 'Unexpected arguments'; no_reload=1 ;;
    *) fail 'Usage: install-certificate [--no-reload]' ;;
  esac
  require_root
  [[ "${LEGO_HOOK_CERT_NAME:-zolotoy.dev}" == zolotoy.dev ]] || fail 'Unexpected lego certificate name'
  [[ ! -L "$TLS_ROOT" ]] || fail 'TLS directory must not be a symlink'
  install -d -o "$TLS_OWNER" -g "$TLS_GROUP" -m 0750 "$TLS_ROOT"
  [[ ! -L "$TLS_ROOT/.install.lock" ]] || fail 'Certificate lock must not be a symlink'
  exec 9>"$TLS_ROOT/.install.lock"
  flock -w 60 9 || fail 'Another certificate installation is in progress'
  if [[ -L "$TLS_ROOT/current" ]]; then
    previous=$(readlink "$TLS_ROOT/current")
    [[ "$previous" =~ ^[0-9a-f]{64}$ && -d "$TLS_ROOT/$previous" && ! -L "$TLS_ROOT/$previous" ]] || fail 'Unsafe existing certificate link'
  elif [[ -e "$TLS_ROOT/current" ]]; then
    fail 'current must be a relative certificate symlink'
  fi
  [[ -n "$previous" || "$no_reload" == 1 ]] || fail 'First installation requires --no-reload before adding the production Caddy site'
  [[ -f "$ACME_ROOT/certificates/$DOMAIN.crt" && ! -L "$ACME_ROOT/certificates/$DOMAIN.crt" ]] || fail 'Lego certificate is missing or is a symlink'
  [[ -f "$ACME_ROOT/certificates/$DOMAIN.key" && ! -L "$ACME_ROOT/certificates/$DOMAIN.key" ]] || fail 'Lego private key is missing or is a symlink'
  trap finish EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  candidate=$(mktemp -d "$TLS_ROOT/.incoming.XXXXXXXX")
  install -o "$TLS_OWNER" -g "$TLS_GROUP" -m 0640 "$ACME_ROOT/certificates/$DOMAIN.crt" "$candidate/fullchain.pem"
  install -o "$TLS_OWNER" -g "$TLS_GROUP" -m 0640 "$ACME_ROOT/certificates/$DOMAIN.key" "$candidate/privkey.pem"
  validate_pair "$candidate/fullchain.pem" "$candidate/privkey.pem"
  fingerprint=$(certificate_fingerprint "$candidate/fullchain.pem")
  [[ "$fingerprint" =~ ^[0-9a-f]{64}$ ]] || fail 'Invalid certificate fingerprint'
  if [[ -e "$TLS_ROOT/$fingerprint" || -L "$TLS_ROOT/$fingerprint" ]]; then
    [[ -d "$TLS_ROOT/$fingerprint" && ! -L "$TLS_ROOT/$fingerprint" ]] || fail 'Certificate version is not a directory'
    [[ ! -L "$TLS_ROOT/$fingerprint/fullchain.pem" && ! -L "$TLS_ROOT/$fingerprint/privkey.pem" ]] || fail 'Stored certificate files must not be symlinks'
    cmp -s "$candidate/fullchain.pem" "$TLS_ROOT/$fingerprint/fullchain.pem" || fail 'Immutable certificate chain differs'
    cmp -s "$candidate/privkey.pem" "$TLS_ROOT/$fingerprint/privkey.pem" || fail 'Immutable certificate key differs'
  else
    chown "$TLS_OWNER:$TLS_GROUP" "$candidate"
    chmod 0750 "$candidate"
    mv "$candidate" "$TLS_ROOT/$fingerprint"
    candidate=
  fi
  if [[ "$no_reload" == 1 && -n "$previous" && "$previous" != "$fingerprint" ]]; then
    fail '--no-reload is reserved for initial installation, not certificate rotation'
  fi
  if [[ "$previous" == "$fingerprint" ]]; then
    if [[ "$no_reload" == 1 || "$(served_fingerprint)" == "$fingerprint" ]]; then
      committed=1
      printf 'Certificate already installed: %s\n' "$fingerprint"
      return
    fi
  fi
  switched=1
  replace_current "$fingerprint"
  if [[ "$no_reload" == 0 ]]; then
    validate_caddy
    reload_attempted=1
    reload_caddy
    [[ "$(served_fingerprint)" == "$fingerprint" ]] || fail 'Caddy did not serve the newly installed certificate'
  fi
  committed=1
  printf 'Installed zolotoy.dev certificate: %s%s\n' "$fingerprint" "$([[ "$no_reload" == 1 ]] && printf ' (Caddy reload intentionally deferred)' || true)"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
