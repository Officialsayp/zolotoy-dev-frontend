# FRONTEND-IMPLEMENTATION-PROMPT-04-SHORTENER


## Sequential prerequisite

Assume Foundation, Order, Auth and Notification are already implemented. Reuse all shared infrastructure and established visual/error conventions. Do not add a separate analytics framework or create a second shared layer.

## Codex repository execution contract

This is a **real repository modification task**. Do not stop at planning and do not return a bundle of source files for manual copy/paste when repository editing/terminal tools are available.

### Source priority

```text
backend MD
  -> MASTER_FRONTEND_PLAN.md
    -> current repository + applicable AGENTS.md instructions
      -> this execution prompt
        -> local Codex choice
```

If a real contradiction appears, identify it explicitly. Do not silently change backend rules or the global frontend architecture.

### Before any edits — mandatory repository inspection

Inspect all relevant available items:

1. repository root/current working directory;
2. applicable `AGENTS.md` / `AGENTS.override.md` files and their scope;
3. `git status` and current uncommitted changes;
4. `package.json`, lockfile and actual package manager;
5. current directory structure;
6. Vue/Vite/TypeScript/lint/test/build configuration;
7. router and layouts/navigation;
8. shared UI/design tokens;
9. shared API/HTTP/error/config layer;
10. shared mock/MSW/scenario infrastructure;
11. existing tests/test utilities;
12. relevant README/docs/OpenAPI/generated clients;
13. service modules already implemented by previous prompts.

Do not assume a pristine repository and do not overwrite user changes.

### Before editing — output this compact inventory

```text
CREATE:
- exact files/directories expected to be added

MODIFY:
- exact existing files expected to change

PRESERVE:
- relevant existing architecture/user changes that must remain untouched

CONTRACT/TBD NOTES:
- unresolved backend/API points affecting this task
```

Then directly implement the task in repository files.

### Git/scope rules

- Do not create a second Vue application/repository.
- Reuse existing router, design system, HTTP client, error model, MSW bootstrap, test infrastructure and configuration.
- Do not use `git reset --hard`, `git clean -fd`, force push, destructive checkout/revert or delete user changes.
- Do not commit or push unless the user explicitly asks.
- Do not fix broad unrelated issues. If an unrelated issue blocks the task, make the smallest necessary fix and report it.
- Inspect `git diff`/`git status` before final response and ensure the patch matches task scope.

### Dependency rules

Before adding a dependency, verify installed/native alternatives, master-plan approval, concrete benefit and maintenance cost. No framework/router/state-management/HTTP/mock/test/UI-library migrations inside this service task.

### Mandatory verification loop

After coherent implementation slices and before completion, use the repository's actual scripts/tools. At minimum when available:

```text
lint
-> typecheck / vue-tsc
-> relevant tests
-> relevant E2E subset when required
-> production build
```

For failures: inspect → fix current-task regressions → rerun. Never claim a command passed if it was not executed successfully. If environment limitations prevent a check, report the exact command attempted, failure reason and unverified area.

You are implementing the **URL Shortener + Analytics frontend module for zolotoy.dev**.

This frontend is deliberately small. It demonstrates management and observable consequences of the backend's caching/performance design; it must not become a Bitly clone or Redis control panel.

## Mandatory sources

Before code:

1. Read `04_url_shortener.md` completely — backend source of truth.
2. Read `MASTER_FRONTEND_PLAN.md`, especially sections 1–12, 17–28.
3. Inspect current shell/auth/API/design/mock infrastructure.
4. If current OpenAPI resolves a TBD, follow it and update adapters/tests instead of retaining old proposal.

Never claim a proposed update/analytics/auth contract already exists.


## Frozen global architecture/stack

Use existing zolotoy.dev frontend:

- one Vue 3 + TypeScript + Vite SPA;
- Vue Router;
- SFC `<script setup lang="ts">`;
- TanStack Query for server state;
- Pinia only global/auth state;
- native shared fetch then generated OpenAPI client when stable;
- MSW deterministic mocks;
- Zod narrowly where useful;
- Chart.js only for analytics visualizations that need it;
- shared lightweight design system;
- kebab-case filenames;
- Vitest/VTU + narrow Playwright.

No Nuxt/Axios/Redux/microfrontend/large UI library.

## Fixed backend scope

Core management:

- create short link;
- custom alias optional;
- expiration optional;
- metadata;
- list own links;
- enable/disable;
- logical delete;
- analytics.

Analytics dimensions:

- total clicks;
- clicks by day;
- referrer domain;
- coarse device category (`mobile`, `desktop`, `bot`, `unknown`).

Public redirect:

```text
GET /{code}
```

MVP recommendation is HTTP 302 for active link.

Do not add preview/title fetch, QR core feature, campaign tools, folders/tags, branded domains or other Bitly-like features unless source explicitly activates stretch scope.

