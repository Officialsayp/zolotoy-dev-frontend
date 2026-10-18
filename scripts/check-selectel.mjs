#!/usr/bin/env node
// Compare the built Cloudflare Worker with the exact staging Caddy route file.
// No deployment, installed-service reload, external requests or new dependencies.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, relative } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { startServers } from './selectel-servers.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const reportPath = join(root, 'test-results/selectel-routing.json')
const CACHE = 'public, max-age=0, must-revalidate'
const QUERY = '?probe=selectel&next=%2Fdemo%2F&probe=a+b&empty='
const EMPTY = Buffer.alloc(0)
const cases = []
const results = []
const failures = []
const files = new Map()
const baselines = new Map()

async function file(path) {
  if (!files.has(path)) files.set(path, await readFile(join(dist, path)))
  return files.get(path)
}

async function inventory(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? inventory(path) : [relative(dist, path).replaceAll('\\', '/')]
  }))
  return nested.flat().sort()
}

// Read the dependency-free declarations without requiring Node's optional TS
// loader. Fail closed if their format/topology changes instead of silently
// testing an independently maintained whitelist.
async function manifest() {
  const source = await readFile(join(root, 'src/shared/routing/site-routes.ts'), 'utf8')
  const publicBlock = source.match(/export const PUBLIC_ROUTES[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1]
  const demoBlock = source.match(/export const DEMO_ROUTE_PATTERNS[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1]
  assert(publicBlock && demoBlock, 'Routing manifest declarations must be readable')
  const publicPaths = [...publicBlock.matchAll(/\bpath: '([^']+)'/g)].map((match) => match[1])
  const demoPatterns = [...demoBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
  assert.equal(publicPaths.length, 6, 'Expected six public pages per locale')
  assert.equal(demoPatterns.length, 15, 'Review the differential corpus when the demo whitelist changes')
  return { publicPaths, demoPatterns }
}

function add(label, path, expected, extra = {}) {
  cases.push({ label, path, method: 'GET', ...expected, ...extra })
}

function document(label, path, bodyFile, status = 200) {
  add(label, path, { status, bodyFile, mime: 'text/html', cache: CACHE })
}

function redirect(label, path, destination, status = 307) {
  add(label, path, { status, destination, body: EMPTY })
}

function demo(path, label = 'demo shell') {
  document(label, path, 'demo/index.html')
}

function notFound(path, locale = 'en', plain = false) {
  if (plain) add('unknown demo', path, { status: 404, body: Buffer.from('Not found'), mime: 'text/plain' })
  else document('unknown document or asset', path, locale === 'ru' ? 'ru/404.html' : '404.html', 404)
}

const mimeAliases = new Map([
  ['application/javascript', 'text/javascript'],
  ['application/x-javascript', 'text/javascript'],
  ['image/x-icon', 'image/vnd.microsoft.icon'],
])

function mime(value) {
  const type = value?.split(';', 1)[0].trim().toLowerCase()
  return mimeAliases.get(type) ?? type
}

function assetMime(path) {
  return {
    '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.txt': 'text/plain', '.xml': 'application/xml', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.ico': 'image/vnd.microsoft.icon',
  }[extname(path)]
}

async function buildCases() {
  const { publicPaths, demoPatterns } = await manifest()
  for (const locale of ['en', 'ru']) {
    for (const publicPath of publicPaths) {
      const path = (locale === 'ru' ? '/ru' : '') + publicPath
      const bodyFile = path === '/' ? 'index.html' : `${path.slice(1)}index.html`
      document('canonical public page', path, bodyFile)
      document('canonical public page with query', path + QUERY, bodyFile)
      const bare = path === '/' ? '' : path.slice(0, -1)
      const aliases = path === '/' ? ['/index', '/index.html'] : [bare, `${bare}.html`, `${bare}/index`, `${bare}/index.html`]
      for (const alias of aliases) redirect('public alias with query', alias + QUERY, path + QUERY)
      redirect('public index-directory alias', `${bare}/index/` + QUERY, `${bare}/index` + QUERY)
      notFound(`${bare}/index.html/`, locale)
    }
  }
  redirect('bare demo', '/demo' + QUERY, '/demo/' + QUERY, 308)
  redirect('explicit demo HTML', '/demo/index.html' + QUERY, '/demo/' + QUERY, 308)
  redirect('native demo HTML alias', '/demo.html' + QUERY, '/demo/' + QUERY)
  for (const pattern of demoPatterns) {
    const internal = pattern.replace(/:[^/]+/g, 'fixture-123')
    const path = '/demo' + internal
    demo(path, `whitelisted ${pattern}`)
    if (internal !== '/') {
      const bare = internal.replace(/\/$/, '')
      demo('/demo' + (internal.endsWith('/') ? bare : internal + '/'))
      demo('/demo' + internal.replaceAll('/', '///'), 'repeated-slash demo route')
      const target = '/demo' + internal
      redirect('legacy route with query', internal + QUERY, target + QUERY, 308)
      redirect('legacy slash variant', (internal.endsWith('/') ? bare : internal + '/') + QUERY, target + QUERY, 308)
    }
  }
  for (const path of [
    '/demo//', '/demo/index', '/demo/index/', '/demo//index', '/demo//index.html',
    '/demo/orders/a%2Fb', '/demo/orders/a%252Fb', '/demo/orders/a.js',
    '/demo/orders/a%3Fb', '/demo/orders/a%5Cb', '/demo/notifications/events',
  ]) demo(path)
  for (const path of [
    '/demo/unknown', '/demo/orders/new/extra', '/demo/auth/unknown',
    '/demo/%6frders/123', '/demo/auth/log%69n', '/demo/unknown//',
    '/demo/unknown%2Fpath', '/demo/index.html/', '/demo/mockServiceWorker.js/',
    '/demo/mockServiceWorker.js.html', '/demo/orders/a%2Fb/extra',
  ]) notFound(path, 'en', true)
  for (const path of ['/demo//mockServiceWorker.js', '/demo/%6dockServiceWorker.js']) {
    add('encoded/static demo asset', path, { status: 200, bodyFile: 'demo/mockServiceWorker.js', mime: 'text/javascript', cache: CACHE })
  }
  for (const [path, target] of [
    ['/orders//', '/demo/orders/'],
    ['/orders///123///', '/demo/orders///123//'],
    ['/auth//login/', '/demo/auth//login'],
    ['/orders/a%2Fb', '/demo/orders/a%2Fb'],
    ['/orders/a.js', '/demo/orders/a.js'],
    ['/orders/a%3Fb', '/demo/orders/a%3Fb'],
    ['/notifications/events', '/demo/notifications/events'],
  ]) redirect('raw legacy segments', path + QUERY, target + QUERY, 308)
  for (const [path, target] of [
    ['//', '/'], ['///architecture', '/architecture/'],
    ['/architecture//', '/architecture/'], ['/architecture//index.html', '/architecture/'],
    ['/architecture%2F', '/architecture/'], ['/%61rchitecture/', '/architecture/'],
    ['/architecture%2findex.html', '/architecture/'],
    ['/ru//no-such', '/ru/no-such'], ['/ru%2Fno-such', '/ru/no-such'],
    ['/%72u/no-such', '/ru/no-such'], ['/no//such', '/no/such'], ['/no%2Fsuch', '/no/such'],
    ['/d%65mo/orders/123', '/demo/orders/123'], ['/demo%2Forders%2F123', '/demo/orders/123'],
    ['/%6frders/a%2Fb', '/orders/a/b'], ['//orders/123', '/orders/123'],
    ['/auth/%6cogin', '/auth/login'], ['/auth/%2Flogin', '/auth/login'],
    ['/orders%2F123', '/orders/123'],
  ]) redirect('native valid URI normalization', path + QUERY, target + QUERY)
  for (const locale of ['en', 'ru']) {
    const path = locale === 'ru' ? '/ru/404' : '/404'
    document('direct error document', path, path.slice(1) + '.html')
    for (const suffix of ['/', '.html', '/index', '/index.html']) redirect('error document alias', path + suffix + QUERY, path + QUERY)
  }
  for (const path of [
    '/no-such', '/no%20such', '/orders-extra', '/orders/new/extra', '/auth/unknown',
    '/notifications/events/abc/extra', '/shortener/a/extra', '/ARCHITECTURE/',
    '/assets/missing-file.js', '/missing.js', '/mockServiceWorker.js',
    '/favicon.svg/', '/architecture.html/', '/no-such/index/', '/services/index/',
  ]) notFound(path)
  for (const path of ['/ru/no-such', '/ru/assets/missing.js', '/ru/missing.js']) notFound(path, 'ru')

  const assets = (await inventory(dist)).filter((path) => !path.endsWith('.html'))
  assert(assets.includes('demo/mockServiceWorker.js'), 'Built mock service worker must exist')
  for (const path of assets) {
    add('built static asset', '/' + path, { status: 200, bodyFile: path, mime: assetMime(path), cache: CACHE })
  }
  // HEAD covers every route/alias/static file, without following redirects.
  cases.push(...cases.map((test) => ({ ...test, method: 'HEAD' })))

  for (const path of ['/', '/architecture', '/ru/no-such', '/no-such', '/favicon.svg', '/demo/orders/fixture-123', '/demo/unknown', '/demo/mockServiceWorker.js', '/orders/123', '/orders/new/extra']) {
    const worker = /^\/(demo|orders|auth|notifications|shortener)(\/|$)/.test(path)
    for (const method of ['POST', 'OPTIONS']) {
      add('unsupported method', path, { status: 405, body: worker ? Buffer.from('Method not allowed') : EMPTY, mime: worker ? 'text/plain' : undefined }, { method })
    }
  }
  const script = assets.find((path) => path.startsWith('assets/') && path.endsWith('.js'))
  assert(script, 'Build must contain a fingerprinted JavaScript asset')
  return [
    { path: '/', bodyFile: 'index.html', mime: 'text/html', worker: false },
    { path: '/' + script, bodyFile: script, mime: 'text/javascript', worker: false },
    { path: '/demo/orders/fixture-123', bodyFile: 'demo/index.html', mime: 'text/html', worker: true },
    { path: '/demo/mockServiceWorker.js', bodyFile: 'demo/mockServiceWorker.js', mime: 'text/javascript', worker: true },
  ]
}

function request(base, path, method = 'GET', headers = {}) {
  const origin = new URL(base)
  assert.equal(origin.protocol, 'http:', 'The isolated test fixtures must use loopback HTTP')
  assert.equal(origin.hostname, '127.0.0.1', 'Never probe an external server from this script')
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: origin.hostname, port: origin.port, path, method, headers: { 'Accept-Encoding': 'identity', ...headers } }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => req.destroy(new Error(`Request timed out: ${method} ${path}`)))
    req.end()
  })
}

