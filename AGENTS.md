# AGENTS.md — zolotoy-dev-frontend

## Purpose

This file contains persistent repository-level instructions for Codex working inside the
`zolotoy-dev-frontend` Git repository.

It applies to the entire repository unless a more deeply nested `AGENTS.md` or
`AGENTS.override.md` adds narrower instructions for a specific directory.

Nested instructions may refine local implementation details, but they must not weaken or
contradict:

- the backend service source-of-truth MD files;
- `MASTER_FRONTEND_PLAN.md`;
- security constraints;
- the single-repository / single-SPA architecture;
- Git safety rules;
- verification requirements defined here.

`zolotoy.dev` is a technical developer/admin environment for demonstrating backend services.
It is **not** a second personal portfolio site and must not become a frontend-first pet project.

The frontend exists primarily to:

- visualize backend behavior;
- expose reproducible API/demo scenarios;
- make state transitions and domain errors visible;
- make backend-oriented concepts understandable during an interview;
- provide a professional manual client for the services;
- remain small enough that Go/backend remains the main engineering focus.

---

# 1. Source-of-truth priority

When sources disagree, use this precedence:

```text
backend service MD
  ↓
MASTER_FRONTEND_PLAN.md
  ↓
current repository state + applicable AGENTS.md instructions
  ↓
current FRONTEND-IMPLEMENTATION-PROMPT-XX-*.md
  ↓
local Codex implementation choice
```

Interpretation:

1. Backend business rules are authoritative.
2. `MASTER_FRONTEND_PLAN.md` is authoritative for frontend architecture and shared decisions.
3. The real repository must be inspected and preserved; it is not assumed to be pristine.
4. The current execution prompt defines the scope of the current task.
5. Codex may make local implementation choices only where higher-priority sources leave room.

Never change backend business rules to simplify frontend implementation.

Never silently redesign the global frontend architecture during a service task.

If a real contradiction is found:

1. identify it explicitly;
2. preserve the higher-priority source;
3. do not invent a hidden workaround;
4. mark unresolved API questions as `TBD / requires API contract decision`;
5. mark frontend-suggested API shapes as `PROPOSED CONTRACT`;
6. continue only with work that is not blocked.

A frontend proposal is not an existing backend contract until accepted by the backend MD or
canonical OpenAPI.

---

# 2. Canonical project documentation

Expected documentation layout:

```text
docs/
├── backend-specs/
│   ├── 01_order_service.md
│   ├── 02_auth_service.md
│   ├── 03_notification_service.md
│   └── 04_url_shortener.md
├── frontend/
│   ├── MASTER_FRONTEND_PLAN.md
│   └── CODEX_ADAPTATION_CHANGELOG.md
└── codex/
    ├── FRONTEND-IMPLEMENTATION-PROMPT-00-FOUNDATION.md
    ├── FRONTEND-IMPLEMENTATION-PROMPT-01-ORDER.md
    ├── FRONTEND-IMPLEMENTATION-PROMPT-02-AUTH.md
    ├── FRONTEND-IMPLEMENTATION-PROMPT-03-NOTIFICATION.md
    ├── FRONTEND-IMPLEMENTATION-PROMPT-04-SHORTENER.md
    └── FRONTEND-IMPLEMENTATION-PROMPT-05-FINAL-INTEGRATION.md
```

If the repository uses different paths, locate the documents by filename instead of creating
duplicate copies or moving them without reason.

Backend source-of-truth mapping:

- `01_order_service.md` → Order Service;
- `02_auth_service.md` → Auth Service;
- `03_notification_service.md` → Notification Service;
- `04_url_shortener.md` → URL Shortener.

`MASTER_FRONTEND_PLAN.md` is the source of truth for:

- frontend architecture;
- one-repository strategy;
- routing and deployment topology;
- technology decisions;
- design system;
- repository structure;
- API abstraction;
- mock strategy;
- OpenAPI migration strategy;
- global error model;
- browser auth integration;
- testing;
- responsive/accessibility baseline;
- service-specific frontend scope;
- frontend contract/TBD register;
- Definition of Done.

`CODEX_ADAPTATION_CHANGELOG.md` is supporting context only. It does not override the master plan.

