> The Caddy installation sections below are historical. For the Nginx profile and current deployment preflight, use [NGINX.md](NGINX.md).

# Selectel staging deployment

This runbook prepares `origin.zolotoy.dev` only. It does not migrate production
DNS, change the Cloudflare deployment, or configure a live backend. The workflow
always builds `VITE_API_MODE=mock` and `VITE_DEPLOY_ENV=selectel-staging`.

## Review status and existing infrastructure

The repository change is a review candidate. No deployment or Caddy reload is
performed while preparing it. A GitHub Actions `workflow_dispatch` after approval
is the separate action that publishes the staged build.

Read-only infrastructure observations from 2026-10-18:

- `origin.zolotoy.dev` points to `135.106.186.27` with DNS-only routing.
- Caddy 2.11.4 already serves the origin with an issued certificate; `/_health`
  returns 200, while `/` returns 503 because no frontend release exists yet.
- `/etc/caddy/Caddyfile` already imports `zolotoy-dev.caddy`. It also contains the
  working `maxzolotoy.com` and `origin.maxzolotoy.com` sites; retain all of them.
- `zolotoydeploy` has SSH ED25519 access and no sudo. Deployment scripts write
  exclusively inside `/var/www/zolotoy-dev/releases`, including temporary files.
- The parent `/var/www/zolotoy-dev` directory was also owned by `zolotoydeploy`
  during inspection. Therefore the account's filesystem permissions are broader
  than the intended releases-only boundary. These changes neither depend on nor
  alter that ownership; any permission correction is a separate approved action.
- GitHub Environment `selectel-staging` is configured for `main` only, with
  secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` and variable
  `VPS_ORIGIN_HOST`. The values are checked against the fixed staging destination.

The checked-in site configuration deliberately differs from the initial
health/503 configuration. The deploy preflight rejects that initial file. An
administrator must install and reload the reviewed site configuration after
separate approval, before the first workflow deployment.

## Routing and staging differences

`deploy/caddy/zolotoy-dev.caddy` serves the 12 built public documents (six EN and
six RU pages), an explicit allowlist of demo routes, existing static assets,
localized public 404 pages, and the original legacy namespace redirects.

- Legacy redirects and `/demo`/`/demo/index.html` aliases use 308 and preserve
  query strings and encoded identifiers.
- Public aliases handled by Cloudflare's native ASSETS layer use **307**. They
  must not be changed to 308 under an assumption that every Worker URL uses 308.
- Unknown demo paths return the Worker-style plain 404; missing assets never
  become a successful SPA document. Recognized dynamic route segments retain
  the Worker's existing semantics.
- `/demo/mockServiceWorker.js` remains available inside the `/demo/` scope.
- Existing static/HTML cache policy remains `public, max-age=0, must-revalidate`,
  including hashed asset filenames. There is no unreviewed immutable-cache change.
- All staging responses, including redirects and errors, add
  `X-Robots-Tag: noindex,nofollow`. Production canonicals and public content remain
  in the build. `robots.txt` is retained so crawlers can retrieve the noindex
  headers; noindex is not access control.
- `/_health` is a Caddy liveness response with `Cache-Control: no-store`, including
  before the first release. It is not evidence that the frontend is deployed.
- `/_release` serves `release-id.txt` with `Cache-Control: no-store`; before a
  release it returns 503. This confirms the actual version served over HTTP.
- HTTP redirects to staging HTTPS. Caddy manages TLS for the existing staging
  hostname; no production hostname is added to this file.

The local HTTP differential checks compare the actual built Worker/assets with
Caddy, including response bytes, routing, relevant cache/MIME headers, methods,
aliases, encoded paths, missing files and the complete emitted asset list. Server
implementation headers such as `Server`, ETag values and transport timing are not
byte-for-byte contracts. The staging noindex header and operational endpoints are
intentional additions. TLS is checked separately with an isolated local Caddy CA;
no system trust store or live service is modified by local tests. The actual
deployment smoke program also runs against real local Caddy responses, using the
staging hostname with a test certificate and explicit loopback port mappings.

## Local verification

Use the committed Node version and lockfile. From the repository root:

```bash
npm ci
npm run lint
npm test
VITE_API_MODE=mock VITE_DEPLOY_ENV=selectel-staging npm run build
python3 -B -m unittest discover -s scripts/selectel -p 'test_*.py' -v
bash scripts/install-caddy.sh
npm run check:selectel
npm run check:selectel:tls
npx playwright install --with-deps chromium
VITE_API_MODE=mock VITE_DEPLOY_ENV=selectel-staging npm run test:e2e:built-worker
VITE_API_MODE=mock VITE_DEPLOY_ENV=selectel-staging npm run test:e2e:selectel
```

The build includes type-checking. HTTP/TLS checks and both browser suites use that
same existing `dist` without rebuilding; the deploy job packages and publishes
those checked bytes. The Caddy installer downloads the pinned 2.11.4
binary, verifies its published SHA256 and writes only `.tools/bin/caddy`. Set
`CADDY_BIN` to an already available 2.11.4 binary if needed. The transaction suite
uses temporary local directories and a fake HTTP endpoint; it never connects to
the VPS. It exercises archive integrity, path traversal/symlink rejection,
immutable releases, competing deployments, first-install failure, later rollback,
manual rollback, release identity/noindex failures and interrupted SSH-shell
signals. Local tests do not prove that a remote deployment has happened.

The existing lockfile reports four high-severity npm audit entries involving
`@vue/eslint-config-typescript`, `braces`, `fast-glob`, and `micromatch`. This
migration leaves dependencies unchanged; those findings remain a separate task.

## Administrator installation — only after explicit approval

Run these commands in an **existing administrative SSH session** on the VPS,
using the current administrative account. Do not grant `zolotoydeploy` sudo and
do not create a new access key. This is the only step that replaces the installed
site file and reloads Caddy; the workflow does neither.

Use the approved full commit SHA already merged to `main`, after reviewing the
configuration. The pinned download avoids loading an unreviewed future branch
tip. The backup remains in the printed review directory for manual recovery.

```bash
set -euo pipefail
read -r -p 'Approved 40-character main commit SHA: ' reviewed_commit
[[ "$reviewed_commit" =~ ^[0-9a-f]{40}$ ]]
read -r -p 'Site-file SHA256 from the reviewed checkout: ' reviewed_sha256
[[ "$reviewed_sha256" =~ ^[0-9a-f]{64}$ ]]
review_dir=$(mktemp -d /var/tmp/zolotoy-caddy-review.XXXXXX)
curl --fail --silent --show-error --location \
  "https://raw.githubusercontent.com/Officialsayp/zolotoy-dev-frontend/$reviewed_commit/deploy/caddy/zolotoy-dev.caddy" \
  --output "$review_dir/zolotoy-dev.caddy"
