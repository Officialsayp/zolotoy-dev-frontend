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
