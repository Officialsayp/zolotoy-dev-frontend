# zolotoy.dev: unattended Selectel production deployments

> Caddy/lego installation and TLS recovery details in this historical runbook
> predate the Nginx migration. Use [NGINX.md](NGINX.md) and the current
> infrastructure migration report for hosting/TLS operations. The release root,
> exact-artifact deployment, and application rollback protocol remain applicable.

The production release root is `/var/www/zolotoy-dev-production/current`.

Certificate renewal on the VPS is a **separate root-owned lego/systemd service**,
not part of the application release workflow. Read the
[TLS renewal and recovery runbook](SELECTEL_TLS_RECOVERY.md) before making any
certificate, Caddy or ACME changes. The archived unit/script copies must be
compared against installed VPS files before reuse.
The root-owned baseline observed on 21 Oct 2026 points to
`releases/prod-20261018T145910Z-8c7625cbd433/site`, containing the old
English text `résumé`. The corrected commit is `ffaa95f`.

This pipeline is separate from the staging user `zolotoydeploy` and the
`/var/www/maxzolotoy` website. No Cloudflare, Caddy, TLS or DNS change occurs.

## Deployment controls

- PR: full `verify` suite only, no production secrets. It checks lint, unit tests,
  build/type-check, desktop/mobile browser scenarios against Worker and Caddy,
  717 routing comparisons, TLS and production transaction integration tests.
- `main` push: run `verify` first; deployment is skipped unless GitHub
  repository variable `SELECTEL_PRODUCTION_DEPLOY_ENABLED=true`.
- First approved rollout: use Actions → **verify** → Run workflow on `main`;
  check `publish_production`, after setting the enable variable.
- Reusable workflow: `.github/workflows/deploy-selectel-production.yml`.
- `verify` builds the checked SHA using `VITE_API_MODE=mock` and
  `VITE_DEPLOY_ENV=production`; it tests and packages that exact build using
  `package-release.py`. The deployment job downloads the same run's immutable
  archive and does not reinstall dependencies or rebuild with secrets available.
  Its release ID comes from the successful verification job, including on retry.
- Deploys as non-root `zolotoyprod`; SHA-256 verifies archive and individual files.
- Atomically switches the production `current` symlink, then compares HTTPS
  responses from local Caddy for /, /ru/, /demo/, a deep demo route, robots.txt,
  sitemap.xml, entry JS/CSS and MSW. It checks /_health and /_release, including
  identity again after the smoke. Failed smoke or SIGHUP/SIGINT/SIGTERM restores
  the previous symlink and checks it. Older releases are retained.
- The remote lock rejects overlapping transactions. Both directory ancestors and
  nested release directories are readable by Caddy even with a restrictive umask.
- SSH refuses unknown host keys; no `StrictHostKeyChecking=no` or sudo in CI.
- Disabling `SELECTEL_PRODUCTION_DEPLOY_ENABLED` stops future automatic deploys.

## One-time setup on the existing VPS (administrator)

Confirm these paths and the current symlink before changing file ownership:

