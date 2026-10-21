#!/usr/bin/env bash
# Dedicated production pipeline, intentionally separate from staging.
set -Eeuo pipefail
set +x
umask 077
[[ $# -eq 2 ]] || { echo "Usage: deploy-production.sh RELEASE_ID ARCHIVE" >&2; exit 1; }
release_id="$1"
archive="$2"
[[ "$release_id" =~ ^[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}$ ]] || exit 1
[[ -f "$archive" && ! -L "$archive" ]] || exit 1
[[ "$GITHUB_REF" == refs/heads/main ]] || exit 1
[[ "$GITHUB_EVENT_NAME" == push || "$GITHUB_EVENT_NAME" == workflow_dispatch ]] || exit 1
[[ "$VPS_PRODUCTION_HOST" == 135.106.186.27 ]] || exit 1
[[ "$VPS_PRODUCTION_USER" == zolotoyprod ]] || exit 1
[[ -n "$VPS_PRODUCTION_SSH_KEY" && -n "$VPS_PRODUCTION_KNOWN_HOSTS" ]] || exit 1
root="$(cd "$(dirname "$0")/../.." && pwd)"
temp="$(mktemp -d "$RUNNER_TEMP/selectel-prod-ssh.XXXXXX")"
trap 'rm -rf -- "$temp"' EXIT
printf '%s\n' "$VPS_PRODUCTION_SSH_KEY" > "$temp/key"
printf '%s\n' "$VPS_PRODUCTION_KNOWN_HOSTS" > "$temp/known_hosts"
unset VPS_PRODUCTION_SSH_KEY VPS_PRODUCTION_KNOWN_HOSTS
chmod 600 "$temp/key" "$temp/known_hosts"
ssh-keygen -F "$VPS_PRODUCTION_HOST" -f "$temp/known_hosts" > "$temp/match"
awk '$2 == "ssh-ed25519" { found = 1 } END { exit !found }' "$temp/match" || exit 1
opts=(
  -i "$temp/key" -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$temp/known_hosts"
  -o GlobalKnownHostsFile=/dev/null -o HostKeyAlgorithms=ssh-ed25519
  -o UpdateHostKeys=no -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no
  -o ClearAllForwardings=yes -o ControlMaster=no -o RequestTTY=no
  -o ConnectTimeout=10 -o ConnectionAttempts=1
  -o ServerAliveInterval=15 -o ServerAliveCountMax=2
)
dest="$VPS_PRODUCTION_USER@$VPS_PRODUCTION_HOST"
remote="$root/scripts/selectel/production-remote.py"
hash="$(sha256sum "$archive" | cut -d ' ' -f 1)"
ssh "${opts[@]}" "$dest" "python3 - prepare '$release_id'" < "$remote"
scp "${opts[@]}" "$archive" "$dest:/var/www/zolotoy-dev-production/releases/.incoming-$release_id/release.tar.gz"
ssh "${opts[@]}" "$dest" "python3 - apply '$release_id' '$hash'" < "$remote"