---

# 3. Sequential implementation model

The frontend is developed through these six Codex stages:

```text
00 Foundation
→ 01 Order
→ 02 Auth
→ 03 Notification
→ 04 Shortener
→ 05 Final Integration
```

Run **only** the stage explicitly requested by the user.

Do not automatically continue to the next stage after completing the current task.

## Stage 00 — Foundation

May create/reconcile global frontend infrastructure.

Must not implement business screens for Order/Auth/Notification/Shortener.

## Stage 01 — Order

Assumes Foundation already exists.

Must reuse the existing:

- shell;
- router;
- design tokens;
- shared UI;
- TanStack Query client;
- Pinia/auth-capability boundary;
- HTTP/error/config foundation;
- MSW bootstrap;
- test infrastructure.

Do not bootstrap another frontend application.

## Stage 02 — Auth

Assumes Foundation + Order already exist.

Must fill the existing auth/session capability rather than creating a parallel application-wide
auth architecture.

Do not create a second router, query client, HTTP client, mock runtime or design system.

## Stage 03 — Notification

Assumes Foundation + Order + Auth already exist.

Must build the operational/admin Notification module on shared infrastructure.

## Stage 04 — Shortener

Assumes all previous stages already exist.

Must build link management and analytics using the same shell, API, error, auth and mock patterns.

## Stage 05 — Final Integration

Assumes all four service modules already exist.

This is an integration/regression/production-readiness task.

Do not add new product functionality.

Do not redesign the application.

Do not migrate frameworks or replace approved shared infrastructure.

---

# 4. Repository-first behavior

Before **any** edit, inspect the real repository.

At minimum, inspect all relevant available items:

1. repository root/current working directory;
2. applicable `AGENTS.md` / `AGENTS.override.md` files and their scope;
3. `git status`;
4. existing uncommitted changes;
5. `package.json`;
6. lockfile and actual package manager;
7. current directory structure;
8. Vue/Vite/TypeScript configuration;
9. lint configuration;
10. unit/component test configuration;
11. E2E/Playwright configuration if present;
12. router, routes, guards and route names;
13. app shell/layout/navigation;
14. shared design tokens and UI primitives;
15. shared HTTP/API/error/config layer;
16. auth bootstrap/refresh infrastructure if present;
17. TanStack Query setup;
18. Pinia stores if present;
19. MSW bootstrap, handlers, scenarios and fixtures;
20. service modules already implemented;
21. tests and test utilities;
22. `.env.example` and runtime configuration;
23. README and relevant docs;
24. OpenAPI files and generated clients/types if present.

Never assume the repository is pristine.

Never assume it still exactly matches the state expected after an earlier stage.

Never overwrite user work because it differs from Codex's preferred implementation style.

If repository reality differs from the master plan, classify the difference before changing it:

- equivalent implementation of the approved architecture;
- deliberate user modification;
- documented later decision;
- genuine architectural contradiction.

Do not rewrite working code merely for stylistic preference.

---

# 5. Mandatory pre-edit implementation inventory

Before changing files, output a compact inventory:

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

After this inventory, directly perform the repository changes when editing/terminal tools are
available.

Do not stop at planning.

Do not return dozens of files for manual copy/paste instead of modifying the repository.

---

# 6. Global architecture invariants

The approved architecture is:

```text
one Git repository
→ one Vue application
→ one SPA
→ one common application shell
→ four lazy-loaded service modules
```

The application is a shared `zolotoy.dev` developer/admin environment.

Do not create:

- separate Vue applications for the services;
- microfrontends;
- Module Federation;
- iframe-based service separation;
- a second app shell;
- a second router;
- a second global API transport;
- a second global error model;
- a second global mock runtime;
- a second design system;
- Nuxt/SSR without an explicit master-plan revision;
- Redux;
- speculative frontend domain architecture for pattern purity.

The shell may share authentication identity and service-level status/configuration, but the browser
must not become an orchestrator for distributed backend business logic.

KISS/YAGNI applies globally.

---

# 7. Approved baseline stack

Preserve these master-plan decisions unless the master plan is explicitly revised:

