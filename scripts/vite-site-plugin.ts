/**
 * Vite dev-server plugin serving the public portfolio documents (build-time
 * SSR in development tooling only) and routing per the shared manifest:
 *  - public documents (EN and /ru/...) render through entry-server.ts;
 *  - /demo/** serves demo/index.html for known demo routes;
 *  - legacy /orders, /auth, /notifications, /shortener 308-redirect to /demo/;
 *  - unknown document navigations get a deliberate 404.
 *
 * This middleware runs BEFORE Vite's internal middlewares (registered via
 * configureServer without a post hook), so it must be conservative: only
 * HTML document navigations are resolved or rejected here. Module URLs
 * (/src/...), Vite internals (/@vite/...), public-dir assets (including
 * public/demo/mockServiceWorker.js) and HMR traffic fall through to Vite
 * untouched. Development rendering is tooling only — production behavior is
 * verified against wrangler dev.
 */
import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  canonicalizePublicUrl,
  isLegacyNamespacePath,
  legacyRedirectTarget,
  matchDemoRoute,
  DEMO_BASE,
} from '../src/shared/routing/site-routes'

/**
 * True for HTML document navigations: paths without a file extension where
 * the client asked for text/html. Module fetches, asset loads and non-browser
 * requests (a wildcard accept header) are not documents and must reach Vite's
 * handlers.
 */
export function isDocumentRequest(req: IncomingMessage, pathname: string): boolean {
  if (pathname === '/' || /\.[a-zA-Z0-9]+$/.test(pathname)) return false
  const accept = req.headers.accept ?? ''
  return accept.includes('text/html')
}

const PUBLIC_HEAD_BASE = (locale: string, title: string, description: string): string => `
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="robots" content="index,follow" />
    <title>${escapeHtml(title)}</title>
    <link rel="alternate" hreflang="en" href="/" />
    <link rel="alternate" hreflang="ru" href="/ru/" />
    <link rel="alternate" hreflang="x-default" href="/" />`

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[ch] ?? ch
  })
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

const DEV_TITLES: Record<string, { en: string; ru: string }> = {
  '/': { en: 'zolotoy.dev — Go backend portfolio (dev)', ru: 'zolotoy.dev — портфолио Go-бэкендера (dev)' },
  '/architecture/': { en: 'System architecture (dev)', ru: 'Архитектура системы (dev)' },
  '/services/order/': { en: 'Order service case study (dev)', ru: 'Кейс Order-сервиса (dev)' },
  '/services/auth/': { en: 'Auth service case study (dev)', ru: 'Кейс Auth-сервиса (dev)' },
  '/services/notification/': { en: 'Notification service case study (dev)', ru: 'Кейс Notification-сервиса (dev)' },
  '/services/url-shortener/': { en: 'URL shortener case study (dev)', ru: 'Кейс URL-сокращателя (dev)' },
}

async function renderPublicHtml(server: ViteDevServer, pathname: string): Promise<string | null> {
  try {
    const mod = await server.ssrLoadModule('/src/portfolio/entry-server.ts')
    const rendered = await (
      mod as {
        renderPublicPage: (p: string) => Promise<{
          html: string
          locale: 'en' | 'ru'
          canonicalPath: string
        } | null>
      }
    ).renderPublicPage(pathname)
    if (rendered === null) return null
    const lang = rendered.locale
    const enPath = lang === 'ru' ? rendered.canonicalPath.slice(3) || '/' : rendered.canonicalPath
    const title = DEV_TITLES[enPath]?.[lang] ?? 'zolotoy.dev (dev)'
    const template = await server.transformIndexHtml(
      pathname,
      `<!doctype html><html lang="${lang}"><head></head><body><div id="app"></div></body></html>`,
    )
    // Development rendering: inject rendered body and minimal head metadata.
    return template
      .replace('</head>', `${PUBLIC_HEAD_BASE(lang, title, 'Development rendering — not for production use')}\n  </head>`)
      .replace('<div id="app"></div>', `<div id="app">${rendered.html}</div>`)
  } catch {
    return null
  }
}

function sendText(res: ServerResponse, status: number, body: string, contentType = 'text/plain; charset=utf-8'): void {
  res.statusCode = status
  res.setHeader('Content-Type', contentType)
  res.end(body)
}

export function viteSitePlugin(): Plugin {
  return {
    name: 'zolotoy-site-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = decodeURIComponent(url.pathname)

        // Demo HTML: known demo routes get demo/index.html; unknown demo
        // document navigations 404. Non-document requests under /demo/ (the
        // MSW worker script from public/, future static files) fall through
        // to Vite's own middlewares. Bare /demo canonicalizes to /demo/ —
        // mirroring the Edge Worker — so the demo document always lives in
        // the /demo/ namespace (inside the MSW worker scope).
        if (pathname === '/demo') {
          res.statusCode = 308
          res.setHeader('Location', '/demo/' + (url.search || ''))
          res.end()
          return
        }
        if (pathname === DEMO_BASE || pathname.startsWith(DEMO_BASE)) {
          const internal = pathname.slice(DEMO_BASE.length - 1)
          if (matchDemoRoute(internal) !== null) {
            req.url = '/demo/index.html'
            next()
            return
          }
          if (isDocumentRequest(req, pathname)) {
            sendText(res, 404, 'Not found (unknown demo route)')
            return
          }
          next()
          return
        }

        // Legacy namespace redirects preserve query.
        if (isLegacyNamespacePath(pathname)) {
          const target = legacyRedirectTarget(pathname)
          if (target) {
            res.statusCode = 308
            res.setHeader('Location', target + (url.search || ''))
            res.end()
            return
          }
        }

        // Public documents through SSR (EN + /ru/...).
        if (req.method === 'GET' || req.method === 'HEAD') {
          const canonical = canonicalizePublicUrl(pathname)
          if (canonical !== null) {
            if (canonical !== pathname) {
              res.statusCode = 308
              res.setHeader('Location', canonical + (url.search || ''))
              res.end()
              return
            }
            const html = await renderPublicHtml(server, pathname)
            if (html !== null) {
              sendText(res, 200, html, 'text/html; charset=utf-8')
              return
            }
          }
          // Deliberate 404 for unknown document navigations only. Everything
          // else (module URLs, public assets, Vite internals) must reach
          // Vite's internal middlewares.
          if (isDocumentRequest(req, pathname)) {
            sendText(res, 404, 'Not found (unknown document route)')
            return
          }
        }

        next()
      })
    },
  }
}
