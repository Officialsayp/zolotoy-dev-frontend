# zolotoy.dev — Selectel TLS renewal and disaster recovery

This is an **operator reference**, not a deployment instruction or proof that a
repository file matches the currently installed VPS file. Do **not** run a
certificate renewal, change Caddy, replace any `systemd` unit or copy a private
key merely because this document exists.

## Status and provenance

- Production: `zolotoy.dev` served by Caddy on the Selectel VPS.
- Certificate source: Let's Encrypt, issuer `YE1`, for `zolotoy.dev`.
- Observed certificate validity: **2026-10-18 13:29:39 UTC** through
  **2027-01-16 13:29:38 UTC**.
- Evidence from the actual server, **2026-10-24**:
  - `zolotoy-dev-certificate.timer` reported `enabled` and `active`.
  - Last invocation: **2026-10-24 15:45:15 UTC**, exit `0/SUCCESS`.
  - Next scheduled invocation: **2026-10-25 03:51:51 UTC**.
  - `lego` logged **Skip renewal** because the certificate was still valid;
    the installer logged `Certificate already installed`.
  - Earlier successful checks are visible on 2026-10-22 and 2026-10-23.
- The **first real automatic certificate rotation has not yet been observed**.
  The next expected renewal eligibility is approximately **2026-12-17**
  (30 days before expiry), depending on the ACME client and clock.
  Inspect the December logs and check that a new certificate actually reaches
  the local HTTPS listener. A successful "Skip renewal" is insufficient evidence
  of a completed rotation.

### Source snapshot (not yet byte-verified against the VPS)

The six source/test files below were copied **without editing** from closed
superseded PR #15, source commit
`69088f519e0a8d7188512df67687968d82d0cd2b`.

| Repository reference file | Intended installed VPS file |
| --- | --- |
| `scripts/selectel-production/renew-certificate.sh` | `/usr/local/libexec/zolotoy-dev/renew-certificate` |
| `scripts/selectel-production/install-certificate.sh` | `/usr/local/libexec/zolotoy-dev/install-certificate` |
| `deploy/systemd/zolotoy-dev-certificate.service` | `/etc/systemd/system/zolotoy-dev-certificate.service` |
| `deploy/systemd/zolotoy-dev-certificate.timer` | `/etc/systemd/system/zolotoy-dev-certificate.timer` |
| `scripts/selectel-production/test_certificates.py` | Test fixture only (not installed) |
| `scripts/selectel-production/test_renewal.py` | Test fixture only (not installed) |

The service's `ExecStart`, unit name, `lego` log messages and scheduling match
the historical design; **this does not establish file identity**. The installed
unit and scripts may have been updated after PR #15. A read-only SHA-256 comparison
with live files is required before treating this snapshot as the authoritative
recovery copy. No private key, ACME account data, DNS API token or server-secret
material is stored in this repository.

The **live production Caddyfile is not archived here**: the historical
`deploy/caddy/zolotoy-dev-production.caddy` from #15 can be stale relative
to current production routing and has deliberately **not** been reintroduced.
Retrieve the current non-secret Caddy configuration during a separate VPS audit
and preserve it as a reviewed, appropriately redacted backup.

## Read-only server audit (safe to repeat)

Run on the authenticated Selectel VPS as an authorized administrator:

```bash
systemctl is-enabled zolotoy-dev-certificate.timer
systemctl is-active zolotoy-dev-certificate.timer
systemctl list-timers --all zolotoy-dev-certificate.timer
systemctl status zolotoy-dev-certificate.service --no-pager -l
journalctl -u zolotoy-dev-certificate.service --since '2026-12-16' --no-pager -l

openssl x509 -in /etc/caddy/zolotoy-dev-tls/current/fullchain.pem \
  -noout -dates -issuer -subject -fingerprint -sha256

# Only public configuration and checksums: never output certificate private keys.
systemctl cat zolotoy-dev-certificate.service
systemctl cat zolotoy-dev-certificate.timer
for p in \
  /usr/local/libexec/zolotoy-dev/renew-certificate \
  /usr/local/libexec/zolotoy-dev/install-certificate \
  /etc/systemd/system/zolotoy-dev-certificate.service \
  /etc/systemd/system/zolotoy-dev-certificate.timer
do
  if test -f "$p"; then sha256sum "$p"; else printf 'MISSING %s\n' "$p"; fi
done
```