- Vue 3;
- TypeScript strict mode;
- Vite;
- Vue Router;
- TanStack Vue Query for server state;
- Pinia only for genuine client-global state, principally auth/session bootstrap;
- native `fetch` behind the approved typed shared HTTP boundary before stable OpenAPI;
- `openapi-typescript` + `openapi-fetch` after an individual service OpenAPI stabilizes;
- MSW for mock-first network interception;
- Zod only where runtime validation is actually justified;
- Chart.js only for real analytics surfaces approved by the master plan;
- `lucide-vue-next` for icons;
- Vitest;
- Vue Test Utils;
- Playwright for a small high-value E2E subset;
- ESLint with public Vue/TypeScript configuration.

There is no general UI framework by default.

There is no date library by default.

Do not introduce Axios, another router, another state manager, another query library, another mock
library, another UI framework, or another form framework merely because it is convenient in one
module.

---

# 8. Dependency discipline

Before adding **any new runtime dependency**, verify:

1. can the problem be solved by already installed or native capabilities?
2. is the dependency compatible with `MASTER_FRONTEND_PLAN.md`?
3. does it materially reduce implementation complexity?
4. is the maintenance cost justified?
5. is the need stable enough to belong to the repository?

Before adding a dev dependency, apply the same reasoning where practical.

Do not perform a framework/library migration inside a service task.

Do not create a second lockfile.

Do not migrate npm ↔ pnpm ↔ yarn ↔ bun without explicit user instruction.

Use the package manager already selected by:

- lockfile;
- `packageManager` field;
- repository documentation.

---

# 9. Preferred repository shape and naming

Follow the master-plan structure unless the current repository already implements an equivalent
approved shape.

Preferred high-level structure:

```text
src/
├── app/
│   ├── router/
│   ├── shell/
│   └── providers/
├── modules/
│   ├── orders/
│   ├── auth/
│   ├── notifications/
│   └── shortener/
├── shared/
│   ├── api/
│   ├── config/
│   ├── ui/
│   ├── lib/
│   └── styles/
├── mocks/
├── tests/
└── main.ts

e2e/
openapi/
scripts/
```

A service module should contain only categories it needs, for example:

```text
api/
components/
models/
pages/
queries/
mocks/
tests/
```

Auth may additionally own `store/`.

Do not create empty folders only to mirror an architecture diagram.

Naming conventions:

- files/directories: `kebab-case`;
- Vue component identifiers: `PascalCase`;
- composable files: `use-*.ts`;
- composables: `useSomething()`;
- service facade: `<service>-api.ts`;
- temporary network DTO type: `<name>-dto`;
- presentation-specific type: `<name>-view-model`;
- tests: `*.spec.ts`;
- deterministic fixtures: semantic names, stable IDs;
- query keys: centralized and service-prefixed.

Shared extraction follows **Rule of Three plus semantic stability**.

Two similar blocks do not automatically justify an abstraction.

Conversely, truly global infrastructure must not be independently reimplemented by each service.

---

# 10. Required frontend layering

Approved direction:

```text
Vue page/component
  ↓
module query/mutation composable
  ↓
module API facade/application boundary
  ↓
shared HTTP/OpenAPI client
  ↓
network
```

In MOCK mode:

```text
same Vue page/component
  ↓
same query/mutation composable
  ↓
same module API facade
  ↓
same shared HTTP client
  ↓
MSW interception
```

Therefore:

- components must not import mock fixtures directly;
- components must not select mock vs live behavior;
- components must not call raw `fetch` directly;
- shared transport must not own service-specific domain semantics;
- service modules own domain-specific error interpretation and UI mapping.

Direct `fetch` is acceptable only inside the approved low-level transport/generated-client path.

---

# 11. Mock-first / real-API-ready invariant

The frontend must be fully demonstrable without running Go backends.

Mocks must be:

- deterministic;
- stable across reloads unless the selected scenario intentionally mutates state;
- semantically named;
- built around stable fixture IDs;
- capable of reproducing relevant backend states and failures.

Do not generate random fixture state on every refresh.

Switching:

```text
MOCK ↔ REAL
```

must not require Vue component changes.

Mock behavior must reproduce the known/future HTTP contract as closely as the source allows:

