#!/usr/bin/env node
/**
 * Built-output invariants for the static portfolio layer (npm run check).
 * Validates the 12 prerendered documents (six EN + six RU), 404 documents and
 * the bilingual sitemap — without a browser.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = resolve(root, 'dist')

let failures = 0
function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    failures += 1
  }
}

const PUBLIC_ROUTES = [
  { path: '/', file: 'index.html', routeId: 'home' },
  { path: '/architecture/', file: 'architecture/index.html', routeId: 'architecture' },
  { path: '/services/order/', file: 'services/order/index.html', routeId: 'order' },
  { path: '/services/auth/', file: 'services/auth/index.html', routeId: 'auth' },
  { path: '/services/notification/', file: 'services/notification/index.html', routeId: 'notification' },
  { path: '/services/url-shortener/', file: 'services/url-shortener/index.html', routeId: 'shortener' },
]

const CANONICALS = {
  home: 'https://zolotoy.dev/',
  architecture: 'https://zolotoy.dev/architecture/',
  order: 'https://zolotoy.dev/services/order/',
  auth: 'https://zolotoy.dev/services/auth/',
  notification: 'https://zolotoy.dev/services/notification/',
  shortener: 'https://zolotoy.dev/services/url-shortener/',
}

/** Distinct title/description per document — no cross-document duplicates. */
const seenTitles = new Map()
const seenDescriptions = new Map()

