# PORTFOLIO ARCHITECTURE — zolotoy.dev

This document owns the current public/demo product architecture of the
frontend repository. It supersedes the older topology/SEO statements in
`MASTER_FRONTEND_PLAN.md` where they disagree; the master plan's domain
constraints, API-contract rules and TBD register remain authoritative for
contracts.

## Product architecture

One repository, one deployment (Cloudflare Workers + static assets):

1. **Public portfolio layer** — six statically generated, indexable documents:

   | Route | Document |
   | --- | --- |
   | `/` | Home |
   | `/architecture/` | System architecture |
   | `/services/order/` | Order case study |
   | `/services/auth/` | Auth case study |
   | `/services/notification/` | Notification case study |
   | `/services/url-shortener/` | URL shortener case study |

   Rendered at build time with native Vite SSR (`vue/server-renderer`) via
   `src/portfolio/entry-server.ts` → `scripts/prerender.mjs`. No runtime SSR,
   no Nuxt, no SSG framework. Public navigation is plain anchors (full
   document navigation, no second Vue Router).

2. **Interactive demo SPA** — the existing Vue application under `/demo/`
   (`createWebHistory('/demo/')`, internal paths unchanged). All four service
   modules, MSW scenarios, TanStack Query, Pinia session/theme stores and the
   fail-closed mock boundary behave exactly as before.

`src/shared/routing/site-routes.ts` is the pure routing manifest: public
paths, demo patterns, legacy namespaces and the derived helpers. The demo
router, the Edge Worker and the build tooling all read the same manifest.

## Single source of content truth

`src/content/**` is the typed content layer: service cases, claims, evidence,
roadmap and architecture data. Home cards, case-study sections, page metadata,
JSON-LD and the sitemap derive from it. Rules:

- `implementationStatus`: planned | in-development | implemented (backend truth).
- `demoMode`: mock | mixed | live (visible demo flow only).
- `runtime`: not-deployed | local | public-demo (backend availability).
- Claim categories: `current` (confirmed in code), `target` (planned/spec),
  `measured` (reproducible artifact). The measurement list is initially empty;
  never fabricate benchmarks or coverage.

## Localization (EN/RU)

The public layer renders both locales statically: six EN documents at root
paths, six RU documents under `/ru/...` — 12 indexable documents with
canonical + hreflang (en/ru/x-default) metadata and a bilingual sitemap.
`src/shared/i18n/` owns the strict `Locale` model, dictionaries (EN source,
RU parity enforced by unit test) and the demo locale store
(`?lang=` → `zolotoy.locale` → EN). The typed content layer
(`src/content/**`) carries `{ en, ru }` copy alongside invariant technical
data (IDs, evidence paths, revisions). Dates/numbers use locale-aware
`Intl` formatting; protocol values and code identifiers stay untranslated.

Unknown paths under `/ru/...` serve a Russian 404 document; the demo stays
noindex in both locales.

## Build pipeline

`npm run build`:
1. `vue-tsc --build` (type-check);
2. client build (two HTML inputs: `index.html` public template, `demo/index.html`);
3. SSR entry build into `.prerender/` (ignored, outside dist);
4. `scripts/prerender.mjs` — renders the six public documents, `404.html`
   (static noindex) and `sitemap.xml` (exactly six canonical URLs, no lastmod);
5. `scripts/check-site.mjs` — built-output invariants (npm run check).

Page CSS is resolved from the Vite build manifest (SSR manifest closure) and
inlined as `<link>` before hydration. Metadata, OG/Twitter tags and JSON-LD are
generated per route from the manifest + content layer.

The OG image (`public/og/portfolio.png`, 1200×630) is a committed source asset.
Regenerate deliberately with `npm run og:generate` (uses Playwright Chromium);
the normal build never launches a browser.

## Cloudflare routing

`wrangler.jsonc` keeps `main: ./src/edge/worker.ts`, `assets.directory: ./dist`,
`assets.binding: ASSETS`, with **selective `run_worker_first`**:

```
/demo, /demo/*, /orders, /orders/*, /auth, /auth/*,
/notifications, /notifications/*, /shortener, /shortener/*
```

Rationale (verified with local Wrangler):

- The six prerendered public documents are served natively by
  `html_handling: "auto-trailing-slash"` — no Worker invocation, no redirect
  chains (canonical URLs verified).
- Unknown public paths and missing assets fall to `not_found_handling:
  "404-page"` → `dist/404.html` with genuine HTTP 404.
- Only the demo namespace and legacy namespaces genuinely need Worker logic:
  demo-shell serving with `X-Robots-Tag: noindex,follow`, legacy 308 redirects,
  unknown demo-route-pattern 404s. Fingerprinted assets never invoke the Worker.

Worker responsibilities (`src/edge/worker.ts`, document GET/HEAD only):
legacy namespace 308 redirects (complete segments, query preserved, encoded
segments preserved), demo shell serving for recognized patterns, passthrough of
real static files under /demo/ (e.g. `mockServiceWorker.js`), genuine 404s for
unknown demo patterns and non-GET/HEAD methods. No API proxy, no runtime HTML
rendering, no external fetches.

## Demo compatibility notes

- MSW worker moved to `public/demo/mockServiceWorker.js` (scope /demo/);
  `msw:init` writes there.
- `src/shared/browser/retire-legacy-mock-worker.ts` unregisters only the known
  legacy root-scoped `/mockServiceWorker.js` registration (exact same-origin
  URL). Called from the demo bootstrap and the public client entry; no reload
  loop, no storage clearing.
- Demo route remains noindex,follow after hydration (`updateRobotsMeta` no
  longer exempts the overview).
- Login redirect targets are normalized through
  `normalizeDemoRedirectTarget` (guards.ts): strips one `/demo` prefix,
  restricts to internal demo route patterns, rejects external/protocol-relative
  URLs, backslash tricks and login/register loops. Never produces /demo/demo/.
- Runtime badge shows the selected data source:
  `Data source: Mock` / `Data source: Live API` — network health stays separate.

## Local verification

- `npm run dev` — development server (mock mode; the site plugin renders
  public documents via ssrLoadModule — development tooling only).
- `npm run build` — type-check + client build + SSR build + prerender + checks.
- `npm run preview` — production-like `wrangler dev` over the built Worker and
  dist (not `vite preview`; it does not exercise Worker routing).
- E2E (`npm run test:e2e`) runs against that wrangler dev server.

Note: the local workerd bundled with wrangler may lag `compatibility_date` in
`wrangler.jsonc`; the dev/E2E server pins its own supported date. Cloudflare's
production runtime honors the configured date — deploys are unaffected.

## Deployment

`npm run deploy` / `npm run deploy:preview` remain explicit externally
publishing operations and are not part of verification. CI (`.github/workflows/verify.yml`)
runs lint, unit tests, full build and E2E without deployment side effects.

## Content/status update procedure

1. Update the service record in `src/content/services/*.ts` (claims + evidence).
2. Update `src/content/roadmap.ts` when a milestone state changes.
3. Update the metadata in `scripts/prerender.mjs` only if titles/descriptions
   change (all route URLs come from `site-routes.ts`).
4. Run `npm run build`; `check-site` fails on broken invariants.
5. Never move a status backwards-incompatible without evidence; planned
   services must not gain source/OpenAPI/observability links until the backend
   implementation exists.