- method;
- route;
- request body;
- response body;
- status;
- validation errors;
- auth errors;
- authorization errors;
- not found;
- conflicts;
- rate limit;
- server/service failures;
- pagination;
- deterministic delays/loading;
- service-specific domain failures.

Never implement a mock-only shortcut that cannot exist over a real HTTP boundary.

If endpoint/DTO/status details are not fixed:

- do not present them as existing contracts;
- label them `PROPOSED CONTRACT` or `TBD`;
- isolate uncertainty behind the module API boundary.

---

# 12. OpenAPI rules

Before a service OpenAPI is stable:

- use small manual network-boundary types only where needed;
- keep DTOs separate from presentation/view models;
- avoid freezing speculative contracts;
- keep the module API facade stable enough for mock-first development.

After an individual service OpenAPI becomes canonical:

1. inspect the canonical schema;
2. place/fetch it according to repository conventions;
3. generate types with `openapi-typescript`;
4. use `openapi-fetch` for the typed Fetch client;
5. migrate that service incrementally;
6. preserve the module API boundary;
7. never hand-edit generated files.

Do not wait for all four services to stabilize before adopting generated types for one stable
service.

Do not create a second handwritten copy of every generated DTO unless a separate view model has a
real presentation purpose.

Generated DTOs are network-boundary artifacts, not UI domain/view models.

---

# 13. State management rules

Use TanStack Vue Query for server-derived state:

- lists;
- detail records;
- histories;
- sessions;
- analytics;
- notification jobs/attempts;
- mutations;
- loading/error/refetch lifecycle;
- targeted invalidation.

Do not mirror fetched server state into Pinia by default.

Pinia is deliberately narrow:

- auth/session bootstrap;
- memory-only access-token state where required;
- only other truly client-global state with a concrete reason.

Do not use Pinia as a generic repository/cache.

Invalidate only affected query families. Avoid global invalidation as the default mutation strategy.

Do not blindly retry all requests.

In particular, do not automatically retry:

- 401 authentication failures;
- authorization failures;
- domain/business 4xx failures;
- idempotency conflicts;
- optimistic concurrency conflicts;
- unsafe mutations.

---

# 14. Authentication and browser-security invariants

The Auth backend MD and the master plan override frontend convenience.

Never design refresh-token persistence around:

- `localStorage`;
- `sessionStorage`;
- IndexedDB;
- persistent Pinia storage.

The intended browser model must remain compatible with an:

```text
HttpOnly; Secure
```

refresh credential cookie.

Access-token state is memory-only by default.

Never log or expose:

- passwords;
- access tokens;
- refresh tokens;
- `Authorization` headers;
- auth cookies;
- private keys;
- secret environment values.

Treat `401` and `403` differently:

- `401` → authentication/session recovery or expiration;
- `403` → authenticated but unauthorized.

Concurrent `401` responses must not start uncontrolled parallel refresh operations after the
approved refresh coordinator exists.

This is especially important because strict refresh rotation/reuse detection can interpret reuse
of an old refresh token as compromise.

Do not create infinite refresh/retry loops.

Do not rely on self-decoded JWT claims as the sole authorization source if the approved flow uses
server principal/session state.

If cookie/CSRF/logout/refresh DTO details remain unresolved, keep them explicit as `TBD`.

---

# 15. Global error handling

Use the shared normalized frontend error model for transport-level categories.

Distinguish where applicable:

- network error;
- timeout;
- validation error;
- authentication error;
- authorization error;
- not found;
- conflict;
- concurrency conflict;
- idempotency conflict;
- rate limit;
- business/domain error;
- server error;
- service unavailable.

Do not display raw backend stack traces, SQL errors or unsafe internal messages.

UX guidance:

- form validation → inline;
- non-blocking mutation result → toast where appropriate;
- initial page load failure → page-level error;
- destructive confirmation → dialog;
- recoverable request failure → explicit retry;
- successful token refresh → silent;
- unrecoverable session failure → controlled session-expired/auth flow.

Do not flatten safe service-specific domain errors into a generic message if the backend exposes a
meaningful error code.

---

# 16. Shared UI/design rules

All service modules must look like one `zolotoy.dev` developer/admin product.

Do not make four unrelated applications.

