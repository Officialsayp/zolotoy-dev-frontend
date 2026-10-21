# zolotoy.dev: unattended Selectel production deployments

Production is hosted directly by Caddy from `/var/www/zolotoy-dev-production/current`.
The root-owned baseline observed on 21 Oct 2026 points to
`releases/prod-20261018T145910Z-8c7625cbd433/site`, containing the old
English text `résumé`. The corrected commit is `ffaa95f`.

This pipeline is separate from the staging user `zolotoydeploy` and the
`/var/www/maxzolotoy` website. No Cloudflare, Caddy, TLS or DNS change occurs.

## Deployment controls

- PR: full `verify` suite only, no production secrets.
- `main` push: run `verify` first; deployment is skipped unless GitHub
  repository variable `SELECTEL_PRODUCTION_DEPLOY_ENABLED=true`.
- First approved rollout: use Actions → **verify** → Run workflow on `main`;
  check `publish_production`, after setting the enable variable.
- Reusable workflow: `.github/workflows/deploy-selectel-production.yml`.
- Builds the checked SHA using `VITE_API_MODE=mock` and `VITE_DEPLOY_ENV=production`;
  packages immutable artifacts using existing `package-release.py`.
- Deploys as non-root `zolotoyprod`; SHA-256 verifies archive and individual files.
- Atomically switches the production `current` symlink, then compares HTTPS
  responses from local Caddy for /, /ru/, /demo/, robots.txt and sitemap.xml.
  A failed smoke test restores the previous symlink. Older releases are retained.
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
Place **only the public key** into
`/home/zolotoyprod/.ssh/authorized_keys` with mode 0600 and owner
`zolotoyprod`. Never send private keys through chat or commit them to Git.
Validate SSH access as `zolotoyprod`, with no sudo rights and no group
membership granting access to staging or `maxzolotoy.com`.

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

Do not edit `/etc/caddy/*`, Cloudflare Routes, DNS or site content on the server
for ordinary frontend updates. Existing root-owned staging and the first
production backup remain intact.

## Rollback

Automatic rollback runs if the VPS-local HTTPS validation fails. A retained
immutable release may later be selected with the reviewed
`scripts/selectel/production-remote.py rollback RELEASE_ID` command, invoked
over SSH as `zolotoyprod`. Manual rollback of a legacy `prod-...` release
requires administrator verification of the target; automatic failure rollback
still supports restoring the original legacy release.

A SIGKILL or host power loss cannot be trapped. Inspect `current` and the
web content before retrying in those cases. No release pruning is performed
until a separate retention policy is approved.
