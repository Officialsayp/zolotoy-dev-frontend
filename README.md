# zolotoy-dev-frontend

`zolotoy-dev-frontend` is the frontend for `zolotoy.dev` — a Go backend
engineering portfolio with an interactive demo. One repository, one deployment:

- **Public portfolio layer** — six statically generated, indexable documents
  (home, system architecture, four service case studies) rendered at build
  time with native Vite SSR + `vue/server-renderer`.
- **Interactive demo SPA** — the Vue 3 application under `/demo/`, one shell
  with four lazy-loaded service modules:
  - Order (`/demo/orders/`)
  - Auth (`/demo/auth/`)
  - Notification (`/demo/notifications/`)
  - URL Shortener (`/demo/shortener/`)

The shell and shared infrastructure were established in Stage 00 and all service
modules reuse that foundation — no module re-creates the router, HTTP client,
error model, design tokens, query client or mock runtime. The portfolio layer's
product architecture is documented in
[`docs/frontend/PORTFOLIO_ARCHITECTURE.md`](docs/frontend/PORTFOLIO_ARCHITECTURE.md).

## Stack

- Vue 3 + TypeScript (strict) + Vite
- Vue Router (demo SPA at `/demo/`, lazy service modules, one shell layout)
- TanStack Vue Query (server state)
- Pinia (narrow: app/runtime, theme, session bootstrap boundary)
- Native `fetch` behind a typed shared HTTP boundary
- MSW (mock-first network interception, worker scoped to `/demo/`)
- Vitest + Vue Test Utils, Playwright (E2E against the built Worker)
- ESLint + Prettier, Cloudflare Workers + static assets

## Project docs

- Portfolio/demo architecture: [`docs/frontend/PORTFOLIO_ARCHITECTURE.md`](docs/frontend/PORTFOLIO_ARCHITECTURE.md)
- Backend specs: [`docs/backend-specs/`](docs/backend-specs/)
- Frontend architecture (historical master plan): [`docs/frontend/MASTER_FRONTEND_PLAN.md`](docs/frontend/MASTER_FRONTEND_PLAN.md)
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
worker intercepts the network at `http://localhost:5173`. The
`Data source: Mock` badge in the demo header makes the mode unmistakable.
Public portfolio pages are rendered by the dev-site plugin at `/`,
`/architecture/` and `/services/...`.

### Mock vs live

Runtime mode comes from `VITE_API_MODE`:

- `mock` — MSW serves deterministic, simulated data; no backend required.
- `real` — requests go to the configured live backend hosts.

Switching modes never requires Vue component changes; both share the same typed
HTTP boundary. The runtime badge describes the selected data source, not
network health.

In `mock` mode, requests to a configured backend service origin are **fail
closed**: if no deterministic MSW handler is registered, the request is answered
locally with HTTP `501` and error code `MOCK_UNHANDLED_REQUEST` instead of being
forwarded to a live backend. Non-service requests are bypassed normally.

