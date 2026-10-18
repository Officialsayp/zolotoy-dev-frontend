# Selectel staging verification — 2026-10-18

Prepared from `main` at `105a395c891f808bb515052986d84a33301a537b` on
`codex/selectel-staging`. This records local preparation, not a remote release.

## Results

| Verification | Result |
| --- | --- |
| Locked dependency installation | Passed; lockfile unchanged |
| ESLint and TypeScript | Passed |
| Full mock build, 12 prerendered pages and built-site checks | Passed |
| Vitest | 297 tests in 42 files passed |
| Worker/Caddy HTTP differential corpus | 713/713 passed |
| Existing Playwright suite against Worker | 164/164 passed, desktop and mobile |
| Same Playwright suite against Caddy | 164/164 passed, desktop and mobile |
| SSH client, release integrity, concurrency, signal handling and rollback tests | 18/18 passed |
| Empty-release Caddy state | Health 200; frontend/release routes 503 with no-store |
| Isolated TLS with explicit CA and hostname verification | Passed; no trust-store installation |
| Actual deployment smoke program against real local Caddy | Passed with a release marker and TLS, all traffic mapped to loopback |
| Actionlint 1.7.12, Bash syntax, Caddy adaptation/formatting, diff whitespace | Passed |

Local runtime: macOS ARM64, Node 26.8.2, npm 11.19.1, Caddy 2.11.4. Node 26
is within the repository's supported engine range; Actions selects Node 24 from
`.node-version`. Chromium initially could not start inside the macOS execution
sandbox (`MachPortRendezvousServer: Permission denied`); both complete browser
suites then passed with the required local process permission. No tests were
skipped or weakened to accommodate that environment failure.

The differential report is generated at `test-results/selectel-routing.json`.
The [routing contract](SELECTEL_ROUTING.md) records intentional staging noindex,
health/release additions, equivalent MIME spellings, implementation-specific
ETags, and the allowed omission of Content-Type on a bodyless 304.

## Remote observations and remaining actions

Read-only SSH confirmed Caddy 2.11.4 and the currently installed health/503
configuration. Public HTTPS requests verified staging health 200, staging root
503, production `zolotoy.dev` 200 and `maxzolotoy.com`'s existing root redirect.
Certificate validation succeeded for all three hosts. GitHub environment names
and its main-only policy were read without retrieving secret values.

The existing Cloudflare Worker, Wrangler configuration, deployment scripts,
verification workflow and lockfile are unchanged. No branch was pushed, PR
merged, remote release uploaded, Caddy configuration installed/reloaded or DNS
record changed during preparation. The [runbook](SELECTEL_STAGING.md) contains
the exact administrator installation and first manual staging deployment steps;
those require the user's separate confirmation.

Two operational limits remain documented in the runbook: deploy-user ownership
currently extends to the parent site directory, and an already-open old browser
tab can request a removed hashed chunk after switching current. The unchanged
lockfile also reports four high-severity development dependency audit findings
(`@vue/eslint-config-typescript`, `braces`, `fast-glob`, `micromatch`); this
migration does not change dependencies or claim to resolve those findings.