In a checked-out copy of **this exact PR branch**, calculate corresponding
source hashes to compare with the four installed script/unit file hashes:

```bash
sha256sum \
  scripts/selectel-production/renew-certificate.sh \
  scripts/selectel-production/install-certificate.sh \
  deploy/systemd/zolotoy-dev-certificate.service \
  deploy/systemd/zolotoy-dev-certificate.timer
```

A differing hash requires **manual diff/review**, not automatic overwrite.
Units may differ in harmless comments or important command flags; both need
review. Note that the live service references the **installed executable**
without a `.sh` extension.

Confirm that `systemctl` shows a next run, the service completed successfully,
and the local certificate is not near expiry. For the December audit, additionally
verify a changed leaf fingerprint/new `notBefore`, no deploy-hook failure,
and that Caddy serves the new certificate via a local TLS request. Never paste
private key contents or ACME account JSON into a ticket or chat.

## Why this certificate needs a dedicated timer

The historical production Caddy configuration explicitly selected PEM files at
`/etc/caddy/zolotoy-dev-tls/current/{fullchain,privkey}.pem`. With a manually
specified certificate, Caddy does not manage its ACME renewal. The designed flow
is:

1. `zolotoy-dev-certificate.timer` invokes the root-owned `oneshot` service,
   approximately twice a day (03:00 and 15:00 with up to 1 hour randomized
   delay).
2. Pinned `lego 5.5.2` uses the pre-existing ACME account and HTTP-01
   challenge webroot.
3. The installer validates the full chain, hostname, private-key correspondence,
   expiry and file permissions, stages immutable certificate directories, and
   switches the `current` symlink atomically.
4. Caddy is validated and force-reloaded only when the installed certificate
   changes. A failed installation attempts rollback and verification.

The automatic `oneshot` service being `inactive (dead)` **between runs** is
normal. A service `status=0/SUCCESS` during `Skip renewal` confirms that the
scheduled check works, **not** that actual renewal and Caddy reload have succeeded.

## Offline regression tests

The original tests use temporary files, test certificates and a fake Caddy/lego
command. They do not contact Let's Encrypt or a production server:

```bash
python3 -B -m unittest discover -s scripts/selectel-production -p 'test_*.py' -v
```

This is also a dedicated step in `.github/workflows/verify.yml`. Avoid executing
the actual `renew-certificate.sh` or `install-certificate.sh` in CI: both are
root-only operational programs for an already-provisioned server.

## Recovery policy (administrator-controlled, not automated by this PR)

1. Capture and verify the current **non-secret** Caddy configuration, current
   `systemd` units, exact binaries, checksums and `lego --version`. Preserve
   the VPS-local encrypted certificate/account backup and existing
   `/etc/caddy/zolotoy-dev-tls/` tree **outside GitHub**. Keep the working
   application release and unrelated sites untouched.
2. On a replacement host, first restore the verified application routes and
   Caddy TLS behavior from a separately reviewed backup. Do not blindly apply
   an old PR #15 production Caddyfile.
3. Restore ACME credentials/certificate private material **only** from an
   authorized secure backup using restrictive permissions. If unavailable,
   perform a separately approved issuance/reprovisioning procedure — the two
   archived scripts cannot bootstrap a missing ACME account.
4. Confirm `/var/lib/zolotoy-dev-acme` and the HTTP-01 webroot are correctly
   separated: private account and certificate state must be root-only; the
   challenge path must be publicly readable by Caddy. The original scripts
   intentionally scope `umask 022` only to the public challenge output.
5. After validating exact script/unit differences and permissions, install
   reviewed binaries into their root-owned destinations and then validate the
   configured timer. Any restart, forced renewal, ACME issuance, TLS reload or
   DNS operation requires a **separate change authorization** and a rollback
   plan.
6. Verify current local HTTPS and a browser-visible trusted leaf certificate,
   then inspect timer logs. A production build deployment is independent of
   certificate renewal.

Reference for publishing application releases (not TLS):
[Selectel production deployment](SELECTEL_PRODUCTION.md).

**Scope:** this repository change archives source material and tests only.
It does not install VPS files, touch Cloudflare DNS, change Caddy, initiate a
certificate renewal, or publish production assets.