sha256sum "$review_dir/zolotoy-dev.caddy"
[[ "$(sha256sum "$review_dir/zolotoy-dev.caddy" | cut -d ' ' -f 1)" == "$reviewed_sha256" ]]
sudo cp -p /etc/caddy/zolotoy-dev.caddy "$review_dir/previous-zolotoy-dev.caddy"
sudo install -o root -g root -m 0644 \
  "$review_dir/zolotoy-dev.caddy" /etc/caddy/zolotoy-dev.caddy
if ! sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  sudo cp -p "$review_dir/previous-zolotoy-dev.caddy" /etc/caddy/zolotoy-dev.caddy
  exit 1
fi
if ! sudo systemctl reload caddy; then
  sudo cp -p "$review_dir/previous-zolotoy-dev.caddy" /etc/caddy/zolotoy-dev.caddy
  sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  sudo systemctl reload caddy
  exit 1
fi
sudo systemctl is-active caddy
printf 'Saved original site file in %s\n' "$review_dir"
curl --fail --silent --show-error --resolve origin.zolotoy.dev:443:127.0.0.1 \
  https://origin.zolotoy.dev/_health
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  https://origin.zolotoy.dev/
curl --fail --silent --show-error --output /dev/null https://maxzolotoy.com/
curl --fail --silent --show-error --output /dev/null https://zolotoy.dev/
```

Obtain the expected SHA256 with `shasum -a 256 deploy/caddy/zolotoy-dev.caddy` in
the reviewed Mac checkout; the snippet checks it before replacing any file. The first
origin root request should still show 503 before deployment. The complete main
Caddyfile is validated so existing imported sites participate in validation.
Preserve `/etc/caddy/Caddyfile`, `site.caddy`, DNS records, and every other site
file. If verification fails, retain the output and restore the saved site file
with an administrator; do not trigger the deploy workflow.

The deployment's file checksum preflight confirms the installed site file, not
Caddy's in-memory configuration. The approved reload plus subsequent HTTP/TLS
checks are required to establish that the configuration is active.

## Approved first deployment

After the reviewed change is on `main` and the configuration installation above
has been separately approved and completed:

1. Open GitHub Actions → **Deploy Selectel staging (manual)** → **Run workflow**.
2. Select `main` and the **Deploy Selectel staging** confirmation option. Launching
   this workflow is the explicit staging publication action.
3. The verification job installs locked dependencies, runs lint, Vitest,
   type-check/build/site checks, local deployment transactions, Worker/Caddy HTTP
   comparison, isolated TLS checks, and full desktop/mobile Playwright suites.
4. Only after those pass does the environment-bound deploy job receive SSH secrets
   and download the exact verified artifact. It does not rebuild the application.
5. Inspect the activation result and previous release ID. Open
   `https://origin.zolotoy.dev/`, `/ru/`, and `/demo/`; `/_release` must equal the
   workflow's `<commit SHA>-<run ID>-<run attempt>` identifier.

