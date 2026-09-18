#!/usr/bin/env node
/**
 * Static generation for the public portfolio layer.
 *
 * Inputs: the built client bundle (dist/) with the SSR manifest, and the
 * server entry built into .prerender/ (ignored, outside dist).
 *
 * Outputs (into dist/):
 *  - one index.html per public route (six documents);
 *  - a static noindex 404.html;
 *  - sitemap.xml from the public route manifest.
 *
 * Run by `npm run build` after the Vite client build. Requires no browser.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const ssrDir = join(root, '.prerender')

if (!existsSync(ssrDir)) {
  console.error('prerender: .prerender/ missing — build the SSR entry first')
  process.exit(1)
}

const { renderPublicPage, publicRoutePaths } = await import(
  new URL('file://' + join(ssrDir, 'entry-server.js').replace(/\\/g, '/'))
)

/** Page metadata derived from the routing manifest (single source of truth). */
const ROUTE_META = {
  home: {
    title: 'zolotoy.dev — Go backend portfolio',
    description:
      'Maxim Zolotoy’s Go backend engineering portfolio: four service case studies with honest current-vs-target architecture and an interactive demo.',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://zolotoy.dev/#website',
      name: 'zolotoy.dev',
      url: 'https://zolotoy.dev/',
      description:
        'Go backend engineering portfolio: order, auth, notification and URL shortener service case studies.',
      author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
    },
  },
  architecture: {
    title: 'System architecture — zolotoy.dev',
    description:
      'Current and target system architecture of the zolotoy.dev Go backend portfolio: service boundaries, data ownership, integration contracts and runtime modes.',
    ogType: 'article',
    jsonLd: (url) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: 'System architecture — zolotoy.dev',
          isPartOf: { '@id': 'https://zolotoy.dev/#website' },
          about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        },
        {
          '@type': 'TechArticle',
          '@id': url + '#article',
          headline: 'System architecture — zolotoy.dev',
          description:
            'Current and target architecture of the zolotoy.dev Go backend portfolio.',
          author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
          url,
        },
      ],
    }),
  },
  order: {
    title: 'Order service case study — zolotoy.dev',
    description:
      'Order service case study: HTTP validation and service boundaries today, state machines, idempotency, optimistic concurrency and transactional outbox as the target.',
    ogType: 'article',
    jsonLd: (url) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: 'Order service case study — zolotoy.dev',
          isPartOf: { '@id': 'https://zolotoy.dev/#website' },
          about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        },
        {
          '@type': 'TechArticle',
          '@id': url + '#article',
          headline: 'Order service case study — zolotoy.dev',
          description: 'HTTP validation and service boundaries today; state machines, idempotency, optimistic concurrency and transactional outbox as the target.',
          author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
          url,
        },
      ],
    }),
    softwareSourceCode: true,
  },
  auth: {
    title: 'Auth service case study — zolotoy.dev',
    description:
      'Auth service case study: planned Argon2id credentials, rotating refresh sessions, reuse detection, RBAC and rate limiting for the zolotoy.dev Go portfolio.',
    ogType: 'article',
    jsonLd: (url) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: 'Auth service case study — zolotoy.dev',
          isPartOf: { '@id': 'https://zolotoy.dev/#website' },
          about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        },
        {
          '@type': 'TechArticle',
          '@id': url + '#article',
          headline: 'Auth service case study — zolotoy.dev',
          description: 'Planned Argon2id credentials, rotating refresh sessions, reuse detection, RBAC and rate limiting.',
          author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
          url,
        },
      ],
    }),
  },
  notification: {
    title: 'Notification service case study — zolotoy.dev',
    description:
      'Notification service case study: planned at-least-once event processing, durable inbox, retry with backoff and recovery for the zolotoy.dev Go portfolio.',
    ogType: 'article',
    jsonLd: (url) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: 'Notification service case study — zolotoy.dev',
          isPartOf: { '@id': 'https://zolotoy.dev/#website' },
          about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        },
        {
          '@type': 'TechArticle',
          '@id': url + '#article',
          headline: 'Notification service case study — zolotoy.dev',
          description: 'Planned at-least-once event processing, durable inbox, retry with backoff and recovery.',
          author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
          url,
        },
      ],
    }),
  },
  shortener: {
    title: 'URL shortener case study — zolotoy.dev',
    description:
      'URL shortener case study: planned redirect hot path, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible benchmarks.',
    ogType: 'article',
    jsonLd: (url) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: 'URL shortener case study — zolotoy.dev',
          isPartOf: { '@id': 'https://zolotoy.dev/#website' },
          about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        },
        {
          '@type': 'TechArticle',
          '@id': url + '#article',
          headline: 'URL shortener case study — zolotoy.dev',
          description: 'Planned redirect hot path, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible benchmarks.',
          author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
          url,
        },
      ],
    }),
  },
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[ch] ?? ch
  })
}