MSW is loaded only for the mock runtime path; the real-mode production entry does
not statically import the browser worker and mock handler graph.

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
npm run build              # type-check + client build + SSR prerender + site checks
npm run check              # built-output invariants (run by build)
npm run preview            # production-like wrangler dev over the built Worker + dist
npm run test:e2e           # Playwright against the wrangler dev server
npm run og:generate        # regenerate the OG image (Playwright; deliberate)
npm run deploy:preview     # upload a Cloudflare preview version
npm run deploy             # deploy through Wrangler
```

> E2E requires the Playwright browser/runtime dependencies to be installed in the
> environment where the suite is executed.

## Content and status updates

The typed content layer in `src/content/**` is the single source for service
facts, evidence, roadmap and architecture claims. Home cards, case studies,
metadata and the sitemap derive from it. Status semantics, update procedure and
the Cloudflare routing rationale are documented in
[`docs/frontend/PORTFOLIO_ARCHITECTURE.md`](docs/frontend/PORTFOLIO_ARCHITECTURE.md).

Rules that keep the portfolio honest:

- `current`/`target`/`measured` are different claim categories with different
  evidence requirements; the initial measurement list is empty by design.
- Planned services (auth, notification, shortener) expose specification links,
  never source/OpenAPI/observability links for nonexistent backends.
- The sitemap contains exactly the six public canonical URLs.

## Logo and favicon

The navigation mark and favicons use the approved logo kit from
[saypix/brand](https://github.com/Officialsayp/saypix/tree/c75fa1ea4138162823e37f6131bd832f4133fe91/brand).
`public/favicon.svg` and `public/favicon.ico` are exact copies of the compact
favicon exports; `public/favicon.png` is the 192px PWA export, and
`public/apple-touch-icon.png` is the 180px touch icon. The navigation mark
reuses the compact SVG in both themes. Its parent link provides the accessible
name. The social card (`public/og/portfolio.png`) is a neutral rendering of the
same brand mark.

The locked master SHA-256 is
`fe0dde1281b8fe1b4a8a44e54365050becd72e2c8ea21acde61e5f28fc12be31`.
Update assets only from approved derivatives; do not redraw the master.

## Cloudflare deployment

Cloudflare is the external build/deployment gate used by the project. Preview and
production pipelines run the repository build before the corresponding Wrangler
deploy command.

For a local/manual verification before deployment:

```bash
npm run build
npm run preview   # production-like wrangler dev (Worker routing + assets)
```

Preview upload:

```bash
npm run deploy:preview
```

Production deploy:

```bash
npm run deploy
```

A Cloudflare failure while restoring build/dependency cache **before**
`npm clean-install` or `npm run build` is an environment/cache failure rather
than evidence of a source-code build failure. Clearing the Cloudflare build cache
and retrying has resolved that failure mode in this project.

## Demo scenarios (mock mode)

In mock mode the demo header shows a **Demo scenario** switcher. Scenarios are
deterministic baselines served by MSW. Changing a scenario invalidates active
TanStack Query data so the visible shell state refreshes immediately. Resetting
restores the deterministic baseline for the selected demo flow.

The service scenarios cover Order lifecycle/payment/concurrency, Auth sessions
and RBAC, Notification retry/deduplication states, and URL Shortener management
and analytics cases without requiring the Go services to be running.

## Repository layout

```text
index.html            public document template (prerendered per route)
demo/index.html       demo SPA bootstrap (noindex)
public/demo/          MSW worker (scope /demo/), public/ root assets
src/
  portfolio/          public layer: shell, pages, components, entries
  content/            typed content layer (service cases, roadmap, evidence)
  shared/routing/     site route manifest (public + demo + legacy)
  edge/               Cloudflare Worker
  app/                demo router, shell, providers, root pages
  modules/            orders, auth, notifications, shortener
  shared/             api, config, ui, theme, lib, styles
  mocks/              MSW bootstrap, handlers, scenario registry, reset
  tests/              vitest setup
  main.ts             demo entry
scripts/              prerender, site checks, OG image, dev site plugin
e2e/                  Playwright specs (portfolio, SEO/routing, demo flows)
```

## Implementation status

- **Stage 00 — Foundation**: implemented.
- **Stage 01 — Order Service**: implemented.
- **Stage 02 — Auth Service**: implemented.
- **Stage 03 — Notification Service**: implemented.
- **Stage 04 — URL Shortener**: implemented.
- **Stage 05 — Final Integration**: integration/regression hardening completed in the current implementation cycle.
- **Portfolio layer**: implemented (see PORTFOLIO_ARCHITECTURE.md).

Backend/API points that remain explicitly marked `TBD` or `PROPOSED CONTRACT` in
the architecture documents are intentionally not guessed by the frontend. See
[`docs/frontend/MASTER_FRONTEND_PLAN.md`](docs/frontend/MASTER_FRONTEND_PLAN.md)
for the current contract register and service-specific constraints.
