#!/usr/bin/env bash
# Local test tool only: no service installation, sudo, trust-store or VPS writes.
set -euo pipefail
cd "$(dirname "$0")/.."
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux_amd64; checksum=527fbf917c39189a1e3b31d34fa955601680b2d5c8055d2a87b8b9588dec7bb9 ;;
  Darwin-arm64) platform=mac_arm64; checksum=9efb0af2d6cf09cfb5053c0e51721b9b3d4956d346234f39368d943d25a3c9a7 ;;
  *) echo 'Set CADDY_BIN to Caddy 2.11.4 for this platform.' >&2; exit 1 ;;
esac
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
curl --fail --silent --show-error --location --retry 3 \
  "https://github.com/caddyserver/caddy/releases/download/v2.11.4/caddy_2.11.4_${platform}.tar.gz" \
  --output "$temp_dir/caddy.tar.gz"
if [[ "$platform" == linux_* ]]; then
  printf '%s  %s\n' "$checksum" "$temp_dir/caddy.tar.gz" | sha256sum -c -
else
  printf '%s  %s\n' "$checksum" "$temp_dir/caddy.tar.gz" | shasum -a 256 -c -
fi
tar -xzf "$temp_dir/caddy.tar.gz" -C "$temp_dir" caddy
mkdir -p .tools/bin
install -m 0755 "$temp_dir/caddy" .tools/bin/caddy
.tools/bin/caddy version
