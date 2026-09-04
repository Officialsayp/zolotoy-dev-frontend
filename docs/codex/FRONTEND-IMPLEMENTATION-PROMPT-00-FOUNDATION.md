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
