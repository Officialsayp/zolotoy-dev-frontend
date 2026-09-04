# MASTER FRONTEND PLAN — zolotoy.dev

**Status:** finalized architecture/specification for subsequent Codex repository execution; frontend code is intentionally out of scope for this document.  
**Execution target:** Codex working agentically inside one real Git repository for the zolotoy.dev frontend.  
**Target:** a single technical/demo frontend environment for four Go backend portfolio services.  
**Primary sources of truth:** `01_order_service.md`, `02_auth_service.md`, `03_notification_service.md`, `04_url_shortener.md`.  
**Secondary source:** provided Ozon Frontend conventions, used only for portable engineering principles; corporate-only libraries/infrastructure are not adopted.

---

## Contract notation used in this plan

To keep frontend planning honest while backend contracts are still evolving, every non-obvious decision uses one of these labels:

- **SOURCE CONTRACT** — explicitly fixed by one of the four backend MD files.
- **DERIVED INVARIANT** — follows directly from a documented backend invariant/state flow, but is not itself a published HTTP contract.
- **PROPOSED CONTRACT** — a concrete backend API shape suggested to make the frontend possible; it is not part of the current source of truth until accepted in the corresponding backend MD/OpenAPI.
- **Frontend proposal — not fixed by backend specification** — frontend-only UX/architecture choice that does not expand backend behavior.
- **TBD / requires API contract decision** — the MD does not define enough information to implement live integration safely. Mock-first work may proceed behind the API boundary, but the point must be resolved before final OpenAPI integration.

The frontend must never silently upgrade a proposal into an existing backend capability.

## Source-of-truth and repository-execution priority

For implementation work performed by Codex, use this precedence order:

```text
backend service MD
  -> MASTER_FRONTEND_PLAN.md
    -> existing repository state + applicable repository instructions
      -> current service execution prompt
        -> local implementation choice by Codex
```

Interpretation:

1. Backend business rules, state transitions, security semantics and API contracts win over frontend convenience.
2. This master plan fixes the shared frontend architecture, design system, mock/error/API strategy and cross-service conventions. A single service task must not redesign them silently.
3. The repository is not assumed to be pristine. Existing files, tests, scripts, configuration, uncommitted user changes and applicable `AGENTS.md`/`AGENTS.override.md` instructions must be inspected before editing. Repository instructions are followed where they do not contradict the backend MD or this master plan.
4. A service prompt narrows scope for one execution step; it does not supersede the backend MD or global architecture.
5. Codex may make local implementation decisions only inside the remaining degrees of freedom.
6. If these layers conflict materially, Codex must stop treating the point as implicit, identify the contradiction in its implementation report, and choose the least-invasive path that preserves higher-priority sources. It must not silently rewrite architecture or backend scope.

## Codex repository workflow baseline

Every implementation task is an **agentic repository task**, not a code-snippet generation task. The expected loop is:

```text
specification
  -> repository + AGENTS.md inspection
  -> git/worktree inspection
  -> implementation inventory
  -> edit real files
  -> lint/typecheck/tests/build
  -> inspect failures
  -> minimal fixes
  -> rerun checks
  -> git diff inspection
  -> final verification report
```

Codex must operate on the real repository whenever repository tooling is available. It must not respond with dozens of files for manual copy/paste instead of editing those files itself. It must not commit or push unless the user explicitly asks.

---

# 1. Executive summary

zolotoy.dev should be implemented as **one Vue 3 SPA with one application shell and four lazy-loaded service modules**:

- `/orders`
- `/auth`
- `/notifications`
- `/shortener`

This is one deployable frontend, not four SPAs and not a microfrontend system. The shell provides navigation, environment/API-mode visibility, authentication context, service health indicators and links to technical resources. Each service module owns its pages, API facade, query definitions, view models, mock handlers and service-specific tests.

The frontend exists to make backend mechanics observable and manually testable. It is not a second personal portfolio and not a product storefront. The main zolotoy.dev page should answer five technical questions quickly:

1. What services exist?
2. What backend concept does each demonstrate?
3. Is the live backend reachable/ready?
4. Can the interviewer open a deterministic mock demo if live services are unavailable?
5. Where are API docs, source code and observability resources?

### Core architectural decisions

- **One SPA + modular shell.** KISS/YAGNI wins over separate SPAs/subdomain frontends/microfrontends.
- **Vue 3 + TypeScript + Vite + Vue Router.** No Nuxt: SSR/SEO are not requirements.
- **Pinia only for true client-global state**, principally auth/session state; do not put fetched server data in Pinia.
- **TanStack Vue Query for server state**: list/detail queries, mutations, invalidation, loading/refetch/error lifecycle.
- **Native Fetch initially** behind one typed HTTP boundary; after OpenAPI stabilizes use `openapi-typescript` + `openapi-fetch` rather than Axios.
- **MSW for mock-first development.** Mock mode intercepts the same HTTP requests used by real mode, so components and frontend service layers never import fixture data.
- **Deterministic fixtures** with stable IDs and scenario presets. No random data on refresh.
- **Zod, narrowly scoped** to pre-OpenAPI request/form/mock validation and runtime config validation; it is not the source of backend truth.
- **Chart.js only where actual analytics exist**: Notification operational summaries if an API is agreed, and Shortener click analytics. Every chart requires a textual/table alternative.
- **No general-purpose UI framework.** A small in-repo shared UI layer using semantic HTML, native `<dialog>`, CSS custom properties and a small icon package is sufficient.
- **One security model across modules.** Access JWT in memory; refresh credential in `HttpOnly; Secure` cookie in browser mode. Never store refresh token in `localStorage`.
- **API DTOs never leak directly into presentation code when transformation is needed.** Generated DTO types belong at the network boundary; view models belong in module presentation/application code.

### Backend-specific frontend emphasis

- **Order:** state machines, allowed actions, idempotent commands, optimistic conflict UX and history.
- **Auth:** secure browser session lifecycle, refresh rotation consequences, RBAC, session revocation and 401/403 behavior.
- **Notification:** operational job lifecycle and the visual chain `event -> job -> attempts -> provider result -> retry/dead/sent`.
- **Shortener:** link lifecycle, public redirect, expiry/disable behavior and analytics; caching internals remain in Grafana/technical docs unless a real API exposes them.

---

# 2. Анализ архитектурных вариантов

## A. Один Vue application + Vue Router

**Complexity:** low.  
**Deploy:** one static build/deployment.  
**Design consistency:** excellent.  
**Service independence:** good at source-folder/route level, weak at deployment level.  
**Mock development:** straightforward.  
**Auth/CORS:** easiest because all modules share one browser application and auth state.  
**Future expansion:** sufficient for several more demo services.  
**Cost:** lowest.

Risk: without module boundaries, the repository can degrade into a flat `components/` directory. This is solved structurally, not by splitting deployables.

## B. Один frontend shell + service modules

This is best understood as a disciplined form of option A, not a separate runtime architecture. There is still one SPA/deployable, but the code is partitioned by service module and routes are lazy-loaded.

**Complexity:** low-to-moderate.  
**Deploy:** one.  
**Design consistency:** excellent.  
**Independence:** strong enough for this project because each service owns its API, mocks, queries and pages.  
**Mock development:** excellent.  
**Auth:** one shared auth integration.  
**Future expansion:** strong without speculative infrastructure.  
**Cost:** slightly higher than a flat SPA, but pays back immediately in clarity.

## C. Отдельные SPA для каждого сервиса

**Complexity:** high relative to scope.  
**Deploy:** 4+ pipelines/builds.  
**Design consistency:** requires shared package/versioning discipline.  
**Independence:** excellent, but unnecessary.  
**Auth/CORS:** duplicated and easier to get subtly inconsistent.  
**Mock development:** duplicated setup.  
**Portfolio/demo value:** low incremental value; mostly shows frontend deployment fragmentation rather than backend concepts.  
**Cost:** too high.

Rejected by KISS/YAGNI.

## D. Frontend per subdomain

Example: `orders.zolotoy.dev`, `auth.zolotoy.dev`, etc.

Benefits are mainly organizational/deployment isolation. Costs include more DNS, TLS, CORS, cookie and routing concerns plus visual drift. Because all four UIs are intentionally secondary demo clients, the isolation has no business payoff.

Rejected.

## E. Microfrontends/module federation

No independent frontend teams, release cadences or runtime ownership boundaries exist. Microfrontends would introduce a problem the project does not have.

Rejected explicitly.

## Decision

**Choose B implemented as A:** one Vite/Vue SPA, one shell, four route-level service modules, one shared design/API/auth foundation, lazy-loaded by Vue Router.

This provides enough modularity to reason about four services while keeping deployment, security, testing and visual consistency simple.

---

# 3. Выбранная архитектура и причины

Logical flow:

```text
Browser
  -> zolotoy.dev SPA shell
      -> Router
          -> Order module
          -> Auth module
          -> Notification module
          -> Shortener module
      -> shared auth/session state
      -> shared query client
      -> shared HTTP/error boundary
          -> service API facade
              -> native/openapi fetch client
                  -> REAL network
                  -> MSW interception in MOCK mode
```

Important rules:

1. Vue components never import mock fixtures.
2. Vue components never call `fetch()` directly.
3. Pages consume module-level query/mutation composables and presentation models.
4. API facades are service-specific; avoid a giant generic repository/client abstraction.
5. Server state lives in TanStack Query cache, not Pinia.
6. Auth state is global because it genuinely spans services.
7. Mock and real modes exercise the same HTTP adapter path.
8. Backend state transitions remain authoritative; frontend action gating is convenience/clarity only.
9. Route modules may be lazy-loaded; shared shell and auth bootstrap load immediately.
10. There is no cross-service frontend call orchestration unless required by an existing backend contract. The shell may reuse Auth identity and service health, but it must not implement distributed business logic in the browser.

### Single-repository execution invariant

The selected architecture maps to **one frontend Git repository**. All four modules must reuse the same application shell and shared infrastructure. Codex must not bootstrap another Vue application from within a service task.

Repository-level ownership:

- `src/app` / router / shell: common;
- `src/shared/ui`: shared lightweight UI primitives;
- `src/shared/api`: transport, config, normalized errors and generated-client boundaries;
- `src/mocks`: one MSW bootstrap/scenario system with service-owned handlers/fixtures;
- `src/modules/orders`: Order-specific code;
- `src/modules/auth`: Auth-specific code;
- `src/modules/notifications`: Notification-specific code;
- `src/modules/shortener`: Shortener-specific code.

Shared extraction follows **Rule of Three plus semantic stability**. Two similar lines do not justify a generic abstraction. Conversely, layout, buttons, dialogs, generic table shells, error normalization, environment configuration and mock bootstrap must not be independently reimplemented by each service.

### Why this is stronger for an interview

The interface demonstrates architectural restraint. It makes backend behaviors visible without pretending the frontend is a separate enterprise platform. The interviewer can inspect precise request outcomes, state changes and failures, while the architecture remains easy to explain in a few minutes.

---

# 4. Technology decisions

## Core

### Vue 3 — YES

**Why:** fixed baseline in all backend plans; mature Composition API; first-class TypeScript.  
**Where:** all UI.  
**Why native/simple alternative is insufficient:** vanilla JS would increase repetitive state/rendering code across four modules.  
**Can be removed:** no, this is the chosen framework.

### TypeScript strict mode + `vue-tsc` — YES

**Why:** contracts, state machines and error mappings are a major part of the demo; static typing makes accidental cross-service shape drift visible.  
**Where:** all Vue/TS code; `vue-tsc` is the CI/typecheck path for SFC templates and script code.  
**Why a simpler/native implementation is insufficient:** plain JavaScript and editor-only checking cannot reliably catch DTO/view-model/prop contract errors across four services.  
**Can be removed:** no without materially weakening the chosen Vue/TypeScript baseline.

Use strict typing, avoid `any`, avoid uncontrolled casts. Portable principle from the provided frontend convention: fully typed client and API layer. The corporate `@fe/tsconfig` is not used.

### Vite — YES

**Why:** standard lightweight Vue build/dev tool, fast HMR and static production build.  
**Where:** application bootstrap, dev server, environment configuration, production bundle and lazy route chunks.  
**Why a simpler/native implementation is insufficient:** maintaining Rollup/esbuild/browser-module plumbing manually adds build-system work with no backend-demo value.  
**Can be removed:** not realistically while keeping the chosen Vue toolchain; replacing it with another bundler would be lateral complexity.  
**Nuxt:** NO. SSR and SEO for internal service UIs are not requirements; Nuxt would add routing/server conventions without value.

### Vue Router — YES

**Why:** one SPA needs deterministic deep links, nested/lazy service routes, route metadata and guards.  
**Where:** shell navigation, service routing, auth guards, 404 handling and post-login internal redirects.  
**Why a simpler/native implementation is insufficient:** hand-rolling History API routing/guard lifecycle would duplicate solved framework behavior and be harder to test.  
**Can be removed:** only if the frontend becomes one non-routed page, which contradicts the four-service shell requirement.

## State and data

### Pinia — YES, deliberately narrow

Use for:

- in-memory access-token/auth principal state;
- auth bootstrap status (`unknown/authenticated/anonymous`);
- optional shell-only preference such as theme.

Do **not** use it for orders, notification jobs, links or analytics responses.

**Why:** auth is shared across unrelated pages and service modules; Pinia gives typed, observable global state and good devtools/testing ergonomics.  
**Why a simple exported `reactive()` is not enough:** possible, but a security-critical global lifecycle benefits from explicit store actions and test isolation.  
**Can be removed:** yes, if auth is later isolated per module; currently not recommended.

### TanStack Vue Query — YES

Use for all remote/server state:

- list/detail reads;
- cursor pages;
- mutations;
- query invalidation after commands;
- controlled retry policies;
- background refetch where appropriate.

**Why:** four services have repeated server-state concerns; handwritten `isLoading/error/data/refetch` logic would be duplicated and would encourage inconsistent retry/cache behavior.  
**Can be removed:** technically yes, but only at the cost of repetitive infrastructure.

Policy: do not blindly use default retries for every request. Authentication failures, 4xx domain errors, idempotency conflicts and mutation failures must not be automatically retried just because a library can retry them.

## HTTP

### Native `fetch` — YES initially

Axios is **not selected**.

Reasons:

- browser Fetch API is sufficient;
- AbortController supports timeouts/cancellation;
- MSW works at the network boundary regardless;
- a small explicit wrapper makes 401/refresh/error normalization visible;
- later `openapi-fetch` remains Fetch-based.

Axios can be added only if a concrete missing capability appears.

### `openapi-typescript` + `openapi-fetch` — YES after contracts stabilize

**Why:** the backend specifications already require OpenAPI; generated DTO/path types reduce contract drift and `openapi-fetch` keeps the client thin and Fetch-native.  
**Where:** generated service DTO/path types and the transport implementation behind each module API facade after the corresponding backend schema stabilizes.  
**Why a simpler/manual implementation is insufficient long-term:** handwritten copies of four evolving contracts will drift from OpenAPI and create duplicate maintenance.  
**Can be removed:** before contract stabilization, yes — manual temporary boundary types are intentionally used. After stable OpenAPI, removal is possible but not recommended because it gives up contract generation.

`openapi-typescript` generates runtime-free types from each service OpenAPI schema. `openapi-fetch` provides a small typed Fetch client and middleware support. Do not make generated output a presentation model. Generated files are network-boundary artifacts and must never be hand-edited.

## Runtime/schema validation

### Zod — YES, limited scope

**Why:** TypeScript types disappear at runtime, while pre-OpenAPI mocks/config/forms still need a small amount of deterministic runtime validation.  
**Where:** mock handler request parsing, selected form schema reuse, runtime Vite config validation and fixture validation.  
**Why a simpler/native implementation is insufficient:** hand-written repetitive `typeof`/shape guards across four mock modules are easy to make inconsistent; however Zod is deliberately not duplicated for every generated response.  
**Can be removed:** yes after contract stabilization if runtime validation usage becomes trivial.

After OpenAPI stabilizes, generated DTO types become the compile-time network contract. Zod remains only where runtime validation is still useful; do not maintain a parallel Zod schema for every generated API response without a reason.

## Charts

### Chart.js — YES, one chart dependency

**Why:** the Shortener has real time-series/category analytics that are clearer visually than as tables alone, while Chart.js is sufficient without a dashboard framework.  
**Where:** Shortener clicks-by-day/referrer/device; Notification summary charts only if an agreed stats API exists.  
**Why a simpler/native implementation is insufficient:** hand-authored SVG/canvas chart geometry, scales, labels and resize behavior would create a frontend side-project.  
**Can be removed:** yes; analytics can ship as accessible tables/metric lists if bundle/time scope is tighter. Charts are enhancement, not core backend capability.

Do not add a Vue wrapper library initially. One small shared chart component can own Chart.js lifecycle. Every chart gets a text/table equivalent because canvas alone is not screen-reader accessible.

## Date/time

### No date library initially

