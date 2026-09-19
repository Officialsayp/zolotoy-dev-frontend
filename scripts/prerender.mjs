#!/usr/bin/env node
/**
 * Static generation for the public portfolio layer (bilingual EN/RU).
 *
 * Inputs: the built client bundle (dist/) with the SSR manifest, and the
 * server entry built into .prerender/ (ignored, outside dist).
 *
 * Outputs (into dist/):
 *  - one index.html per public route per locale (six EN + six RU documents);
 *  - a static noindex 404.html;
 *  - sitemap.xml with all 12 canonical URLs and hreflang alternates.
 *
 * Titles/descriptions derive from the routing manifest (titleRu/descriptionRu
 * fields) — single source of truth. Run by `npm run build`; requires no browser.
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

const SITE = 'https://zolotoy.dev'

/**
 * Page metadata per route and locale. EN/RU copy mirrors the manifest's
 * title/titleRu and description/descriptionRu — checked by check-site.
 */
const ROUTE_META = {
  home: {
    en: {
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
        inLanguage: 'en',
        description:
          'Go backend engineering portfolio: order, auth, notification and URL shortener service case studies.',
        author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
      },
    },
    ru: {
      title: 'zolotoy.dev — портфолио Go-бэкендера',
      description:
        'Портфолио Go-бэкенд-инженера Максима Золотого: четыре технических кейса с честным разделением current/target и интерактивным демо.',
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': 'https://zolotoy.dev/#website',
        name: 'zolotoy.dev',
        url: 'https://zolotoy.dev/',
        inLanguage: 'ru',
        description:
          'Портфолио Go-бэкенд-инженера: кейсы сервисов Order, Auth, Notification и URL-сокращателя.',
        author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
      },
    },
  },
  architecture: {
    en: {
      title: 'System architecture — zolotoy.dev',
      description:
        'Current and target system architecture of the zolotoy.dev Go backend portfolio: service boundaries, data ownership, integration contracts and runtime modes.',
      ogType: 'article',
      articleTitle: 'System architecture — zolotoy.dev',
      articleDescription: 'Current and target architecture of the zolotoy.dev Go backend portfolio.',
    },
    ru: {
      title: 'Архитектура системы — zolotoy.dev',
      description:
        'Текущая и целевая архитектура Go-бэкенд-портфолио zolotoy.dev: границы сервисов, владение данными, интеграционные контракты и режимы рантайма.',
      ogType: 'article',
      articleTitle: 'Архитектура системы — zolotoy.dev',
      articleDescription: 'Текущая и целевая архитектура Go-бэкенд-портфолио zolotoy.dev.',
    },
  },
  order: {
    en: {
      title: 'Order service case study — zolotoy.dev',
      description:
        'Order service case study: HTTP validation and service boundaries today, state machines, idempotency, optimistic concurrency and transactional outbox as the target.',
      ogType: 'article',
      articleTitle: 'Order service case study — zolotoy.dev',
      articleDescription:
        'HTTP validation and service boundaries today; state machines, idempotency, optimistic concurrency and transactional outbox as the target.',
      softwareSourceCode: true,
    },
    ru: {
      title: 'Кейс Order-сервиса — zolotoy.dev',
      description:
        'Кейс Order-сервиса: сегодня — HTTP-валидация и границы сервиса; цель — машина состояний, идемпотентность, оптимистичная конкурентность и transactional outbox.',
      ogType: 'article',
      articleTitle: 'Кейс Order-сервиса — zolotoy.dev',
      articleDescription:
        'Сегодня — HTTP-валидация и границы сервиса; цель — машина состояний, идемпотентность, оптимистичная конкурентность и transactional outbox.',
      softwareSourceCode: true,
    },
  },
  auth: {
    en: {
      title: 'Auth service case study — zolotoy.dev',
      description:
        'Auth service case study: planned Argon2id credentials, rotating refresh sessions, reuse detection, RBAC and rate limiting for the zolotoy.dev Go portfolio.',
      ogType: 'article',
      articleTitle: 'Auth service case study — zolotoy.dev',
      articleDescription:
        'Planned Argon2id credentials, rotating refresh sessions, reuse detection, RBAC and rate limiting.',
    },
    ru: {
      title: 'Кейс Auth-сервиса — zolotoy.dev',
      description:
        'Кейс Auth-сервиса (план): учётные данные Argon2id, ротация refresh-сессий, обнаружение повторного использования, RBAC и rate limiting.',
      ogType: 'article',
      articleTitle: 'Кейс Auth-сервиса — zolotoy.dev',
      articleDescription:
        'План: учётные данные Argon2id, ротация refresh-сессий, обнаружение повторного использования, RBAC и rate limiting.',
    },
  },
  notification: {
    en: {
      title: 'Notification service case study — zolotoy.dev',
      description:
        'Notification service case study: planned at-least-once event processing, durable inbox, retry with backoff and recovery for the zolotoy.dev Go portfolio.',
      ogType: 'article',
      articleTitle: 'Notification service case study — zolotoy.dev',
      articleDescription:
        'Planned at-least-once event processing, durable inbox, retry with backoff and recovery.',
    },
    ru: {
      title: 'Кейс Notification-сервиса — zolotoy.dev',
      description:
        'Кейс Notification-сервиса (план): обработка событий at-least-once, durable inbox, ретраи с backoff и восстановление.',
      ogType: 'article',
      articleTitle: 'Кейс Notification-сервиса — zolotoy.dev',
      articleDescription:
        'План: обработка событий at-least-once, durable inbox, ретраи с backoff и восстановление.',
    },
  },
  shortener: {
    en: {
      title: 'URL shortener case study — zolotoy.dev',
      description:
        'URL shortener case study: planned redirect hot path, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible benchmarks.',
      ogType: 'article',
      articleTitle: 'URL shortener case study — zolotoy.dev',
      articleDescription:
        'Planned redirect hot path, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible benchmarks.',
    },
    ru: {
      title: 'Кейс URL-сокращателя — zolotoy.dev',
      description:
        'Кейс URL-сокращателя (план): redirect hot path, Redis cache-aside с ограниченным фолбэком, per-instance singleflight и воспроизводимые бенчмарки.',
      ogType: 'article',
      articleTitle: 'Кейс URL-сокращателя — zolotoy.dev',
      articleDescription:
        'План: redirect hot path, Redis cache-aside с ограниченным фолбэком, per-instance singleflight и воспроизводимые бенчмарки.',
    },
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
  alt: {
    en: 'zolotoy.dev — Go backend engineering portfolio by Maxim Zolotoy',
    ru: 'zolotoy.dev — портфолио Go-бэкенд-инженера Максима Золотого',
  },
}