The workflow cannot run automatically on push, pull request or merge. A non-main
dispatch fails before verification, and the deployment job additionally requires
`workflow_dispatch`, `main`, and the `selectel-staging` environment. The existing
Cloudflare deployment remains unchanged; merging repository changes may still
trigger that existing provider integration under its existing configuration.

## SSH, integrity and transaction behavior

The client enforces the reviewed IP, user and origin and loads only the supplied
key and verified ED25519 known-host entry into a private temporary runner
directory. `StrictHostKeyChecking=yes`, `HostKeyAlgorithms=ssh-ed25519`,
`IdentitiesOnly=yes`, no agent, no password fallback, and no global known-host
file prevent an unverified host from being accepted. There is no `ssh-keyscan`
or `sudo` in deployment code. Temporary runner credentials are removed on exit.

The release layout is:

```text
/var/www/zolotoy-dev/releases/
  .deploy.lock
  .incoming-<release ID>/release.tar.gz
  .metadata-<release ID>/manifest.json
  .metadata-<release ID>/smoke.py
  <release ID>/index.html
  <release ID>/demo/index.html
  <release ID>/release-id.txt
  current -> <release ID>
```

The archive contains only regular files. It preserves the build, including
`.vite/manifest.json`, and adds only `release-id.txt` to the served files. The
archive checksum and every file checksum are validated before extraction becomes
a release. Metadata and the smoke program remain outside the served root. New
release IDs cannot overwrite an old release. The installed Caddy version and
site-file checksum must match the tested version/configuration.

One remote `flock` covers validation, activation and smoke checks. The `current`
link is replaced atomically in the same directory. Both loopback HTTPS with the
real hostname (`curl --resolve ...:127.0.0.1`) and public DNS HTTPS must pass TLS
certificate verification; neither uses `-k`. Smoke checks verify the release ID,
12 localized pages, demo routes, legacy redirects/query retention, genuine 404s,
MSW, static MIME/cache headers, noindex, health and HTTP→HTTPS. Each smoke run has
a 120-second total deadline; each request has bounded connection/request timeouts.

Any failed smoke or HUP/INT/TERM before commit restores the previous link and
checks its HTTP release identity. On the first deployment it removes `current`
and confirms the original 503 state. Old releases, the failed candidate and its
uploaded archive are retained; there is no automatic pruning. A connection loss
after a completed transaction can lose the success acknowledgement: inspect
`/_release` before retrying. SIGKILL, a power loss, or a kernel/filesystem failure
cannot be handled by shell traps; inspect the current release before proceeding.

Static files are resolved only through `current`. Keeping an older release
directory does not keep its old chunk URLs available to a tab that was open
before a deployment; a later lazy import can receive 404 and require a page
reload. A historical-asset fallback is not introduced because it would change
the existing routing contract.

## Explicit rollback to a retained release

Rollback is a separate authorized publication action. Use the prior ID recorded
in a successful activation log. In the reviewed local checkout, with the existing
verified Mac SSH key/known-hosts file, run only after approving rollback:

```bash
read -r -p 'Retained release ID to restore: ' release_id
[[ "$release_id" =~ ^[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}$ ]]
config_hash=$(shasum -a 256 deploy/nginx/zolotoy-routes.conf | cut -d ' ' -f 1)
router_hash=$(shasum -a 256 deploy/nginx/zolotoy-routes.js | cut -d ' ' -f 1)
ssh -i "$HOME/.ssh/zolotoydev_selectel_actions_ed25519" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none \
  -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 \
  -o UserKnownHostsFile="$HOME/.ssh/known_hosts" -o GlobalKnownHostsFile=/dev/null \
  -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=2 \
  zolotoydeploy@135.106.186.27 \
  "bash -s -- rollback $release_id origin.zolotoy.dev $config_hash $router_hash" \
  < scripts/selectel/remote.sh
```

The same lock, configuration/version preflight, stored-file hashes, atomic switch
and both TLS smoke runs protect rollback. A failed rollback attempt restores the
release that was active when the attempt began. No Caddy reload is needed when
switching release links. Run the snippet in Bash (`bash` on macOS) because its
input and regex syntax is Bash-specific.

Production cutover, production DNS, broader filesystem access changes, pruning,
and changes to `maxzolotoy.com` remain outside this staging implementation.