Use ISO/RFC3339 from APIs, `Date`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` and small utilities. Backoff countdowns and expiration labels do not justify a date dependency.

## UI/component library

### No general UI framework

Do not use Ozon `@fe/ozi` or any internal component library. Do not adopt PrimeVue/Vuetify only to make an admin template quickly.

Use:

- semantic HTML;
- native inputs/selects/buttons;
- native `<dialog>` for confirmations;
- CSS custom properties/tokens;
- small shared Vue primitives.

This keeps the UI bespoke enough to avoid a generic admin-template appearance while minimizing frontend scope.

### Icon library — `lucide-vue-next` YES

**Why:** a small consistent SVG vocabulary improves technical actions without hand-maintaining many icon paths.  
**Where:** copy, external-link, refresh/retry, menu and limited status/context actions.  
**Why a simpler/native implementation is insufficient:** Unicode symbols are inconsistent across platforms; hand-copying SVGs creates its own maintenance/accessibility surface.  
**Can be removed:** yes; replace with a tiny reviewed in-repo SVG set if dependency budget becomes important.

## Mocking

### MSW — YES, critical

**Why:** mock-first is a hard requirement and the mock must reproduce HTTP contract behavior without coupling components to fake repositories.  
**Where:** browser development, deterministic demo mode, API-adapter/component integration tests and selected Playwright flows.  
**Why a simpler/native implementation is insufficient:** hardcoded component data or duplicate `Mock*Api` implementations bypass real URL/header/auth/error parsing and can diverge from live integration.  
**Can be removed:** only if replaced by another network-level mock server/proxy; removing network-boundary mocking entirely would violate the project requirement.

MSW intercepts the same browser requests produced by the real HTTP client. Therefore mock and real mode share URL construction, headers, auth middleware, error parsing and query code.

## Testing

### Vitest — YES

**Why:** fast Vite-aligned unit/integration runner with TypeScript support and low configuration overhead.  
**Where:** pure policies/mappers, HTTP/error/auth coordinator logic, query/application functions and selected component integrations.  
**Why a simpler/native implementation is insufficient:** Node assertions alone do not provide the convenient module mocking, DOM environment and test lifecycle needed for Vue integration.  
**Can be removed:** only by replacing it with another test runner; there is no benefit in doing so for this stack.

### Vue Test Utils — YES

**Why:** a small set of Vue component behaviors requires realistic mount/interaction tests.  
**Where:** forms, action states, dialogs, route-aware views and components whose behavior cannot be proven as pure functions.  
**Why a simpler/native implementation is insufficient:** direct DOM setup does not provide Vue mounting/component lifecycle ergonomics and would add bespoke helpers.  
**Can be removed:** yes if those checks move to Playwright, but that would make the suite slower and less focused.

### Playwright — YES, narrow scope

**Why:** the public demo must be proven in an actual browser across routing, auth, dialogs and responsive interaction.  
**Where:** one critical mock journey per service plus a few auth/guard checks; later optional live smoke.  
**Why a simpler/native implementation is insufficient:** unit/component tests cannot fully validate browser navigation, cookies, History API and end-to-end user flow composition.  
**Can be removed:** not recommended before public demo; if removed, confidence in the interview-ready browser journey drops materially.

Do not create an exhaustive frontend QA suite.

### ESLint + public Vue/TypeScript config — YES

**Why:** catch unsafe/incorrect JavaScript/TypeScript/Vue patterns before runtime and keep four modules consistent.  
**Where:** all source/tests in local development and CI.  
**Why a simpler/native implementation is insufficient:** the TypeScript compiler does not enforce many code-quality and Vue-specific rules; manual review alone is unnecessarily error-prone.  
**Can be removed:** not recommended; it is a low-cost quality gate.

Adopt the portable linting principle from the provided frontend convention, but not corporate `@fe/*` configs. Add formatting through Prettier only if chosen by repository bootstrap; do not create a complicated style toolchain.

## Portable Ozon frontend conventions vs corporate-specific rules

The provided frontend convention is useful as an engineering reference, not as a public-project dependency manifest.

Adopt as portable principles:

- TypeScript and full typing; avoid `any`;
- Vue 3 for SPA;
- kebab-case filenames;
- root README with build/run specifics;
- Vitest unit tests;
- Playwright E2E;
- typed API service layer;
- generate API models/calls from OpenAPI when contract is stable;
- keep model transformation, token handling and final API calls outside components;
- centralize service/API error handling;
- CSP/escaping/dependency-security discipline;
- Vite-based build.

Do **not** copy as public-project requirements:

- internal `@fe/*` packages/configs;
- `@fe/ozi`;
- internal nginx images/pipelines;
- corporate Logging/platform dependencies;
- organization-specific deployment rules;
- TSX mandate;
- Nuxt recommendation.

For this project, Vue SFC + `<script setup lang="ts">` is intentionally chosen over the convention's corporate TSX rule because it is simpler, standard in the public Vue ecosystem and better aligned with the requirement that frontend remain secondary. Nuxt is rejected because SSR/SEO are not needed.

---

# 5. URL/deployment topology

## Frontend routes

Chosen user-facing topology:

```text
https://zolotoy.dev/
https://zolotoy.dev/orders
https://zolotoy.dev/orders/new
https://zolotoy.dev/orders/:orderId
https://zolotoy.dev/auth/login
https://zolotoy.dev/auth/register
https://zolotoy.dev/auth/profile
https://zolotoy.dev/auth/sessions
https://zolotoy.dev/auth/admin
https://zolotoy.dev/notifications
https://zolotoy.dev/notifications/:notificationId
https://zolotoy.dev/notifications/events/:eventId
https://zolotoy.dev/shortener
https://zolotoy.dev/shortener/:linkId
```

The shell is one SPA. Deep-link fallback must serve `index.html` for frontend routes.

## API hosts

**Frontend proposal — not fixed by backend specification:** use flat service API subdomains:

```text
https://order-api.zolotoy.dev
https://auth-api.zolotoy.dev
https://notification-api.zolotoy.dev
https://shortener-api.zolotoy.dev
```

Why this is preferred over `api.order.zolotoy.dev`:

- simpler DNS/TLS topology;
- clearer host identity in logs and browser devtools;
- no nested-subdomain certificate/DNS management;
- preserves each backend's existing `/api/v1/...` path exactly.

Thus Order remains `https://order-api.zolotoy.dev/api/v1/orders`, Auth remains `https://auth-api.zolotoy.dev/api/v1/auth/login`, etc.

## Short redirect host

**Frontend proposal — not fixed by backend specification:** configure Shortener public base URL as:

```text
https://s.zolotoy.dev/{code}
```

The MD fixes the redirect path `GET /{code}` but not the host. This gives short URLs a realistic compact host without changing management API semantics.

## Cloudflare/DNS/HTTPS

Recommended simple model:

- Cloudflare manages DNS and TLS edge;
- one VPS/reverse proxy may host the SPA and backend containers, or SPA may be static-hosted separately;
- each API subdomain routes to exactly one backend service;
- all public endpoints are HTTPS;
- production CORS allowlist explicitly permits `https://zolotoy.dev` and configured preview origin(s), never wildcard with credentials.

If Cloudflare Pages is used for the SPA while APIs are on a VPS, this topology still works; no Cloudflare Worker API gateway is required.

## Mock vs live deployment

Development baseline:

```text
VITE_API_MODE=mock
VITE_API_MODE=real
```

A build must display an unmistakable `MOCK` or `LIVE` badge.

For interview resilience, one of two deployment patterns may be chosen later:

1. `zolotoy.dev` live + `demo.zolotoy.dev` mock; or
2. one `zolotoy.dev` deployment with mock support enabled by an explicit demo-only runtime switch.

**Preferred first implementation:** separate deployment configuration (`demo.zolotoy.dev`) because it prevents accidental confusion between simulated and live state. Same source code, different config.

**TBD / requires deployment decision:** whether public mock mode is a second hostname or a controlled runtime switch. This does not affect module architecture.

## Environment/config values

At minimum (all browser-exposed Vite variables are public configuration):

```text
VITE_API_MODE
VITE_ORDER_API_BASE_URL
VITE_AUTH_API_BASE_URL
VITE_NOTIFICATION_API_BASE_URL
VITE_SHORTENER_API_BASE_URL
VITE_SHORTENER_PUBLIC_BASE_URL
VITE_GITHUB_REPO_URLS (or individual per-service values, optional)
VITE_GRAFANA_URLS (or individual per-service values, optional)
VITE_API_DOC_URLS (or individual per-service values, optional)
VITE_DEPLOY_ENV
```

Keep service metadata in one typed config module rather than scattering `import.meta.env` access throughout components.

---

# 6. Общий zolotoy.dev shell

## Desktop layout

- persistent left sidebar, ~232–248px;
- top contextual header within content area;
- content container up to ~1440px;
- service-specific page content below.

Sidebar:

- `zolotoy.dev` wordmark only; no personal bio/photo;
- Overview;
- Orders;
- Auth;
- Notifications;
- URL Shortener;
- optional footer links to GitHub root/source overview.

Top contextual header:

- current service/title;
- `MOCK` / `LIVE` badge;
- backend connectivity/readiness indicator for current service;
- Auth user/session widget if authenticated;
- contextual actions: OpenAPI, GitHub, Grafana when configured;
- theme control if dual theme is implemented.

## Mobile/tablet

Below the desktop breakpoint the sidebar becomes a compact top navigation with service switcher; do not implement a complex animated app drawer unless needed. A native/select-style service switcher is acceptable and more robust.

## Overview page `/`

Four technical service cards. Each card contains only:

- service name;
- one-sentence engineering focus;
- live/readiness state;
- `Open demo`;
- `OpenAPI` if configured;
- `Source` if configured;
- `Grafana` if configured.

Examples of focus text:

- Order — state machines, transactions, idempotency, optimistic concurrency, outbox.
- Auth — token/session lifecycle, rotation/replay detection, RBAC, rate limiting.
- Notification — Kafka at-least-once processing, durable jobs, retry/DLQ, workers.
- Shortener — Redis cache-aside, singleflight, hot path, bounded analytics.

Do not add CV, work history, “about me”, contact CTA or marketing hero. Those belong to maxzolotoy.com.

## Backend status

Every service already defines `/health/live` and `/health/ready` endpoints. The shell may issue lightweight status checks.

**TBD / requires API contract/deployment decision:** response body and CORS behavior of health endpoints are not specified. Frontend should treat any 2xx as healthy and not depend on a JSON DTO unless OpenAPI later defines one.

In mock mode, health is clearly marked **simulated**.

## Swagger/OpenAPI links

The backend MDs consistently define `/swagger.json`; they do not consistently define an interactive Swagger UI route. Therefore the shell should call the link **OpenAPI** unless a real Swagger UI URL is configured. Do not invent `/swagger`.

---

# 7. Design system

Goal: modern developer/admin UI, restrained and data-oriented.

## Typography

No external font CDN. Use system stacks:

- UI: `system-ui`, Apple/Segoe/Roboto/Helvetica fallbacks;
- code/IDs: `ui-monospace`, SFMono/Consolas fallbacks.

Hierarchy:

- page title: 28–32px desktop, 24px mobile;
- section title: 18–20px;
- body: 14–16px;
- table/meta: 13–14px;
- code/IDs: 12–13px monospace.

## Spacing

4px base rhythm; preferred scale:

```text
4 / 8 / 12 / 16 / 24 / 32 / 48
```

Avoid arbitrary one-off spacing unless required by alignment.

## Surface hierarchy

- page background;
- elevated/outlined cards;
- subtle section separators;
- limited shadow use;
- 8–12px radii, not oversized “mobile app” pills everywhere.

## Semantic colors

Use design tokens, not service-specific palettes:

- neutral;
- info;
- success;
- warning;
- danger;
- accent.

Status colors must always be accompanied by text/icon; never encode state by color alone.

## Core shared UI primitives

Keep the set small:

- app button (`primary`, `secondary`, `ghost`, `danger`);
- icon button;
- text field / textarea / select wrapper;
- form field with label/help/error;
- status badge;
- service/environment badge;
- card/panel;
- data table shell;
- pagination controls for cursor navigation;
- tabs;
- native-dialog wrapper;
- confirmation dialog;
- toast/aria-live region;
- skeleton block/table rows;
- empty state;
- page-level error state;
- inline callout;
- code/id value with copy action;
- timeline/event list;
- metric tile;
- chart container with accessible summary.

Do not build a generic form builder, generic schema-driven table or enterprise data grid.

## Tables

Desktop lists use semantic tables where the data is tabular. On small screens:

- allow horizontal scroll for compact operational tables; or
- switch selected critical lists to stacked records/cards when readability materially improves.

Do not hide important state/action columns on mobile without another access path.

## Forms

- labels always visible;
- required state clear;
- helper text only when useful;
- validation near field;
- backend error summary above form when multiple fields fail;
- preserve user input after network/server errors.

## Confirmation/destructive UX

Require explicit confirmation for:

- Order cancel where irreversible/financial consequences may exist;
- Auth logout-all/revoke another session;
- Notification manual retry only when side-effect duplication risk should be acknowledged;
- Shortener delete.

Use a concise warning that describes backend consequence, not generic “Are you sure?”.

## Loading

- initial page data: skeleton matching layout;
- mutation/action: disable only the action being submitted and show progress;
- background refetch: subtle indicator, do not replace valid data with a full-page spinner.

## Empty state

Always distinguish:

- genuinely empty resource list;
- no result due filters;
- unauthorized/no access;
- data failed to load.

## Theme

**Decision:** support light + dark through CSS variables, with system preference as default. This is low-cost because one shared shell owns it. Store only the non-sensitive theme preference locally.

If implementation time becomes constrained, ship one polished light theme first; dark theme is the first removable cosmetic item.

---

# 8. Repository/file structure

Recommended repository: `zolotoy-dev-frontend`.

All file names use **kebab-case**, adopting the portable naming rule from the provided frontend convention. Vue component identifiers inside code may use PascalCase.

```text
zolotoy-dev-frontend/
├── public/
│   └── mock-service-worker.js
├── src/
│   ├── app/
│   │   ├── app.vue
│   │   ├── router/
│   │   │   ├── index.ts
│   │   │   ├── route-names.ts
│   │   │   └── guards.ts
│   │   ├── shell/
│   │   │   ├── app-shell.vue
│   │   │   ├── app-sidebar.vue
│   │   │   ├── app-header.vue
│   │   │   └── service-overview-card.vue
│   │   └── providers/
│   │       └── query-client.ts
│   ├── modules/
│   │   ├── orders/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── models/
│   │   │   ├── pages/
│   │   │   ├── queries/
│   │   │   ├── mocks/
│   │   │   └── tests/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── models/
│   │   │   ├── pages/
│   │   │   ├── store/
│   │   │   ├── queries/
│   │   │   ├── mocks/
│   │   │   └── tests/
│   │   ├── notifications/
│   │   │   └── ...same module categories...
│   │   └── shortener/
│   │       └── ...same module categories...
│   ├── shared/
│   │   ├── api/
│   │   │   ├── http-client.ts
│   │   │   ├── api-error.ts
│   │   │   ├── error-mapper.ts
│   │   │   ├── refresh-coordinator.ts
│   │   │   └── generated/
│   │   │       ├── order-api.d.ts
│   │   │       ├── auth-api.d.ts
│   │   │       ├── notification-api.d.ts
│   │   │       └── shortener-api.d.ts
│   │   ├── config/
│   │   │   ├── app-config.ts
│   │   │   └── service-registry.ts
│   │   ├── ui/
│   │   │   ├── app-button.vue
│   │   │   ├── status-badge.vue
│   │   │   ├── confirm-dialog.vue
│   │   │   ├── data-table-shell.vue
│   │   │   ├── empty-state.vue
│   │   │   ├── error-state.vue
│   │   │   ├── loading-skeleton.vue
│   │   │   ├── toast-region.vue
│   │   │   ├── timeline-list.vue
│   │   │   └── metric-chart.vue
│   │   ├── lib/
│   │   │   ├── dates.ts
│   │   │   ├── money.ts
│   │   │   ├── clipboard.ts
│   │   │   └── ids.ts
│   │   └── styles/
│   │       ├── tokens.css
│   │       ├── base.css
│   │       └── utilities.css
│   ├── mocks/
│   │   ├── browser.ts
│   │   ├── handlers.ts
│   │   ├── scenario-registry.ts
│   │   └── reset.ts
│   ├── tests/
│   │   ├── setup.ts
│   │   └── fixtures/
│   ├── main.ts
│   └── vite-env.d.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── order.spec.ts
│   ├── notification.spec.ts
│   └── shortener.spec.ts
├── openapi/
│   ├── order.openapi.yaml
│   ├── auth.openapi.yaml
│   ├── notification.openapi.yaml
│   └── shortener.openapi.yaml
├── scripts/
│   └── generate-api-types.mjs
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
└── playwright.config.ts
```

### Naming rules

- files/directories: kebab-case;
- Vue component name: PascalCase;
- composables: `use-*.ts` files, `useSomething()` symbol;
- API facade: `<service>-api.ts`;
- DTO/network types: `<name>-dto` only when manual temporary types are required;
- view models: `<name>-view-model`;
- query keys: centralized per module;
- tests: `*.spec.ts`;
- mock fixtures: semantic stable names, never index-only random arrays.

---

# 9. API abstraction architecture

## Required layering

```text
Page/component
  -> module query/mutation composable
      -> module API facade
          -> shared HTTP/OpenAPI client
              -> network
```

Mock mode does not introduce a second component-facing API implementation. MSW intercepts the network boundary.

## Shared HTTP responsibilities

The shared HTTP layer owns:

- service base URL selection;
- `Accept`/`Content-Type` defaults;
- request ID/correlation header if frontend-generated IDs are adopted;
- bearer access-token attachment;
- `credentials: include` only where browser cookie flow requires it;
- timeout/AbortController policy;
- normalized network/HTTP error conversion;
- single coordinated refresh-on-401 behavior;
- one safe retry after successful refresh;
- no logging of Authorization/cookies/token bodies.

It must **not** own domain-specific error interpretation. For example, `ORDER_VERSION_CONFLICT` belongs in Order module mapping/UX even though transport status 409 is normalized globally.

## Module API facade responsibilities

Examples:

- Order facade knows `createOrder`, `getOrder`, `listOrders`, commands and history.
- Auth facade knows registration/login/refresh/logout/session calls.
- Notification facade knows job list/detail/retry/event lookup.
- Shortener facade knows link CRUD/analytics.

The facade converts generated/raw HTTP results into a small stable shape expected by query composables and performs DTO-to-view-model mapping where appropriate.

## Query layer

TanStack Query keys are service-prefixed:

```text
['orders', 'list', cursor]
['orders', 'detail', orderId]
['orders', 'history', orderId]
['auth', 'me']
['auth', 'sessions']
['notifications', 'list', filters, cursor]
['notifications', 'detail', id]
['shortener', 'links', cursor]
['shortener', 'analytics', linkId]
```

After a successful mutation, invalidate only affected queries. Avoid “invalidate everything” as the default.

## DTO vs view model

Network DTO examples:

- `amount: 499000`, `currency: "RUB"`;
- timestamps as RFC3339 strings;
- raw backend status enum;
- cursor string.

View/presentation models may add:

- formatted amount;
- localized date labels;
- derived status label/tone;
- action availability results;
- shortened IDs for visual display while preserving full copyable value.

Never send view models back to the backend.

---

# 10. Mock architecture

## Choice: MSW network interception

Runtime startup:

```text
if API_MODE == mock:
    start MSW worker
then mount Vue app
```

The frontend HTTP layer behaves identically in real and mock modes.

## Handler organization

- each service module owns its handlers and fixtures;
- root `src/mocks/handlers.ts` composes them;
- one scenario registry chooses deterministic initial fixture state;
- mutation handlers update an in-memory mock store so demos can progress through state transitions;
- reload/reset returns to the deterministic fixture baseline.

## What mocks must reproduce

For every implemented operation:

- method/path;
- request body/header contract;
- auth requirements;
- response body;
- HTTP status;
- documented error envelope where known;
- pagination/cursor behavior;
- idempotency replay/conflict behavior where specified;
- deterministic latency;
- unauthorized/forbidden/not-found/conflict/rate-limit/server-unavailable cases;
- service-specific transitions.

## Latency

Use small deterministic presets instead of randomness:

- normal read: e.g. 150–250ms;
- normal mutation: 250–400ms;
- slow scenario: fixed 1500ms;
- timeout scenario: intentionally exceed shared client timeout.

Exact values are frontend-only and can be tuned later.

## Scenario selector

**Frontend proposal — not fixed by backend specification:** in mock deployment only, expose a compact “Demo scenario” control in the shell/service header. It resets fixtures to a named scenario. It must be impossible to confuse with backend data and must not appear as a backend feature.

Examples: `Happy path`, `Conflict`, `Rate limited`, `Provider outage`, `Empty`.

## Mock auth cookie problem

MSW can simulate browser refresh semantics without exposing a real refresh token to components. The mock handler may model an opaque cookie/session internally. Components still see only the same public auth API result as live mode.

No mock token values need to be shown in UI.

---

# 11. OpenAPI integration strategy

## Before final OpenAPI

Use manual temporary DTOs **only at module API boundaries**. Each manual type must be traceable to:

- explicit MD request/response shape; or
- `PROPOSED CONTRACT` documented in this master plan.

Do not create speculative “perfect” domain DTOs.

Mocks should be written against those temporary boundary types and Zod schemas where runtime validation adds value.

## After a service OpenAPI stabilizes

For each service:

1. copy/fetch canonical OpenAPI into `openapi/<service>.openapi.yaml` during CI/dev generation;
2. generate types with `openapi-typescript` into `src/shared/api/generated/`;
3. instantiate typed `openapi-fetch` client for that service;
4. replace manual DTO aliases inside API facade with generated `paths/components` types;
5. keep module view models/mappers stable;
6. run typecheck/tests; contract mismatches should fail early.

Generated files are never hand-edited.

## Why not generate everything immediately

The backend specifications contain known gaps. Generating clients from a premature OpenAPI would merely freeze guesses and produce churn. Mock-first UI needs stable *frontend boundaries* now, not fake certainty.

## Why not keep manual clients forever

The four services already commit to OpenAPI. Generated path/request/response typing removes URL/DTO drift and makes backend contract changes visible to the frontend build.

---

# 12. Global error handling

Normalize transport failures into a frontend `AppError` classification without exposing backend internals.

## Error categories and UX

### Network error

Examples: DNS failure, offline, CORS/network failure.

- read page: page-level error + `Retry`;
- mutation: toast/callout; preserve form/input;
- do not claim backend rejected the command because no response was received.

### Timeout

- distinguish from domain failure;
- mutation copy should warn that outcome may be unknown when idempotent backend command could have completed;
- where an idempotency key exists, allow safe retry with the **same key**.

### Validation error

- field-specific details -> inline field errors;
- cross-field/domain validation -> form-level callout;
- frontend validation improves UX but never suppresses backend validation handling.

### Authentication error (401)

- protected request may trigger one silent refresh attempt;
- if refresh succeeds, retry original request once;
- if refresh fails/revoked/expired/reused, clear auth state and route to login with a non-sensitive reason banner;
- never infinite-loop 401 -> refresh -> 401.

### Authorization error (403)

- no refresh loop;
- show `Access denied` page/callout;
- admin-only navigation may be hidden for convenience, but direct route still handles 403.

### Not found (404)

- detail route: resource-specific not-found state;
- public Shortener redirect is handled by backend browser navigation, not transformed into an SPA detail error.

### Conflict (409 or documented conflict code)

Separate subtypes:

- optimistic concurrency conflict -> tell user resource changed; refetch and require user to re-evaluate action;
- idempotency conflict -> explain same idempotency key was used for a different request; do not silently generate a new key and retry;
- ordinary domain state conflict -> show safe backend message/code.

### Rate limit (429)

- show concise limit state;
- honor `Retry-After` if present;
- disable/re-enable action with countdown only when reliable header/data exists;
- no automatic aggressive retries.

### Business/domain error

Show safe backend error code/message near the action that caused it. Do not collapse every domain rule into “Something went wrong”.

### Server error (5xx)

- reads: page/error panel with retry;
- mutations: non-destructive error callout/toast;
- do not show stack/SQL/provider raw body.

### Service unavailable

Service shell status becomes degraded/offline. Preserve access to mock demo and technical docs.

## Display priority

```text
field validation -> inline
command/domain result -> action/form callout
short non-blocking success/failure -> toast
resource read failure -> page-level error
security/session expiration -> global auth banner + redirect
irreversible confirmation -> dialog
fatal bootstrap/config error -> full-app fatal state
```

---

# 13. Authentication integration strategy

Auth Service is both one demo module and a shared frontend infrastructure dependency.

## Browser token storage

**SOURCE CONTRACT preference:** refresh token in `HttpOnly; Secure; SameSite` cookie; access token in application memory.

Frontend implementation:

- access token stored only in Pinia memory;
- no refresh token in JavaScript-readable storage;
- no access token in URL/query params;
- no token logging;
- no token persistence to localStorage/sessionStorage by default.

## Bootstrap session flow

1. App starts with auth status `unknown`.
2. In real browser mode, call Auth refresh/bootstrap flow using `credentials: include`.
3. If refresh succeeds, store new access token in memory.
4. Fetch `/api/v1/me` and store principal/user view.
5. Status becomes `authenticated`.
6. If refresh indicates no active session/expired/revoked, status becomes `anonymous` without treating it as an app crash.
7. Render protected routes only after bootstrap resolves.

**TBD / requires API contract decision:** the Auth MD defines `/refresh` and browser cookie preference, but does not fix the browser-mode refresh response DTO or whether refresh cookie is set/rotated purely by `Set-Cookie`. Final OpenAPI must define this.

## Request authentication

For resource APIs that use Auth Service JWT verification:

```text
Authorization: Bearer <in-memory access token>
```

The HTTP layer injects this header. Components never receive raw tokens.

## Concurrent 401/refresh flow

Use a single refresh coordinator:

- first eligible 401 starts refresh;
- concurrent protected requests await the same refresh promise;
- on success each failed request retries once with the new access token;
- on failure all waiters fail consistently and auth state is cleared;
- refresh endpoint itself never recursively triggers refresh;
- retry counter prevents loops.

This is particularly important because Auth source-of-truth uses strict refresh rotation: two independent browser refreshes using the same old token can trigger replay/reuse policy.

## 403

Frontend route guards are convenience only. Backend RBAC remains authoritative.

## Logout current

- call backend logout;
- clear in-memory access state regardless of successful redirect UX;
- invalidate protected query caches;
- route to login/overview.

**TBD:** exact browser logout cookie-clearing response/credentials semantics must be fixed in Auth OpenAPI.

## Logout all

- explicit confirmation;
- call backend;
- treat current browser session as no longer refreshable;
- clear client auth state and all authenticated server-state caches.

## Session revocation

Revoke one session from `/me/sessions` via documented `DELETE` endpoint. If the backend later identifies current session in the list, UI may label it. Current-session marker is **TBD** because the response contract does not currently define it.

## Refresh replay/revocation consequence

If refresh returns a safe code such as `AUTH_REFRESH_REUSE_DETECTED`, display a security-oriented message:

> Session was revoked and sign-in is required again.

Do not show refresh token value, family ID or sensitive detection internals.

## CSRF

Because a refresh cookie is automatically attached by the browser, cookie-authenticated state-changing endpoints require an explicit backend CSRF/Origin policy.

**TBD / requires API contract/security decision:** choose and document one of:

- strict Origin/Referer validation plus SameSite policy; or
- anti-CSRF token/header mechanism.

The frontend can support either, but must not invent the final mechanism before Auth backend ADR/OpenAPI fixes it.


# 14. Order Service frontend plan

## 14.1 Frontend objective

Order UI is the strongest domain-oriented frontend module. Its job is not to imitate an e-commerce storefront; it is a **technical order-management console** that makes the aggregate lifecycle, payment rules, idempotent commands, optimistic concurrency and history visible.

Source-of-truth constraints that the UI must preserve:

- order status and payment status are independent state machines;
- supported payment methods are `prepaid` and `pay_on_receipt_online`, and both are online-only;
- `cancelled` and `completed` are terminal order states;
- payment cannot start while payment is already `processing` or `paid`;
- payment retry is allowed after `failed` only while the order still permits payment;
- `prepaid` cannot enter fulfillment before payment is `paid`;
- `pay_on_receipt_online` may reach `delivered` while still unpaid, but `Complete` requires `paid`;
- cancelling a paid order implies a refund workflow and cannot be represented as an immediate local `refunded` mutation;
- mutations are versioned and may fail due to optimistic concurrency;
- create/pay/cancel are idempotent commands using `Idempotency-Key`.

Frontend validation and action gating are **ergonomic mirrors**, never the source of truth. Backend invariants always win.

## 14.2 Routes and pages

### `/orders` — Order list

Purpose: operational overview and entry point into order demos.

Content:

- page title `Orders`;
- short technical subtitle: `Order lifecycle, payment state and concurrency demo`;
- `Create order` primary action;
- cursor-paginated orders table;
- no speculative full-text search or filter panel until list query parameters are defined by OpenAPI;
- shell-level OpenAPI/Grafana links remain available.

Recommended columns, subject to response DTO:

- Order ID, truncated visually with full copy action;
- Created at;
- Payment method;
- Total;
- Order status;
- Payment status;
- optional `Version` only if list DTO contains it; otherwise detail-only.

Pagination UI:

- `Previous` / `Next` navigation based on server cursors;
- do not expose or parse cursor internals in components;
- pagination state belongs in route query where practical so the page is shareable;
- exact query parameter names and response envelope are **TBD / requires API contract decision**.

### `/orders/new` — Create order

Fields follow the source request and nothing more:

- `buyer_id`;
- `payment_method`;
- repeatable items:
  - `product_id`;
  - `name`;
  - `quantity`;
  - `unit_price`;
  - `currency`;
- `delivery_address`;
- `buyer_comment`.

UX rules:

- no editable `total` field;
- frontend may calculate a **preview total** from item quantities/prices for user feedback, labelled as a preview; backend total remains authoritative;
- item add/remove is frontend-only form behavior, not a new backend capability;
- default currency may be `RUB` only if the project configuration intentionally limits MVP to RUB; do not hide the currency field from DTO mapping if the API still requires it;
- submit receives an idempotency key generated once for that submission attempt;
- if the transport outcome is unknown, retry uses the same key and payload;
- changing the payload requires a new idempotency key.

**TBD / integration decision:** source create DTO explicitly includes `buyer_id`, while Auth provides authenticated `sub`. For the frontend-first phase, keep `buyer_id` in the adapter/form contract because that is the Order source of truth. In an integrated live mode, the preferred proposal is to prefill it from the authenticated principal and make it read-only. Whether the backend ultimately derives buyer identity from auth and removes `buyer_id` from the request must be decided in the Order API contract, not by frontend.

### `/orders/:orderId` — Order detail

One technical detail screen; do not create many low-value subpages.

Recommended sections:

1. **Header**
   - order ID + copy;
   - `OrderStatusBadge`;
   - `PaymentStatusBadge`;
   - payment method;
   - created/updated timestamps;
   - action area generated from centralized action policy.

2. **Overview**
   - buyer ID where authorized;
   - total and currency;
   - delivery address;
   - buyer comment;
   - technical metadata such as aggregate version.

3. **Items**
   - product snapshot name;
   - product ID;
   - quantity;
   - unit price;
   - total price.

4. **Payment**
   - payment method;
   - current payment status;
   - explanation of method semantics (`prepaid` vs `pay_on_receipt_online`);
   - Pay action where permitted;
   - no card/payment-provider UI because real acquiring is explicitly out of project scope.

5. **History**
   - timeline sourced from `/history`;
   - order/payment transition name;
   - timestamp;
   - safe actor/source metadata if returned;
   - no invented event data.

A tabbed presentation is acceptable on smaller screens, but the route stays one detail route. Tabs are presentation state, not additional API contracts.

## 14.3 Main components

Service-specific components should remain modest:

```text
order-list-table
order-create-form
order-items-editor
order-status-badge
payment-status-badge
payment-method-label
order-summary-card
order-items-table
order-action-bar
order-action-dialog
order-history-timeline
order-concurrency-alert
order-idempotency-demo-panel   # mock/demo-only advanced panel
```

`order-action-bar` must consume a centralized action-policy result. It must not contain scattered ad-hoc conditionals that reimplement the state machine independently.

## 14.4 State-dependent action policy

Create a frontend policy module such as:

```text
modules/orders/models/order-action-policy.ts
```

Its responsibility is limited to presentation:

- determine whether an action is shown;
- determine whether it is enabled;
- provide a human-readable disabled reason;
- check role visibility;
- never mutate order state;
- never claim that disabled client actions replace backend validation.

When backend rules are incomplete, the policy must be conservative.

### Action vocabulary

- `PAY` — call Pay command;
- `CONFIRM` — call Confirm;
- `START_PROCESSING` — backend command route TBD;
- `SHIP` — backend command route TBD;
- `START_DELIVERY` — backend command route TBD;
- `MARK_DELIVERED` — backend command route TBD;
- `REQUEST_CANCELLATION` — request-cancellation;
- `CANCEL` — cancel;
- `COMPLETE` — complete.

### Role vocabulary

The Order spec uses semantic roles:

- Buyer;
- `operator`;
- `admin`.

The Auth core spec defines only:

- `user`;
- `admin`.

Therefore the integrated role mapping is **TBD / requires cross-service contract decision**.

Frontend proposal for the first integrated demo, without expanding Auth scope:

- authenticated Auth `user` acts as the buyer for own orders;
- Auth `admin` may exercise service/administrative transitions;
- do not silently create an Auth `operator` role;
- if a future Auth extension adds `operator`, adapt the authorization policy then.

This proposal is frontend integration policy, not a change to either backend source of truth.

## 14.5 OrderStatus × PaymentStatus × UserRole → UI action matrix

The following matrix is a **frontend gating matrix**, not a replacement backend state machine. It includes only constraints that can be established from the Order MD. `TBD` means the backend specification does not define the combination/action precisely enough to make a final promise.

Legend:

- **Buyer** = owner of the order; integrated Auth mapping currently proposed as `user`;
- **Service** = `operator/admin` semantic role; first integrated demo may map to Auth `admin`;
- `—` = no mutation action;
- `invalid` = combination conflicts with an explicit invariant and should normally never be returned by backend;
- `TBD` = do not enable action by assumption;
- cancellation availability is conservative because exact source-state eligibility is not fully enumerated;
- paid cancellation requires a refund orchestration decision and is never represented as instant local `refunded`.

### `prepaid`

| Order status | Payment `awaiting` | Payment `processing` | Payment `paid` | Payment `failed` | Payment `refunded` |
|---|---|---|---|---|---|
| `created` | Buyer: `PAY`; cancellation `TBD`. Service: fulfillment disabled | Buyer: no Pay; show processing. Service: fulfillment disabled | Service: `CONFIRM`; cancellation `TBD` | Buyer: `PAY` retry; cancellation `TBD` | `TBD` — refund/order relation not fixed |
| `confirmed` | **invalid** by prepaid invariant | **invalid** | Service: `START_PROCESSING`; cancellation `TBD` | **invalid** | `TBD` |
| `processing` | **invalid** | **invalid** | Service: `SHIP`; cancellation `TBD` | **invalid** | `TBD` |
| `shipped` | **invalid** | **invalid** | Service: `START_DELIVERY`; cancellation `TBD` | **invalid** | `TBD` |
| `in_delivery` | **invalid** | **invalid** | Service: `MARK_DELIVERED`; cancellation `TBD` | **invalid** | `TBD` |
| `delivered` | **invalid** | **invalid** | Service: `COMPLETE` | **invalid** | `TBD` |
| `cancellation_requested` | `TBD`; service may have `CANCEL` depending cancellation contract | `TBD` | `TBD`; refund requirement applies | `TBD` | `TBD` |
| `cancelled` | — | — | inconsistent unless refund pending semantics are deliberately defined | — | — |
| `completed` | — | — | — | invalid | `TBD` |

### `pay_on_receipt_online`

The source explicitly permits fulfillment before payment and requires only that `Complete` cannot succeed until `paid`. It also says Pay may be allowed a little before delivery if the business rule chooses so; the earliest payable order state is not fixed.

To avoid inventing that rule, the **initial frontend proposal** is deliberately conservative: enable Pay at `delivered + awaiting/failed`; earlier Pay actions remain `TBD` until backend contract/domain tests fix the policy.

| Order status | Payment `awaiting` | Payment `processing` | Payment `paid` | Payment `failed` | Payment `refunded` |
|---|---|---|---|---|---|
| `created` | Service: `CONFIRM`; Buyer Pay earlier = `TBD`; cancellation `TBD` | no new Pay; service transition `TBD` | Service: `CONFIRM`; cancellation `TBD` | Buyer Pay retry timing `TBD`; Service: `CONFIRM` if backend permits | `TBD` |
| `confirmed` | Service: `START_PROCESSING`; Pay = `TBD` | no new Pay; fulfillment continuation `TBD` | Service: `START_PROCESSING` | Service: `START_PROCESSING`; Pay retry timing `TBD` | `TBD` |
| `processing` | Service: `SHIP`; Pay = `TBD` | no new Pay; fulfillment continuation `TBD` | Service: `SHIP` | Service: `SHIP`; Pay retry timing `TBD` | `TBD` |
| `shipped` | Service: `START_DELIVERY`; Pay = `TBD` | no new Pay; fulfillment continuation `TBD` | Service: `START_DELIVERY` | Service: `START_DELIVERY`; Pay retry timing `TBD` | `TBD` |
| `in_delivery` | Service: `MARK_DELIVERED`; Pay = `TBD` | no new Pay; fulfillment continuation `TBD` | Service: `MARK_DELIVERED` | Service: `MARK_DELIVERED`; Pay retry timing `TBD` | `TBD` |
| `delivered` | Buyer: `PAY`; Service: `COMPLETE` disabled with reason `Payment required` | Buyer: no new Pay; show processing; `COMPLETE` disabled | Service: `COMPLETE` | Buyer: `PAY` retry; `COMPLETE` disabled | `TBD` |
| `cancellation_requested` | `TBD`; service may `CANCEL` | `TBD` | `TBD`; refund requirement applies | `TBD` | `TBD` |
| `cancelled` | — | — | inconsistent unless refund workflow state is separately represented | — | — |
| `completed` | invalid | invalid | — | invalid | `TBD` |

### Permission presentation policy

- action impossible because the viewer lacks permission: normally hide it and show role/context in a small technical permissions summary;
- action belongs to viewer but is temporarily invalid due to order/payment state: show disabled only when this helps demonstrate the backend rule, with a concise reason;
- unknown `TBD` rule: do not enable the action in live mode until OpenAPI/domain decision exists;
- mock scenario may expose a clearly labelled `Backend rejection demo` control only in demo tooling, not as normal product action.

## 14.6 Command UX and idempotency

### Create / Pay / Cancel

For each idempotent command:

1. create a UUID idempotency key at the beginning of the logical user attempt;
2. keep key + canonical payload in mutation state until a definitive response arrives;
3. disable duplicate UI submit while the request is in flight;
4. on timeout/network ambiguity, offer `Retry request` using the **same** key and exact payload;
5. after a definitive domain response, a new user attempt gets a new key;
6. if same key + altered payload produces an idempotency conflict, show a conflict dialog/callout rather than silently generating another key and hiding the problem.

The advanced mock/demo panel can display a shortened idempotency key and provide `Replay exact request` to make the backend property visible to an interviewer. It must not expose sensitive data and should be hidden outside demo/developer mode.

## 14.7 Optimistic concurrency UX

For version/conflict response:

- do **not** blindly retry a state-changing command;
- invalidate and refetch the order;
- show a persistent inline alert on detail page:
  `Order changed on the server. The latest state has been loaded. Review it before retrying.`
- update action availability from fresh state;
- optionally show old/new version numbers if DTO safely provides them;
- preserve form input only for operations where resubmitting remains meaningful.

This visible behavior is valuable because it demonstrates the backend's optimistic locking rather than hiding it.

## 14.8 Payment processing/failure UI

- `processing`: show neutral/progress status; Pay disabled;
- `failed`: show safe backend error code/message if exposed; allow retry only if action policy permits;
- `paid`: successful terminal payment state; no Pay action;
- `refunded`: show explicit refund badge only when backend actually returns it;
- do not poll a payment provider directly from frontend;
- do not manufacture an intermediate provider state absent from backend contract.

If Pay command is synchronous and returns final paid/failed state, invalidate detail/history immediately. If backend later makes it asynchronous, that is a backend contract change and the query strategy can add polling based on returned status.

## 14.9 History UI

The source requires `GET /api/v1/orders/{order_id}/history`, but the history DTO is not specified.

**TBD / requires API contract decision:** define history response fields.

Frontend proposal — not fixed by backend specification:

```text
HistoryEntryView
- id or sequence
- occurred_at
- order_status_before/after where applicable
- payment_status_before/after where applicable
- operation/event_type
- actor_type / safe actor identifier if available
- request_id/correlation_id if intentionally public to demo UI
```

The frontend must adapt generated DTO to a presentation timeline; it must not infer missing historical transitions from current state.

## 14.10 Observability integration

Order screens may expose contextual links:

- `OpenAPI`;
- `Grafana`;
- repository;
- optionally a trace/search link only if a stable public tracing URL exists.

The UI does not duplicate Prometheus/Grafana dashboards. It can display a small `Technical metadata` area with request ID or trace ID returned by HTTP headers, but header names are **TBD**.

Outbox/Kafka state should not be shown as a fake order field. If a future admin API exposes outbox delivery state, it can be added explicitly; current source requires metrics, not a user-facing outbox endpoint.

## 14.11 Loading, empty and error states

- list loading: table skeleton;
- empty list: `No orders in this demo scenario` + create action where authorized;
- detail loading: content skeleton with stable layout;
- 404: page-level not-found state;
- 403: page-level access denied, not `not found` unless backend deliberately uses privacy masking;
- domain rejection: inline near action area;
- concurrency conflict: dedicated persistent callout + refetch;
- 429: show retry guidance and `Retry-After` if available;
- backend unavailable: page-level state with retry and shell service health context.

## 14.12 Order mock scenarios

At minimum:

- `orders-happy-pay-on-receipt`;
- `orders-prepaid`;
- `orders-payment-failed-retry`;
- `orders-version-conflict`;
- `orders-idempotency-replay`;
- `orders-idempotency-conflict`;
- `orders-empty`;
- `orders-forbidden`;
- `orders-rate-limited`.

Each scenario uses deterministic IDs and state transitions. The mock handler must mutate its in-memory scenario store consistently for the browser session; a reset action restores the exact fixture baseline.

---

# 15. Auth Service frontend plan

## 15.1 Frontend objective

Auth UI is a compact **security/session demonstrator**, not an IAM suite. It exists to demonstrate:

- registration/login;
- short-lived access-token lifecycle;
- browser-safe refresh handling;
- session list and revocation;
- logout one/all;
- RBAC;
- rate limit UX;
- session expiration and refresh failure;
- replay/revocation consequences.

It must never weaken the backend model for frontend convenience.

## 15.2 Routes and pages

### `/auth/login`

- email;
- password;
- login submit;
- generic invalid-credentials response;
- 429 rate-limit state;
- no `remember me` unless backend explicitly defines a different cookie/session duration contract;
- in mock mode only, a clearly labelled `Demo credentials` helper may be displayed.

### `/auth/register`

- email;
- password;
- minimal password guidance based on actual backend validation contract;
- email-already-exists handling;
- successful outcome routes to login or authenticated state according to the final register response contract.

**TBD:** register success/login-after-register semantics are not fixed in the MD.

### `/auth/profile`

Show only safe profile data returned by `/me`:

- user ID;
- email;
- status (`active`/`blocked`);
- roles;
- created/updated timestamps if response includes them.

Do not display:

- raw JWT by default;
- refresh token;
- token signature;
- password metadata;
- internal security flags unless explicitly part of public contract.

A technical chip such as `Access token: in memory` is acceptable as explanatory UI; it must not reveal the token.

### `/auth/sessions`

List active/relevant sessions returned by `/me/sessions`.

Recommended columns/fields if provided:

- device label;
- created at;
- last used at;
- expires at;
- status;
- optional coarse IP prefix/location only if backend intentionally returns it;
- current-session marker only if the API defines one.

Actions:

- revoke one session;
- logout all sessions.

Revoke requires confirmation containing safe device/session label, not raw refresh token or family internals.

### `/auth/admin`

A deliberately small route that calls `/api/v1/admin/example` and visibly demonstrates RBAC:

- admin -> content from endpoint;
- normal user -> 403 page/callout;
- anonymous -> login flow.

Do not grow this into user management because the backend spec explicitly avoids enterprise IAM.

## 15.3 Auth client state lifecycle

Use an explicit finite client lifecycle:

```text
unknown
  -> bootstrap refresh
      -> authenticated
      -> anonymous

authenticated
  -> refreshing   # transient internal operation
      -> authenticated
      -> anonymous/session-expired

authenticated
  -> logout/revocation
      -> anonymous
```

`refreshing` need not block the whole app if a valid access token still exists, but the refresh coordinator must serialize refresh work.

Pinia auth store owns only:

- auth lifecycle status;
- in-memory access token;
- principal/user view;
- optional access expiry metadata;
- last safe auth reason (`expired`, `revoked`, `reuse-detected`) for redirect message.

TanStack Query owns `/me`, sessions and admin endpoint server data where practical; the auth store should not become a second cache of every auth response.

## 15.4 Route guard policy

Route metadata:

```text
public: login, register
requiresAuth: profile, sessions
requiredRole=admin: admin example
```

Guard behavior:

- while auth state is `unknown`, wait for bootstrap rather than flashing protected content;
- anonymous on protected route -> `/auth/login?redirect=<safe internal path>`;
- authenticated user visiting login/register -> optionally redirect to profile;
- missing required admin role can block navigation client-side for convenience, but still expect server 403;
- never derive authorization from a form or user-editable client property.

Redirect parameter must accept internal application paths only; reject external/open-redirect targets.

## 15.5 Browser login/refresh storage design

Production browser baseline:

- refresh token: backend-owned `HttpOnly; Secure; SameSite` cookie;
- access token: JavaScript memory only;
- no refresh token in localStorage/sessionStorage/IndexedDB;
- access token is not persisted by default;
- all refresh/logout calls use `credentials: include`;
- resource calls receive Bearer access token from the shared HTTP layer.

This intentionally means a page reload requires bootstrap refresh. That is desirable: it avoids persistent bearer access credentials in browser storage.

## 15.6 Bootstrap flow

```text
App starts
 -> auth=unknown
 -> POST /auth/refresh with cookie
    -> success: access token in memory
       -> GET /me
       -> authenticated
    -> no session / expired / revoked:
       -> anonymous
```

A normal anonymous visitor must not see an alarming error toast simply because bootstrap has no refresh session.

**TBD:** exact status/error code that distinguishes `no browser session` from a true auth-service failure.

## 15.7 Concurrent request refresh coordination

Critical browser behavior:

```text
Request A -> 401
Request B -> 401
Request C -> 401

A starts one refresh promise
B/C await same promise
refresh rotates cookie once
A/B/C retry once with new access token
```

Never let each failed request independently call refresh under strict rotation. The source explicitly notes that two concurrent refreshes with the same T1 may cause legitimate sessions to be revoked by strict replay detection.

Rules:

- exactly one in-flight refresh per browser app instance;
- refresh request is excluded from 401 interception recursion;
- original requests retry at most once;
- 403 never triggers refresh;
- failed refresh clears token and protected cache once;
- if safe error indicates `AUTH_REFRESH_REUSE_DETECTED`, preserve that reason for the sign-in message.

## 15.8 401, 403 and expiration UX

### 401 with recoverable expired access token

Silent refresh; no toast if recovery succeeds.

### 401 with expired/revoked refresh session

- clear access token/principal;
- clear authenticated query cache;
- navigate to login;
- show one concise message: `Your session expired. Sign in again.`

### refresh reuse detected

- clear all local auth state;
- navigate login;
- show stronger safe warning: `This session was revoked because a refresh token replay was detected. Sign in again.`
- do not expose old refresh token or session family internals.

### 403

- no token refresh;
- render `Access denied` inline/page-level;
- authenticated navigation remains intact.

## 15.9 Login/register security UX

- login failure message remains generic (`Invalid email or password`) even if internal mock knows exact reason;
- do not disclose whether a user exists except where register duplicate contract explicitly returns it;
- password field never logs/telemeters its value;
- no analytics event contains credentials;
- prevent accidental double submit;
- use autocomplete semantics (`email`, `current-password`, `new-password`) rather than disabling browser password managers;
- rate limit response shows wait time only if backend safely provides `Retry-After`;
- blocked-user public message follows backend safe error mapping; exact external mapping is TBD.

## 15.10 Session list/revocation UX

- session rows use stable `session_id` only for API action, not as a bearer secret;
- show device label rather than parsing user agent in multiple UI components;
- if `DeviceLabel` is absent, display neutral `Unknown device`;
- current session badge requires API support and is currently TBD;
- revoke mutation invalidates session list;
- if current session is revoked through another context and next refresh fails, normal global auth flow handles it;
- logout-all confirmation clearly states that current session will also end.

## 15.11 Admin route

The admin route is a **demonstration endpoint** only. The frontend should show:

- current principal roles;
- endpoint result if admin;
- a short note that route guard is only UX and backend role middleware is authoritative;
- no admin user-editing controls.

## 15.12 Mock-specific security demo

In mock mode, MSW may internally simulate an HttpOnly-like refresh cookie/session even though it cannot create browser server-set cookie semantics identical to production in every test environment.

The UI must not receive a mock refresh token directly.

Mock scenarios:

- normal user session;
- admin session;
- blocked user;
- expired access token with successful refresh;
- expired refresh session;
- refresh replay detected;
- revoked session;
- login rate limited;
- invalid credentials;
- email duplicate.

For interview replay demonstration, the mock scenario controller may transition the **server-side mock state** to replay-detected. Do not add a UI button that reads/reuses a real HttpOnly refresh token.

---

# 16. Notification Service frontend plan

## 16.1 Frontend objective

Notification UI is an **operational/admin console for delivery mechanics**. It must make this chain understandable:

```text
order event
  -> durable notification job(s)
     -> delivery attempt 1
     -> retry_wait
     -> attempt 2...
     -> sent OR dead
```

It is explicitly not:

- a marketing dashboard;
- a campaign builder;
- an email editor;
- CRM;
- segmentation UI;
- mass-send product.

The visual narrative should highlight at-least-once processing, durable jobs, retries, provider results and manual recovery.

## 16.2 Routes and pages

### `/notifications` — Jobs list

Content:

- operational title/subtitle;
- filters required by source:
  - status;
  - channel;
  - event type;
- keyset pagination;
- jobs table;
- optional compact health summary only from a real stats API; otherwise link to Grafana.

Recommended columns:

- job ID;
- event type;
- channel;
- recipient — masked in list by frontend proposal where practical;
- status;
- attempt count;
- next attempt at;
- last error code;
- created at;
- sent at if complete.

**PROPOSED CONTRACT:** query parameter names for status/channel/event type and cursor are not fixed by the source even though filtering and keyset pagination are required. Agree them in OpenAPI before real integration.

### `/notifications/:notificationId` — Job detail

This is the main demonstration page.

Recommended composition:

1. **Event origin card**
   - `event_id`;
   - `event_type`;
   - occurred/received time if API returns it;
   - producer;
   - aggregate/order ID;
   - correlation ID.

2. **Job card**
   - job ID;
   - channel;
   - safe recipient display;
   - template key;
   - status;
   - attempt count;
   - next attempt;
   - provider message ID if safe;
   - last error code;
   - created/updated/sent timestamps.

3. **Attempts timeline**
   - attempt number;
   - started/finished;
   - result;
   - provider status;
   - safe error code;
   - latency ms.

4. **Operational actions**
   - manual Retry only for eligible terminal delivery jobs;
   - external Grafana/Mailpit links if configured.

**TBD:** exact `GET /notifications/{id}` response shape. Frontend proposal is to return job plus delivery attempts or a relation/link sufficient to render them. The source defines the storage fields but not JSON DTO.

### `/notifications/events/:eventId` — Event view

Use exact `GET /api/v1/events/{event_id}` route.

Purpose:

- show input event metadata;
- show whether event was consumed/deduplicated if response exposes it;
- show all notification jobs resulting from this event if API exposes them;
- link to each job detail.

**TBD:** event response DTO and whether related jobs are embedded.

## 16.3 Best visual representation of event → job → attempts

Use a simple, semantic **vertical operational flow**, not a canvas graph library:

```text
[ Event: order.paid.v1 ]
          |
          +--> [ Email job: sent ]
          |       |- Attempt #1: provider 500, 184 ms
          |       |- Attempt #2: provider 429, 92 ms
          |       `- Attempt #3: sent, 121 ms
          |
          `--> [ Telegram job: ... ]   # only if that channel/job exists
```

Implementation later can use CSS borders/lines and regular cards. This is more accessible and simpler than a node graph while making causality obvious.

Do not represent Kafka partition internals as if they were job states.

## 16.4 Job status UI

Exact statuses from source:

- `pending`;
- `processing`;
- `retry_wait`;
- `sent`;
- `dead`;
- `cancelled`.

Semantics:

- `pending`: queued and eligible when scheduled;
- `processing`: claimed by worker;
- `retry_wait`: previous attempt failed retryably, waiting for `next_attempt_at`;
- `sent`: successful provider result recorded;
- `dead`: retry budget exhausted or terminalized;
- `cancelled`: no further delivery.

There is **no generic job status `failed`** in the source. Frontend wording must not invent one. Failure is represented by attempt results and either `retry_wait` or `dead` job status.

## 16.5 Retry UX

Source admin API contains:

```text
POST /api/v1/notifications/{id}/retry
```

Core UI policy:

- show Retry for `dead` jobs;
- do not show manual Retry for `sent` or `cancelled`;
- `pending`, `processing`, `retry_wait` are already controlled by worker/retry policy and should not receive a duplicate manual action by default;
- if backend later permits more statuses, encode them in API/domain policy explicitly.

Retry dialog:

- identify job/channel safely;
- explain that manual retry creates another delivery attempt and that external provider crash-window semantics may allow a rare duplicate side effect;
- confirm once;
- invalidate/refetch job and attempts after response.

**TBD:** whether `POST retry` changes job to `pending` immediately, creates a new job, or applies another explicit transition. The frontend must follow response contract rather than assume.

## 16.6 Kafka DLQ vs dead delivery jobs

The UI must explicitly preserve the source distinction:

### Kafka DLQ

`notifications.dlq.v1` contains poison/unparseable/unprocessable events.

Current admin API has **no endpoint to list Kafka DLQ messages**.

Therefore:

- no fake `DLQ page` in core frontend;
- shell/module may link to configured Kafka UI/Grafana;
- if a future API is deliberately added, it becomes a new source-backed feature.

### Dead delivery job

A valid event was processed and a particular notification exhausted delivery retry policy. This is visible through `notification_jobs.status=dead` and can be retried through existing admin API.

This distinction should be stated in help copy on the jobs page because it is an important interview concept.

## 16.7 Statistics

The source asks for simple success/failure statistics and defines rich Prometheus metrics, but the HTTP admin API does not define a statistics endpoint.

Therefore:

**PROPOSED CONTRACT — not fixed by backend specification:**

```text
GET /api/v1/notifications/stats
```

Potential minimal response view:

```text
window
sent
retry_wait
dead
processing
pending
success_rate
provider_latency_p95?   # preferably observability system, not duplicated if expensive
```

However the preferred scope decision is:

- only add a small in-app stats strip if backend intentionally provides a cheap admin stats endpoint;
- otherwise do not calculate misleading “global stats” from one paginated page;
- use a `Open Grafana` link for real operational metrics.

This keeps observability ownership honest.

## 16.8 Polling / live operational state

No WebSocket/SSE API is defined.

**Frontend proposal — not fixed by backend specification:**

- use TanStack Query polling at a modest interval (e.g. 5 s) on active job detail while status is `pending`, `processing` or `retry_wait`;
- stop/reduce polling when `sent`, `dead`, `cancelled`;
- pause when browser tab is hidden where library/default behavior permits;
- list page can have a manual refresh plus optional slow polling in mock/demo mode.

This is presentation behavior and does not require a new backend API.

## 16.9 Error/result presentation

Attempts show only safe structured fields:

- `result`;
- `provider_status`;
- `error_code`;
- `latency_ms`.

Do not show:

- provider secrets;
- raw exception stack;
- full sensitive template payload;
- SMTP/API credentials;
- raw headers unless explicitly sanitized.

Provider `429` should visually differ from permanent invalid-recipient errors because it explains why a retry was scheduled.

## 16.10 Privacy

The backend job stores `recipient`; operational UI needs enough information to identify a job, but the default list can reduce exposure:

- email: `u***@example.com` in list;
- Telegram/user identifiers: shortened/masked if appropriate;
- detail may show full recipient only to admin if backend contract permits.

This is a **frontend privacy proposal**, not a claim that backend already redacts DTOs.

## 16.11 Notification mock scenarios

- `notifications-happy-sent`;
- `notifications-duplicate-event`;
- `notifications-retry-then-sent`;
- `notifications-retry-to-dead`;
- `notifications-permanent-error-dead`;
- `notifications-manual-retry-success`;
- `notifications-empty`;
- `notifications-forbidden`;
- `notifications-service-unavailable`.

Deterministic mock time should be anchored to a fixed clock/scenario epoch so `next_attempt_at` and attempt history do not drift randomly after every refresh.

---

# 17. URL Shortener frontend plan

## 17.1 Frontend objective

Shortener UI is a compact management/analytics console. It demonstrates externally visible consequences of the backend's performance design without pretending the browser can see internal Redis/singleflight state.

Core UI:

- create a short URL;
- optional custom alias;
- optional expiration;
- copy/open redirect URL;
- list and inspect own links where ownership is available;
- enable/disable;
- logical delete;
- analytics by day/referrer/device;
- clear rate-limit/error/expiration behavior.

It must not become a Bitly clone.

## 17.2 Routes and pages

### `/shortener` — Link management dashboard

To minimize scope, combine:

- compact create panel/card;
- link list;
- no separate `/new` route initially.

Create fields exactly from source:

- `url`;
- `custom_alias` optional;
- `expires_at` optional.

Frontend validation mirrors documented rules:

- scheme `http`/`https`;
- custom alias 4–32 chars;
- alphanumeric + `-`/`_`;
- obviously reserved aliases can be warned about if reserved list is shared/configured, but backend remains authoritative.

No URL preview/title fetcher: the source explicitly avoids that feature and notes it would introduce SSRF concerns.

List recommended fields, subject to DTO:

- short code/short URL;
- original URL truncated with full accessible title/copy;
- status;
- expiration;
- created at;
- actions.

Do **not** show click count in list unless list DTO actually includes it; do not issue N analytics requests just to decorate every row.

### `/shortener/:linkId` — Link detail + analytics

Sections:

1. **Link metadata**
   - code;
   - short URL + copy/open;
   - original URL;
   - status;
   - expiration;
   - created/updated time;
   - version if response includes it.

2. **Management actions**
   - enable/disable;
   - logical delete;
   - update fields only to the extent allowed by final PUT DTO.

3. **Analytics**
   - total clicks;
   - clicks by day;
   - referrer domains;
   - device categories (`mobile`, `desktop`, `bot`, `unknown`).

4. **Backend mechanics links**
   - Grafana for cache hit/miss, redirect latency and analytics queue/drop metrics;
   - performance report repository link if configured.

No internal Redis-key inspector is part of the UI.

## 17.3 Create result UX

After successful `POST /api/v1/links`:

- show returned `short_url` prominently;
- copy button with accessible success announcement;
- `Open` in new tab;
- link to detail page;
- no confetti/marketing treatment; keep technical.

**Frontend proposal — not fixed by backend specification:** production short redirect hostname is `s.zolotoy.dev`, while management UI remains at `zolotoy.dev/shortener`. Backend response `short_url` is authoritative and the frontend must not reconstruct it if the API already returns it.

## 17.4 Link status and management actions

The source defines active/expiry/disabled/deleted semantics but does not provide a complete explicit management status enum in the API section.

**TBD / requires API contract decision:** final status enum and update request DTO.

Frontend must not encode a guessed enum into generated domain assumptions before OpenAPI stabilizes.

Known behavior:

- active + not expired -> redirect;
- expired -> unavailable (`404` or `410`, policy TBD);
- disabled/deleted -> unavailable (`404`/`410` policy TBD);
- management API can show accurate state even if public redirect intentionally hides distinctions.

Management actions:

- Disable: confirmation optional depending reversibility; usually no destructive dialog needed if easily reversible, but clear status change required;
- Enable: direct mutation with loading state;
- Logical Delete: destructive confirmation required;
- Update: only fields accepted by final PUT contract.

### PROPOSED CONTRACT for PUT — not source truth

Possible future request shape:

```text
url?          # only if destination editing is deliberately supported
expires_at?
status?       # or explicit enable/disable command alternative
version?      # if optimistic locking is used in public API
```

Do not implement this exact shape until backend chooses it.

## 17.5 Redirect demonstration

The browser UI can demonstrate redirect by:

- `Open short URL` in a new tab;
- provide `Copy`;
- show a small note that redirect is the service hot path and management UI is not involved in the redirect request.

Do not call `GET /{code}` through the JSON API client expecting a redirect DTO. Browser navigation should exercise the real redirect semantics.

In mock mode, direct browser navigation to an MSW-intercepted redirect may vary by environment. If exact external navigation cannot be reliably mocked, the demo page can use a labelled simulated redirect result while E2E tests verify handler semantics at the mock boundary. It must remain clear that real mode uses an HTTP 302.

## 17.6 Analytics UI

Preferred presentation:

- top metric: total clicks;
- line chart: clicks by day;
- horizontal bar/list: top referrer domains;
- bar/donut only if useful: device categories;
- every chart has an adjacent or toggled table/text representation.

Use Chart.js only here (and potentially Notification if later justified), keeping the rest of frontend dependency-free from charting.

**TBD / requires API contract decision:** exact `GET /links/{id}/analytics` response shape.

Frontend proposal — not fixed by backend specification:

```text
LinkAnalyticsDto
- total_clicks
- by_day: [{ date, clicks }]
- by_referrer: [{ referrer_domain, clicks }]
- by_device: [{ device_type, clicks }]
```

This maps naturally to the source's aggregate dimensions but must be ratified in OpenAPI.

## 17.7 Do not visualize Redis internals

No core UI widgets such as:

- `Redis key: link:Ab3...`;
- manually editable cache TTL;
- singleflight lock state;
- cache node topology;
- fake cache hit badge per browser click.

Those concepts are internal backend behavior and no management API exposes them.

Instead show their **observable evidence** through:

- Grafana link;
- documented performance report;
- redirect behavior under demo scenarios;
- external load-test/demo instructions.

This is more honest and more valuable in an interview.

## 17.8 Expiration/unavailable UX

Management UI may show accurate `Expired`, `Disabled`, `Deleted` labels if metadata DTO provides them.

Public redirect behavior remains backend policy:

- `404` for all unavailable links is privacy-friendly;
- `410` for expired/deleted is another valid policy.

**TBD:** select one public contract and document it. Frontend management UI does not need to mimic public indistinguishability.

## 17.9 Rate limiting UX

On `429` from create or management mutation:

- keep current form/data;
- show inline/top callout;
- show safe retry time when `Retry-After` exists;
- do not automatically spam retries;
- mock fixture includes deterministic rate-limit recovery.

## 17.10 Ownership/auth integration

The schema has nullable `owner_id`, and source discusses per-user/IP rate limiting, but management authentication/ownership policy is not fully fixed.

**TBD / requires API contract decision:**

- whether all management endpoints require Auth Service;
- whether anonymous links exist in production demo;
- whether owner ID is derived from JWT or request;
- authorization behavior for foreign links.

Frontend proposal for integrated zolotoy.dev:

- authenticated user owns management links;
- resource API derives owner from Auth principal rather than trusting a client-editable owner ID;
- mock mode supports a deterministic demo principal.

This is an integration proposal only; do not implement backend ownership assumptions until contracts are fixed.

## 17.11 Shortener mock scenarios

- `shortener-happy-active`;
- `shortener-analytics-populated`;
- `shortener-analytics-empty`;
- `shortener-disabled`;
- `shortener-expired`;
- `shortener-alias-conflict`;
- `shortener-rate-limited`;
- `shortener-not-found`;
- `shortener-service-unavailable`.

No mock scenario claims to display Redis internal truth. A `Performance demo` documentation link may explain how to reproduce cache miss/hit/singleflight in live backend.

# 18. API contract inventory

This inventory is intentionally strict about provenance.

Labels:

- **SOURCE CONTRACT** — route/method or DTO explicitly fixed by a backend MD;
- **SOURCE MODEL / DTO TBD** — operation exists, but JSON request/response is not fully fixed;
- **PROPOSED CONTRACT** — useful frontend-facing shape suggested for future OpenAPI; it is **not** existing backend truth;
- **TBD** — backend/security decision required.

Successful HTTP status codes are not guessed when the MD does not specify them. They must be finalized in OpenAPI.

## 18.1 Order Service API inventory

### Create order

- Purpose: create aggregate with item/price snapshots and chosen payment method.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders`.
- Request DTO: **SOURCE CONTRACT** fields `buyer_id`, `payment_method`, `items[{product_id,name,quantity,unit_price,currency}]`, `delivery_address`, `buyer_comment`; no request `total`.
- Headers: **SOURCE CONTRACT** `Idempotency-Key` required by project idempotency policy.
- Response DTO: **SOURCE MODEL / DTO TBD**; expected to expose created order/resource representation or equivalent.
- Success status: **TBD**.
- Relevant statuses/errors: `400` validation/domain; `401`; `403`; conflict code (`409` preferred public option vs documented `400` alternative) **TBD**; `429`; `500`.
- Relevant business errors: validation; idempotency conflict; infrastructure failure.
- Authorization: buyer/authenticated creation expected, but relation between authenticated `sub` and request `buyer_id` **TBD**.
- Frontend: `/orders/new`.

### Get order

- Purpose: show aggregate detail.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/orders/{order_id}`.
- Request DTO: path `order_id`.
- Response DTO: **SOURCE MODEL / DTO TBD**, based on aggregate fields `ID, BuyerID, Status, PaymentStatus, PaymentMethod, Items, DeliveryAddress, BuyerComment, Total, Version, CreatedAt, UpdatedAt`.
- Relevant statuses: `200` expected but final OpenAPI; `401`, `403`, `404`, `500`.
- Business errors: `ErrOrderNotFound` safe mapping.
- Authorization: **SOURCE** buyer can read own order; service/admin policy as backend defines.
- Frontend: `/orders/:orderId`.

### List orders

- Purpose: cursor-paginated management/buyer list.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/orders`.
- Pagination: **SOURCE CONTRACT concept** keyset `(created_at,id)` descending.
- Query parameter names: **TBD** (`cursor`, `limit` are only possible proposals).
- Response envelope: **PROPOSED CONTRACT** likely `items + next_cursor + previous/has_more`; exact shape **TBD**.
- Filters: not fixed; frontend should not invent them.
- Relevant statuses: auth/forbidden/server errors.
- Authorization: own-order visibility for buyer; broader service/admin visibility **TBD**.
- Frontend: `/orders`.

### Pay

- Purpose: begin/execute online payment according to order/payment state.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders/{order_id}/pay`.
- Headers: **SOURCE CONTRACT** `Idempotency-Key` required.
- Request body: **TBD**; no payment-provider/card DTO is defined.
- Response DTO: **TBD**, likely refreshed order/payment result.
- Relevant statuses/errors: validation/domain; `401`; `403`; `404`; version/idempotency conflict; `429`; `500`/provider safe failure.
- Business errors from source: `ErrInvalidOrderState`, `ErrPaymentAlreadyProcessing`, `ErrOrderAlreadyPaid`, `ErrVersionConflict`, `ErrIdempotencyConflict`.
- Authorization: buyer payment expected; exact service permissions **TBD**.
- Frontend: order detail action.

### Confirm

- Purpose: transition order to confirmed if invariants allow.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders/{order_id}/confirm`.
- Request/response DTO: **TBD**.
- Idempotency header: not declared as mandatory in source.
- Relevant errors: invalid state, auth/forbidden, not found, version conflict where applicable.
- Authorization: **SOURCE direction** service transition (`operator/admin`).
- Frontend: order action bar.

### Request cancellation

- Purpose: buyer/service requests cancellation where state permits.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders/{order_id}/request-cancellation`.
- Request/response DTO: **TBD**.
- Exact eligible source states: **TBD**.
- Relevant errors: invalid state, auth/forbidden, not found, version conflict.
- Authorization: exact role policy **TBD**.
- Frontend: order action bar/dialog.

### Cancel

- Purpose: execute cancellation; paid-order cancellation must not fake refund completion.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders/{order_id}/cancel`.
- Headers: **SOURCE CONTRACT** `Idempotency-Key` required by idempotency section.
- Request/response DTO: **TBD**.
- Paid-order refund orchestration/result: **TBD / backend domain decision**.
- Relevant errors: invalid state, version/idempotency conflict, auth, not found, server/provider failures if refund involved.
- Authorization: likely service role; exact policy **TBD**.
- Frontend: order action dialog.

### Complete

- Purpose: terminal completion; requires paid state, and pay-on-receipt scenario demonstrates failure while unpaid.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/orders/{order_id}/complete`.
- Request/response DTO: **TBD**.
- Relevant business error: invalid order/payment state.
- Authorization: service/admin semantics.
- Frontend: detail action.

### Order history

- Purpose: display lifecycle history.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/orders/{order_id}/history`.
- Response DTO: **TBD**.
- **PROPOSED CONTRACT:** ordered list of safe history entries with timestamp, operation/event type and before/after statuses where stored.
- Authorization: same ownership/service policy as detail unless backend specifies otherwise.
- Frontend: history timeline.

### Fulfillment transitions

The source requires Ship/InDelivery/Delivered behavior but does not fix routes.

**PROPOSED CONTRACT — choose before backend implementation:**

```text
POST /api/v1/orders/{order_id}/ship
POST /api/v1/orders/{order_id}/start-delivery
POST /api/v1/orders/{order_id}/mark-delivered
```

Alternative single status-change endpoint is permitted by source but less desirable for demonstrating explicit commands. Request/response/success codes remain **TBD**.

### Operational endpoints

**SOURCE CONTRACT:**

```text
GET /health/live
GET /health/ready
GET /metrics
GET /swagger.json
```

Frontend shell uses health/OpenAPI links. It does not parse Prometheus `/metrics` to construct product UI.

## 18.2 Auth Service API inventory

### Register

- Purpose: create user/credentials/default role.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/auth/register`.
- Request DTO: **SOURCE CONTRACT** `{email,password}`.
- Response DTO: **TBD**; must not contain password-related data.
- Success behavior: **TBD** — register-and-login vs register-then-login not fixed.
- Relevant errors: email duplicate, validation, rate limit, server error.
- Authorization: public.
- Frontend: `/auth/register`.

### Login

- Purpose: authenticate and create a session/initial refresh token.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/auth/login`.
- Request DTO: credentials are semantically required, but exact JSON body is not separately shown. **PROPOSED CONTRACT** `{email,password}`.
- Browser response: **TBD**. Preferred source strategy is refresh token via `Set-Cookie` and access token in response/body for in-memory storage.
- Non-browser token response: **SOURCE EXAMPLE** `{access_token,token_type,expires_in,refresh_token}`; do not use plaintext refresh token JSON as browser default.
- Relevant errors: safe `AUTH_INVALID_CREDENTIALS`; blocked user mapping **TBD**; rate limit; server error.
- Authorization: public.
- Frontend: `/auth/login`.

### Refresh

- Purpose: rotate refresh token and issue new access token.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/auth/refresh`.
- Browser request: **PROPOSED/TBD** no JSON body, refresh cookie attached with credentials.
- Browser response: **TBD** access token + expiry metadata and rotated `Set-Cookie`.
- Relevant errors: expired, revoked, reused/replay, invalid token, rate limit/server policy.
- Authorization: refresh credential, not Bearer access requirement.
- Frontend: hidden bootstrap/refresh coordinator.

### Logout current

- Purpose: revoke current session.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/auth/logout`.
- Request: **TBD**, preferred browser cookie identifies current refresh session.
- Response/cookie-clearing semantics: **TBD**.
- Authorization: current session.
- Frontend: user/session widget.

### Logout all

- Purpose: revoke all user sessions.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/auth/logout-all`.
- Request/response: **TBD**.
- Authorization: authenticated user.
- Frontend: sessions page confirmation.

### Get profile

- Purpose: fetch current user/principal.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/me`.
- Response DTO: **PROPOSED CONTRACT based on SOURCE User model** `id,email,status,roles,created_at,updated_at`; exact OpenAPI shape TBD.
- Relevant errors: `401`; blocked/revoked policy; server error.
- Authorization: authenticated.
- Frontend: profile + bootstrap principal.

### List sessions

- Purpose: view active/relevant devices/sessions.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/me/sessions`.
- Response DTO: **PROPOSED based on SOURCE Session model** safe subset of `id,device_label,created_at,last_used_at,expires_at,status,revoked_at/reason`.
- Current-session marker: **TBD**.
- Raw refresh hash/family internals: must not be returned to UI.
- Authorization: authenticated owner.
- Frontend: sessions page.

### Revoke one session

- Purpose: revoke specific session.
- Method/route: **SOURCE CONTRACT** `DELETE /api/v1/me/sessions/{session_id}`.
- Response DTO/status: **TBD**.
- Relevant errors: not found/forbidden/session state/server.
- Authorization: authenticated owner.
- Frontend: session row action.

### Admin example

- Purpose: demonstrate RBAC.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/admin/example`.
- Response DTO: **TBD**.
- Relevant statuses: `401`, `403`, `200` final OpenAPI.
- Authorization: `admin`.
- Frontend: `/auth/admin`.

### JWKS

- Method/route: **SOURCE CONTRACT conditional** `GET /.well-known/jwks.json` when selected public-key distribution is used.
- Frontend: link only if useful; normal UI does not consume JWKS directly.

### Operational endpoints

**SOURCE CONTRACT:** health, readiness, metrics, swagger as in MD.

## 18.3 Notification Service API inventory

### List notification jobs

- Purpose: operational job list.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/notifications`.
- Pagination: **SOURCE** keyset `(created_at,id)`.
- Filters: source frontend requires status/channel/event type; query parameter names are **PROPOSED/TBD**.
- Response DTO: **PROPOSED based on SOURCE notification_jobs fields**, exact envelope TBD.
- Relevant statuses: `401`, `403`, validation of filters, `500`/unavailable.
- Authorization: admin role middleware via Auth/dev auth.
- Frontend: `/notifications`.

### Get notification job

- Purpose: inspect job and delivery lifecycle.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/notifications/{id}`.
- Response DTO: **TBD**.
- **PROPOSED CONTRACT:** job fields + ordered `attempts[]`; optional safe event summary or link.
- Relevant errors: `404`, `401`, `403`, server.
- Frontend: `/notifications/:notificationId`.

### Manual retry

- Purpose: manually retry a terminal delivery job.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/notifications/{id}/retry`.
- Request DTO: **TBD**, likely empty in core.
- Response DTO/state transition: **TBD**.
- Frontend policy: core exposes for `dead` only until API says otherwise.
- Relevant errors: invalid current state, not found, forbidden, storage/server.
- Authorization: admin.
- Frontend: detail retry dialog.

### Get event

- Purpose: inspect source event/deduplication context.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/events/{event_id}`.
- Response DTO: **TBD**.
- **PROPOSED CONTRACT:** safe event envelope + consumption metadata + related job references where useful.
- Relevant errors: not found/auth/server.
- Frontend: `/notifications/events/:eventId` and event origin detail.

### Notification statistics

- Purpose: optional small in-app success/failure operational summary.
- Route: **PROPOSED CONTRACT** `GET /api/v1/notifications/stats`.
- This endpoint does **not** exist in source admin API and must be agreed before implementation.
- Alternative: omit in-app global stats and link Grafana, which is fully source-compatible.

### Kafka DLQ listing

- No admin HTTP route exists.
- Core frontend: **NO CONTRACT / NO PAGE**.
- Use Kafka UI/Grafana external link if configured.

### Operational endpoints

**SOURCE CONTRACT:** health, readiness, metrics, swagger.

## 18.4 URL Shortener API inventory

### Create link

- Purpose: create random/custom short link.
- Method/route: **SOURCE CONTRACT** `POST /api/v1/links`.
- Request DTO: **SOURCE CONTRACT** `{url,custom_alias?,expires_at?}`.
- Response DTO: **SOURCE CONTRACT** `{id,code,short_url,url,expires_at,created_at}`.
- Success status: final OpenAPI **TBD**.
- Relevant errors: malformed/unsupported URL, invalid/reserved alias, alias collision, rate limit, auth/ownership if adopted, server.
- Frontend: `/shortener` create card.

### Get link metadata

- Purpose: management detail.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/links/{id}`.
- Response DTO: **PROPOSED based on SOURCE schema** `id,owner_id?,code,original_url/url,status,expires_at,created_at,updated_at,version`; exact naming TBD.
- Relevant errors: not found/forbidden/server.
- Authorization/ownership: **TBD**.
- Frontend: `/shortener/:linkId`.

### List links

- Purpose: owner management list.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/links`.
- Pagination: **SOURCE** keyset `(created_at,id)`.
- Query parameter/envelope names: **TBD**.
- Response DTO: **TBD**; do not assume analytics totals per row.
- Authorization/ownership: **TBD**.
- Frontend: `/shortener`.

### Update link

- Purpose: support enable/disable and any backend-approved mutable metadata.
- Method/route: **SOURCE CONTRACT** `PUT /api/v1/links/{id}`.
- Request DTO: **TBD**.
- Response DTO: **TBD**.
- **PROPOSED CONTRACT:** explicit mutable fields only; avoid generic patch map. Whether URL, expiry, status and version are accepted must be decided.
- Relevant errors: invalid state/input, conflict if versioned, forbidden/not found/rate limit/server.
- Frontend: detail management actions.

### Logical delete

- Purpose: logically delete link and invalidate redirect/cache via backend.
- Method/route: **SOURCE CONTRACT** `DELETE /api/v1/links/{id}`.
- Response status/DTO: **TBD**.
- Authorization: **TBD owner policy**.
- Frontend: destructive confirmation.

### Link analytics

- Purpose: display aggregate click analytics.
- Method/route: **SOURCE CONTRACT** `GET /api/v1/links/{id}/analytics`.
- Response DTO: **TBD**.
- **PROPOSED CONTRACT:** total + by-day + referrer-domain + coarse-device aggregates.
- Relevant errors: not found/forbidden/server/unavailable analytics storage as backend chooses.
- Frontend: detail analytics section.

### Redirect

- Purpose: hot public redirect path.
- Method/route: **SOURCE CONTRACT** `GET /{code}`.
- Response: recommended source MVP `302` with `Location` for active link.
- Unavailable behavior: **TBD** `404` vs `410`; privacy-friendly unified `404` is source-supported option.
- Frontend component: `Open short URL` browser navigation, not JSON query.

### Operational endpoints

**SOURCE CONTRACT:** health, readiness, metrics, swagger.

---

# 19. Mock fixture inventory

## 19.1 Fixture principles

Fixtures are deterministic test/demo data, not faker-driven decoration.

Rules:

1. Stable IDs never change across refreshes.
2. Stable timestamps are based on a documented scenario epoch, e.g. `2026-09-01T12:00:00Z`, with relative offsets.
3. Resetting a scenario returns exactly the same state.
4. Newly created mock resources use a deterministic monotonic sequence, not random IDs.
5. Scenario handlers can mutate a cloned in-memory store; fixture source objects stay immutable.
6. Delays are deterministic per endpoint/scenario unless the scenario intentionally tests timeout.
7. Error fixtures use the same normalized backend envelopes/statuses expected in real mode.
8. Never put real passwords, API keys or secrets into fixtures.

## 19.2 Common stable principals

Frontend fixture constants:

```text
DEMO_USER_ID  = 11111111-1111-4111-8111-111111111111
DEMO_ADMIN_ID = 22222222-2222-4222-8222-222222222222
BLOCKED_ID    = 33333333-3333-4333-8333-333333333333
```

Mock-only credentials may be documented as public fake values such as:

```text
user@demo.zolotoy.dev  / DemoPass!123
admin@demo.zolotoy.dev / DemoPass!123
```

These values are never production credentials and are valid only in MSW scenario data.

## 19.3 Order fixtures

Stable IDs:

```text
ORDER_RECEIPT_UNPAID   = 10000000-0000-4000-8000-000000000001
ORDER_PREPAID_AWAITING = 10000000-0000-4000-8000-000000000002
ORDER_PAYMENT_FAILED   = 10000000-0000-4000-8000-000000000003
ORDER_COMPLETED        = 10000000-0000-4000-8000-000000000004
ORDER_CANCEL_REQUESTED = 10000000-0000-4000-8000-000000000005
ORDER_CONFLICT         = 10000000-0000-4000-8000-000000000006
```

Fixtures cover:

- delivered + awaiting `pay_on_receipt_online`;
- created + awaiting `prepaid`;
- payable + `failed` retry state;
- completed + paid terminal order;
- cancellation-request state;
- version conflict fixture with server version increment after first read;
- status history for each key lifecycle;
- empty list fixture;
- foreign-buyer/403 fixture.

Idempotency handler state:

- stable key `idem-order-create-001` + exact payload -> stored replay response;
- stable key `idem-order-pay-001` + same payload -> replay;
- stable key `idem-order-conflict-001` + alternate payload -> deterministic conflict.

## 19.4 Auth fixtures

Users:

- demo `user`, active;
- demo `admin`, active;
- blocked user.

Sessions:

```text
SESSION_CURRENT = 20000000-0000-4000-8000-000000000001
SESSION_PHONE   = 20000000-0000-4000-8000-000000000002
SESSION_OLD     = 20000000-0000-4000-8000-000000000003
```

Fixture states:

- anonymous/no refresh session;
- authenticated user;
- authenticated admin;
- access expired but refresh active;
- refresh expired;
- session revoked;
- refresh reuse detected -> family revoked;
- login rate limited with fixed `Retry-After`;
- invalid credentials;
- duplicate registration.

Access token strings inside MSW may be opaque dummy values and must not need JWT decoding by UI. Frontend should use `/me`/principal state, not trust self-decoded token claims as authorization source.

## 19.5 Notification fixtures

Stable event IDs:

```text
EVENT_PAID          = 30000000-0000-4000-8000-000000000001
EVENT_DUPLICATE     = 30000000-0000-4000-8000-000000000002
EVENT_PROVIDER_FAIL = 30000000-0000-4000-8000-000000000003
```

Stable job IDs:

```text
JOB_SENT          = 40000000-0000-4000-8000-000000000001
JOB_RETRY_WAIT    = 40000000-0000-4000-8000-000000000002
JOB_DEAD          = 40000000-0000-4000-8000-000000000003
JOB_PROCESSING    = 40000000-0000-4000-8000-000000000004
JOB_CANCELLED     = 40000000-0000-4000-8000-000000000005
```

Attempt fixtures cover:

- immediate success;
- provider 500 -> retry;
- provider 429 with retry-after semantics;
- timeout;
- permanent invalid recipient;
- repeated retryable errors until dead;
- manual retry followed by success.

Event duplicate fixture demonstrates one consumed event identity producing no second duplicate job.

Kafka poison-message/DLQ data is not rendered in core UI because no HTTP contract exists.

## 19.6 Shortener fixtures

Stable link IDs:

```text
LINK_ACTIVE    = 50000000-0000-4000-8000-000000000001
LINK_DISABLED  = 50000000-0000-4000-8000-000000000002
LINK_EXPIRED   = 50000000-0000-4000-8000-000000000003
LINK_DELETED   = 50000000-0000-4000-8000-000000000004
LINK_NO_CLICKS = 50000000-0000-4000-8000-000000000005
```

Stable codes:

```text
DemoGo01
Disabled01
Expired01
Deleted01
NoClicks01
```

Analytics fixtures:

- 7–14 fixed days of click counts;
- known referrers such as `google.com`, `github.com`, `(direct)`;
- devices `mobile`, `desktop`, `bot`, `unknown`;
- no raw IPs;
- deterministic totals matching dimension sums where the contract defines additive aggregation.

Error fixtures:

- custom alias collision;
- invalid URL;
- reserved alias;
- rate limit;
- management not found;
- unavailable API.

## 19.7 Global fixture/error scenarios

Every service module should be able to reuse global scenario classes where semantically valid:

```text
happy
empty
slow
unauthorized
forbidden
not-found
rate-limited
server-error
service-unavailable
```

Domain-specific conflicts remain in the owning service module rather than a generic error factory that loses semantics.

---

# 20. Demo scenarios

Demo scenarios must be reproducible from a clean mock reset with no database preparation. In live mode, equivalent scripts/seed data may be added later, but frontend mock demos are available from day one.

## 20.1 Order Service demos

### Demo O1 — Online payment on receipt lifecycle

Initial fixture: `ORDER_RECEIPT_UNPAID` or create a deterministic new order.

Flow:

1. create `pay_on_receipt_online` order;
2. use service/admin commands to move it through fulfillment to `delivered` while payment is `awaiting`;
3. show `Complete` disabled by frontend explanation, then deliberately invoke the backend rejection in demo mode or API tool to prove invariant;
4. execute Pay;
5. state becomes `paid`;
6. Complete becomes available;
7. complete successfully;
8. open history timeline.

Mock needs: order state machine, action policy, history transitions, Pay success.

### Demo O2 — Idempotent payment replay

1. start from payable order;
2. Pay with `Idempotency-Key=idem-order-pay-001`;
3. replay exact command with same key through advanced demo control;
4. receive same logical response and no second payment transition;
5. history contains one successful payment effect.

Mock needs: idempotency response store/request hash.

### Demo O3 — Idempotency key conflict

1. issue an idempotent command with key K and payload A;
2. attempt same key K with altered payload B;
3. receive conflict error;
4. UI renders dedicated idempotency conflict, not generic 500.

### Demo O4 — Optimistic concurrency conflict

1. open `ORDER_CONFLICT` detail at version N;
2. scenario simulates another actor moving server state/version to N+1;
3. submit stale command;
4. receive version conflict;
5. UI refetches and shows latest state + conflict callout;
6. user manually reevaluates action.

### Demo O5 — Prepaid fulfillment guard

1. show `prepaid` order with payment `awaiting`;
2. service fulfillment actions are disabled/not offered according to invariant;
3. Pay succeeds;
4. Confirm becomes available;
5. continue lifecycle.

### Demo O6 — Failed payment retry

1. Pay transitions to `failed` through deterministic provider-failure mock;
2. safe failure appears;
3. retry with new logical attempt/idempotency key;
4. payment succeeds if order remains payable.

## 20.2 Auth Service demos

### Demo A1 — Register → login → profile

1. register deterministic user;
2. login;
3. browser receives refresh cookie semantics in mock boundary and access token is stored only in memory;
4. `/me` loads profile;
5. protected navigation succeeds.

### Demo A2 — Silent access refresh

1. authenticated fixture has expired access token and active refresh session;
2. protected query returns 401;
3. one refresh request rotates session;
4. original request retries once;
5. UI remains authenticated without user-visible error.

### Demo A3 — Sessions and revoke one

1. open sessions;
2. display several deterministic device sessions;
3. revoke one;
4. list updates;
5. no token values are exposed.

### Demo A4 — Logout all

1. confirm logout-all;
2. backend mock revokes all sessions;
3. auth state/query cache clears;
4. protected route redirects to login.

### Demo A5 — Refresh replay detection consequence

This mirrors backend demonstration without exposing real HttpOnly token to JS:

1. mock server state starts with a valid session family;
2. scenario simulates reuse of an already used refresh token;
3. refresh returns safe `AUTH_REFRESH_REUSE_DETECTED`;
4. entire family becomes revoked;
5. app clears auth and shows security sign-in message;
6. subsequent refresh fails until new login.

Live backend's raw T1/T2 replay remains best demonstrated via API/curl/integration test, not unsafe browser token access.

### Demo A6 — RBAC + rate limit

1. normal user opens admin route -> 403 without refresh loop;
2. switch/reset to login brute-force scenario;
3. repeated invalid login reaches deterministic 429;
4. UI shows retry guidance.

## 20.3 Notification Service demos

### Demo N1 — Event → successful job → attempt

1. open event `order.paid.v1` fixture;
2. show event metadata;
3. show generated email job;
4. attempts timeline has attempt #1 success;
5. job status `sent`;
6. optional Mailpit link in live setup.

### Demo N2 — Duplicate event deduplication

1. ingest same `event_id` twice in mock/server demo;
2. event view indicates repeated input was deduplicated if API exposes that metadata;
3. only one logical notification job exists;
4. no second email attempt.

If admin event DTO does not expose dedupe metadata, show the same result indirectly by unchanged job set and document the server-side proof in live demo.

### Demo N3 — Retryable provider failures → dead

1. job attempt #1 receives provider 500;
2. job becomes `retry_wait` with deterministic next attempt;
3. later attempts include timeout/429 as fixture defines;
4. retry budget exhausts;
5. status becomes `dead`;
6. timeline explains each attempt.

### Demo N4 — Manual recovery

1. start with `dead` job;
2. restore mock provider scenario;
3. press Retry and confirm;
4. job returns to backend-defined retry state;
5. next attempt succeeds;
6. status becomes `sent`.

### Demo N5 — Permanent error

1. provider returns invalid-recipient/permanent 4xx classification;
2. job does not enter unbounded retries;
3. attempt timeline identifies permanent safe error;
4. terminal state is visible.

### Demo N6 — Operational observation

Live-oriented scenario:

1. watch a `processing/retry_wait` job with polling;
2. open Grafana link for pending age/provider latency/errors;
3. demonstrate that Kafka DLQ is separate from delivery dead job;
4. no fake Kafka internals are shown in app.

## 20.4 URL Shortener demos

### Demo S1 — Create → redirect → analytics

1. create deterministic short URL;
2. copy/open returned `short_url`;
3. exercise redirect;
4. analytics fixture/backend receives clicks;
5. detail displays total, by-day, referrer and device aggregates.

### Demo S2 — Custom alias conflict

1. submit already-used alias;
2. backend returns validation/conflict response;
3. inline alias error/callout appears;
4. form input stays intact.

### Demo S3 — Disable → unavailable → enable

1. open active link detail;
2. disable through final PUT contract;
3. management badge becomes disabled;
4. public redirect is unavailable according to chosen 404/410 policy;
5. re-enable;
6. redirect works again.

This scenario is gated on final update DTO.

### Demo S4 — Expiration

1. open expired fixture;
2. management page shows expiry/state;
3. redirect is unavailable;
4. no Redis internals are inferred from this behavior.

### Demo S5 — Empty vs populated analytics

1. open no-click link -> purposeful empty analytics state;
2. open populated link -> charts + accessible tables;
3. verify totals/dimensions are deterministic.

### Demo S6 — Performance/availability evidence

Live backend demonstration, not fake UI state:

1. open performance documentation/Grafana;
2. first redirect after cache deletion shows backend cache miss metrics;
3. subsequent redirect shows hit metrics;
4. Redis outage fallback and singleflight behavior are demonstrated by backend scripts/metrics;
5. management frontend remains a client rather than a Redis simulator.

# 21. Testing strategy

Frontend tests should protect integration semantics and demo reliability, not compete with backend test depth.

## 21.1 Tool decisions

### Vitest — use now

Why:

- fast Vite-native unit/integration runner;
- ideal for pure action policies, mappers, error normalization and query/application logic;
- low setup cost.

Use for:

- pure model/policy tests;
- API facade tests with MSW;
- composables/query behavior;
- security-sensitive refresh coordinator logic.

Can it be removed? Yes, but replacing it would offer no simplification because a test runner is still required.

### Vue Test Utils — use now, narrowly

Why:

- component behavior that cannot be proven by pure functions;
- form validation/presentation;
- dialogs/action states;
- route-aware UI.

Do not mount every trivial badge/card. Prefer pure tests for policy/mapping logic and a few behavior tests for components.

Can it be removed? Only if all component tests are shifted to Playwright, which would be slower and less focused.

### MSW — use now

MSW is part of both mock development and testing strategy, not a test-only duplicate.

Use for:

- realistic HTTP statuses/body/delay;
- auth cookie/session scenarios;
- business errors;
- list pagination;
- idempotency/concurrency responses;
- service-unavailable scenarios.

The same handlers/fixture factories can be reused by development and tests with scenario-specific setup.

Can it be removed? Technically yes, but then the project would need another network-level mock mechanism or duplicated fake clients. That would violate the mock-first goal.

### Playwright — use now, narrow scope

Purpose: prove that the four critical demo journeys actually work in a browser.

Core mock-mode E2E:

- Order pay-on-receipt lifecycle;
- Auth login/bootstrap/session or refresh behavior;
- Notification dead job -> manual retry;
- Shortener create -> detail/analytics.

Additional security/high-value E2E:

- protected-route redirect;
- normal user gets admin 403;
- auth refresh failure returns to login.

Real API smoke suite can be added once backends are deployed, but must remain small and environment-aware.

Can it be removed? Before public demo, not recommended. Browser routing/auth/dialog/copy/responsive interactions are difficult to prove sufficiently with unit tests alone.

## 21.2 What not to test heavily

Avoid:

- snapshots of whole pages;
- pixel-perfect visual regression suite;
- testing library/framework implementation details;
- trivial getters;
- every badge color;
- duplicating backend domain-unit test matrices in the frontend.

The frontend action matrix gets enough tests to guarantee **UI gating matches the known source-backed subset**, while backend tests remain authoritative for complete invariants.

## 21.3 Shared high-value tests

### Shared HTTP/error layer

Test:

- JSON error normalization;
- network failure;
- timeout/abort classification;
- 429 + `Retry-After` extraction;
- no raw response stack/HTML exposure;
- Bearer injection only when token exists;
- credentials inclusion only where required/configured.

### Refresh coordinator

Critical tests:

1. three concurrent protected requests receive 401;
2. exactly one refresh request is issued;
3. all eligible requests retry once after success;
4. failed refresh clears auth once;
5. refresh endpoint 401 does not recurse;
6. 403 never triggers refresh;
7. reuse-detected error preserves safe logout reason.

### Query cache isolation

After logout/switch from user to admin in mock demo:

- authenticated query data from previous identity is cleared;
- no other user's Order/Shortener management data flashes.

## 21.4 Order tests

Pure tests:

- action-policy known combinations;
- prepaid fulfillment blocked while unpaid;
- pay-on-receipt Complete blocked while unpaid;
- terminal states offer no mutations;
- payment processing disables new Pay;
- failed payment can expose retry where backend policy permits;
- unknown/TBD combinations do not become accidentally enabled.

Integration/component tests:

- create form omits total from request;
- deterministic preview total does not become authoritative request total;
- mutation sends stable idempotency key;
- timeout retry reuses same key/payload;
- modified payload with existing logical idempotency attempt does not silently reuse old key;
- version conflict refetches and shows callout;
- history empty/loading/error/rendering.

## 21.5 Auth tests

- login invalid credentials is generic;
- no token is written to local/session storage;
- bootstrap starts from `unknown` and avoids protected-content flash;
- anonymous protected route goes to login;
- admin guard works as convenience;
- server 403 still renders access denied;
- sessions revoke confirmation + invalidation;
- logout-all clears auth/query state;
- session expiration shows one reason, not toast storm;
- external redirect query is rejected/sanitized.

A test can monkey-patch Storage APIs and assert they are not called with bearer/refresh credentials.

## 21.6 Notification tests

- list filters serialize only agreed query params;
- job statuses map exactly to source enum;
- no generic `failed` badge is introduced;
- retry action visible for `dead`, absent for `sent/cancelled`;
- attempts timeline order is deterministic;
- provider 429/5xx/permanent errors render safely;
- event/job/attempt links preserve IDs;
- no Kafka DLQ navigation appears without contract;
- active-job polling stops on terminal status;
- global stats block is absent when stats capability is disabled.

## 21.7 Shortener tests

- create request contains only fixed create DTO;
- URL/alias frontend hints work but backend errors are still rendered;
- copy action announces success;
- delete requires confirmation;
- enable/disable UI is capability-gated by final update contract;
- analytics mapper handles empty/missing categories safely;
- chart data and accessible table are derived from same view model;
- rate-limit preserves form input;
- no code path attempts to query a Redis/cache-inspection endpoint.

## 21.8 CI frontend quality gate

Baseline pipeline:

```text
install locked dependencies
-> lint
-> typecheck (vue-tsc)
-> unit/component tests
-> build
-> Playwright mock smoke
```

Optional after live deployment:

```text
-> small real-API smoke against dedicated demo environment
```

No flaky timing thresholds or network-dependent public integration tests in mandatory pull-request pipeline.

---

# 22. Responsive strategy

The UI is desktop-oriented because it is a developer/admin environment, but it must remain usable on phone/tablet without creating a separate mobile product.

## 22.1 Breakpoint baseline

Frontend proposal:

- compact/mobile: `< 640px`;
- tablet/narrow desktop: `640–959px`;
- desktop shell: `>= 960px`;
- wide content enhancements: `>= 1280px`.

These are implementation tokens, not backend constraints.

## 22.2 Shell behavior

### Desktop (`>=960`)

- persistent left sidebar;
- top/context header;
- main content max width varies by page type;
- tables use available horizontal space.

### Narrow (`<960`)

- sidebar becomes drawer or top service switcher;
- current service remains obvious;
- environment/backend status moves into compact header/menu;
- primary page action remains visible.

### Mobile (`<640`)

- single-column forms;
- tables either:
  - retain horizontal scrolling with sticky first semantic column; or
  - transform to compact record cards when that substantially improves usability;
- do not hide critical status/action information;
- dialogs use near-full-width layout;
- action groups wrap vertically;
- long UUIDs/URLs truncate visually but retain copy/full accessible title.

## 22.3 Service-specific responsive rules

### Orders

- order list can become scrollable table rather than maintaining two independent render implementations initially;
- item editor rows stack on mobile;
- detail action bar becomes vertical/wrapped;
- order/payment status remain both visible.

### Auth

- login/register forms max-width on desktop, full-width card on mobile;
- sessions table may become cards because device metadata is naturally record-oriented.

### Notifications

- operational attempts timeline is naturally responsive;
- job list can horizontally scroll;
- filters become stacked/collapsible filter row;
- event → jobs flow stacks vertically on all sizes.

### Shortener

- create card stacks fields;
- long URLs use truncation + copy;
- charts use responsive container with fixed minimum height;
- analytics table is available below/next to chart.

## 22.4 No mobile-only scope

Do not add:

- bottom-navigation application rewrite;
- touch gestures;
- PWA/offline mode;
- mobile push notifications;
- alternate mobile API.

Responsive means usable presentation, not a second frontend product.

---

# 23. Accessibility baseline

Target: practical WCAG 2.2 AA-oriented engineering baseline without claiming formal certification.

## 23.1 Semantic structure

- one `main` landmark;
- real `nav`, `header`, `aside` where appropriate;
- heading hierarchy without skipped levels for visual styling reasons;
- tables use captions/headers for tabular data;
- forms use actual labels, not placeholder-only labeling;
- buttons are buttons, navigation is links.

## 23.2 Keyboard and focus

- every action works with keyboard;
- visible focus ring is never globally removed;
- modal/dialog traps/restores focus correctly;
- service drawer/menu supports keyboard navigation;
- after destructive action or route change, focus moves predictably;
- provide skip-to-main link in shell.

## 23.3 Status and color

- status badges contain text/icon/shape, never color alone;
- semantic colors satisfy readable contrast;
- error/success/warning states include words;
- mock/live environment indicator uses label in addition to color.

## 23.4 Forms and validation

- `aria-invalid` and error association where appropriate;
- field-level validation appears next to the field;
- global backend error is not attached misleadingly to one field;
- first invalid field receives focus only when it improves UX and does not cause focus thrashing;
- required fields are programmatically indicated.

## 23.5 Dynamic changes

Use restrained live regions for:

- copied-to-clipboard success;
- toast notifications;
- auth expiration message;
- background job status update where meaningful.

Do not announce every polling refresh or table rerender.

## 23.6 Motion

Respect `prefers-reduced-motion`:

- status transitions/fades shortened/removed;
- no essential information communicated only through animation;
- charts remain understandable statically.

## 23.7 Charts

Canvas/SVG analytics visualization always has an accessible counterpart:

- textual total;
- structured table/list of values;
- chart title/description;
- keyboard-accessible toggle if chart/table are separate views.

A chart is enhancement, not the only representation of analytics.

## 23.8 Destructive actions

- dialog title names the resource/action;
- explicit destructive button text (`Delete link`, `Log out all sessions`), not generic `OK`;
- cancel is always available;
- do not require typing long IDs for routine demo actions; that would add friction without risk benefit.

---

# 24. Security considerations

Security decisions are especially strict because Auth Service is itself a security project and all other services may consume its access tokens.

## 24.1 Token handling

- refresh token is never stored in localStorage/sessionStorage/Pinia/IndexedDB;
- production browser refresh token is `HttpOnly` cookie controlled by Auth backend;
- access token lives only in memory;
- raw token values never render in DOM, console logs, analytics or errors;
- no JWT in URL/query/hash;
- no client-side token debugging panel in production demo.

## 24.2 Cookies, CSRF and CORS

Required cross-service decision before live auth:

- Auth refresh/logout cookie domain/path;
- `SameSite` policy;
- allowed frontend origin(s);
- credentials behavior;
- CSRF mitigation for cookie-authenticated state changes.

CORS:

- explicit `https://zolotoy.dev` and optional `https://demo.zolotoy.dev` allowlist;
- never `Access-Control-Allow-Origin: *` with credentialed Auth requests;
- resource APIs receiving Bearer token still use explicit origin policy.

If API topology is moved behind a same-origin reverse proxy later, CORS complexity decreases, but this is not required for the initial static frontend architecture.

## 24.3 CSP and XSS baseline

Deployment should send a reasonable Content Security Policy, adjusted for actual assets and observability links.

Principles:

- no arbitrary inline scripts;
- no `eval`-style dependencies;
- avoid `v-html`; if ever unavoidable, sanitize explicitly with a reviewed library;
- notification payload/template content is rendered as data/text, not trusted HTML;
- backend messages are text, never inserted as HTML;
- external links use safe `rel="noopener noreferrer"` where relevant.

## 24.4 Vite environment variables are public

Any `VITE_*` value is bundled to the browser and must be treated as public configuration.

Allowed examples:

- API base URLs;
- docs/GitHub/Grafana public links;
- API mode;
- feature capability flags.

Forbidden:

- DB credentials;
- JWT private key;
- service tokens;
- provider secrets;
- Cloudflare API token;
- Grafana admin password.

Secrets remain server/infrastructure-side.

## 24.5 Authorization

- route guards are UX only;
- every protected backend operation must still enforce authorization;
- role is derived from trusted auth result/access token verified by backend, not request body;
- frontend never changes a role to unlock an action;
- Order ownership and Shortener ownership are backend decisions, not client filters.

## 24.6 Open redirects

Auth `redirect` query after login accepts only internal router destinations.

Shortener intentionally redirects externally, but destination validation happens in backend at link creation; the management frontend must not add a hidden server-side preview request.

## 24.7 URL Shortener safety

- frontend URL validation is convenience only;
- no preview/title screenshot fetch, avoiding a new SSRF-capable backend feature;
- `javascript:`/`data:` input is rejected in frontend hints and backend remains authority;
- external target opens with expected browser behavior;
- no raw IP analytics displayed/stored by frontend.

## 24.8 Notification data

- render provider/template error codes as text;
- no raw provider secrets;
- avoid unnecessarily exposing recipients in lists;
- do not render arbitrary notification HTML payload;
- no stack traces.

## 24.9 Error privacy

Never display:

- SQL errors;
- Go panic/stack trace;
- filesystem paths;
- Authorization header;
- raw cookies;
- provider request body containing sensitive information.

In development, raw response may be inspectable through browser devtools, but UI copy remains safe and normalized.

## 24.10 Dependency security

- lockfile committed;
- dependency updates reviewed;
- avoid large UI dependency surface;
- CI dependency/vulnerability audit according to repository policy;
- do not copy private/internal Ozon packages into public project;
- licenses of public dependencies remain compatible with project distribution.

## 24.11 Mock security

- mock mode must be visually obvious;
- mock credentials are intentionally fake/public;
- mock bundle contains no production secret;
- a mock scenario must not accidentally call live mutation endpoints: API mode config is single-source and asserted during startup/tests;
- production/live deployment should not expose destructive scenario reset controls.

# 25. Codex implementation stages and repository workflow

The architecture is implemented through **six sequential Codex tasks**, not one giant task. Each task edits the same repository and begins by inspecting the current state rather than assuming the previous prompt produced an exact template.

The required prompt sequence is:

```text
PROMPT-00 FOUNDATION
  -> PROMPT-01 ORDER
    -> PROMPT-02 AUTH
      -> PROMPT-03 NOTIFICATION
        -> PROMPT-04 SHORTENER
          -> PROMPT-05 FINAL INTEGRATION
```

This order intentionally keeps Order first after Foundation because it is the strongest portfolio module and can run against deterministic mock principals before full Auth UI exists. Foundation establishes the shared auth-capability/bootstrap boundary but not Auth business screens. Auth then fills that existing boundary without forcing Order to recreate infrastructure. Full live cross-service role/cookie integration is verified in Prompt 05.

## 25.1 Stage 0 — mandatory repository inspection before every task

Stage 0 is repeated at the beginning of **every** Codex task.

Codex must inspect, when available:

1. repository root and current working directory;
2. all applicable `AGENTS.md` / `AGENTS.override.md` files and their scope;
3. `git status --short` / current branch information without changing branches;
4. `package.json` and lockfile;
5. package manager actually used by the repository;
6. directory structure;
7. Vite/TypeScript/lint/test/build configuration;
8. router and route conventions;
9. shared UI/design tokens/layouts;
10. shared API/error/config layer;
11. mock/MSW bootstrap, handlers, scenarios and fixtures;
12. existing tests and test utilities;
13. relevant README/docs/OpenAPI/generated-client artifacts;
14. existing service modules that may already contain work from previous tasks;
15. uncommitted user changes and files outside the current task scope.

Codex must not assume the repository is pristine or that previous stages followed a guessed directory tree exactly. The real repository wins on low-level file placement where it remains compatible with this plan.

Before editing, Codex outputs a compact inventory:

```text
CREATE:
- ...

MODIFY:
- ...

PRESERVE:
- user/unrelated files and architectural areas intentionally left untouched

CONTRACT/TBD NOTES:
- only unresolved points that affect the current task
```

Then Codex performs the changes directly in the repository.

## 25.2 Shared verification loop for every task

After each coherent implementation slice, and always before completion, run the checks the repository actually exposes. Prefer package scripts instead of inventing parallel command variants.

Typical minimum if present:

```text
lint
-> typecheck / vue-tsc
-> relevant unit/component tests
-> relevant integration/E2E subset
-> production build
```

Required behavior:

1. run commands, do not merely recommend them;
2. wait for commands to finish;
3. inspect failures;
4. fix failures caused by the current task;
5. rerun until green or an environment limitation is proven;
6. never claim a check passed unless it actually ran successfully;
7. if a check cannot run, report exact attempted command, failure reason and what remains unverified;
8. do not broaden into unrelated refactoring merely to make a noisy repository fully perfect.

At the end inspect `git diff` / `git status` and verify scope. Do not use `git reset --hard`, `git clean -fd`, force push, destructive checkout/revert operations or delete user changes. Do not commit/push unless explicitly requested.

## 25.3 Dependency discipline

Before adding any runtime dependency Codex must verify:

1. the task is not already solvable with installed dependencies/native browser APIs;
2. this master plan already approves the dependency or the repository has standardized on it;
3. the dependency materially reduces implementation complexity or correctness risk;
4. maintenance/bundle/security cost is proportionate.

A service task may not migrate framework, router, state management, HTTP strategy, test runner, UI library or mock framework. If the repository already differs from this plan for a legitimate prior reason, Codex identifies the divergence before deciding whether to preserve or minimally reconcile it.

Dev dependencies required by the master testing/tooling strategy are allowed when they belong to the current stage and are not already present.

## 25.4 Stage 1 — FRONTEND-IMPLEMENTATION-PROMPT-00-FOUNDATION

### Goal

Make the single zolotoy.dev repository installable, runnable, testable and ready for all service modules **without implementing service business logic**.

### Scope

- Vue 3 + strict TypeScript + Vite baseline, only if repository is not already bootstrapped;
- Vue Router and route/module placeholders;
- common application shell, service navigation/switcher and technical landing;
- shared design tokens/global styles;
- minimal reusable UI primitives actually required by planned modules;
- TanStack Query provider;
- narrow Pinia setup for true client-global/auth state boundary;
- shared environment/service registry;
- shared native-fetch HTTP boundary;
- normalized error model;
- API mode config (`mock` / `real` or equivalent approved config);
- one MSW bootstrap/scenario foundation with no direct component-fixture coupling;
- test infrastructure (Vitest/VTU and Playwright wiring if planned and practical at this point);
- lint/typecheck/build scripts/config;
- baseline responsive/a11y behavior;
- README/environment example needed to run foundation.

### Explicit non-scope

- no Order state machine UI;
- no registration/login/session pages;
- no Notification job pages;
- no Shortener forms/analytics;
- no speculative service DTOs beyond tiny smoke-test placeholders needed to validate infrastructure;
- no duplicate fake business modules.

### Definition of Done

- repository install succeeds with its chosen package manager;
- dev app starts;
- shell/navigation works on desktop/tablet/mobile baseline;
- invalid environment config fails clearly;
- mock bootstrap can start without backend;
- real-mode transport configuration is representable without component changes;
- lint/typecheck/base tests/build pass;
- git diff contains foundation-only changes.

## 25.5 Stage 2 — FRONTEND-IMPLEMENTATION-PROMPT-01-ORDER

### Goal

Implement the Order module against shared Foundation infrastructure, mock-first and live-ready.

### Dependency

Prompt 00 is assumed present. Do not recreate project/router/design system/HTTP client/MSW bootstrap.

### Required verification emphasis

- state-dependent UI action policy;
- `OrderStatus × PaymentStatus × role` behavior;
- prepaid vs `pay_on_receipt_online` constraints;
- idempotency-key lifecycle;
- optimistic concurrency conflict UX;
- deterministic lifecycle/history scenarios;
- long IDs/tables/timelines responsive behavior.

### Definition of Done

Section 28.1 plus common Codex task DoD in section 28.5.

## 25.6 Stage 3 — FRONTEND-IMPLEMENTATION-PROMPT-02-AUTH

### Goal

Implement Auth screens and complete the shared browser authentication lifecycle without redesigning Order.

### Dependency

Prompts 00 and 01 are assumed present. Auth must reuse the existing shared auth boundary/HTTP layer/router/design system and preserve Order behavior.

### Required verification emphasis

- access token memory-only;
- refresh credential never stored in local/session storage;
- cookie-compatible refresh abstraction;
- bootstrap/route guards;
- one-refresh coordination for concurrent 401s;
- 403 handling;
- sessions/revocation/logout-all;
- rate limit/session-expired/replay scenarios;
- existing Order module remains green.

### Definition of Done

Section 28.2 plus common Codex task DoD in section 28.5.

## 25.7 Stage 4 — FRONTEND-IMPLEMENTATION-PROMPT-03-NOTIFICATION

### Goal

Implement the operational/admin Notification UI using existing shared infrastructure.

### Dependency

Prompts 00–02 are assumed present. Do not create another admin shell, table system, API client or mock framework.

### Required verification emphasis

- exact source status vocabulary;
- `event -> job -> attempts -> provider result` visibility;
- retry/dead behavior;
- polling termination;
- no invented DLQ/statistics API;
- provider error/long text safety;
- existing Order/Auth regressions absent.

### Definition of Done

Section 28.3 plus common Codex task DoD in section 28.5.

## 25.8 Stage 5 — FRONTEND-IMPLEMENTATION-PROMPT-04-SHORTENER

### Goal

Implement compact Shortener management + analytics UI using existing shared infrastructure.

### Dependency

Prompts 00–03 are assumed present.

### Required verification emphasis

- create/custom alias/expiration;
- copy/open redirect;
- list/detail/lifecycle actions only where contract supports them;
- analytics by day/referrer/device;
- rate limit/errors/expiry;
- no Redis/singleflight inspector invention;
- no list-level analytics N+1;
- responsive charts/tables/long URLs.

### Definition of Done

Section 28.4 plus common Codex task DoD in section 28.5.

## 25.9 Stage 6 — FRONTEND-IMPLEMENTATION-PROMPT-05-FINAL-INTEGRATION

This final task contains two internal passes.

### Pass A — cross-service integration

- verify shell/navigation and module lazy routes;
- verify Auth principal propagation/guards without silently changing backend role vocabulary;
- verify common error handling and query-cache clearing behavior;
- verify mock/live mode consistency;
- compare shared components and extract only clearly justified duplication (Rule of Three);
- verify links to OpenAPI/GitHub/Grafana/health only where configured;
- verify environment/service registry across all four services.

### Pass B — production readiness/regression

- full lint;
- full typecheck;
- full unit/component tests;
- complete relevant Playwright/E2E suite;
- production build;
- inspect console/runtime errors in critical mock flows where browser tooling permits;
- responsive pass desktop/tablet/mobile;
- accessibility baseline;
- dead-code/unreferenced-file review without speculative redesign;
- README/environment example/deployment documentation review;
- `git diff` scope and accidental-file audit.

### Explicit non-scope

No new product features. No redesign. No backend scope expansion. Only limited refactoring needed to fix consistency, duplication, defects or production-readiness gaps discovered by verification.

### Definition of Done

Section 28.6.

## 25.10 OpenAPI/live API adoption inside staged work

The old concept of a single late “OpenAPI phase” is replaced with **incremental contract adoption**:

- before each service task, inspect whether the corresponding backend OpenAPI now exists/stabilized;
- if stable, generate/use types at the approved network boundary during that task;
- if not stable, keep temporary DTOs confined to the adapter boundary and deterministic mocks;
- never block mock-first UI on an unavailable backend;
- when generated types replace temporary types, delete duplicate transport definitions and rerun service + regression checks.

Real API integration therefore happens service-by-service when available, while Prompt 05 verifies the combined live-ready architecture.

---
# 26. Risks / TBD / backend contract decisions

This section remains the backend/frontend contract-decision queue from the first pass and adds repository-agent risks. P0 decisions affect correctness/security; P1 affect integration/polish but do not prevent early mock-first implementation.

## 26.0 Codex/repository execution risks

### P0-CX-01 — Existing repository diverges from the plan

Codex must identify whether the divergence is:

- intentional prior implementation compatible with the same architectural intent;
- stale/unfinished work;
- a true contradiction with the master plan.

Do not overwrite first and explain later. Preserve compatible repository conventions; escalate/document true architectural contradictions before broad changes.

### P0-CX-02 — Uncommitted user work

A dirty worktree is not permission to delete or normalize unrelated changes. Codex scopes its patch around existing work and reports any unavoidable overlap.

### P0-CX-03 — Repository instructions

Inspect applicable `AGENTS.md` / `AGENTS.override.md`. Follow scoped repository instructions unless they conflict with higher-priority backend MD/master-plan requirements. Never ignore test commands or code-style requirements supplied by applicable repository instructions without stating why.

### P0-CX-04 — False verification claims

A task is not green because code “looks correct.” Every reported passing lint/typecheck/test/build must correspond to an actually executed successful command. Environment failures must be reported precisely.

### P1-CX-05 — Dependency drift

Service tasks must not accumulate convenience libraries. New runtime dependencies need explicit justification against existing stack and section 4.

### P1-CX-06 — Premature shared abstractions

Final integration may extract duplicate patterns only when semantics are stable and reuse is clear. Rule of Three is preferred to speculative generic components/composables.

## 26.1 Cross-service P0 decisions

### P0-CS-01 — Auth role vocabulary vs Order roles

Conflict:

- Auth core: `user`, `admin`;
- Order source: buyer plus `operator/admin` for service transitions.

Decision required:

- keep Auth core unchanged and map `user -> buyer`, `admin -> service/admin` for integrated demo; **recommended initial integration**;
- or deliberately extend Auth later with `operator` as a separately approved backend scope change.

Frontend must not silently invent `operator`.

### P0-CS-02 — Browser cookie/CORS/CSRF topology

Need exact decisions for:

- refresh cookie name/domain/path;
- SameSite;
- Secure/HttpOnly;
- which endpoint sets/rotates/clears cookie;
- allowed origins;
- CSRF mechanism;
- whether `demo.zolotoy.dev` may authenticate against live Auth at all.

Recommendation: mock demo remains isolated; live `zolotoy.dev` uses live API hosts and explicit allowlist.

### P0-CS-03 — Error envelope consistency

Order defines explicit `{error:{code,message,details}}`; other MDs define error concepts/codes but not one universal HTTP envelope.

Decision:

- standardize all public demo APIs on a compatible envelope where reasonable; or
- let each OpenAPI define its envelope and keep frontend normalized error adapter per service.

Recommendation: common external envelope is useful but is a backend API decision, not something frontend should impose silently.

## 26.2 Order P0 decisions

### P0-O-01 — Fulfillment command routes

Source leaves Ship/InDelivery/Delivered route shape open.

Recommendation: explicit commands:

```text
/ship
/start-delivery
/mark-delivered
```

Must be accepted in Order OpenAPI/domain implementation before live UI enables them.

### P0-O-02 — Earliest Pay state for `pay_on_receipt_online`

Source says payment may be a little earlier than delivery if allowed, but does not fix rule.

Recommended frontend baseline until decision: enable Pay at `delivered` only (and retry after failed there).

Backend domain tests should define the final earliest state.

### P0-O-03 — Cancellation state eligibility

`RequestCancellation`/`Cancel` exist, but source does not enumerate every allowed order/payment combination.

Need state table in backend/domain docs before final UI action matrix.

### P0-O-04 — Paid cancellation/refund workflow

Source invariant: paid cancellation must initiate refund; cannot immediately set refunded without confirmed operation.

Need decide:

- synchronous fake provider refund result;
- transitional refund state/event;
- how Cancel response reflects pending/failed refund;
- whether cancellation can complete before refund confirmation.

Frontend cannot manufacture this.

### P0-O-05 — Conflict HTTP status

Source explicitly allows two approaches:

- `409` for version/idempotency conflict — recommended for public API;
- `400` if intentionally following restricted internal convention.

Recommendation: use `409` in public pet-project and document it.

### P0-O-06 — List/query/history DTOs

Need:

- cursor parameter names;
- response envelope;
- Order list item fields;
- detail DTO;
- history entry DTO.

### P0-O-07 — Buyer identity

Decide whether create API keeps `buyer_id` or derives from Auth principal in integrated production mode. Source currently fixes `buyer_id` in request, so changing it requires explicit backend contract revision.

## 26.3 Auth P0 decisions

### P0-A-01 — Browser login/refresh response

Need exact browser OpenAPI behavior:

- login body fields;
- access-token response fields;
- `Set-Cookie` refresh rotation;
- refresh body/no-body;
- no-session response;
- logout cookie clearing.

### P0-A-02 — CSRF mechanism

Select one explicit policy for cookie-authenticated refresh/logout:

- Origin/Referer validation + SameSite;
- anti-CSRF token/header;
- another documented equivalent.

Do not defer this until after frontend code is public/live.

### P0-A-03 — Session list DTO

Need safe fields and status enum in HTTP response, including whether:

- `device_label` is provided;
- current session is marked;
- revoked sessions appear;
- IP prefix is returned.

Recommendation: return a safe device label and `is_current`; avoid raw UA parsing in frontend.

### P0-A-04 — Public error mapping

Need exact safe codes for:

- invalid credentials;
- blocked user;
- session expired;
- session revoked;
- refresh reused;
- email duplicate;
- rate limited.

`AUTH_REFRESH_REUSE_DETECTED` is already used in project demonstration and should become a stable safe code if retained.

### P0-A-05 — Register success semantics

Decide whether registration:

- returns user and requires login;
- creates session automatically.

Recommendation for clarity/security demo: register then explicit login, unless backend chooses otherwise.

## 26.4 Notification P0 decisions

### P0-N-01 — Job list filter contract

Frontend source requires filters status/channel/event type; HTTP API does not name query params.

Need define:

- `status` single/multi;
- `channel`;
- `event_type`;
- cursor/limit names;
- ordering.

### P0-N-02 — Job detail DTO

Need specify whether `/notifications/{id}` returns:

- job only;
- job + attempts;
- event summary.

Recommendation: job + ordered attempts and event ID/link is enough; event details can remain separate endpoint.

### P0-N-03 — Event detail DTO

Need safe event fields, dedupe metadata if desired, related job references.

Do not expose unnecessary raw payload secrets/PII.

### P0-N-04 — Manual retry state transition

Need exact eligible states and response. Core recommendation: `dead` only.

Clarify whether retry:

- resets same job to pending/retry state;
- creates a new attempt eligibility;
- resets attempt counter or preserves history.

History should normally remain preserved for operational explainability.

### P0-N-05 — Statistics endpoint

Decision:

- add minimal `/notifications/stats`; or
- omit in-app global stats and rely on Grafana.

Recommendation: Grafana-only is acceptable and keeps HTTP API small. Add stats only if it materially improves public demo.

### P0-N-06 — Kafka DLQ visibility

No HTTP endpoint today. Core decision: remain external via Kafka UI/Grafana. Do not add endpoint merely for frontend symmetry.

## 26.5 Shortener P0 decisions

### P0-S-01 — Management authorization/ownership

Need define:

- authenticated-only management?;
- nullable owner meaning?;
- anonymous create allowed?;
- foreign-owner read/mutate behavior?;
- owner derived from JWT or explicit field?

Recommendation for zolotoy.dev live integration: authenticated owner for management; public redirect remains anonymous.

### P0-S-02 — Link status enum

Need exact management enum representing active/disabled/logically deleted/expired semantics. Expired may be derived from `expires_at` instead of stored enum; document whichever is chosen.

### P0-S-03 — PUT update DTO

Must define exactly what can change:

- destination URL?;
- expiration?;
- enabled/disabled status?;
- optimistic version?;
- custom alias immutable or editable?

Frontend should not implement a guessed generic editor.

### P0-S-04 — Analytics response DTO

Need total/by-day/referrer/device response and zero/unknown-category semantics.

### P0-S-05 — Public unavailable redirect policy

Choose `404` vs `410` for expired/disabled/deleted. Source favors privacy-friendly unified behavior as a valid option.

Recommendation: public unavailable -> `404`; management endpoint shows exact status.

### P0-S-06 — Short redirect hostname

`short_url` in API response is authoritative; infrastructure hostname is not fixed in source.

Frontend/infrastructure proposal: `s.zolotoy.dev/{code}`.

## 26.6 P1 deployment/observability decisions

### P1-01 — Health response body and CORS

Routes are fixed, response schema is not. Shell only needs success/failure; decide if response includes version/build metadata.

### P1-02 — Public observability links

Decide which are safely public:

- Grafana viewer;
- Kafka UI;
- Mailpit;
- tracing UI.

Do not expose admin interfaces or credentials publicly merely because shell supports links.

### P1-03 — Mock deployment topology

Preferred:

- `zolotoy.dev` = live when available;
- `demo.zolotoy.dev` = deterministic mock-only build.

Alternative: mode switch inside one deployment. Separate hostname is safer/clearer because interviewer cannot accidentally confuse fake state with live backend.

### P1-04 — Theme persistence

Light/dark both are planned through tokens. Persistence can use localStorage because theme is non-sensitive. It is lower priority than service functionality.

### P1-05 — Trace/request ID response headers

If backends return standard request/trace identifiers, decide header names and whether UI exposes a copy/search link.

---

# 27. Definition of Done — overall frontend
The zolotoy.dev frontend is globally done when all of the following are true.

## Architecture

- one Vue 3 + TypeScript + Vite SPA is used;
- Vue Router owns four lazy-loaded service modules;
- no microfrontends, SSR/Nuxt or duplicate service SPAs were introduced without a new documented requirement;
- repository structure follows feature/service modules plus small shared layer;
- file naming is kebab-case;
- README explains build/run/mock/live behavior.

## Purpose and presentation

- `/` is a technical service dashboard, not a personal portfolio duplicate;
- every service states its backend engineering purpose in one short description;
- visual language is consistent across four modules;
- frontend remains secondary to backend mechanics;
- no Ozon internal UI/library is copied.

## API architecture

- components never import mock fixtures/handlers;
- UI calls module query/application layer;
- module API facade isolates transport DTOs;
- shared HTTP layer normalizes transport errors/auth/timeouts;
- mock and real modes use the same frontend API facade;
- unresolved backend contracts are explicit capability/TBD points, not hidden assumptions.

## Mock-first

- application works completely in mock mode with no Go services running;
- deterministic scenario reset exists;
- fixtures have stable IDs/times;
- validation/business/auth/conflict/rate-limit/5xx/unavailable scenarios are reproducible;
- mode is visibly labelled `Mock` vs `Live`;
- mock mode never accidentally mutates live endpoints.

## OpenAPI

- temporary handwritten API types are confined to adapter boundaries;
- once a backend contract stabilizes, TS API DTOs are generated from OpenAPI;
- generated files are reproducible and never hand-edited;
- UI/view models remain separate where presentation requires transformation.

## Authentication/security

- refresh token is never JavaScript-readable in live browser design;
- access token is memory-only;
- no bearer/refresh tokens in local/session storage;
- concurrent 401s share one refresh operation;
- 403 does not trigger refresh;
- logout clears authenticated query state;
- CORS/CSRF/cookie policy is documented before live auth;
- no secret is stored in `VITE_*` environment variables;
- backend errors are sanitized.

## UX/error handling

- loading, empty, not-found, forbidden, rate-limit, server-unavailable and domain-error states exist where relevant;
- unknown outcome of idempotent command can be retried correctly;
- destructive operations require appropriate confirmation;
- raw stack/SQL/provider secret content is never shown.

## Quality

- strict TypeScript passes;
- lint passes;
- unit/component tests pass;
- Playwright critical mock demos pass;
- production build passes from clean checkout;
- no critical console errors in normal demo flows;
- responsive behavior works from mobile through desktop;
- keyboard/focus baseline and accessible chart alternatives are present.

## Deployment/demo

- HTTPS deployment works;
- API mode and backend health are understandable;
- OpenAPI/GitHub/Grafana links appear only when configured;
- at least one short reproducible interview demo exists per service;
- demo can be reset without manual DB preparation.

---

## Codex/repository completion invariants

- all six implementation prompts operate on the same repository;
- Foundation is the only stage allowed to bootstrap global tooling/structure from scratch;
- later tasks first inspect and reuse existing shell/router/UI/API/mock/test infrastructure;
- applicable repository instructions were respected;
- no task depends on manual file copy/paste when repository editing was available;
- no task commits/pushes without explicit user instruction;
- final working tree changes are explainable by task scope;
- unrelated user changes are preserved;
- checks reported as passed were actually executed;
- unavailable checks are explicitly documented with attempted command and reason.

# 28. Definition of Done — each service frontend
## 28.1 Order Service frontend DoD

Order frontend is done when:

- list uses server/keyset pagination adapter;
- create form implements only source fields and never submits client total;
- detail shows items, total, delivery/comment, order status, payment status and payment method;
- history endpoint is represented once DTO is fixed;
- action availability comes from centralized policy;
- prepaid unpaid fulfillment is blocked in UI;
- pay-on-receipt unpaid `Complete` is disabled/explained and backend rejection can be demonstrated;
- terminal orders have no mutation actions;
- Create/Pay/Cancel implement idempotency-key lifecycle;
- timeout/unknown result supports same-key retry;
- idempotency conflict has dedicated UX;
- version conflict refetches and asks user to review latest state;
- Buyer/service role integration is explicit and does not invent Auth operator role;
- unresolved cancellation/refund/early-pay states remain disabled/TBD rather than guessed;
- mock scenarios O1–O6 are deterministic;
- high-value policy/idempotency/concurrency tests pass.

## 28.2 Auth Service frontend DoD

Auth frontend is done when:

- register/login/profile/sessions/admin routes exist;
- auth bootstrap has `unknown` state and does not flash protected data;
- access token is memory-only;
- refresh token is modeled as HttpOnly cookie in live design;
- refresh/logout use credentialed browser calls per final contract;
- concurrent protected 401s cause one refresh request;
- original requests retry at most once;
- 403 produces access denied without refresh;
- failed/revoked/reuse refresh clears auth and authenticated caches;
- sessions list/revoke and logout-all work;
- admin-only example is enforced by route UX and backend response;
- generic invalid credentials avoids enumeration-friendly detail;
- rate-limit state is handled;
- no token values are rendered/logged/persisted;
- mock scenarios A1–A6 are reproducible;
- refresh coordinator and route guard tests pass.

## 28.3 Notification Service frontend DoD

Notification frontend is done when:

- list renders source statuses exactly;
- status/channel/event-type filters use agreed API parameters or remain mock proposal until agreed;
- keyset pagination works;
- job detail clearly shows event origin, job state and ordered attempts;
- provider status/error/latency is safe and readable;
- active jobs can refresh/poll without WebSocket invention;
- Retry is available only for backend-approved state, core default `dead`;
- retry confirmation preserves operational caveat about duplicate external side effect;
- Kafka DLQ and dead delivery jobs are visibly distinguished;
- no Kafka DLQ page exists without an API;
- in-app global statistics appear only if a real stats contract exists; otherwise Grafana is used;
- no marketing/campaign/email-editor scope exists;
- deterministic N1–N6 demos work;
- tests verify retry visibility, exact statuses, polling termination and absence of fake DLQ/stats UI.

## 28.4 URL Shortener frontend DoD

Shortener frontend is done when:

- create uses exact `{url,custom_alias?,expires_at?}` contract;
- returned `short_url` can be copied/opened;
- management list uses keyset adapter and does not issue per-row analytics N+1 calls;
- detail shows metadata/status/expiry;
- enable/disable/update is implemented only after PUT DTO is fixed;
- logical delete has destructive confirmation;
- public redirect is exercised through browser URL, not treated as JSON management API;
- analytics shows total/by-day/referrer/device from agreed response;
- charts have accessible table/text equivalents;
- expiration, alias conflict, rate limit, empty analytics and not-found states exist;
- ownership/auth follows final backend contract;
- no Redis/singleflight/cache inspector is invented;
- Grafana/performance links communicate backend mechanics instead;
- deterministic S1–S6 demos work where relevant contracts are available;
- create/analytics/status/error tests pass.

---

## 28.5 Common Definition of Done — every service Codex task

A service task is complete only when all are true:

- requested functionality for that service stage is implemented in real repository files;
- behavior matches its backend MD and this master plan;
- existing repository architecture is reused rather than recreated;
- deterministic mocks make the implemented service demo usable without backend;
- Vue pages/components do not import fixtures directly;
- service operations pass through approved application/query/API/transport boundaries;
- loading state exists where requests can wait;
- empty state exists where collections/data can be empty;
- relevant error/unauthorized/forbidden/conflict/rate-limit states exist;
- responsive behavior is checked at desktop, tablet and mobile sizes, including long IDs/URLs and tables/timelines/charts;
- semantic/accessibility baseline is preserved;
- relevant tests are added/updated;
- lint passes if a lint script exists;
- typecheck passes if available;
- relevant tests pass;
- production build passes;
- any required relevant E2E subset passes, or an environment limitation is explicitly documented;
- `git diff`/`git status` are inspected after implementation;
- unrelated files are not changed by the task, except minimal explicitly reported blocker fixes;
- README/config/docs are updated if runtime behavior or environment configuration changed;
- no commit/push occurs without explicit user instruction.

## 28.6 Definition of Done — Final Integration Codex task

Final integration is complete when:

- all four service routes work inside one shell;
- navigation/service switcher/breadcrumb behavior is consistent;
- shared components are reused where justified and service-specific components remain local where semantics differ;
- no unnecessary duplicate HTTP clients, error models, mock bootstraps, design tokens or layouts remain;
- mock/live selection is globally consistent and does not require Vue component edits;
- mock mode cannot accidentally call live mutations through configuration mistakes covered by the planned safeguards;
- Auth integration and cross-service 401/403/query-cache behavior are consistent with the final available contracts;
- backend role vocabulary remains source-faithful;
- global error handling is consistent while preserving service-specific domain codes;
- desktop/tablet/mobile regression pass is complete;
- accessibility baseline is checked for forms, dialogs, tables, charts and keyboard navigation;
- full lint passes;
- full typecheck passes;
- full unit/component test suite passes;
- relevant full Playwright/E2E suite passes where environment permits;
- production build passes;
- dead/unreferenced code introduced by these frontend stages is removed when safe;
- README and `.env.example`/equivalent accurately describe install, mock, real, test and build usage;
- deployment topology/config remains consistent with section 5;
- final `git diff` contains only intended frontend work and explicitly documented blocker fixes;
- no new product feature or redesign was added during integration.

---

# Final verification before Codex execution prompts

## CHECK 1 — Source fidelity

**PASS.** Service-specific requirements and contract gaps from the first master plan are preserved. Backend MD rules remain higher priority than frontend/repository convenience.

## CHECK 2 — Cross-service consistency

**PASS.** One SPA, one repository, one shell, one shared UI/error/API/mock/config foundation, one naming/testing strategy. Later prompts explicitly reuse prior repository work.

## CHECK A — Codex executability

**PASS.** Every prompt instructs Codex to inspect the repository, emit a compact `CREATE/MODIFY/PRESERVE` inventory, then directly edit real files and execute checks. Prompts are not “generate code snippets for manual copying” requests.

## CHECK B — Sequential consistency

**PASS.** Prompt 00 owns global foundation. Prompts 01–04 explicitly assume previous stages exist and prohibit recreating global tooling. Prompt 05 assumes all service modules are present and adds no new product scope.

## CHECK C — Verification

**PASS.** Every task has a mandatory implement → checks → inspect failures → fix → rerun loop. A task cannot claim success for checks that were not actually run.

## CHECK D — Scope control

**PASS.** Source precedence, dependency discipline, dirty-worktree preservation, prohibited destructive Git actions, Rule of Three and explicit no-redesign/no-backend-expansion rules constrain local tasks.

## Codex-specific validation note

Current OpenAI Codex guidance supports repository-local agent instructions such as `AGENTS.md` and emphasizes configured development environments, reliable tests and inspecting actual terminal/test results. This plan therefore requires Codex to discover scoped repository instructions and run the repository's own verification commands rather than relying on guessed conventions. This is Codex workflow guidance, not a backend contract.

Current workflow references used for this Codex adaptation:

- OpenAI — Introducing Codex: https://openai.com/index/introducing-codex/
- OpenAI — Unrolling the Codex agent loop: https://openai.com/index/unrolling-the-codex-agent-loop/

---
# CHANGELOG — second pass optimized for Codex

Relative to the previous `MASTER_FRONTEND_PLAN.md`:

1. **Execution target changed from generic implementation to Codex repository execution.** The document now assumes Codex edits one real Git repository instead of returning copy/paste code.
2. **Source precedence is explicit:** backend MD → master plan → repository state/instructions → service prompt → local Codex choice.
3. **Added mandatory repository-first inspection** including `package.json`, lockfile/package manager, router, shared UI/API/mocks/tests/config/docs, `git status`, dirty worktree and applicable `AGENTS.md` files.
4. **Added `CREATE / MODIFY / PRESERVE / CONTRACT-TBD` implementation inventory** before edits.
5. **Added Git-aware safety:** preserve user changes, inspect diff, no destructive Git commands, no commit/push without explicit request.
6. **Replaced monolithic implementation phases with six sequential Codex tasks:** Foundation, Order, Auth, Notification, Shortener, Final Integration.
7. **Added dedicated Foundation prompt** that owns common shell/design/API/mock/test/tooling only and explicitly excludes service business logic.
8. **Kept the required Order-before-Auth prompt sequence** while Foundation supplies only a minimal shared auth-capability boundary; full cross-service auth binding is verified later.
9. **Made OpenAPI adoption incremental per service** instead of one late global migration phase.
10. **Added mandatory verification loop** using actual repository scripts: lint, typecheck, tests, build and relevant E2E; environment limitations must be reported precisely.
11. **Added dependency discipline and Rule-of-Three scope controls** to prevent per-module framework/library drift and premature abstractions.
12. **Expanded DoD** with repository integrity, deterministic mocks, responsive/a11y verification, actual command execution and git-diff inspection.
13. **Added Final Integration prompt** for cross-service consistency, regression, documentation and deployment readiness only—no new product features/redesign.
14. **All original service-specific frontend requirements and backend TBDs remain preserved.**

---
# FRONTEND-IMPLEMENTATION-PROMPT-00-FOUNDATION

You are Codex working directly inside the **single frontend Git repository for zolotoy.dev**.

Your task is to implement **only the common frontend foundation** required by `MASTER_FRONTEND_PLAN.md`. Do not implement Order/Auth/Notification/Shortener business screens in this task.

## Mandatory sources

Before editing:

1. Read `MASTER_FRONTEND_PLAN.md` completely, especially sections 1–13 and 25–28.
2. Read all four backend source-of-truth files enough to understand shared constraints and ensure Foundation does not invent service behavior:
   - `01_order_service.md`
   - `02_auth_service.md`
   - `03_notification_service.md`
   - `04_url_shortener.md`
3. Inspect the existing repository and applicable repository instructions before assuming any bootstrap is necessary.

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

## Foundation scope

Implement/reconcile only common elements approved by the master plan:

- Vue 3 + TypeScript + Vite baseline if not already present;
- Vue Router;
- one application shell;
- technical zolotoy.dev landing/dashboard shell, not a personal portfolio;
- service navigation/switcher and route placeholders;
- design tokens/global styles and only the small shared UI primitives needed by the planned interfaces;
- TanStack Vue Query provider;
- Pinia only for genuine client-global/auth bootstrap state boundary;
- shared runtime/environment/service registry;
- API mode configuration (`mock` / `real` or existing equivalent);
- shared typed native-fetch HTTP boundary;
- common normalized frontend error model;
- shared MSW/mock bootstrap and deterministic scenario architecture;
- mock-mode indicator and safe mock reset infrastructure if included in master plan;
- lint/typecheck/unit-test/build configuration/scripts;
- Vitest + Vue Test Utils setup when not present;
- Playwright wiring only to the extent justified by the master plan; no fake service E2E flows yet;
- base responsive navigation/layout;
- accessibility baseline for shared primitives;
- `.env.example`/equivalent and README instructions needed to install/run/mock/typecheck/test/build.

## Explicit non-scope

Do not implement:

- Order list/create/detail/state-machine actions;
- Auth registration/login/profile/sessions/admin flows;
- Notification job/event/attempt pages;
- Shortener create/list/detail/analytics;
- speculative backend DTOs/endpoints;
- service-specific fixtures beyond minimal infrastructure smoke examples;
- separate service SPAs;
- microfrontends;
- SSR/Nuxt;
- large UI framework;
- second HTTP/mock/error implementation.

## Foundation architecture invariants

- one repository, one SPA, one shell;
- service modules will be route-level/lazy modules inside this repository;
- Vue components do not call `fetch` directly;
- components never import fixture data;
- mock and real modes share the same transport/application boundaries;
- server state is intended for TanStack Query, not Pinia;
- auth access-token state is memory-only by design; refresh credential will be browser-cookie compatible and must not be designed around localStorage;
- unresolved service contracts stay unresolved rather than being invented in Foundation.

## Foundation-specific verification

In addition to repository checks, verify:

- app can install/start;
- route shell works for `/`, `/orders`, `/auth`, `/notifications`, `/shortener` placeholders or equivalent master-approved routes;
- invalid API-mode/runtime config fails clearly;
- mock bootstrap starts without real backends;
- live configuration path exists without component changes;
- base shell does not overflow on desktop/tablet/mobile;
- shared dialog/button/form primitives included in this stage have basic keyboard/focus behavior.

## Definition of Done — Foundation

- repository is installable/runnable;
- one shell/router/shared infrastructure exists;
- foundation contains no service business implementation;
- mock and real transport architecture are wired at the shared boundary;
- lint/typecheck/base tests/production build pass when runnable;
- git diff is foundation-only;
- README/environment example explain the common workflows.

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


---

# FRONTEND-IMPLEMENTATION-PROMPT-01-ORDER


## Sequential prerequisite

Assume `FRONTEND-IMPLEMENTATION-PROMPT-00-FOUNDATION` has already been applied. Do not bootstrap the project again. Use the existing mock principal/auth-capability boundary for role-dependent Order demos; do not wait for full Auth UI and do not invent new Auth roles.

## Mandatory Order fidelity reminders

Preserve the complete Order-specific plan, including explicit `OrderStatus` and `PaymentStatus` handling, the `OrderStatus × PaymentStatus × UserRole` action policy, payment-method-specific lifecycle, cancellation/history, idempotent command retries, optimistic concurrency conflicts and backend domain-error rendering. Frontend action gating is only UX; backend invariants remain authoritative.

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

You are implementing the **Order Service frontend module for zolotoy.dev**. This is a production-quality public pet-project frontend whose purpose is to demonstrate the backend, not to become a separate frontend portfolio project.

## Mandatory sources

Before writing any code:

1. Read `01_order_service.md` completely. It is the **source of truth for backend behavior**.
2. Read `MASTER_FRONTEND_PLAN.md`, especially sections 1–14, 18–28.
3. Inspect the current frontend repository and existing shared shell/design/API/mock infrastructure.
4. Do not override either source with assumptions from this prompt if the source files have been updated more recently.

If a backend contract is absent or ambiguous, mark it `TBD / requires API contract decision`. If a frontend-side proposal is necessary for mock-first work, label it `Frontend proposal — not fixed by backend specification` and keep it behind an adapter/capability so it can be replaced without rewriting UI.


## Frozen global architecture

Do **not** redesign the frontend architecture unless a concrete repository/source conflict makes it necessary and you explain the reason first.

Use:

- one Vue 3 SPA;
- TypeScript strict mode;
- Vite;
- Vue Router;
- Vue SFC with `<script setup lang="ts">`;
- TanStack Query / Vue Query for remote/server state;
- Pinia only for true global client state/auth, not Order server entities;
- native `fetch` through the shared HTTP layer before generated OpenAPI adoption;
- `openapi-typescript` + `openapi-fetch` once Order OpenAPI is stable;
- MSW for mock mode;
- Zod only where pre-OpenAPI form/mock/runtime validation materially helps;
- shared lightweight zolotoy.dev design system;
- kebab-case filenames;
- Vitest + Vue Test Utils for high-value tests;
- Playwright for critical browser flow.

Do not add Nuxt, Axios, Redux, microfrontends, a large UI framework or a second design system.

## Frozen API layering

Components/pages must not import mocks or call raw backend URLs directly.

Use this dependency direction:

```text
Order page/component
 -> Order query/mutation/application function
 -> Order API facade
 -> shared HTTP/OpenAPI client
 -> network

MSW intercepts the same network request in mock mode.
```

DTOs belong at the API boundary. UI/view models may be separate when formatting/action policy requires it. Do not use a presentation model as if it were the backend contract.

## API modes

Support the existing global configuration:

```text
VITE_API_MODE=mock
VITE_API_MODE=real
```

Mock and real modes must use the same Order API facade. No `if (mock)` branches inside Order UI components.

## Source-backed Order behavior to preserve

Payment methods:

```text
prepaid
pay_on_receipt_online
```

Order statuses:

```text
created
confirmed
processing
shipped
in_delivery
delivered
completed
cancellation_requested
cancelled
```

Payment statuses:

```text
awaiting
processing
paid
failed
refunded
```

Critical invariants include:

- no empty order/items with invalid quantity/price;
- server calculates total;
- items immutable after confirmation;
- cancelled/completed terminal;
- no new payment while processing/paid;
- retry after failed only if order remains payable;
- no payment on cancelled order;
- prepaid cannot proceed to fulfillment before paid;
- pay-on-receipt may be delivered unpaid but cannot complete unpaid;
- cancelling a paid order requires a real refund workflow, not fake immediate refunded state;
- every state change increments aggregate version.

Frontend validation/action gating is convenience only; backend invariants remain authoritative.

## Existing fixed Order routes

Use the exact routes from `01_order_service.md` where defined:

```text
POST   /api/v1/orders
GET    /api/v1/orders/{order_id}
GET    /api/v1/orders
POST   /api/v1/orders/{order_id}/pay
POST   /api/v1/orders/{order_id}/confirm
POST   /api/v1/orders/{order_id}/request-cancellation
POST   /api/v1/orders/{order_id}/cancel
POST   /api/v1/orders/{order_id}/complete
GET    /api/v1/orders/{order_id}/history
```

Do not invent fulfillment command routes as existing contracts. Ship/start-delivery/mark-delivered routes are still a backend contract decision unless the current MD/OpenAPI now fixes them.

## Required frontend routes

```text
/orders
/orders/new
/orders/:orderId
```

Keep detail in one route with sections/tabs; do not create unnecessary CRUD pages.

## Required UI scope

Implement:

- orders list with keyset/cursor adapter;
- create-order form using the exact source create fields;
- no submitted `total`; optional client preview only;
- order detail;
- item snapshots;
- order/payment method/status badges;
- history timeline once DTO is available;
- centralized Order action-policy;
- state/role-dependent actions;
- idempotency UX for Create/Pay/Cancel;
- optimistic concurrency conflict UX;
- loading/empty/not-found/forbidden/rate-limit/service-unavailable/domain-error states;
- responsive behavior;
- mock demo controls only when appropriate and clearly marked.

## Action policy requirements

Do not scatter state checks across templates. Implement a testable centralized presentation policy that returns available/disabled actions and reasons.

Known rules must follow `MASTER_FRONTEND_PLAN.md` section 14 matrix.

Important unresolved rules:

- Auth has `user/admin`, while Order source mentions buyer/operator/admin;
- initial integration proposal is `user -> buyer`, `admin -> service/admin`; do not invent Auth `operator`;
- earliest Pay state for `pay_on_receipt_online` is TBD; conservative frontend baseline is Pay at `delivered` unless backend has since fixed earlier states;
- cancellation eligibility and paid-refund behavior are TBD;
- unknown combinations must not become enabled by guesswork.

## Idempotency requirements

Create, Pay and Cancel require `Idempotency-Key`.

Frontend must:

- generate one key per logical attempt;
- preserve key + exact payload while outcome is unknown;
- retry a timeout/unknown outcome with the same key;
- use a new key for a new logical attempt;
- render idempotency conflict explicitly;
- never hide a conflict by silently regenerating a key;
- provide an advanced exact-replay demo only in mock/developer mode if already approved by the master plan.

## Concurrency requirements

For version conflict:

- do not automatically retry mutation;
- refetch latest order;
- show clear conflict callout;
- recalculate action availability;
- let user decide whether to retry.

## Mock requirements

Use deterministic MSW fixtures and stable IDs. Implement at least:

- pay-on-receipt lifecycle;
- prepaid lifecycle;
- payment failure then retry;
- version conflict;
- idempotency replay;
- idempotency conflict;
- empty list;
- forbidden;
- rate limited.

Mocks must return realistic bodies/statuses/delays and mutate a resettable in-memory scenario store. No random fixtures on refresh.

## Testing requirements

High-value tests at minimum:

- action policy for known state combinations;
- unpaid prepaid fulfillment blocked;
- unpaid pay-on-receipt completion blocked;
- terminal states;
- create request omits total;
- stable idempotency key on unknown-outcome retry;
- idempotency conflict rendering;
- optimistic conflict refetch/callout;
- critical Order Playwright mock demo.

Do not duplicate the entire backend domain test suite in frontend.

## Error/security requirements

Use the global normalized error model. Do not show SQL/stack/provider internals. Respect current authenticated buyer/service role. Never trust frontend gating as authorization.

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


---

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


---

# FRONTEND-IMPLEMENTATION-PROMPT-03-NOTIFICATION


## Sequential prerequisite

Assume Foundation, Order and Auth are already implemented. Reuse all shared infrastructure. Do not create a second admin shell/table system/API client/mock bootstrap. Run regression checks for shared/auth changes that affect existing modules.

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

You are implementing the **Notification Service operational/admin frontend module for zolotoy.dev**.

The UI's job is to visualize backend delivery mechanics. It is **not** an email marketing product.

## Mandatory sources

Before code:

1. Read `03_notification_service.md` completely — backend source of truth.
2. Read `MASTER_FRONTEND_PLAN.md`, especially sections 1–12, 16, 18–28.
3. Inspect existing frontend shell, auth integration, API client, design primitives and MSW setup.
4. Use newer OpenAPI/source decisions if they resolve master-plan TBDs.

Never invent a backend endpoint and call it existing. Proposed contracts remain explicit adapters/capabilities.


## Frozen global frontend architecture

Use the existing one-SPA architecture:

- Vue 3 + TypeScript + Vite;
- Vue Router;
- Vue SFC `<script setup lang="ts">`;
- TanStack Query server state;
- Pinia only for global/auth state;
- shared native fetch/OpenAPI client;
- MSW mock network boundary;
- shared lightweight design system;
- kebab-case filenames;
- Vitest/VTU + narrow Playwright.

No Nuxt/Axios/Redux/microfrontends/new UI framework.

## Source-backed Notification model

Event types include:

```text
order.created.v1
order.paid.v1
order.cancelled.v1
order.completed.v1
```

Job statuses are exactly:

```text
pending
processing
retry_wait
sent
dead
cancelled
```

Do **not** invent a job status `failed`.

Delivery attempts contain source-backed fields such as:

```text
attempt_no
started_at
finished_at
result
provider_status
error_code
latency_ms
```

Core semantics:

- Kafka at-least-once;
- duplicate events are normal and deduplicated durably;
- event -> durable job -> worker/provider;
- retry only retryable errors;
- backoff + jitter;
- max attempts -> dead;
- manual retry exists;
- provider side effect can rarely duplicate in crash window without provider idempotency;
- Kafka poison DLQ is not the same thing as a dead delivery job.

## Fixed Admin/read routes

```text
GET  /api/v1/notifications
GET  /api/v1/notifications/{id}
POST /api/v1/notifications/{id}/retry
GET  /api/v1/events/{event_id}
```

Health/metrics/swagger are operational links.

Do not create a Kafka DLQ HTTP API unless the backend source/OpenAPI now explicitly contains one.

## Required frontend routes

```text
/notifications
/notifications/:notificationId
/notifications/events/:eventId
```

## Required UI

### Jobs list

- status/channel/event-type filters required by source frontend scope;
- keyset pagination;
- safe recipient presentation;
- status;
- attempt count;
- next attempt;
- last safe error code;
- timestamps.

Filter query parameter names are `PROPOSED CONTRACT` until OpenAPI fixes them.

### Job detail

Build a clear operational sequence:

```text
Event origin
 -> Notification job
    -> Attempt #1
    -> Attempt #2
    -> ...
    -> Sent / Dead
```

Use semantic cards/timeline/CSS, not a graph library.

Show event ID/type/correlation/order link data only when returned by API. Show job/channel/template/status/provider result and attempts from source-backed fields.

### Retry

Core frontend shows manual Retry for `dead` only unless backend now specifies broader eligible states.

Retry requires confirmation and explains that external provider crash-window semantics mean an operational retry can, in rare cases, duplicate side effect if prior provider success was not recorded.

Do not expose retry for `sent`, `cancelled`, `processing` or `retry_wait` by assumption.

### Statistics

Source requests simple success/failure stats, but original admin API has no stats endpoint.

Therefore:

- if current OpenAPI now defines a stats endpoint, implement it through API facade;
- otherwise omit fake global stats and show configured Grafana link;
- never compute “global success rate” from only the current paginated page.

### Kafka DLQ

Original source has no HTTP listing endpoint. No core DLQ page. A configured Kafka UI/Grafana link is acceptable.

Explain in UI help copy:

- Kafka DLQ = invalid/poison input event;
- `dead` notification job = valid event whose delivery exhausted retry budget.

## Polling

No SSE/WebSocket source contract exists.

Use the master-plan frontend proposal:

- modest Query polling for `pending`, `processing`, `retry_wait` details;
- stop/reduce polling on `sent`, `dead`, `cancelled`;
- do not add realtime backend scope.

## Mock requirements

Deterministic MSW fixtures/scenarios:

- successful sent job;
- duplicate event dedupe;
- retryable 500 then success;
- 429/retry wait;
- timeout/retries -> dead;
- permanent invalid-recipient terminal failure;
- dead -> manual retry -> sent;
- empty list;
- forbidden;
- service unavailable.

Use fixed event/job/attempt IDs and fixed scenario clock. No random attempt timing after refresh.

Do not fabricate Kafka DLQ records for a UI that has no contract.

## Testing requirements

At minimum:

- exact source status vocabulary;
- filter serialization once contract fixed;
- retry action visibility policy;
- attempts timeline ordering;
- provider error rendering safety;
- active polling terminates at terminal state;
- no DLQ page/link-as-internal-route without API;
- stats widget disabled when capability absent;
- critical Playwright dead->retry demo.

## Non-goals

Do not add:

- campaign builder;
- segmentation;
- CRM;
- template editor;
- mass marketing send;
- scheduled campaigns;
- user preference editor unless backend stretch scope is explicitly activated;
- Redis;
- another queue.

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


---

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


---

# FRONTEND-IMPLEMENTATION-PROMPT-05-FINAL-INTEGRATION

You are Codex working directly inside the **existing single zolotoy.dev frontend repository after Foundation + Order + Auth + Notification + Shortener have been implemented**.

This is an **integration/regression/production-readiness task only**. Do not add new product features and do not redesign the frontend.

## Mandatory sources

Before editing:

1. Read all four backend source-of-truth MDs.
2. Read `MASTER_FRONTEND_PLAN.md` completely, especially sections 25–28 and the contract/TBD register.
3. Inspect the full current repository, applicable `AGENTS.md` files, current git status/diff, all four service modules, shared layers, tests, configuration and documentation.
4. Treat existing service implementations as work to verify and minimally reconcile, not an excuse to rewrite them from scratch.

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

## Final Integration scope

### Cross-service consistency

Verify and minimally fix:

- application shell and all routes;
- service switcher/navigation/breadcrumb patterns;
- common layouts/spacing/typography/status semantics;
- duplicated shared primitives where Rule of Three now clearly justifies extraction;
- accidental over-abstraction where a shared abstraction made service semantics less clear;
- one shared HTTP/error/config/auth/mock foundation;
- mock/live switching across all services;
- query-cache behavior and auth logout/session-expiration handling;
- 401 vs 403 behavior across modules;
- role integration without inventing backend roles;
- links to OpenAPI/GitHub/Grafana/health only when configured;
- deterministic mock reset across service scenarios;
- generated OpenAPI/client adoption consistency where contracts are now available.

### UI/UX regression

Check all service flows for:

- visual hierarchy;
- spacing/typography consistency;
- table readability;
- form labels/errors;
- status visibility;
- destructive action clarity;
- disabled states;
- loading/empty/error states;
- long IDs, long URLs, long provider errors and overflow;
- desktop/tablet/mobile navigation, tables, dialogs, timelines and analytics;
- semantic HTML, keyboard/focus baseline and chart alternatives.

### Repository/code quality

Check:

- no duplicate Vue app/router/query client/MSW bootstrap/error model exists;
- no dead code or abandoned placeholder pages from staged work remain where safe to remove;
- no direct component imports of fixtures;
- no raw `fetch` calls bypassing approved service/API layer except explicitly documented low-level transport code;
- no debug `console` noise/secrets;
- no accidental `any`/weak types introduced without justification;
- no service-specific dependency added where shared/native tooling already solved the need;
- README and environment examples match actual scripts/config;
- deployment topology/config is ready for HTTPS/CORS/live/mock environments per master plan.

## Prohibited during Final Integration

- new product functionality;
- backend endpoint invention;
- UI redesign;
- framework migration;
- replacing the design system;
- broad folder restructuring for preference alone;
- changing state management/mock/HTTP strategy;
- adding a large dependency to simplify cleanup;
- destructive Git operations;
- commit/push without user instruction.

## Mandatory full verification

Run the repository's complete available verification suite, not just changed-service tests:

```text
lint
-> full typecheck
-> full unit/component tests
-> relevant/full Playwright or E2E suite
-> production build
```

Also inspect runtime critical mock demo flows if browser tooling is available. Fix current frontend regressions, rerun failed checks, and report environment-limited checks exactly.

## Definition of Done — Final Integration

- all four modules work under one shell;
- shared infrastructure is singular and consistent;
- justified duplication is removed without speculative abstraction;
- mock/live switching is coherent;
- Auth/cross-service error/cache behavior is coherent;
- source-contract TBDs remain explicit rather than guessed;
- responsive/a11y baseline is verified across all modules;
- full available lint/typecheck/tests/E2E/build pass;
- README/environment/deployment guidance matches repository reality;
- git diff contains only intended integration fixes;
- no new features/redesign were introduced;
- no commit/push was performed without explicit instruction.

Final response must provide a concise repository audit: files changed, integration defects fixed, checks actually run/results, remaining backend-contract TBDs, and environment limitations. Do not paste the repository contents.