/** Serialize JSON-LD with protection against </script> injection. */
function jsonLdScript(value) {
  const json = JSON.stringify(value).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

/** Read the client SSR manifest to resolve CSS for a page. */
function loadSsrManifest() {
  const manifestPath = join(distDir, '.vite', 'manifest.json')
  if (!existsSync(manifestPath)) return null
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

/** Collect the CSS files for a page from the SSR manifest entry closure. */
function cssForEntry(manifest, entryKey) {
  if (!manifest) return []
  const css = new Set()
  const seen = new Set()
  function walk(key) {
    if (seen.has(key)) return
    seen.add(key)
    const entry = manifest[key]
    if (!entry) return
    for (const file of entry.css ?? []) css.add(file)
    for (const imp of entry.imports ?? []) walk(imp)
  }
  walk(entryKey)
  return [...css]
}

const OG_IMAGE = {
  url: 'https://zolotoy.dev/og/portfolio.png',
  width: 1200,
  height: 630,
  alt: 'zolotoy.dev — Go backend engineering portfolio by Maxim Zolotoy',
}

function buildHead(routeId, canonicalPath) {
  const meta = ROUTE_META[routeId]
  const url = 'https://zolotoy.dev' + (canonicalPath === '/' ? '/' : canonicalPath)
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const jsonLd =
    typeof meta.jsonLd === 'function' ? meta.jsonLd(url) : meta.jsonLd

  const parts = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="zolotoy.dev" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE.url}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE.url}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(OG_IMAGE.alt)}" />`,
  ]

  if (jsonLd) parts.push(jsonLdScript(jsonLd))

  // SoftwareSourceCode only when actual service source exists (Order).
  if (meta.softwareSourceCode) {
    parts.push(
      jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'order-service',
        url: 'https://github.com/Officialsayp/zolotoy-dev-backend',
        codeRepository: 'https://github.com/Officialsayp/zolotoy-dev-backend',
        programmingLanguage: 'Go',
        author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        description:
          'In-development Go order HTTP service (POST /orders, GET /orders/{id}) at the Service Layer milestone: validation and service boundaries, no persistence yet.',
      }),
    )
  }

  return parts
}

async function main() {
  rmSync(join(distDir, '.prerender-out'), { recursive: true, force: true })
  const manifest = loadSsrManifest()

  // The client build template is overwritten by the home document below, so
  // capture the raw placeholder template once before the render loop.
  const rawTemplate = readFileSync(join(distDir, 'index.html'), 'utf8')
  if (rawTemplate.includes('robots content="index,follow"') && rawTemplate.includes('og:')) {
    console.error(
      'prerender: dist/index.html already contains prerendered metadata — run a fresh client build first (npm run build-only)',
    )
    process.exit(1)
  }

  for (const path of publicRoutePaths()) {
    const rendered = await renderPublicPage(path)
    if (rendered === null) {
      console.error(`prerender: failed to render ${path}`)
      process.exit(1)
    }
    const routeId = rendered.routeId
    const headParts = buildHead(routeId, rendered.canonicalPath ?? path)

    // Page CSS from the client build manifest (index entry closure).
    const manifestKey = Object.keys(manifest ?? {}).find((key) =>
      manifest[key]?.isEntry === true && key === 'index.html',
    ) ?? 'index.html'
    const cssFiles = cssForEntry(manifest, manifestKey)
    for (const css of cssFiles) {
      headParts.push(`<link rel="stylesheet" href="/${css}" />`)
    }

    const template = rawTemplate
    let html = template
      .replace('</head>', headParts.join('\n    ') + '\n  </head>')
      .replace('<div id="app"></div>', `<div id="app">${rendered.html}</div>`)

    // Output file matching the canonical path.
    const route = publicRoutePaths().includes(path)
      ? rendered.canonicalPath
      : path
    const outFile = join(
      distDir,
      route === '/'
        ? 'index.html'
        : route.slice(1).replace(/\/$/, '') + '/index.html',
    )
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, html)
    console.log(`prerender: ${path} → ${outFile.replace(root + '/', '')}`)
  }

  // Static noindex 404 document.
  const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 — Page not found · zolotoy.dev</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.ico?v=20260914" sizes="16x16 32x32 48x48" />
  </head>
  <body>
    <div id="app">
      <main style="max-width:640px;margin:12vh auto;padding:0 16px;font-family:system-ui,sans-serif;">
        <h1>404 — Page not found</h1>
        <p>This address does not match a public document or demo route.</p>
        <p><a href="/">Portfolio home</a> · <a href="/demo/">Open the demo</a></p>
      </main>
    </div>
  </body>
</html>
`
  writeFileSync(join(distDir, '404.html'), notFoundHtml)

  // Sitemap: exactly the six public canonical URLs.
  const urls = publicRoutePaths().map(
    (path) => `  <url><loc>https://zolotoy.dev${path === '/' ? '/' : path}</loc></url>`,
  )
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
  writeFileSync(join(distDir, 'sitemap.xml'), sitemap)
  console.log('prerender: 404.html + sitemap.xml written')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
