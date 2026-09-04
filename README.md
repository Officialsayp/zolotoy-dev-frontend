# zolotoy-dev-frontend

`zolotoy-dev-frontend` is the single Vue 3 SPA for `zolotoy.dev`, a technical
developer/admin environment fronting four Go backend portfolio services.

It is **one repository, one SPA, one application shell** with four lazy-loaded
service modules:

- Order (`/orders`)
- Auth (`/auth`)
- Notification (`/notifications`)
- URL Shortener (`/shortener`)

The shell and shared infrastructure are built in Stage 00 (Foundation). Service
business screens land in their own sequential stages (01–05) and reuse this
foundation — no module re-creates the router, HTTP client, error model, design
tokens or mock runtime.

## Stack

- Vue 3 + TypeScript (strict) + Vite
- Vue Router (lazy service modules, one shell layout)
- TanStack Vue Query (server state)
- Pinia (narrow: app/runtime, theme, session bootstrap boundary)
- Native `fetch` behind a typed shared HTTP boundary
- MSW (mock-first network interception)
- Vitest + Vue Test Utils, Playwright (small E2E subset)
- ESLint + Prettier

## Project docs

- Backend specs: [`docs/backend-specs/`](docs/backend-specs/)
- Frontend architecture: [`docs/frontend/MASTER_FRONTEND_PLAN.md`](docs/frontend/MASTER_FRONTEND_PLAN.md)
- Codex execution prompts: [`docs/codex/`](docs/codex/)

## Requirements

- Node.js ≥ 20.19 (developed against Node 24).
- npm (a `package-lock.json` is committed).

## Install

```bash
npm install
```

If your default npm registry is unreachable, use the public one:

```bash
npm install --registry=https://registry.npmjs.org
```

## Run

```bash
npm run dev
```

By default the app runs in **`mock` mode** (no Go backend needed): the MSW
worker intercepts the network at `http://localhost:5173`. The `MOCK` badge in
the header makes the mode unmistakable.

### Mock vs live

Runtime mode comes from `VITE_API_MODE`:

- `mock` — MSW serves deterministic, simulated data; no backend required.
- `real` — requests go to the configured live backend hosts.

Switching modes never requires Vue component changes; both share the same typed
HTTP boundary.

## Environment

Copy the template and adjust (the template is committed as `env.example`):

```bash
cp env.example .env.local   # git-ignored
```

Available `VITE_*` variables (placeholders/safe values only):

| Variable | Purpose |
| --- | --- |
| `VITE_API_MODE` | `mock` or `real` |
| `VITE_DEPLOY_ENV` | informational deploy label, e.g. `local`/`demo` |
| `VITE_ORDER_API_BASE_URL` | live Order host (used in `real` mode) |
| `VITE_AUTH_API_BASE_URL` | live Auth host |
| `VITE_NOTIFICATION_API_BASE_URL` | live Notification host |
| `VITE_SHORTENER_API_BASE_URL` | live Shortener host |
| `VITE_SHORTENER_PUBLIC_BASE_URL` | public short redirect host |
| `VITE_GITHUB_REPO_URL` | footer/source link (shown only when set) |
| `VITE_GRAFANA_URL` | observability link (shown only when set) |
| `VITE_API_DOCS_URL` | OpenAPI link (shown only when set) |

Never commit real secrets or private values to environment files.

## Scripts

```bash
npm run lint               # ESLint
npm run type-check         # vue-tsc project type check
npm run test               # Vitest run
npm run test:unit          # Vitest watch
npm run build              # type-check + production build
npm run preview            # preview the production build
npm run test:e2e           # Playwright (chromium)
```

> E2E requires Playwright browsers: `npx playwright install chromium`.

## Demo scenarios (mock mode)

In mock mode the shell header shows a **Demo scenario** switcher. Scenarios are
deterministic baselines (e.g. `Default`, `Degraded`) served by MSW. Reloading or
resetting returns to the pipeline baseline.

## Repository layout (Foundation)

```text
public/mockServiceWorker.js
src/
  app/            router, shell, providers, root pages
  modules/        orders, auth, notifications, shortener (placeholders in 00)
  shared/         api, config, ui, lib, styles
  mocks/          MSW bootstrap, handlers, scenario registry, reset
  tests/          vitest setup
  main.ts
e2e/              Playwright specs
openapi/          per-service OpenAPI (populated as contracts stabilize)
```

## Status

- **Stage 00 — Foundation**: implemented (this branch of the repo state).
- Stages 01–05: service modules (Order → Auth → Notification → Shortener →
  Final Integration) reuse this foundation.

See [`docs/codex/`](docs/codex/) for the current stage prompt.