Do not copy proprietary/internal Ozon UI or private libraries.

Do not turn the product into:

- an e-commerce storefront;
- a marketing landing page;
- a generic Bootstrap admin template;
- a cyberpunk/futuristic showcase;
- a second `maxzolotoy.com`.

Prefer a restrained modern technical interface.

Reuse shared design tokens for:

- typography;
- spacing;
- surfaces;
- borders;
- radii;
- focus styles;
- semantic status colors;
- responsive behavior.

Reuse existing shared primitives before creating service-specific duplicates.

Maintain consistent patterns for:

- buttons;
- fields/forms;
- status badges;
- cards;
- table shells;
- dialogs;
- tabs/dropdowns where justified;
- toast/notification region;
- skeleton/loading;
- empty state;
- error state;
- destructive confirmation.

Do not start a large Storybook/design-system project unless explicitly requested later.

---

# 17. Responsive baseline

Every service task must consider at minimum:

- desktop;
- tablet;
- mobile.

Inspect especially:

- shell/navigation;
- tables;
- forms;
- dialogs;
- timelines;
- analytics/charts;
- status badges;
- long URLs;
- UUIDs/long IDs;
- long backend/provider error messages.

Do not allow a table, UUID or URL to create horizontal overflow for the entire page.

Use local table scrolling, truncation + copy affordances, wrapping, or responsive representations
where justified.

---

# 18. Accessibility baseline

Preserve at least:

- semantic HTML;
- actual `<button>` elements for actions;
- labels for form controls;
- keyboard-operable flows;
- visible focus;
- accessible dialog focus behavior;
- errors associated with relevant fields;
- status meaning not communicated by color alone;
- readable contrast;
- text/table alternative for meaningful charts where required.

UI quality is part of completion.

"It renders" is not a sufficient acceptance criterion.

---

# 19. Service-specific non-negotiable boundaries

Always read the corresponding backend MD and execution prompt. The reminders below do not replace
those sources.

## Order Service

The Order UI is a technical order-management console, not a storefront.

Preserve:

- independent `OrderStatus` and `PaymentStatus`;
- state-dependent actions;
- role-dependent actions;
- buyer vs service/admin authorization boundaries;
- `prepaid`;
- `pay_on_receipt_online`;
- payment lifecycle;
- cancellation behavior;
- history/timeline;
- idempotent command behavior;
- optimistic concurrency conflict UX;
- backend invariants as source of truth.

Frontend may hide/disable impossible actions, but frontend validation is not authoritative.

Unknown `OrderStatus × PaymentStatus × role` combinations remain TBD rather than guessed.

Do not invent final cancellation/refund or fulfillment API semantics where backend contracts remain
open.

## Auth Service

Preserve:

- registration;
- login;
- profile;
- sessions/devices;
- revoke one session;
- logout current;
- logout all;
- RBAC;
- admin-only demo route;
- route guards;
- bootstrap session lifecycle;
- refresh behavior;
- concurrent refresh coordination;
- 401/403 distinction;
- session expiration;
- replay/revocation consequences;
- browser-safe token strategy.

Do not implement refresh-token storage in localStorage.

Do not expand MVP into social login, OAuth provider, passkeys, MFA or enterprise IAM unless the
backend source is explicitly extended.

## Notification Service

This is an operational/admin UI.

It is **not**:

- an email marketing dashboard;
- a campaign builder;
- a CRM;
- a segmentation tool;
- a visual email editor.

Preserve visibility of:

```text
event
→ notification job
→ attempt(s)
→ provider result
→ retry / dead / sent
```

Preserve where the API supports them:

- job status;
- channel;
- event type;
- timestamps;
- next attempt;
- attempt history;
- error code;
- provider result;
- retry;
- terminal/dead state;
- latency/statistics.

Do not invent a Kafka/DLQ control page if no frontend-facing API supports it.

Do not derive authoritative aggregate statistics from a single paginated page and present them as
backend stats.

## URL Shortener

Preserve:

- create short URL;
- optional custom alias;
- optional expiration;
- copy short URL;
- list/metadata;
- enable;
- disable;
- logical delete;
- analytics;
- clicks total;
- clicks by day;
- referrer;
- device category;
- rate-limit/error UX;
- public redirect behavior as a backend/browser navigation concern.