function location(response, base) {
  const value = response.headers.location
  if (value === undefined) return undefined
  const url = new URL(value, base)
  assert.equal(url.origin, new URL(base).origin, `Redirect must remain on its own origin: ${value}`)
  assert.equal(url.hash, '', 'HTTP redirects must leave fragment inheritance to the browser')
  return url.pathname + url.search
}

function summary(response) {
  return {
    status: response.status, bytes: response.body.length,
    sha256: createHash('sha256').update(response.body).digest('hex'),
    headers: Object.fromEntries(['location', 'content-type', 'cache-control', 'x-robots-tag', 'etag', 'content-range'].map((key) => [key, response.headers[key]]).filter(([, value]) => value !== undefined)),
  }
}

async function runCase(test, servers) {
  const { label, path, method = 'GET' } = test
  const result = { label, path, method, passed: false }
  try {
    const [worker, caddy] = await Promise.all([
      request(servers.workerURL, path, method, test.workerHeaders ?? test.headers),
      request(servers.caddyURL, path, method, test.caddyHeaders ?? test.headers),
    ])
    result.worker = summary(worker)
    result.caddy = summary(caddy)
    if (method === 'GET' && !test.headers && !test.workerHeaders) baselines.set(path, { worker, caddy })
    const body = method === 'HEAD' ? EMPTY : test.bodyFile ? await file(test.bodyFile) : test.body ?? EMPTY
    for (const [name, response, base] of [['Worker', worker, servers.workerURL], ['Caddy', caddy, servers.caddyURL]]) {
      assert.equal(response.status, test.status, `${name} status`)
      assert.equal(location(response, base), test.destination, `${name} redirect destination/query`)
      assert.equal(response.headers['cache-control'], test.cache, `${name} Cache-Control`)
      assert.equal(response.headers['content-range'], undefined, `${name} must not return partial content`)
      // A 304 carries no representation. Caddy omits Content-Type there while
      // ASSETS repeats it; both preserve the cached representation's MIME.
      if (test.mime !== undefined && test.status !== 304) assert.equal(mime(response.headers['content-type']), test.mime, `${name} MIME`)
      assert(response.body.equals(body), `${name} response differs from the expected built file/body`)
    }
    if (test.status !== 304) assert.equal(mime(caddy.headers['content-type']), mime(worker.headers['content-type']), 'MIME equivalence')
    assert.equal(caddy.headers['x-robots-tag'], 'noindex,nofollow', 'Every staging response must forbid indexing')
    assert(caddy.body.equals(worker.body), 'Response bytes must match the Worker')
    result.passed = true
  } catch (error) {
    result.error = error.message
    failures.push(`${method} ${path}: ${error.message}`)
  }
  results.push(result)
}