/** hreflang alternates for a pair of documents. */
function hreflangLinks(enPath, ruPath) {
  const enUrl = SITE + (enPath === '/' ? '/' : enPath)
  const ruUrl = SITE + (ruPath === '/' ? '/' : ruPath)
  return [
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="ru" href="${ruUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
  ]
}

/** Build the localized TechArticle/WebPage JSON-LD for case-study pages. */
function caseStudyJsonLd(routeId, locale, url) {
  const meta = ROUTE_META[routeId][locale]
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        inLanguage: locale,
        name: meta.title,
        isPartOf: { '@id': 'https://zolotoy.dev/#website' },
        about: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
      },
      {
        '@type': 'TechArticle',
        '@id': url + '#article',
        headline: meta.articleTitle ?? meta.title,
        description: meta.articleDescription ?? meta.description,
        inLanguage: locale,
        author: { '@id': 'https://maxzolotoy.com/#maxim-zolotoy' },
        url,
      },
    ],
  }
}

function buildHead(routeId, locale, canonicalPath, alternates) {
  const meta = ROUTE_META[routeId][locale]
  const url = SITE + (canonicalPath === '/' ? '/' : canonicalPath)
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const jsonLd =
    meta.ogType === 'website'
      ? meta.jsonLd
      : caseStudyJsonLd(routeId, locale, url)

  const parts = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<link rel="canonical" href="${url}" />`,
    ...alternates,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="zolotoy.dev" />`,
    `<meta property="og:locale" content="${locale === 'ru' ? 'ru_RU' : 'en_US'}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE.url}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE.alt[locale])}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE.url}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(OG_IMAGE.alt[locale])}" />`,
  ]

  if (jsonLd) parts.push(jsonLdScript(jsonLd))

  // SoftwareSourceCode only when actual service source exists (Order); it is
  // language-independent, emitted for both locales.
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
          locale === 'ru'
            ? 'Go HTTP-сервис заказов в разработке (POST /orders, GET /orders/{id}), веха Service Layer: валидация и границы сервиса, пока без персистентности.'
            : 'In-development Go order HTTP service (POST /orders, GET /orders/{id}) at the Service Layer milestone: validation and service boundaries, no persistence yet.',
      }),
    )
  }

  return parts
}