```bash
readlink -f /var/www/zolotoy-dev-production/current
ls -ld /var/www/zolotoy-dev-production /var/www/zolotoy-dev-production/releases
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Keep a backup of the current production release, Caddy configuration and
authorized_keys. Confirm no other site is rooted at this production directory.

Create the isolated login (only if it does not exist):

```bash
useradd -m -s /bin/bash zolotoyprod
passwd -l zolotoyprod
install -d -m 0700 -o zolotoyprod -g zolotoyprod /home/zolotoyprod/.ssh
```

Generate a **separate, single-purpose Ed25519 SSH key** locally on the Mac.
Place **only the public key**, prefixed with OpenSSH `restrict`, into
`/home/zolotoyprod/.ssh/authorized_keys` with mode 0600 and owner
`zolotoyprod`. Never send private keys through chat or commit them to Git.
Validate SSH access as `zolotoyprod`, with no sudo rights and no group
membership granting write access to staging or `maxzolotoy.com`. `restrict`
disables forwarding, PTY allocation and SSH user rc execution; this account has
no sudo rights. Only the two production parent directories below become writable.
Load the private key directly into the Environment secret over stdin, never a
command-line argument. Remove the temporary local private key after verifying
SSH access and successful secret storage.

Verify the server host key against an existing trusted pin or the provider's
authenticated console. A fresh unauthenticated `ssh-keyscan` alone is insufficient.

After confirming the above, grant permissions **non-recursively** to the
production root and its releases parent:

```bash
chown zolotoyprod:zolotoyprod /var/www/zolotoy-dev-production
chown zolotoyprod:zolotoyprod /var/www/zolotoy-dev-production/releases
```

Do not recursively chown old releases or touch sibling trees. The Caddy config
and the existing root-owned release contents remain unchanged. The new user
can atomically replace the symlink because it owns the production parent.

## GitHub one-time configuration

Create Environment **selectel-production**, restrict deployment branches to
`main`, and store Environment secrets:

- `VPS_PRODUCTION_HOST`: `135.106.186.27`
- `VPS_PRODUCTION_USER`: `zolotoyprod`
- `VPS_PRODUCTION_SSH_KEY`: dedicated private deploy key
- `VPS_PRODUCTION_KNOWN_HOSTS`: independently verified VPS SSH ED25519 host key

Create repository variable `SELECTEL_PRODUCTION_DEPLOY_ENABLED` initially
as `false`. Only set to `true` after the production user, trusted keys,
ownership and explicit smoke test are verified.

## Controlled first rollout

1. Run GitHub PR checks and review its diff.
2. Merge to `main` while the enable variable is **false**.
3. Create the dedicated account and GitHub Environment settings, if not done.
4. Set the enable variable to `true`. Trigger Actions → `verify` manually on
   `main` with `publish_production` checked.
5. Check Actions job `Selectel production (after verify)` and the resulting
   `current` symlink. Confirm the new production HTML contains `resume`.
6. Subsequent pushes to `main` publish automatically. PRs only verify.

After a remote failure, start a **new manual verify run** with
`publish_production=true`, or choose **Re-run all jobs**. This creates a newly
verified release ID. **Re-run failed jobs** can reuse the verified archive if no
remote prepare occurred, but deliberately refuses to overwrite a previous upload
directory or an existing immutable release. Do not delete releases to force a retry.

Do not edit `/etc/caddy/*`, Cloudflare Routes, DNS or site content on the server
for ordinary frontend updates. Existing root-owned staging and the first
production backup remain intact.

## Rollback

Automatic rollback runs if the VPS-local HTTPS validation fails. A retained
immutable release may later be selected with the reviewed
`scripts/selectel/production-remote.py rollback RELEASE_ID` command, invoked
over SSH as `zolotoyprod`. It verifies the full stored manifest before switching,
then checks HTTPS. If the target fails smoke, the prior active release is restored.
The original legacy `prod-...` release is supported only with its matching
production/mock manifest and full file hashes. No private deploy key needs to be
downloaded from GitHub: an authenticated administrator can run the same checked
script as the dedicated account:

```bash
ssh -o StrictHostKeyChecking=yes root@135.106.186.27 \
  "runuser -u zolotoyprod -- python3 - rollback RELEASE_ID" \
  < scripts/selectel/production-remote.py
```

Before a manual rollback, set repository variable
`SELECTEL_PRODUCTION_DEPLOY_ENABLED=false` and let any running deployment finish.
Re-enable only after deciding which source commit should be deployed next.
Verify `https://zolotoy.dev/_health`, `https://zolotoy.dev/_release` and public
content after every manual operation. The first rollout's root-owned backup is
kept outside the deployment user's writable tree under
`/var/backups/zolotoy-dev-production/`.

A SIGKILL or host power loss cannot be trapped. Inspect `current` and the
web content before retrying in those cases. No release pruning is performed
until a separate retention policy is approved. Disabling the repository variable
does not cancel a deployment that has already started.
