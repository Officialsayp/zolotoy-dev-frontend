#!/usr/bin/env node
/**
 * Built-output invariants for the static portfolio layer (npm run check).
 * Validates the six prerendered documents, 404 and sitemap without a browser.
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

function checkPage(route) {
  const filePath = join(distDir, route.file)
  if (!existsSync(filePath)) {
    check(false, `${route.path}: document exists`)
    return null
  }
  const html = readFileSync(filePath, 'utf8')

  // Exactly one meaningful H1 in the rendered app body.
  const bodyStart = html.indexOf('<div id="app">')
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  const h1s = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim(),
  )
  check(h1s.length === 1, `${route.path}: exactly one H1 (found ${h1s.length})`)
  check(
    h1s.length > 0 && h1s[0].length > 3,
    `${route.path}: H1 is meaningful`,
  )

  // Unique title/description.
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  check(!!title && title.length > 10, `${route.path}: title present`)
  const description = metaContent(html, 'description')
  check(!!description && description.length > 30, `${route.path}: meta description present`)

  // Canonical self-reference.
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  check(
    canonical === CANONICALS[route.routeId],
    `${route.path}: canonical is ${CANONICALS[route.routeId]} (got ${canonical})`,
  )

  // OG/Twitter basics.
  check(metaContent(html, 'og:title', 'property') !== null, `${route.path}: og:title`)
  check(metaContent(html, 'og:url', 'property') === CANONICALS[route.routeId], `${route.path}: og:url`)
  check(metaContent(html, 'og:image', 'property') !== null, `${route.path}: og:image`)
  check(metaContent(html, 'twitter:card', 'name') === 'summary_large_image', `${route.path}: twitter:card`)
  check(metaContent(html, 'robots') === 'index,follow', `${route.path}: robots index,follow`)

  // Parseable JSON-LD.
  const blocks = jsonLdBlocks(html)
  check(blocks.length > 0 && blocks.every((b) => b !== null), `${route.path}: JSON-LD parses`)

  // Meaningful complete body before JS.
  check(body.includes('portfolio-section') || body.includes('portfolio-hero'), `${route.path}: rendered body present`)
  // No duplicate fallback content.
  check(
    (body.match(/<div id="app">/g) ?? []).length === 1,
    `${route.path}: single app root`,
  )

  // CSS linked.
  check(/<link rel="stylesheet" href="\/assets\//.test(html), `${route.path}: CSS linked`)

  // Internal links and fragment targets resolve.
  const anchors = [...body.matchAll(/href="(#[a-zA-Z0-9-]+)"/g)].map((m) => m[1])
  for (const fragment of anchors) {
    check(body.includes(`id="${fragment.slice(1)}"`), `${route.path}: fragment ${fragment} target exists`)
  }

  // Current and Target readable on case-study pages.
  if (route.routeId !== 'home') {
    check(
      pageHasText(body, 'Current') && pageHasText(body, 'Target'),
      `${route.path}: Current and Target readable`,
    )
  }

  return html
}

const pages = {}
for (const route of PUBLIC_ROUTES) {
  pages[route.routeId] = checkPage(route)
}

// Sitemap: exactly the six canonical URLs, no lastmod.
const sitemapPath = join(distDir, 'sitemap.xml')
check(existsSync(sitemapPath), 'sitemap.xml exists')
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8')
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  check(
    JSON.stringify(locs) === JSON.stringify(Object.values(CANONICALS)),
    `sitemap contains exactly the six canonical URLs (got ${locs.length})`,
  )
  check(!/lastmod/.test(sitemap), 'sitemap has no invented lastmod')
}

// 404 document: noindex.
const notFoundPath = join(distDir, '404.html')
check(existsSync(notFoundPath), '404.html exists')
if (existsSync(notFoundPath)) {
  const nf = readFileSync(notFoundPath, 'utf8')
  check(metaContent(nf, 'robots') === 'noindex', '404.html is noindex')
}

// No demo runtime leakage in public document script closure: demo index and
// demo chunks must not be referenced from public documents.
for (const route of PUBLIC_ROUTES) {
  const html = pages[route.routeId]
  if (!html) continue
  check(!html.includes('/assets/demo-'), `${route.path}: no demo entry chunk reference`)
  check(!html.includes('mockServiceWorker'), `${route.path}: no MSW reference`)
}

// OG image asset present.
check(existsSync(join(distDir, 'og', 'portfolio.png')), 'og/portfolio.png exists')

process.exitCode = failures > 0 ? 1 : 0
if (failures === 0) console.log('check-site: all invariants passed')
