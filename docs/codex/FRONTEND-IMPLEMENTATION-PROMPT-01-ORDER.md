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
