# FRONTEND-IMPLEMENTATION-PROMPT-02-AUTH


## Sequential prerequisite

Assume Foundation and Order are already implemented. Reuse the existing router/shell/API/error/MSW/test/auth-capability boundaries. Implement Auth without rewriting Order; after Auth changes, rerun relevant Order regression tests because shared auth/401 behavior can affect it.

## Mandatory Auth fidelity reminders

Preserve the complete Auth-specific plan: registration, login, profile, sessions/devices, revoke-one, logout-all, admin-only route, **RBAC**, bootstrap and route guards, in-memory access-token lifecycle, cookie-compatible refresh flow, concurrent 401 refresh coordination, 403 handling, session expiration/revocation/replay consequences and rate-limit UX. Never redesign refresh-token storage around `localStorage` or `sessionStorage`.

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

You are implementing the **Auth Service frontend module and shared browser authentication lifecycle for zolotoy.dev**.

The Auth frontend is security-sensitive. Browser convenience must never weaken the backend's token/session model.

## Mandatory sources

Before code:

1. Read `02_auth_service.md` completely; it is backend source of truth.
2. Read `MASTER_FRONTEND_PLAN.md`, especially sections 1–13, 15, 18–28.
3. Inspect current shared HTTP client, router, Pinia setup, Query client and mock infrastructure.
4. If MD/OpenAPI now resolves a TBD in the master plan, use the source and update the adapter/tests accordingly.

Never present a proposed DTO/cookie behavior as an existing backend contract.


## Frozen global stack/architecture

Use existing zolotoy.dev architecture:

- one Vue 3 + TypeScript + Vite SPA;
- Vue Router;
- Vue SFC `<script setup lang="ts">`;
- TanStack Query for server data;
- Pinia only for auth lifecycle/in-memory token/principal client state;
- shared native-fetch HTTP layer, later generated OpenAPI client;
- MSW network-level mocks;
- Zod narrowly;
- shared design system;
- kebab-case files;
- Vitest + Vue Test Utils + narrow Playwright.

Do not add Nuxt/Axios/Redux/microfrontends/large IAM UI/component framework.

## Frozen browser security model

Live browser baseline:

- access token: **memory only**;
- refresh token: backend-owned `HttpOnly; Secure; SameSite` cookie;
- never store refresh token in localStorage/sessionStorage/IndexedDB/Pinia;
- never persist access token to localStorage/sessionStorage by default;
- refresh/logout requests use `credentials: include` according to final contract;
- resource APIs receive `Authorization: Bearer <access>` through shared HTTP layer;
- components never receive raw refresh token;
- do not render/log bearer values.

If current Auth OpenAPI has not fixed the browser cookie/response/CSRF details, keep them explicitly TBD and implement through a replaceable API adapter/MSW contract. Do not fall back to localStorage refresh tokens just to make the demo easier.

## Source-backed Auth behavior

Core roles:

```text
user
admin
```

User status:

```text
active
blocked
```

Core session semantics:

- access JWT short-lived;
- opaque random refresh token hashed at rest;
- each refresh rotates token;
- reuse of old refresh token indicates possible compromise;
- core strict replay policy revokes token/session family and requires new login;
- logout current and logout all exist;
- access blacklist is not MVP;
- route/frontend authorization is never authoritative.

## Fixed routes

Use source routes:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/me
GET    /api/v1/me/sessions
DELETE /api/v1/me/sessions/{session_id}
GET    /api/v1/admin/example
```

JWKS/health/metrics/swagger are operational links, not normal app-data calls.

## Required frontend routes

```text
/auth/login
/auth/register
/auth/profile
/auth/sessions
/auth/admin
```

## Auth state machine

Implement explicit client states:

```text
unknown
anonymous
authenticated
```

`refreshing` may be a transient coordinator state.

On application startup:

1. state `unknown`;
2. attempt cookie-based refresh/bootstrap;
3. success -> memory access token -> `/me` -> authenticated;
4. no valid refresh session -> anonymous without fatal app error;
5. infrastructure failure -> normalized service error/retry behavior as designed.

Protected routes must not flash authenticated content while state is `unknown`.

## Mandatory single-refresh coordinator

Strict token rotation makes this critical.

When multiple protected requests receive 401:

- first eligible request starts exactly one refresh promise;
- others await it;
- refresh rotates cookie once;
- successful refresh updates memory token;
- each original request retries at most once;
- refresh request itself cannot recursively trigger refresh;
- 403 never triggers refresh;
- refresh failure clears auth/query state consistently;
- reuse-detected safe error routes to sign-in with a security message.

Write dedicated concurrency tests for this behavior.

## Required UI scope

Implement:

- register;
- login;
- profile;
- sessions/device list;
- revoke one session;
- logout current;
- logout all;
- admin-only demo page;
- route guards;
- session-expiration UX;
- refresh failure/revocation/replay consequences;
- 401/403/rate-limit handling;
- loading/empty/error states;
- responsive/a11y behavior.

Do not implement social login, OAuth provider UI, MFA, password reset, WebAuthn, user-admin console unless source scope has explicitly changed.

## Security UX rules

- invalid login remains generic; do not reveal user-not-found vs wrong-password;
- support password-manager autocomplete rather than disabling it;
- no raw JWT/token inspector by default;
- do not log passwords/token responses;
- safe redirect after login accepts internal routes only;
- 403 renders access denied without logout;
- blocked/revoked/reused error text follows safe backend code mapping;
- logout clears authenticated Query cache.

## Session page

Render only safe fields actually returned by contract. Device label/current-session indicator are allowed only when API supplies them. Do not expose token hash, refresh lineage/family secrets or unnecessary raw IP.

Revoke one session uses confirmation. Logout-all clearly warns current browser session will end.

## Mock requirements

MSW deterministic scenarios at minimum:

- anonymous;
- active normal user;
- active admin;
- invalid credentials;
- duplicate email;
- blocked user;
- access expired + refresh success;
- refresh expired;
- session revoked;
- refresh reuse detected/family revoked;
- login rate limited.

Mock UI never receives a refresh token value. Simulate replay through mock server state/scenario controls, not by exposing a real-style cookie secret to components.

## Testing requirements

At minimum:

- bootstrap unknown state;
- protected route redirect;
- no token persistence to Storage;
- concurrent 401 -> one refresh;
- request retries once;
- refresh 401 no recursion;
- 403 no refresh;
- refresh failure clears auth/caches;
- reuse detection preserves safe sign-in reason;
- sessions revoke/logout-all behavior;
- normal user admin 403;
- critical Playwright auth demo.

## Contract TBDs to keep visible

Until source/OpenAPI fixes them:

- exact login request/browser response;
- refresh request/response/Set-Cookie;
- no-session status/code;
- logout cookie-clearing semantics;
- CSRF mechanism;
- session list safe DTO/current marker;
- register success semantics;
- external safe error codes.

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
