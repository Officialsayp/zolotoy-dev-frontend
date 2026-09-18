/**
 * Vite dev-server plugin serving the public portfolio documents (build-time
 * SSR in development tooling only) and routing per the shared manifest:
 *  - public documents render through src/portfolio/entry-server.ts;
 *  - /demo/** serves demo/index.html for known demo routes;
 *  - legacy /orders, /auth, /notifications, /shortener 308-redirect to /demo/;
 *  - unknown document paths get a deliberate 404.
 *
 * Assets, Vite internal URLs and module requests are delegated to Vite.
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

const PUBLIC_HEAD_BASE = (title: string, description: string): string => `
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="robots" content="index,follow" />
    <title>${escapeHtml(title)}</title>`

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[ch] ?? ch
  })
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

async function renderPublicHtml(server: ViteDevServer, pathname: string): Promise<string | null> {
  try {
    const mod = await server.ssrLoadModule('/src/portfolio/entry-server.ts')
    const rendered = await (mod as { renderPublicPage: (p: string) => Promise<{ html: string } | null> })
      .renderPublicPage(pathname)
    if (rendered === null) return null
    const template = await server.transformIndexHtml(pathname, '<!doctype html><html lang="en"><head></head><body><div id="app"></div></body></html>')
    // Development rendering: inject rendered body and minimal head metadata.
    return template
      .replace('</head>', `${PUBLIC_HEAD_BASE('zolotoy.dev — Go backend portfolio', 'Development rendering')}\n  </head>`)
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

        // Demo HTML: known demo routes get demo/index.html; unknown demo paths 404.
        if (pathname === DEMO_BASE || pathname.startsWith(DEMO_BASE)) {
          const internal = pathname.slice(DEMO_BASE.length - 1)
          if (matchDemoRoute(internal) !== null) {
            req.url = '/demo/index.html'
            next()
            return
          }
          sendText(res, 404, 'Not found (unknown demo route)')
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

        // Public documents through SSR.
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
          // Deliberate 404 for unknown document routes (non-asset paths).
          if (!pathname.startsWith('/@') && !pathname.startsWith('/node_modules') && pathname !== '/') {
            sendText(res, 404, 'Not found (unknown document route)')
            return
          }
        }

        next()
      })
    },
  }
}
