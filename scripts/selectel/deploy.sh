#!/usr/bin/env bash
# Production is deliberately unsupported. Run only after approving a staging deploy.
set +x
set -Eeuo pipefail
umask 077

[[ $# == 2 ]] || { printf 'Usage: deploy.sh RELEASE_ID RELEASE_ARCHIVE\n' >&2; exit 1; }
release_id=$1
archive=$2
[[ "$release_id" =~ ^[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}$ ]] || { printf 'Invalid release id\n' >&2; exit 1; }
[[ "${GITHUB_REF:-}" == refs/heads/main ]] || { printf 'Only a manual main-branch workflow may deploy staging\n' >&2; exit 1; }
[[ "${GITHUB_EVENT_NAME:-}" == workflow_dispatch ]] || { printf 'Only workflow_dispatch may deploy staging\n' >&2; exit 1; }
[[ "${VPS_HOST:-}" == 135.106.186.27 && "${VPS_USER:-}" == zolotoydeploy && "${VPS_ORIGIN_HOST:-}" == origin.zolotoy.dev ]] || {
  printf 'Selectel staging host, user, or origin does not match the reviewed destination\n' >&2
  exit 1
}
[[ -f "$archive" && ! -L "$archive" ]] || { printf 'Release archive is missing\n' >&2; exit 1; }
[[ -n "${VPS_SSH_KEY:-}" && -n "${VPS_KNOWN_HOSTS:-}" ]] || { printf 'Verified SSH secrets are required\n' >&2; exit 1; }

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$script_dir/../.." && pwd)
ssh_dir=$(mktemp -d "${RUNNER_TEMP:?RUNNER_TEMP must be set}/selectel-ssh.XXXXXX")
cleanup() { rm -f "$ssh_dir/key" "$ssh_dir/known_hosts" "$ssh_dir/matched"; rmdir "$ssh_dir"; }
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
printf '%s\n' "$VPS_SSH_KEY" > "$ssh_dir/key"
printf '%s\n' "$VPS_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset VPS_SSH_KEY VPS_KNOWN_HOSTS
# Only the previously verified ED25519 host key is trusted. Never ssh-keyscan,
# StrictHostKeyChecking=no/accept-new, an SSH agent, or a global known_hosts file.
ssh-keygen -F "$VPS_HOST" -f "$ssh_dir/known_hosts" > "$ssh_dir/matched"
awk '$2 == "ssh-ed25519" { found = 1 } END { exit !found }' "$ssh_dir/matched" || {
  printf 'VPS_KNOWN_HOSTS has no verified ED25519 entry for the staging host\n' >&2
  exit 1
}
ssh_options=(
  -i "$ssh_dir/key"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o IdentityAgent=none
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$ssh_dir/known_hosts"
  -o GlobalKnownHostsFile=/dev/null
  -o HostKeyAlgorithms=ssh-ed25519
  -o UpdateHostKeys=no
  -o PasswordAuthentication=no
  -o KbdInteractiveAuthentication=no
  -o ClearAllForwardings=yes
  -o ControlMaster=no
  -o RequestTTY=no
  -o ConnectTimeout=10
  -o ConnectionAttempts=1
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=2
)
destination="$VPS_USER@$VPS_HOST"
archive_hash=$(sha256sum "$archive" | cut -d ' ' -f 1)
config_hash=$(sha256sum "$repo_root/deploy/caddy/zolotoy-dev.caddy" | cut -d ' ' -f 1)

# All interpolated remote arguments have strict validation above. The server
# independently revalidates them and takes a lock before touching current.
ssh "${ssh_options[@]}" "$destination" "bash -s -- prepare $release_id $VPS_ORIGIN_HOST" < "$script_dir/remote.sh"
scp "${ssh_options[@]}" "$archive" "$destination:/var/www/zolotoy-dev/releases/.incoming-$release_id/release.tar.gz"
ssh "${ssh_options[@]}" "$destination" "bash -s -- apply $release_id $VPS_ORIGIN_HOST $archive_hash $config_hash" < "$script_dir/remote.sh"