function metaContent(html, name, attribute = 'name') {
  const m = html.match(
    new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`, 'i'),
  )
  return m ? m[1] : null
}

function jsonLdBlocks(html) {
  const blocks = []
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  for (const m of html.matchAll(re)) {
    try {
      blocks.push(JSON.parse(m[1].replace(/\\u003c/g, '<')))
    } catch {
      blocks.push(null)
    }
  }
  return blocks
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

function pageHasText(html, text) {
  return stripTags(html).includes(text)
}

function checkPage(route, locale) {
  const file = locale === 'ru' ? join('ru', route.file) : route.file
  const urlPath = locale === 'ru' ? '/ru' + (route.path === '/' ? '/' : route.path) : route.path
  const filePath = join(distDir, file)
  if (!existsSync(filePath)) {
    check(false, `${urlPath}: document exists`)
    return null
  }
  const html = readFileSync(filePath, 'utf8')
  const canonical =
    locale === 'ru'
      ? 'https://zolotoy.dev/ru' + (route.path === '/' ? '/' : route.path)
      : CANONICALS[route.routeId]

  // html lang matches the locale.
  check(
    html.includes(`<html lang="${locale}">`),
    `${urlPath}: <html lang="${locale}">`,
  )

  // Exactly one meaningful H1 in the rendered app body.
  const bodyStart = html.indexOf('<div id="app">')
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  const h1s = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim(),
  )
  check(h1s.length === 1, `${urlPath}: exactly one H1 (found ${h1s.length})`)
  check(h1s.length > 0 && h1s[0].length > 3, `${urlPath}: H1 is meaningful`)

  // Unique title/description across ALL 12 documents.
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  check(!!title && title.length > 10, `${urlPath}: title present`)
  if (title) {
    check(!seenTitles.has(title), `${urlPath}: title unique (duplicate of ${seenTitles.get(title) ?? '?'})`)
    seenTitles.set(title, urlPath)
  }
  const description = metaContent(html, 'description')
  check(!!description && description.length > 30, `${urlPath}: meta description present`)
  if (description) {
    check(
      !seenDescriptions.has(description),
      `${urlPath}: description unique (duplicate of ${seenDescriptions.get(description) ?? '?'})`,
    )
    seenDescriptions.set(description, urlPath)
  }

  // Canonical self-reference.
  const canonicalEl = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  check(
    canonicalEl === canonical,
    `${urlPath}: canonical is ${canonical} (got ${canonicalEl})`,
  )

  // hreflang trio points at both locale variants + x-default → EN.
  check(html.includes(`hreflang="en"`), `${urlPath}: hreflang en`)
  check(html.includes(`hreflang="ru"`), `${urlPath}: hreflang ru`)
  check(html.includes(`hreflang="x-default"`), `${urlPath}: hreflang x-default`)
  check(
    html.includes(`hreflang="x-default" href="${CANONICALS[route.routeId]}"`),
    `${urlPath}: x-default points at the EN URL`,
  )

  // OG/Twitter basics.
  check(metaContent(html, 'og:title', 'property') !== null, `${urlPath}: og:title`)
  check(metaContent(html, 'og:url', 'property') === canonical, `${urlPath}: og:url`)
  check(metaContent(html, 'og:image', 'property') !== null, `${urlPath}: og:image`)
  check(metaContent(html, 'twitter:card', 'name') === 'summary_large_image', `${urlPath}: twitter:card`)
  check(metaContent(html, 'robots') === 'index,follow', `${urlPath}: robots index,follow`)

  // Parseable JSON-LD.
  const blocks = jsonLdBlocks(html)
  check(blocks.length > 0 && blocks.every((b) => b !== null), `${urlPath}: JSON-LD parses`)
  // JSON-LD declares the page language.
  const hasLang = blocks.some((b) => JSON.stringify(b).includes(`"inLanguage":"${locale}"`))
  check(hasLang, `${urlPath}: JSON-LD inLanguage=${locale}`)

  // Meaningful complete body before JS.
  check(
    body.includes('portfolio-section') || body.includes('portfolio-hero'),
    `${urlPath}: rendered body present`,
  )
  check(
    (body.match(/<div id="app">/g) ?? []).length === 1,
    `${urlPath}: single app root`,
  )

  // CSS linked.
  check(/<link rel="stylesheet" href="\/assets\//.test(html), `${urlPath}: CSS linked`)

  // Internal fragment links resolve.
  const anchors = [...body.matchAll(/href="(#[a-zA-Z0-9-]+)"/g)].map((m) => m[1])
  for (const fragment of anchors) {
    check(body.includes(`id="${fragment.slice(1)}"`), `${urlPath}: fragment ${fragment} target exists`)
  }

  // Current and Target readable on case-study pages (both locales).
  if (route.routeId !== 'home') {
    check(
      pageHasText(body, 'Current') && pageHasText(body, 'Target'),
      `${urlPath}: Current and Target readable`,
    )
  }

  // No demo runtime leakage.
  check(!html.includes('/assets/demo-'), `${urlPath}: no demo entry chunk reference`)
  check(!html.includes('mockServiceWorker'), `${urlPath}: no MSW reference`)

  // RU documents contain Cyrillic body copy; EN documents must not leak RU copy
  // into their H1.
  if (locale === 'ru') {
    check(/[А-Яа-яЁё]/.test(body), `${urlPath}: body contains Russian text`)
  } else {
    check(!/[А-Яа-яЁё]/.test(h1s[0] ?? ''), `${urlPath}: EN H1 has no Cyrillic`)
  }

  return html
}

for (const route of PUBLIC_ROUTES) {
  checkPage(route, 'en')
}
for (const route of PUBLIC_ROUTES) {
  checkPage(route, 'ru')
}

// Sitemap: exactly the 12 canonical URLs with hreflang alternates, no lastmod.
const sitemapPath = join(distDir, 'sitemap.xml')
check(existsSync(sitemapPath), 'sitemap.xml exists')
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8')
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  const expected = PUBLIC_ROUTES.flatMap((r) => [
    CANONICALS[r.routeId],
    'https://zolotoy.dev/ru' + (r.path === '/' ? '/' : r.path),
  ])
  check(
    JSON.stringify(locs) === JSON.stringify(expected),
    `sitemap contains exactly the 12 canonical URLs (got ${locs.length})`,
  )
  check(!/lastmod/.test(sitemap), 'sitemap has no invented lastmod')
  check(
    (sitemap.match(/hreflang="ru"/g) ?? []).length >= 12,
    'sitemap has hreflang alternates',
  )
}

// 404 documents: noindex.
const notFoundPath = join(distDir, '404.html')
check(existsSync(notFoundPath), '404.html exists')
if (existsSync(notFoundPath)) {
  const nf = readFileSync(notFoundPath, 'utf8')
  check(metaContent(nf, 'robots') === 'noindex', '404.html is noindex')
  check(nf.includes('<html lang="en">'), '404.html is EN')
}
const notFoundRuPath = join(distDir, 'ru', '404.html')
check(existsSync(notFoundRuPath), 'ru/404.html exists')
if (existsSync(notFoundRuPath)) {
  const nf = readFileSync(notFoundRuPath, 'utf8')
  check(metaContent(nf, 'robots') === 'noindex', 'ru/404.html is noindex')
  check(nf.includes('<html lang="ru">'), 'ru/404.html is RU')
  check(/[А-Яа-яЁё]/.test(nf), 'ru/404.html contains Russian copy')
}

// OG image asset present.
check(existsSync(join(distDir, 'og', 'portfolio.png')), 'og/portfolio.png exists')

process.exitCode = failures > 0 ? 1 : 0
if (failures === 0) console.log('check-site: all invariants passed')