## Fixed management routes

```text
POST   /api/v1/links
GET    /api/v1/links/{id}
GET    /api/v1/links
PUT    /api/v1/links/{id}
DELETE /api/v1/links/{id}
GET    /api/v1/links/{id}/analytics
```

Exact create request is:

```text
url
custom_alias? 
expires_at?
```

Exact source create response includes:

```text
id
code
short_url
url
expires_at
created_at
```

Do not reconstruct `short_url` when backend returns it.

## Required frontend routes

```text
/shortener
/shortener/:linkId
```

Keep create form on management dashboard initially; no need for a separate new-link page.

## Required UI

### `/shortener`

- create form;
- optional custom alias;
- optional expiration;
- success short URL copy/open;
- cursor/keyset list;
- status/expiry metadata;
- detail navigation;
- loading/empty/error/rate-limit states.

Do not issue one analytics request per list row merely to show click counts.

### `/shortener/:linkId`

- metadata;
- copy/open short URL;
- original URL;
- status/expiry;
- enable/disable/delete only through agreed PUT/delete contract;
- analytics total/by-day/referrer/device;
- Grafana/performance-report links when configured.

## Contract TBDs

Keep explicit until backend fixes them:

- management auth/ownership and nullable owner semantics;
- exact link status enum/derived-expired behavior;
- exact PUT request/response fields;
- analytics response DTO;
- keyset query/envelope field names;
- public unavailable behavior `404` vs `410`;
- redirect hostname infrastructure (frontend proposal `s.zolotoy.dev`, but API `short_url` is authoritative).

Do not implement a generic editable form for fields the backend has not declared mutable.

## Validation

Frontend may mirror source rules for UX:

- only `http`/`https` URLs;
- custom alias 4–32 chars;
- alphanumeric + `-`/`_`;
- optional expiration.

Backend validation remains authoritative. Preserve form values when backend rejects alias/rate limit.

Do not add target-preview fetch; that would create new SSRF-sensitive backend scope explicitly excluded from MVP.

## Analytics

Use a small analytics presentation:

- total clicks;
- line chart by day;
- referrer ranking/bar list;
- device categories;
- accessible table/text representation derived from same view model.

Chart.js is acceptable here. Do not add a general dashboard/charting platform.

## Redis/cache/performance boundary

Absolutely do not invent frontend endpoints or panels for:

- Redis keys;
- cache TTL editing;
- cache hit state per link/request;
- singleflight lock state;
- cache shards.

Those are backend/internal mechanics. Demonstrate them through configured Grafana/performance docs/live demo scripts.

Frontend can link to observability; it does not simulate infrastructure truth.

## Redirect behavior

`Open short URL` should navigate/open the returned short URL and exercise real HTTP redirect in live mode.

Do not treat `GET /{code}` as a JSON management call.

Mock mode may simulate redirect behavior at network/E2E boundary if browser service-worker navigation limitations require it, but label simulation honestly.

## Mock requirements

Deterministic scenarios:

- active happy link;
- populated analytics;
- empty analytics;
- disabled;
- expired;
- logical deleted metadata if contract exposes it;
- custom alias conflict;
- invalid URL;
- rate limited;
- not found;
- service unavailable.

Stable IDs/codes/timestamps; reset restores exact baseline. No fake Redis-state fixtures in UI.

## Testing requirements

At minimum:

- exact create request fields;
- URL/alias form behavior;
- backend validation/error preservation;
- copy success accessibility;
- delete confirmation;
- update actions capability-gated until contract exists;
- analytics DTO->view model/empty handling;
- chart/table use same data;
- rate-limit handling;
- no per-row analytics N+1;
- no cache-inspection API call;
- critical Playwright create->detail/analytics flow.

## Codex task completion gate

Do **not** mark this task complete until:

- required functionality is implemented in repository files;
- backend MD and master-plan rules are preserved;
- shared infrastructure is reused rather than recreated;
- deterministic mock mode works without the Go backend for this module;
- components do not import fixtures directly;
- loading, empty and relevant error/auth/conflict states are implemented;
- responsive desktop/tablet/mobile behavior has been inspected, including long identifiers/text and overflow;
- relevant accessibility baseline is preserved;
- relevant tests are added/updated;
- lint passes if available;
- typecheck passes if available;
- relevant tests pass;
- production build passes;
- required relevant E2E passes where runnable;
- `git diff`/`git status` were inspected;
- unrelated changes are absent or explicitly identified as minimal blockers;
- documentation/config examples are updated if behavior/config changed;
- no commit/push was performed without explicit instruction.

Final response must summarize: files changed, implemented behavior, checks actually run/results, unresolved source-contract TBDs, and any environment limitation. Do not paste every file's content unless the user explicitly asks.
