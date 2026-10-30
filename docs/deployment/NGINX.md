# Nginx routing and deployment contract

The Nginx profile is in `deploy/nginx/zolotoy-routes.conf` and
`deploy/nginx/zolotoy-routes.js`. It supports both `zolotoy.dev` and
`origin.zolotoy.dev`. Nginx serves the files; njs preserves raw demo/legacy
matching, public canonical redirects, and short error responses. The headers-more
module removes demo request conditionals to preserve the existing Worker behavior.
Keep the router compatible with the deployed njs engine: njs 0.9.4 does not
support optional catch bindings or `for...of`. Node syntax checks alone are not
a substitute for loading the module with Nginx.

The administrator installs both files byte-for-byte as root-owned, non-writable
by group/others files in `/etc/nginx/`. Each HTTPS server includes
`/etc/nginx/zolotoy-routes.conf` and supplies its own `root`, `server_name`, TLS,
and listen directives. Production root is
`/var/www/zolotoy-dev-production/current`; staging root is
`/var/www/zolotoy-dev/releases/current`. The wrapper and certificates remain
administrator-managed. Do not expose private certificate keys to deploy users.

Required Ubuntu packages are `nginx`, `libnginx-mod-http-js`, and
`libnginx-mod-http-headers-more-filter`. After changing the installed profile,
the administrator runs `nginx -t`, isolated routing tests, and an authorized
reload. Copying a profile alone does not prove it is active. A routing change
needs matching installed files and a reviewed repository version before staging
deployments can pass the checksum gate.

`scripts/selectel/deploy.sh` sends separate SHA256 values for the conf and JS
files. `remote.sh` verifies the installed binary and active Nginx service, both
file hashes, and ownership/modes of the files and their parent directory. It does
not run privileged `nginx -t`, reload a service, edit configuration, or read TLS
keys. Existing deployment locking, exact-archive verification, atomic current
switching, HTTP/TLS smoke, and rollback remain unchanged.

The remote command contract is:

```text
prepare RELEASE_ID origin.zolotoy.dev
apply RELEASE_ID origin.zolotoy.dev ARCHIVE_SHA256 CONFIG_SHA256 ROUTER_SHA256
rollback RELEASE_ID origin.zolotoy.dev CONFIG_SHA256 ROUTER_SHA256
```

The production deployment helper is web-server independent; it continues using
the same site root and endpoint contracts. Historical Caddy profiles and their
differential/browser checks remain as a reference; those checks alone do not
verify Nginx. `verify-nginx.yml` adds distribution Nginx/njs syntax validation and
release transaction tests. It does not yet replace the Caddy browser fixture or
provide the complete Worker-versus-Nginx HTTP corpus in CI.

Local checks:

```bash
bash -n scripts/selectel/remote.sh scripts/selectel/deploy.sh scripts/check-nginx.sh
python3 -B -m unittest discover -s scripts/selectel -p 'test_*.py' -v
bash scripts/check-nginx.sh  # Linux with the three packages installed
```

This repository change does not install files, deploy releases, or publish a PR.
Live migration evidence and rollback instructions are maintained in the separate
infrastructure migration report. Check live state before operational actions.
