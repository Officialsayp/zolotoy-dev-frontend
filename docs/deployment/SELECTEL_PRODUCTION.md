# Selectel production: zolotoy.dev

Production was switched to Selectel on 2026-10-18 after explicit approval of the
DNS-only cutover. The frontend still uses `VITE_API_MODE=mock`; no Go service was
deployed. `www.zolotoy.dev` was not configured before migration and remains absent.

## Independent production site

- DNS: `zolotoy.dev A 135.106.186.27`, DNS only, effective TTL 300 seconds.
- No apex AAAA record: the former Cloudflare IPv6 answers must not remain.
- Worker `zolotoy-dev-frontend` remains available on its workers.dev hostname for
  rollback. Only its `zolotoy.dev` custom-domain attachment was removed.
- The authoritative DNS provider remains Cloudflare. MX, SPF, DKIM, DMARC and
  verification records were preserved. Nameservers were not changed.
- `/etc/caddy/Caddyfile` imports `zolotoy-dev-production.caddy` in addition to
  the original staging and maxzolotoy site files.
- Root-owned production path: `/var/www/zolotoy-dev-production/current` points to
  `releases/<release-id>/site`. It is outside the deploy user's writable parent.
- Application source: `0827e5c6e18817632558cf7a31d26b9a4f228895`.
- First release: `prod-20261018T143129Z-0827e5c6e188`, built with
  `VITE_API_MODE=mock VITE_DEPLOY_ENV=selectel-production`.
- Archive SHA256: `8efad209ff88af6328e9a9ed108ac192b285be0d88ac4e5320f3dd9e87a090e0`;
  all 107 published files were checked against the included manifest.

The existing staging workflow changes only `origin.zolotoy.dev`. It cannot update
the separate root-owned production tree. Future production publications require
an administrator to promote a separately verified production artifact and replace
the production symlink atomically. Neither a merge nor a staging workflow run
promotes a Selectel production release. Preserve prior releases for rollback;
there is no automatic pruning or old hashed-asset fallback for already-open tabs.

## Routing and indexing

`scripts/generate-selectel-production.mjs` derives the production site from the
verified staging router, with explicit checked substitutions. Regenerate and run
the differential checks whenever the common routing template changes:

```bash
node scripts/generate-selectel-production.mjs
VITE_API_MODE=mock VITE_DEPLOY_ENV=selectel-production npm run build
npm run check:selectel:production
npm run test:e2e:selectel:production
```

Public pages/assets and redirects retain the Worker's robots headers, rather than
the staging-wide `noindex,nofollow`. Recognized demo documents use `noindex,follow`;
unknown demo routes use `noindex`; the existing demo HTML metadata also remains.
Health/release responses are `noindex` and `no-store`. Only the HTTP ACME challenge
prefix is served without an HTTPS redirect, to renew the certificate.

The production check runs the same 717 Worker/Caddy cases, comparing status,
response bytes, redirects, cache/MIME and robots headers. Another 22 checks cover
published/unpublished operational responses and the isolated HTTP challenge root.
The production Playwright config uses only a local fixture, with desktop/mobile
projects and an existing build; it never deploys anything.

## TLS and automatic renewal

The first publicly trusted Let's Encrypt certificate was issued with DNS-01 before
cutover. Its temporary `_acme-challenge` TXT record was removed afterward. There
is no Cloudflare API token on the VPS and no new DNS credential was created.

Pinned official lego 5.5.2 is installed at `/usr/local/libexec/zolotoy-dev/lego`.
Linux amd64 release archive SHA256:
`2a35505089e7772c92e1e9ac144df91151ef2eca8568630db0ff91fca06d9bef`.
Lego v5 uses `run` for both issuance and renewal; v4-style `renew` flags do not
apply. The ACME account ID is `zolotoy-dev`, registered without an email contact.

- Private ACME state: `/var/lib/zolotoy-dev-acme/accounts` and `certificates`, 0700.
- Traversable parent: `/var/lib/zolotoy-dev-acme`, 0711, root owned.
- Public challenge root: `/var/lib/zolotoy-dev-acme/webroot`, directories 0755.
- Certificate copies: `/etc/caddy/zolotoy-dev-tls/<leaf-sha256>/`, root:caddy,
  directories 0750 and PEM files 0640. Private keys never leave the VPS.
- Atomic TLS link: `/etc/caddy/zolotoy-dev-tls/current/{fullchain,privkey}.pem`.
- Installer: `/usr/local/libexec/zolotoy-dev/install-certificate`.
- Renewal: `/usr/local/libexec/zolotoy-dev/renew-certificate`.
- `zolotoy-dev-certificate.timer` runs twice daily, with random delay and persistence.

This site's certificates are explicitly loaded, so **lego and the systemd timer**
own their renewal; Caddy's automatic certificate management remains unchanged for
the other sites. The installer checks SAN, expiry, chain and key correspondence,
changes the symlink, validates and force-reloads Caddy, then checks the leaf served
over verified local TLS. On failure it restores the previous certificate. Renewal
also reconciles a previously failed deployment even when a new certificate is no
longer due. Check results with:

```bash
systemctl status zolotoy-dev-certificate.service
systemctl list-timers zolotoy-dev-certificate.timer
journalctl -u zolotoy-dev-certificate.service
```

HTTP validation requires Caddy-readable challenge files. The renewal command uses
a scoped 0022 umask for lego's public challenge output; private account/certificate
directories remain 0700, and certificate installation restores the strict umask.
A live Let's Encrypt **staging CA** HTTP-01 validation was used to test the real
DNS/port-80 path. Its untrusted test certificate was never installed in Caddy.

## Live smoke and rollback

```bash
python3 -B scripts/selectel-production/smoke.py \
  --release prod-20261018T143129Z-0827e5c6e188
```

The smoke performs 35 checks against the fixed production host, verifies normal
TLS trust/hostname and the release marker, and requires Caddy responses. It also
checks indexable EN/RU pages, demo noindex/whitelist, redirects, real 404s, MSW,
assets/cache headers, sitemap, methods and HTTP upgrades. `--resolve 127.0.0.1`
is for server-local verification. `--resolve 135.106.186.27` is useful before DNS
cutover only when the client network honors it. This Mac's network still returned
Cloudflare for that forced-IP request; a separately authenticated SSH tunnel
(`--ssh-tunnel`, local 18443→443 and 18080→80) verified the intended VPS with normal
TLS validation. After cutover, normal public DNS/TLS checks passed from Mac and VPS.

Pre-cutover Caddy backup: `/var/tmp/zolotoy-production-backup.pKb7mDAs/` (root only).
The existing `site.caddy` and staging site hashes were unchanged by installation.
To roll back public hosting, keep Selectel serving its valid release during DNS
propagation, remove only the new apex A record, and reattach `zolotoy.dev` under
Worker → Domains → Add Domain. The custom-domain attachment recreates its managed
DNS record; do not paste historical Cloudflare anycast IPs as a substitute. Verify
the Worker and public HTTPS afterward. Cached DNS answers make rollback gradual.

Only after clients have moved back should an administrator remove the production
import from Caddy, validate the complete configuration, reload it, and stop the
dedicated renewal timer if it is no longer required. Restoring the entire old main
file is safe only after confirming no newer unrelated edits would be overwritten.
Keep the production release/certificate copies; do not remove maxzolotoy or staging
files. Future application rollback on Selectel can instead restore a prior verified
production release symlink atomically without changing DNS.

Official references: [Caddy TLS](https://caddyserver.com/docs/caddyfile/directives/tls),
[lego v5.5.2](https://github.com/go-acme/lego/releases/tag/v5.5.2),
[Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
