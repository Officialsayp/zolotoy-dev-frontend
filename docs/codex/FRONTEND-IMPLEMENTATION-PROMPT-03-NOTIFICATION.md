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
