# zolotoy.dev — reviewed Caddy Automatic HTTPS migration (PREPARATION ONLY)

> **NOT AN APPROVED PRODUCTION CHANGE.** This runbook and the adjacent
> `*.automatic-https.caddy` file are offline preparation artifacts. Do not
> enable `auto_https ignore_loaded_certs`, reload Caddy, stop lego or change
> DNS until the site owner separately approves the production cutover.
> No current GitHub Action deploys either Caddy config file.

## Verified production baseline — 2026-10-30

- VPS: Selectel, `135.106.186.27`; Caddy `v2.11.7` systemd unit runs as
  `caddy:caddy` with `HOME=/var/lib/caddy`. Local listeners: TCP 80/443.
- Running Caddyfile: `/etc/caddy/Caddyfile`, SHA-256
  `98fdcf404d730978db8ec745588fe169f87083b1ba19f710a6ea07cd7cd93c62`.
- Running production include: `/etc/caddy/zolotoy-dev-production.caddy`,
  SHA-256 `6b693a30de82e9fbadde371a0b18ea5c5cf9e19fe2ce8d17b372c955c1833144`.
  The archived copy in this repository **matches byte-for-byte**.
- Staging include: `/etc/caddy/zolotoy-dev.caddy`, SHA-256
  `208798df007e280031d3f4842374bf262fd776eecb9c164cee1ccef449ca5523`.
  The archived generator reproduces the manual-certificate production include
  from this verified staging snapshot.
- Existing local/public certificate: Let's Encrypt YE1, SHA-256 fingerprint
  `B5:37:25:A0:2B:B3:DB:6B:EB:E9:08:48:6A:E4:1A:FA:1D:19:85:F6:D1:82:70:BA:46:D7:FA:6C:B2:34:C4:61`,
  expires `2027-01-16 13:29:38 UTC`.
- Active lego timer and install scripts were separately verified in October;
  the first **real rotation** has still not been observed.
- Caddy-managed certificates already exist for `maxzolotoy.com`,
  `www.maxzolotoy.com`, `origin.maxzolotoy.com`, and
  `origin.zolotoy.dev`, in the normal Caddy persistent storage root
  `/var/lib/caddy/.local/share/caddy`; directory mode `0700`, writable by
  the `caddy` account.
- No global Caddy automation overrides were found in the inspected
  `/etc/caddy/*.caddy` and main Caddyfile. This does not replace the required
  audit of all imported files and live effective configuration.
- `dig` returned IPv4 `135.106.186.27`; no AAAA/CAA answers were shown.
  Check external reachability from outside the VPS before any ACME change.

## Files and isolation

- `deploy/caddy/zolotoy-dev-production.caddy`: exact deployed **manual PEM**
  baseline; **do not import or replace the live file just because it is tracked**.
- `deploy/caddy/zolotoy-dev-production.automatic-https.caddy`: **candidate only**.
  It removes precisely the lego HTTP-01 webroot handler and the manual
  `tls fullchain.pem privkey.pem` directive; retains explicit HTTP 308, the
  production asset root, all routes, headers, SEO, EN/RU, demo and app behavior.
- `scripts/generate-selectel-production.mjs`: restores the previously
  reviewed source generator for the historical baseline.
- `scripts/selectel-production/render-caddy-automatic-https.mjs`: an offline,
  strict-baseline candidate renderer. It refuses to transform a Caddyfile whose
  SHA-256 has drifted from the audited baseline.
- **Nothing in this PR changes** `/etc/caddy`, Caddy's systemd unit, the VPS,
  the live certificate store, ACME account state, DNS, or frontend deployment.
  The existing `verify` job only parses/checks the candidate offline.

## Prerequisites and preflight — READ ONLY

1. Obtain explicit owner approval for the exact procedure, maintenance window,
   fallback and potential short first-handshake delay.
2. Confirm the current production and staging checksums still match the
   values above. If either differs, **STOP** and re-audit instead of overwriting.
3. Confirm `systemctl is-active caddy`, `systemctl is-active
   zolotoy-dev-certificate.timer`, the last job result, the next scheduled
   lego run, DNS A/AAAA/CAA and external TCP 80/443 reachability from more than
   one public network. Never run during active lego installation or a near-term
   timer firing. Inspect all manual cert declarations before temporarily using
   the global `auto_https ignore_loaded_certs` mode.
4. Confirm Caddy's storage and available space, Caddy logs, existing certificate
   fingerprints, and that the last verified release, `/_health`, `/_release`,
   portfolio, RU, demo and unrelated `maxzolotoy.com` sites work.
5. Make a restricted, independently verified, *private* VPS-local backup of
   the active Caddyfile/includes, lego state, Caddy state and
   `/etc/caddy/zolotoy-dev-tls/`. Preserve correct ownership/modes. Keep
   backups out of GitHub and do not print or upload private keys or ACME accounts.

## Phase A — pre-provision Caddy-managed certificate (requires approval)

The official Caddy option `auto_https ignore_loaded_certs` allows names from
manually loaded certificates to be automated. For this server, its temporary
presence would be in the existing **global Caddyfile options block**, while the
existing production PEM site and HTTP-01 lego handler stay unchanged.

