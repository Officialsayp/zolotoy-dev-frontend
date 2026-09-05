# AGENTS.md — zolotoy-dev-frontend

Repository instructions for `zolotoy.dev`, a developer/admin console demonstrating
four Go backend services. Keep it useful for backend demonstrations and manual API
scenarios, with a small, coherent frontend.

## Instruction scope and sources

- Follow system/developer instructions and tool permissions, then explicit user
  instructions. User instructions take precedence over repository/skill workflow
  defaults; do not interpret an ordinary feature request as an implicit change to
  backend contracts or the approved architecture.
- This file applies repository-wide. Read applicable nested `AGENTS.md` /
  `AGENTS.override.md` before editing their directories.
- Separate product truth from agent procedure: backend specs/canonical OpenAPI own
  business/API contracts; the master plan owns frontend architecture; this file owns
  current agent workflow. Historical execution boilerplate in planning documents
  does not require a full audit or full test suite for every maintenance edit.
- For a requested implementation stage, read its prompt and satisfy its explicit
  scope, deliverables and verification gates. Work only on the requested stage;
  do not advance to another stage automatically or restart completed foundations.
- When specs, canonical OpenAPI and code disagree, identify the discrepancy. Keep
  uncertain API shapes labelled `PROPOSED CONTRACT` or `TBD / requires API contract
  decision`, isolate them at the module API boundary, and continue independent work.
  A mock implementation is not evidence of an accepted live backend contract.

## Read only the context needed

Start with `git status --short`, relevant diffs, `package.json`, and the affected
implementation/tests. Inspect existing shared infrastructure before extending it.
Use `rg` / `rg --files`; search headings in the large master plan and read the
relevant sections instead of loading every spec and stage prompt for every task.

| Concern | Source |
| --- | --- |
| Setup, runtime modes, implementation status | `README.md`, `package.json`, `env.example` |
| Architecture, design, contracts/TBD register, DoD | `docs/frontend/MASTER_FRONTEND_PLAN.md` |
| Order behavior | `docs/backend-specs/01_order_service.md` |
| Auth behavior | `docs/backend-specs/02_auth_service.md` |
| Notification behavior | `docs/backend-specs/03_notification_service.md` |
| Shortener behavior | `docs/backend-specs/04_url_shortener.md` |
| Requested stage 00–05 | Matching `docs/codex/FRONTEND-IMPLEMENTATION-PROMPT-*.md` |
| Supporting history | `docs/frontend/CODEX_ADAPTATION_CHANGELOG.md` |

The stages are Foundation → Order → Auth → Notification → Shortener → Final
Integration. Check current code/README before using historical stage assumptions.
Final Integration is regression and readiness work, without new features or redesign.

## Working agreement

- Carry the requested task through implementation and verification. Use existing
  conventions for routine, reversible decisions; ask only about missing information
  that materially affects correctness, scope or an action lacking authorization.
- For a substantial change, give a short implementation inventory before editing:
  files to create/modify, existing work to preserve, and relevant contract questions.
  A small fix needs only a brief intent statement, not a ceremonial plan.
- Preserve the user's changes. Make the smallest cohesive fix; reuse working code
  and avoid unrelated refactors, duplicate infrastructure and speculative abstractions.
- If available and allowed by the session, delegate bounded independent work when
  useful, with distinct ownership and integration checks. Keep small edits local.
- Incorporate corrections during work without abandoning the original objective.
  Retain decisions, changed files and pending checks across context compaction.
- Report progress and results in the user's language, with concise explanations.
  If an instruction blocks progress, cite its exact file/rule and explain the conflict;
  complete unaffected work. Do not present inferred restrictions as explicit rules.

## Architecture and code map

One Git repository → one Vue 3 SPA → one shell → four lazy-loaded modules.
Preserve TypeScript strict mode, Vite, Vue Router, TanStack Vue Query, narrow Pinia
stores, native Fetch, MSW, Vitest/Vue Test Utils and Playwright.

| Path | Responsibility |
| --- | --- |
| `src/app/router/`, `src/app/shell/` | Routes/guards and the common shell |
| `src/app/providers/`, `src/app/stores/` | Shared clients/providers and client-global state |
| `src/modules/` (orders, auth, notifications, shortener) | Service pages, API facades, queries, models, mocks and tests |
| `src/shared/api/` | Fetch transport, normalized errors and refresh coordination |
| `src/shared/config/` | Runtime mode, service hosts and configured links |
| `src/shared/ui/`, `src/shared/styles/` | Shared UI primitives and design tokens |
| `src/mocks/`, `src/tests/`, `e2e/` | Network scenarios, test setup and browser flows |

Keep the request path:
`component → query/mutation composable → module API facade → shared HTTP client`.
MSW intercepts that same network path in mock mode.

- Components must not import fixtures, choose mock/live behavior or call raw Fetch.
  Transport owns HTTP concerns; modules own domain interpretation and view mapping.
- TanStack Vue Query owns server state and targeted invalidation. Pinia is for
  genuine client-global state such as session bootstrap, runtime and theme.
  Do not mirror query results into another cache.
- Reuse the single router, query client, HTTP/error boundary, refresh coordinator,
  mock runtime and design system. No microfrontends, extra SPAs, Nuxt/SSR, Redux or
  library/framework migrations without an explicit architecture revision.
- Prefer installed/native capabilities before adding a dependency. Keep npm and the
  lockfile. Zod and charts need a concrete use case; do not add a UI/form framework
  or Axios just for one module.
- Follow neighboring code: kebab-case files, PascalCase component identifiers,
  `use-*.ts` composables, `*.spec.ts` tests and service-prefixed query keys.
  Extract shared code when semantics are stable; do not create empty architecture folders.