/** The EN path of a prerender route (RU paths are prefixed with /ru). */
function enPathOf(path) {
  return path === '/ru/' ? '/' : path.startsWith('/ru/') ? path.slice(3) : path
}

/** Pair each EN path with its RU counterpart for hreflang generation. */
function pathPairs() {
  return publicRoutePaths()
    .filter((p) => !p.startsWith('/ru'))
    .map((en) => ({ en, ru: '/ru' + (en === '/' ? '/' : en) }))
}

async function main() {
  rmSync(join(distDir, '.prerender-out'), { recursive: true, force: true })
  const manifest = loadSsrManifest()

  // The client build template is overwritten by the home document below, so
  // capture the raw placeholder template once before the render loop.
  const rawTemplate = readFileSync(join(distDir, 'index.html'), 'utf8')
  if (rawTemplate.includes('rel="canonical"') || rawTemplate.includes('og:title')) {
    console.error(
      'prerender: dist/index.html already contains prerendered metadata — run a fresh client build first (npm run build-only)',
    )
    process.exit(1)
  }

  const pairs = pathPairs()

  for (const path of publicRoutePaths()) {
    const rendered = await renderPublicPage(path)
    if (rendered === null) {
      console.error(`prerender: failed to render ${path}`)
      process.exit(1)
    }
    const enPath = enPathOf(path)
    const pair = pairs.find((p) => p.en === enPath)
    const alternates = pair ? hreflangLinks(pair.en, pair.ru) : []
    const headParts = buildHead(
      rendered.routeId,
      rendered.locale,
      rendered.canonicalPath ?? path,
      alternates,
    )
    const manifestKey = Object.keys(manifest ?? {}).find(
      (key) => manifest[key]?.isEntry === true && key === 'index.html',
    ) ?? 'index.html'
    const cssFiles = cssForEntry(manifest, manifestKey)
    for (const css of cssFiles) {
      headParts.push(`<link rel="stylesheet" href="/${css}" />`)
    }

    const html = rawTemplate
      .replace('</head>', headParts.join('\n    ') + '\n  </head>')
      .replace('<div id="app"></div>', `<div id="app">${rendered.html}</div>`)
      .replace('<html lang="en">', `<html lang="${rendered.locale}">`)

    const route = rendered.canonicalPath ?? path
    const outFile = join(
      distDir,
      route === '/' ? 'index.html' : route.slice(1).replace(/\/$/, '') + '/index.html',
    )
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, html)
    console.log(`prerender: ${path} → ${outFile.replace(root + '/', '')}`)
  }

  // Static noindex 404 document (English; unknown paths have no locale).
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

  // RU 404 document (served by the Worker for unknown /ru/... paths).
  const notFoundRu = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 — Страница не найдена · zolotoy.dev</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.ico?v=20260914" sizes="16x16 32x32 48x48" />
  </head>
  <body>
    <div id="app">
      <main style="max-width:640px;margin:12vh auto;padding:0 16px;font-family:system-ui,sans-serif;">
        <h1>404 — Страница не найдена</h1>
        <p>Этот адрес не соответствует публичному документу или демо-маршруту.</p>
        <p><a href="/ru/">Главная портфолио</a> · <a href="/demo/?lang=ru">Открыть демо</a></p>
      </main>
    </div>
  </body>
</html>
`
  writeFileSync(join(distDir, 'ru', '404.html'), notFoundRu)
  mkdirSync(join(distDir, 'ru'), { recursive: true })
  writeFileSync(join(distDir, 'ru', '404.html'), notFoundRu)

  // Sitemap: all 12 canonical URLs with hreflang alternates; no lastmod.
  const urlEntries = pairs
    .map(({ en, ru }) => {
      const enUrl = SITE + (en === '/' ? '/' : en)
      const ruUrl = SITE + (ru === '/' ? '/' : ru)
      return `  <url>
    <loc>${enUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />
  </url>
  <url>
    <loc>${ruUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />
  </url>`
    })
    .join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>
`
  writeFileSync(join(distDir, 'sitemap.xml'), sitemap)
  console.log('prerender: 404.html + ru/404.html + sitemap.xml (12 URLs) written')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