- **Global scope caveat:** the option affects *all* names with manually loaded
  certificates; do not apply until the full effective config confirms that no
  unrelated domain will be affected.
- Using `tls_automate_names zolotoy.dev` instead is **not equivalent** when
  the same name already has a site block with its own certificate settings.
  Caddy documents that such sites keep their certificate settings.
- Stage and review exact candidate config in an admin-owned temporary location.
  Run `caddy adapt` and `caddy validate` with the correct imports and
  permissions before any authorized reload. Inspect the adapted automation
  policy (no `internal`, staging CA, on-demand or global unrelated changes).
- Reload Caddy gracefully with the reviewed file, **only by administrator
  authorization**. Keep existing lego timer and cert intact until the new
  manager and its certificate have been confirmed.
- Watch Caddy journal for ACME challenge/result and the managed certificate
  storage for a new `zolotoy.dev` certificate. Compare SNI result and
  expiry/issuer locally and externally. Existing PEM must remain available
  throughout. Do not assume that storage files or a successful reload alone
  prove the new certificate is being served.
- Keep this interim phase short and supervised. The old lego install script
  notices a changed served fingerprint and may reload the old certificate if
  its timer fires. **If the timer is approaching or any fault occurs, revert
  the temporary global option and reload the original configuration**.
  Do not leave a mixed state running unattended overnight.

If the new managed certificate cannot be prepared safely while the legacy
certificate is loaded, **STOP** and return to the audited manual PEM baseline.
Do not force a certificate issuance, trigger rapid repeated ACME orders, turn
off the existing timer, or gamble on an empty certificate cache.

## Phase B — controlled cutover (separate approval)

Proceed only after verifying Caddy's new publicly trusted managed certificate,
with a safe opportunity to activate it and an active rollback window.

1. Confirm the same SNI has a valid Caddy-managed leaf; keep backup and old PEM.
2. Confirm lego's service is inactive *at that instant* and there is ample time
   until its next scheduled run. Do not schedule a concurrent GitHub deploy,
   Caddy reload or server reboot.
3. Apply the **reviewed candidate** `zolotoy-dev-production.automatic-https.caddy`
   as the production include. Remove the temporary
   `auto_https ignore_loaded_certs` global override. Preserve all other site
   blocks and the global `protocols h1 h2` setting.
4. Validate the entire resulting config and use **graceful `caddy reload`**,
   never stop/start. Verify TLS 1.2+, HTTP/1.1, HTTP/2, SNI, certificate chain
   and SAN, redirects, EN/RU documents, demo, assets, API-related routes,
   `/_health`, `/_release` and all unrelated sites.
5. Confirm *externally* that the served leaf matches the intended
   Caddy-managed cert and that Caddy's storage and renewal logs track it.
   Only **then**, once the replacement has been accepted, stop/disable the
   legacy lego timer. Keep old service, scripts, account, certificate and
   key backups protected for rollback.
6. Verify repeated requests and a second independent network, and schedule a
   control of the first **actual automatic renewal**. A successful dry-run
   or same-day issuance is insufficient proof of future automatic rotation.

## Immediate rollback (requires approval before cutover)

Any missing trusted certificate, handshake error, ACME failure, route
regression, unexpected global TLS change or failed smoke test is a stop signal.

1. Restore the **exact original** Caddyfile and production include from the
   protected backup. Remove any temporary global automation override.
2. Parse/validate the restored complete configuration; gracefully reload Caddy.
   Caddy's failed config loads are atomic, but rollback of an already successful
   config change is a distinct, deliberate operation.
3. Verify the original leaf fingerprint
   `B5:37:25:A0:2B:B3:DB:6B:EB:E9:08:48:6A:E4:1A:FA:1D:19:85:F6:D1:82:70:BA:46:D7:FA:6C:B2:34:C4:61`
   on both local and public SNI, followed by HTTP/2, HTTP/1.1, EN/RU, demo,
   staging and `maxzolotoy.com` smoke tests.
4. Ensure the original lego timer is still `enabled` and `active`, or
   explicitly restore it if it was disabled *after* the approved cutover.
   Re-check that the service and installer continue working. Do not delete
   or overwrite either CA's state when rolling back.

## External evidence and ongoing monitoring

Check what visitors actually receive, not simply `systemd status=success`:

- At least daily: external verified TLS handshake with SNI, trusted chain,
  correct hostname, HTTP response from `/_health`, certificate fingerprint,
  `notBefore`, `notAfter`, and warnings at 21/14/7 days before expiry.
- Immediate signal on invalid certificate, handshake failure, DNS failure,
  unreachable HTTPS or unexpectedly changed issuer/serial. A CA change alone
  should be reviewed, not assumed malicious.
- Caddy journal: `tls.obtain`, `tls.renew` and `acme` outcomes; confirm
  actual certificate replacement and its public presentation on the first
  scheduled future renewal.
- GitHub Actions status can supplement monitoring but scheduled workflows
  are not a 24/7 monitoring SLA; configure independent notifications.

## Official references

- https://caddyserver.com/docs/automatic-https
- https://caddyserver.com/docs/caddyfile/options#auto-https
- https://caddyserver.com/docs/caddyfile/options#tls-automate-names
- https://caddyserver.com/docs/command-line#caddy-reload
- https://letsencrypt.org/docs/challenge-types/
- https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
