#!/usr/bin/env bash
# lego v5 syntax: run handles both issuance and conditional renewal. This job
# requires the already-provisioned account/certificate and never bootstraps them.
set +x
set -Eeuo pipefail
umask 077

[[ "$(id -u)" == 0 ]] || { printf 'Certificate renewal requires root\n' >&2; exit 1; }
acme_root=/var/lib/zolotoy-dev-acme
lego=/usr/local/libexec/zolotoy-dev/lego
installer=/usr/local/libexec/zolotoy-dev/install-certificate
account_dir="$acme_root/accounts/acme-v02.api.letsencrypt.org/zolotoy-dev"
[[ -f "$account_dir/account.json" && -f "$account_dir/zolotoy-dev.key" ]] || {
  printf 'The existing zolotoy-dev ACME account is required before enabling renewal\n' >&2
  exit 1
}
[[ -f "$acme_root/certificates/zolotoy.dev.json" && -f "$acme_root/certificates/zolotoy.dev.crt" && -f "$acme_root/certificates/zolotoy.dev.key" ]] || {
  printf 'Initial reviewed certificate issuance is required before enabling renewal\n' >&2
  exit 1
}
[[ -d "$acme_root/webroot" && ! -L "$acme_root/webroot" ]] || { printf 'HTTP challenge webroot is missing\n' >&2; exit 1; }
[[ "$($lego --version)" == 'lego version 5.5.2 '* ]] || { printf 'Expected pinned lego 5.5.2\n' >&2; exit 1; }
[[ ! -L "$acme_root/.renew.lock" ]] || { printf 'Renewal lock must not be a symlink\n' >&2; exit 1; }
exec 8>"$acme_root/.renew.lock"
flock -n 8 || { printf 'Another certificate renewal is running\n' >&2; exit 1; }

# Caddy must read HTTP-01 tokens, but must never enter ACME credential folders.
# Keep the existing traversable state root; only its private children use 0700.
for private_directory in "$acme_root/accounts" "$acme_root/certificates"; do
  [[ -d "$private_directory" && ! -L "$private_directory" ]] || {
    printf 'Private ACME state directory is missing or is a symlink\n' >&2
    exit 1
  }
  chmod 0700 "$private_directory"
done
(
  # lego creates public HTTP challenge files with mode 0644. A process-wide 077
  # umask turns those into 0600, causing Caddy to return 403 to the ACME server.
  # Lego's private key files explicitly use 0600 and remain below 0700 folders.
  umask 022
  "$lego" run --accept-tos --email='' --account-id=zolotoy-dev \
    --server=https://acme-v02.api.letsencrypt.org/directory \
    --path="$acme_root" --domains=zolotoy.dev \
    --http --http.webroot="$acme_root/webroot" --renew-days=30 \
    --deploy-hook="$installer" --deploy-hook-timeout=3m
)

# A failed deploy hook leaves a fresh certificate in lego's storage. The next
# run may skip renewal, so reconcile installation even when no hook ran today.
# The installer skips reloading when Caddy already serves this certificate.
"$installer"