Do not turn the project into a Bitly clone.

Do not expose or simulate:

- Redis keys;
- cache internals;
- singleflight state;
- cache-control panels;
- implementation-only backend state

unless a real API/observability surface explicitly exposes it.

---

# 20. Scope discipline

Do not perform broad unrelated refactors during a service task.

Do not rewrite neighboring modules simply because Codex prefers a different pattern.

If an unrelated issue blocks the current task:

1. make the smallest necessary fix;
2. keep the change clearly scoped;
3. document it in the final response.

Do not create generic abstractions for hypothetical future services.

Use Rule of Three and semantic stability.

Do not remove duplication if the duplicated code represents meaningfully different service
semantics.

---

# 21. Git safety

Before edits, inspect:

```text
git status
```

When useful, inspect relevant existing diffs.

Assume uncommitted changes may belong to the user.

Never destroy user work.

Without explicit user instruction, do not run:

```text
git reset --hard
git clean -fd
git checkout -- <user-modified-file>
git restore <user-modified-file>
git push --force
git rebase --onto ...
```

Do not rewrite history.

Do not delete branches.

Do not commit or push unless the user explicitly asks.

Do not switch branches merely for preference.

Before the final response:

- inspect `git status`;
- inspect `git diff`;
- confirm the patch matches task scope;
- confirm unrelated/generated/temp files were not accidentally included.

---

# 22. Package scripts and command discipline

Discover commands from the real repository.

Use:

- `package.json`;
- repository documentation;
- selected package manager;
- existing scripts.

Do not invent a parallel command/toolchain when repository scripts already exist.

Expected conceptual checks include:

```text
lint
typecheck
test
test:e2e
build
```

The exact commands must come from the repository.

Never claim a command passed if it was not actually executed successfully.

---

# 23. Mandatory implementation verification loop

After coherent implementation slices, and always before declaring the current task complete, run
the relevant available checks.

Minimum when available:

```text
implement
→ lint
→ typecheck / vue-tsc
→ relevant unit/component tests
→ relevant E2E subset when required
→ production build
→ inspect failures
→ fix current-task regressions
→ rerun failed checks
```

For Final Integration, run the complete available verification suite.

If a check cannot run because of an environment limitation, report:

1. exact command attempted;
2. exact reason it failed/could not execute;
3. what remains unverified.

Do not hide failures by:

- deleting tests;
- weakening assertions without reason;
- broad `skip`;
- excluding changed files;
- disabling lint/typecheck rules;
- adding broad `@ts-ignore`;
- replacing strict types with unjustified `any`.

A narrow suppression is acceptable only when source-backed, unavoidable and documented.

---

# 24. Testing priorities

Frontend tests should be high-value rather than numerous.

Prioritize:

- API facade/adapter behavior;
- normalized/service-specific error mapping;
- state-dependent UI actions;
- auth route guards/session lifecycle;
- forms and validation behavior;
- deterministic MSW scenarios;
- mock/live boundary behavior;
- critical demo flows.

Use:

- Vitest for unit behavior;
- Vue Test Utils for component behavior;
- MSW at the network boundary;
- Playwright for a small number of critical integration/demo flows.

Do not turn frontend testing infrastructure into the main project.

---

# 25. Documentation discipline

Update README/config examples when a task changes:

- installation;
- start commands;
- mock/live mode;
- environment variables;
- test commands;
- build commands;
- OpenAPI generation workflow;
- deployment-relevant configuration.

Do not document commands that do not exist or were not checked against the repository.

Never commit secrets.

`.env.example` must contain placeholders only.

Configured UI links such as:

- GitHub;
- OpenAPI/Swagger;
- Grafana;
- health/readiness

must only be displayed when there is a corresponding real/configured location.

Do not invent an endpoint such as `/swagger` when only `/swagger.json` is specified.

---

# 26. Production-quality coding bar

Code must be appropriate for a backend-engineering portfolio:

