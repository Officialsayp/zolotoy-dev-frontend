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