- When an individual service gains canonical OpenAPI, migrate its boundary
  incrementally to `openapi-typescript` + `openapi-fetch`. Do not hand-edit generated
  files, invent a schema, or duplicate generated DTOs without a real view-model need.

## Mock, contract and security invariants

- Demo mode must work without Go backends using deterministic MSW scenarios and
  stable IDs. Reset must restore a reproducible baseline.
- Preserve `src/mocks/handlers/fail-closed.ts`: unhandled requests to configured
  service origins return local `501 MOCK_UNHANDLED_REQUEST`, never reach live
  backends. Keep the mock handler graph out of the real-mode startup path.
- Use `VITE_API_MODE=mock|real` and the shared config boundary. The template is
  `env.example`, not `.env.example`. Browser-exposed `VITE_*` values cannot hold secrets.
  Show GitHub/API docs/Grafana/health links only when the location is actually configured.
- Access tokens stay in memory. Refresh credentials use the intended
  `HttpOnly; Secure` browser-cookie model, never localStorage, sessionStorage,
  IndexedDB or persisted Pinia. Keep unresolved cookie/CSRF/DTO details explicit.
- Preserve one coordinated refresh for concurrent 401s and at most one replay per
  protected request; public auth endpoints must not recurse into refresh. Distinguish
  401 (session recovery/expiry) from 403 (authorization).
- Do not blindly retry business 4xx, idempotency/concurrency conflicts or unsafe
  mutations. Frontend guards are not backend authorization.
- Use normalized transport errors plus safe service error codes. Show validation
  inline and meaningful loading, empty, error, conflict/rate-limit and recovery states.
  Never surface raw stack traces, SQL errors, credentials or private environment values.

## Service boundaries

| Module | Preserve |
| --- | --- |
| Order | Technical console; independent OrderStatus/PaymentStatus, role/state-dependent actions, prepaid/pay-on-receipt flows, history, idempotency and optimistic concurrency. Unknown cancellation/refund or status/role combinations stay TBD. |
| Auth | Registration/login/profile, sessions and revocation, logout current/all, RBAC, route guards, bootstrap/expiry and refresh rotation consequences. Social login/MFA/passkeys require an explicit backend scope change. |
| Notification | Operational view of event → job → attempts → provider result → retry/dead/sent. Respect retry/terminal states. Do not invent campaign tools, Kafka/DLQ controls or aggregate statistics from one paginated page. |
| Shortener | Creation/alias/expiry, copy, metadata, enable/disable/logical deletion, analytics and rate-limit errors. Public redirects belong to backend/browser navigation; do not expose Redis/cache internals without a real API. |

Read the corresponding backend spec for a domain change; this table is a reminder,
not a replacement contract.

## UI quality

Keep one restrained technical interface using existing tokens and primitives.
Preserve desktop/tablet/mobile usability, keyboard access, visible focus, labelled
controls, dialog focus behavior and field-associated errors. Status must not rely
only on color. Tables, URLs and IDs must not overflow the whole page; meaningful
charts need a text/table alternative. Do not copy proprietary UI or expand the
console into a storefront, marketing product or another portfolio.

## Commands and verification

Run from the repository root. `package.json` specifies Node ≥20.19 and npm; use
the committed `package-lock.json`. Recheck these files if the toolchain changes.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Vite development server; default mock mode |
| `npm run lint` | ESLint |
| `npm run type-check` | Vue/TypeScript project check |
| `npm run test:unit:run -- <path-to-spec>` | Focused Vitest run |
| `npm test` | Full non-watch Vitest suite |
| `npm run test:e2e -- e2e/auth.spec.ts` | Example focused Playwright flow |
| `npm run test:e2e` | Full browser suite; requires installed Playwright browsers |
| `npm run build` | Type check plus production build |
| `npm run preview` | Serve an existing production build |

- Documentation-only edits: verify facts, paths, commands and `git diff --check`.
  Do not install dependencies or run the application suite solely for prose.
- Application changes: run lint, relevant unit/component tests and `npm run build`.
  The build includes type checking; do not repeat it just to fill a checklist.
  Add browser checks for changed routes, forms, auth or interactions, and visually
  inspect affected responsive/accessibility behavior when UI changes.
- Shared auth/transport/mock/router changes: cover affected consumers and regression
  scenarios. Stage 05 requires the full unit and E2E suites, build and cross-service
  responsive/accessibility review. Honor explicit stage/CI gates.
- Prefer behavior-level regression tests for bugs. Do not weaken assertions, disable
  checks, add broad skips or replace strict types with `any` to make checks pass.
  After required checks pass, broaden/repeat only for new changes or unresolved risk.
- If a check is unavailable, report the attempted command, actual blocker and what
  remains unverified. A local mock pass does not validate an unsettled live API contract.

## Completion and repository safety

Inspect final diff/status and exclude unrelated/generated/temporary artifacts.
Update README or `env.example` when setup, configuration or behavior changes.
Summarize the result, actual checks and relevant unresolved contracts/limitations;
omit empty report sections and full file dumps.

Commit/push only when explicitly requested or already authorized in the session.
Use a `codex/` branch when creating a review branch. Do not discard user work,
rewrite history, force-push or delete branches without explicit authorization.
Deploy scripts publish externally; run them only for an authorized deployment.

## Maintaining these instructions

Keep durable rules here and detailed product requirements in the linked specs.
Update commands and navigation when code changes; remove superseded workflow rules
instead of appending contradictory instructions.

Reviewed against [OpenAI AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
and [GPT-6 Astra guidance](https://developers.openai.com/api/docs/guides/latest-model)
on 2026-09-06. This file guides behavior; model selection and reasoning effort remain
Codex settings.