- strict TypeScript;
- no unjustified `any`;
- clear names;
- cohesive components;
- avoid giant page components when natural decomposition exists;
- no premature abstractions;
- no dead code;
- no debug `console` noise;
- predictable state handling;
- consistent error behavior;
- deterministic mocks;
- responsive layout;
- accessible forms/actions;
- semantic HTML.

"Production-quality" does **not** mean building an enterprise frontend platform.

Prefer explicit straightforward code over clever indirection.

---

# 27. Stage-specific completion gate

A task is not complete because code exists.

Verify all applicable items:

- requested stage functionality is implemented;
- backend MD behavior is preserved;
- `MASTER_FRONTEND_PLAN.md` is preserved;
- current execution prompt is satisfied;
- existing shared infrastructure is reused;
- no duplicate global architecture was introduced;
- mock mode works without the relevant Go backend;
- real API integration remains possible without component rewrites;
- components do not import fixtures;
- components do not bypass the approved API boundary;
- loading state exists;
- empty state exists where applicable;
- error state exists;
- relevant auth/conflict/rate-limit/domain states are represented;
- responsive behavior was inspected;
- long IDs/text/URLs do not break layout;
- accessibility baseline is preserved;
- relevant tests were added/updated;
- lint passes when runnable;
- typecheck passes when runnable;
- relevant tests pass;
- production build passes;
- relevant E2E passes when required/runnable;
- `git status` and `git diff` were inspected;
- unrelated changes are absent or explicitly identified as minimal blocker fixes;
- documentation/config examples were updated when behavior/config changed;
- no unrequested commit/push was performed.

Stage 05 additionally requires:

- all four modules working under one shell;
- one coherent auth/error/mock/API foundation;
- cross-service route/navigation consistency;
- mock/live switching consistency;
- responsive/a11y regression review;
- dead-code review;
- README/environment/deployment readiness review;
- complete available test suite;
- complete production build;
- no new product features or redesign.

---

# 28. Required Codex final response format

At the end of each implementation task, report concisely:

## Implemented

- what changed;
- main files/modules affected.

## Verification

- exact commands actually run;
- pass/fail results;
- fixes made after failures.

## Contract / TBD

- unresolved backend/OpenAPI decisions relevant to this stage.

## Repository integrity

- confirmation that `git status` / `git diff` were inspected;
- confirmation that existing user changes were preserved;
- any minimal blocker fix outside normal task scope.

## Environment limitations

- exact commands/checks that could not run;
- exact reason;
- what remains unverified.

Do not paste the whole repository or every changed source file unless explicitly requested.

---

# 29. Explicitly prohibited behavior

Unless a higher-priority source explicitly changes the rule, do not:

- create four frontend projects;
- create microfrontends;
- introduce SSR/Nuxt;
- introduce Redux;
- replace Vue Router;
- replace TanStack Query;
- use Pinia as the server-data cache;
- add Axios merely for convenience;
- create another global HTTP/error/mock foundation;
- import fixtures directly into Vue components;
- branch Vue component behavior on mock vs live mode;
- persist refresh tokens in localStorage/sessionStorage/IndexedDB;
- invent backend endpoints/DTOs/status transitions and present them as existing;
- expose raw stack traces/internal backend errors;
- implement backend functionality in the browser;
- copy internal/proprietary Ozon UI or infrastructure;
- turn Notification into a marketing product;
- turn Shortener into a Bitly clone;
- expose Redis/Kafka internals as product state without a real API/observability surface;
- perform broad unrelated refactors;
- redesign the product during Final Integration;
- weaken tests or TypeScript to make CI green;
- delete user changes;
- perform destructive Git operations;
- commit/push without explicit instruction.

---

# 30. Guiding principles

When a local decision is ambiguous, use this priority:

```text
1. backend source fidelity
2. MASTER_FRONTEND_PLAN consistency
3. usefulness for backend demonstration
4. security
5. simplicity
6. cross-service consistency
7. mock-first capability
8. real-API readiness
9. maintainability
10. visual quality
11. feature count
```

Operational rules:

```text
KISS > speculative flexibility
Explicit > implicit
Backend contract > frontend assumption
Production-like > toy shortcuts
Portfolio clarity > unnecessary complexity
Rule of Three > premature abstraction
Existing repository > greenfield assumptions
Verified command output > claimed success
```
