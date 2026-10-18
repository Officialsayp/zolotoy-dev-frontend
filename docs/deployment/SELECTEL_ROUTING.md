# Selectel staging routing contract

The reference is the built `src/edge/worker.ts` plus `wrangler.jsonc` and
Cloudflare's ASSETS behavior, exercised locally by Wrangler. Caddy preserves
the declared route, response-body, MIME and browser-cache contract below.
This is a finite regression corpus, not a claim that two HTTP implementations
are identical for every malformed request or transport feature.

Production Cloudflare configuration and deployment remain unchanged. The
staging host is `origin.zolotoy.dev`; every staging response, including
redirects and errors, adds `X-Robots-Tag: noindex,nofollow`. Public HTML keeps
its production canonical/hreflang metadata. The header is intentionally more
restrictive than production's indexable portfolio or `noindex,follow` demo.

## Routing and precedence

| Request class | Reference behavior |
| --- | --- |
| `/`, `/architecture/`, `/services/{order,auth,notification,url-shortener}/`, and all six `/ru/` counterparts | 200; exact prerendered HTML for that page and locale |
| Public page without final slash, `.html`, `/index`, `/index.html` aliases | 307 to its canonical trailing-slash URL; `/index` and `/index.html` redirect to `/` |
| Public `.html/` or `/index.html/` | Genuine 404; these are not canonical aliases |
| `/demo`, exact `/demo/index.html` | 308 to `/demo/`, retaining the query |
| `/demo.html` | Native ASSETS alias: 307 to `/demo/` |
| Demo whitelist from `DEMO_ROUTE_PATTERNS` | 200 with `demo/index.html`; no unrestricted SPA fallback |
| `/demo/index`, `/demo/index/`, `/demo//index`, `/demo//index.html` | 200 shell through the ASSETS binding; compatibility aliases beyond the router whitelist |
| `/demo/mockServiceWorker.js` | Real JavaScript, scoped naturally to `/demo/`; never portfolio HTML |
| Unknown `/demo/*` including missing demo files | 404 plain text `Not found` |
| Valid legacy `/orders`, `/auth`, `/notifications`, `/shortener` routes | 308 to the corresponding `/demo/...` URL; raw ID encoding and query retained |
| Invalid legacy route, unknown public path or missing root asset | 404 EN HTML; no successful shell fallback |
| Unknown `/ru/*`, including `/ru/assets/missing.js` | 404 RU HTML from the nearest error document |
| `/404`, `/ru/404` | 200 serving the respective error document; their `.html`, `/`, `/index`, `/index.html` aliases use 307 |
| Existing static output, including `/.vite/manifest.json` | 200 with the same bytes; the manifest is currently public in Cloudflare too |
| HEAD | Same status and routing as GET, with an empty response body |
| POST and OPTIONS | 405; Worker namespaces return `Method not allowed`, native asset paths have an empty body |

The Worker matches raw paths before ASSETS normalization. Its demo matcher
ignores empty path segments, so repeated slashes are accepted. Parameters
accept one nonempty raw segment: `/demo/orders/a.js` and
`/demo/orders/a%2Fb` are valid. Literal route names remain encoded:
`/demo/%6frders/123` and `/demo/auth/log%69n` are 404. The notification ID
pattern also accepts `/demo/notifications/events`.

Legacy redirects remove exactly one trailing slash from a nested route and
preserve the other raw separators. For example,
`/orders///123///` redirects to `/demo/orders///123//`. An encoded literal
such as `/auth/%6cogin` fails the raw pattern, then receives native 307
normalization to `/auth/login` before the later legacy 308.

Outside the Worker branches, ASSETS decodes valid percent encodings and
collapses repeated slashes. Examples: `/%61rchitecture/` becomes
`/architecture/`, and `/no%2Fsuch` first redirects to `/no/such`, which is
then 404. Encoded namespace roots do not match raw `run_worker_first` rules:
`/%6frders/a%2Fb` normalizes to `/orders/a/b`. Caddy therefore uses the raw
original URI for Worker matching and applies native normalization afterwards.

## Cache and HTTP checks

The current repository has no `_headers` override. All normal static
responses, including fingerprinted JS/CSS and the demo service worker, use
`Cache-Control: public, max-age=0, must-revalidate`. Immutable asset caching
would be a separate behavior change.

Native public/static responses omit this header when the request includes
`Authorization` or `Range`. ASSETS ignores Range and returns the complete
200 response. Revalidation using the server's own ETag returns 304.
The demo Worker constructs a new ASSETS request from a URL, dropping incoming
headers: demo shell and service-worker requests consequently keep the default
cache policy and return full 200 responses even for those three cases.

ETag values, date/server/transfer headers, compression and header ordering
depend on the HTTP implementation. The test compares each server's own ETag
revalidation behavior, not literal ETag values. MIME comparison ignores
charset formatting and accepts equivalent `application/javascript` versus
`text/javascript`, and `image/x-icon` versus `image/vnd.microsoft.icon`.
Body bytes, default cache values, status codes, redirect path/query and HEAD
body absence are asserted. Redirects may be absolute or relative but must
remain on the serving origin. Caddy omits `Content-Type` on 304 whereas
Cloudflare repeats it; this is an allowed metadata difference for a response
without a representation. MIME equality is checked for the other statuses.

The existing sitemap explicitly uses `Content-Type: application/xml`, matching
the Worker on both macOS and Linux. Linux's MIME registry otherwise selects
`text/xml`; this was caught by the first deployment verification before upload.
Missing XML files and `/sitemap.xml/` still receive the HTML 404 response.
The separate `Verify Selectel routing` pull-request workflow runs the HTTP/TLS
checks on Linux for routing-related changes, before a deployment is attempted.

`/_health` is an intentional staging addition: GET/HEAD 200, `ok`,
`Cache-Control: no-store`. The staging HTTP listener issues 308 to the exact
HTTPS staging host while preserving path/query. These fixtures do not test
certificate issuance, the real VPS, file ownership or release activation.
Malformed escapes, invalid UTF-8, HTTP parser rejection, arbitrary conditional
header combinations and transport-specific range/compression features are
outside this finite corpus.

## Run the regression corpus

After the normal mock build, run:

```sh
node scripts/check-selectel.mjs
```

The script uses the pinned local Caddy binary selected by `CADDY_BIN` (or
the default in `scripts/selectel-servers.mjs`). It starts isolated loopback
Wrangler and Caddy processes using the same `dist/`, compares every public
page and alias, all demo patterns, legacy redirects, negative/encoded cases,
all built static files, GET/HEAD, method rejection, cache behavior, health and
HTTP upgrades. Expected outcomes are asserted as well as differential parity,
so a matching mistake in both servers cannot silently pass. Child processes
are stopped in `finally`; no installed service, DNS, deployment or trust
store is changed. Results are written to
`test-results/selectel-routing.json` and a failing check exits nonzero.

Sources: [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/),
[ASSETS bindings](https://developers.cloudflare.com/workers/static-assets/binding/),
[default headers](https://developers.cloudflare.com/workers/static-assets/headers/).
The checked-in runtime and measured HTTP responses settle differences from
documentation examples; public alias redirects are native 307, not Worker 308.