async function stagingChecks(servers) {
  for (const method of ['GET', 'HEAD']) {
    const result = { label: 'staging health', path: '/_health', method, passed: false }
    try {
      const response = await request(servers.caddyURL, '/_health', method)
      result.caddy = summary(response)
      assert.equal(response.status, 200)
      assert.equal(response.body.toString(), method === 'HEAD' ? '' : 'ok')
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.equal(response.headers['x-robots-tag'], 'noindex,nofollow')
      result.passed = true
    } catch (error) {
      result.error = error.message
      failures.push(`${method} /_health: ${error.message}`)
    }
    results.push(result)
  }
  for (const path of ['/', '/ru/architecture/' + QUERY, '/demo/orders/a%2Fb' + QUERY, '/missing.js', '/_health']) {
    const result = { label: 'staging HTTP upgrade', path, method: 'GET', passed: false }
    try {
      const response = await request(servers.httpURL, path)
      result.caddy = summary(response)
      assert.equal(response.status, 308)
      assert.equal(response.headers.location, 'https://origin.zolotoy.dev' + path)
      assert.equal(response.headers['x-robots-tag'], 'noindex,nofollow')
      result.passed = true
    } catch (error) {
      result.error = error.message
      failures.push(`HTTP upgrade ${path}: ${error.message}`)
    }
    results.push(result)
  }
}

async function main() {
  let servers
  try {
    const cacheCases = await buildCases()
    servers = await startServers()
    for (const test of cases) await runCase(test, servers)
    for (const test of cacheCases) {
      for (const headers of [{ Authorization: 'Bearer selectel-test-only' }, { Range: 'bytes=0-19' }]) {
        await runCase({ ...test, label: 'request-dependent cache policy', method: 'GET', status: 200, cache: test.worker ? CACHE : undefined, headers }, servers)
      }
      const baseline = baselines.get(test.path)
      assert(baseline?.worker.headers.etag && baseline?.caddy.headers.etag, `Both servers must provide an ETag: ${test.path}`)
      await runCase({
        ...test, label: 'own ETag revalidation', method: 'GET', status: test.worker ? 200 : 304,
        bodyFile: test.worker ? test.bodyFile : undefined, cache: CACHE,
        workerHeaders: { 'If-None-Match': baseline.worker.headers.etag },
        caddyHeaders: { 'If-None-Match': baseline.caddy.headers.etag },
      }, servers)
    }
    await stagingChecks(servers)
  } catch (error) {
    failures.push(`Test harness: ${error.stack ?? error.message}`)
  } finally {
    if (servers) await servers.stop()
    await mkdir(join(root, 'test-results'), { recursive: true })
    await writeFile(reportPath, JSON.stringify({
      schema: 1, checkedAt: new Date().toISOString(),
      scope: 'Built route/body/MIME/cache contract over isolated loopback HTTP; not live VPS TLS or deployment verification',
      intentionalDifferences: ['Every staging response has X-Robots-Tag: noindex,nofollow', 'ETag values and equivalent JavaScript/icon MIME spellings are implementation-specific', 'Caddy may omit Content-Type on representation-free 304 responses', 'Health and HTTP-to-HTTPS upgrade are staging additions'],
      total: results.length, passed: results.filter((result) => result.passed).length, failures, results,
    }, null, 2) + '\n')
  }
  console.log(`Selectel routing: ${results.filter((result) => result.passed).length}/${results.length} cases passed; report: ${relative(root, reportPath)}`)
  for (const failure of failures.slice(0, 35)) console.error(failure)
  if (failures.length > 35) console.error(`... ${failures.length - 35} more failures in the JSON report`)
  process.exitCode = failures.length ? 1 : 0
}

await main()
