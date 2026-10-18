#!/usr/bin/env node
// Run the existing full routing corpus against the generated production config
// without editing staging files or contacting a production host.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

import { generateProductionConfig } from './generate-selectel-production.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const reportPath = join(root, 'test-results/selectel-production-routing.json')
const rootDeclaration = "const root = fileURLToPath(new URL('../', import.meta.url))"

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, `Staging test adapter needs review: ${before}`)
  return source.replace(before, after)
}

function productionServers(source, acmeRoot) {
  source = replaceOnce(source, rootDeclaration, `const root = ${JSON.stringify(root)}`)
  source = replaceOnce(source, 'deploy/caddy/zolotoy-dev.caddy', 'deploy/caddy/zolotoy-dev-production.caddy')
  source = replaceOnce(source, '/var/www/zolotoy-dev/releases/current', '/var/www/zolotoy-dev-production/current')
  // Certificate paths and the ACME filesystem root are deployment transport
  // concerns. Preserve their production declarations; substitute only fixtures.
  source = replaceOnce(source,
    "const source = await readFile(resolve(root, 'deploy/caddy/zolotoy-dev-production.caddy'), 'utf8')",
    "let source = await readFile(resolve(root, 'deploy/caddy/zolotoy-dev-production.caddy'), 'utf8')\n" +
    "  const certificateLine = '\\n\\ttls /etc/caddy/zolotoy-dev-tls/current/fullchain.pem /etc/caddy/zolotoy-dev-tls/current/privkey.pem'\n" +
    "  if (source.split(certificateLine).length !== 2) throw new Error('Expected one production TLS fixture replacement')\n" +
    "  source = source.replace(certificateLine, '')\n" +
    "  if (source.split('/var/lib/zolotoy-dev-acme/webroot').length !== 2) throw new Error('Expected one ACME webroot fixture replacement')\n" +
    `  source = source.replace('/var/lib/zolotoy-dev-acme/webroot', ${JSON.stringify(acmeRoot)})`)
  return source.replaceAll('origin.zolotoy.dev', 'zolotoy.dev')
}

function productionCorpus(source) {
  source = replaceOnce(source, rootDeclaration, `const root = ${JSON.stringify(root)}`)
  source = replaceOnce(source, 'test-results/selectel-routing.json', 'test-results/selectel-production-routing.json')
  source = replaceOnce(source,
    "assert.equal(caddy.headers['x-robots-tag'], 'noindex,nofollow', 'Every staging response must forbid indexing')",
    "assert.equal(caddy.headers['x-robots-tag'], worker.headers['x-robots-tag'], 'Production robots headers must match the Worker')")
  source = replaceOnce(source,
    "assert.equal(response.headers['cache-control'], 'no-store')\n      assert.equal(response.headers['x-robots-tag'], 'noindex,nofollow')",
    "assert.equal(response.headers['cache-control'], 'no-store')\n      assert.equal(response.headers['x-robots-tag'], 'noindex')")
  source = replaceOnce(source,
    "assert.equal(response.headers['x-robots-tag'], 'noindex,nofollow')",
    "assert.equal(response.headers['x-robots-tag'], path === '/_health' ? 'noindex' : undefined)\n      assert.equal(response.headers['cache-control'], path === '/_health' ? 'no-store' : undefined)")
  source = replaceOnce(source,
    'Every staging response has X-Robots-Tag: noindex,nofollow',
    'Production robots headers match the Worker; operational URLs additionally use noindex')
  return source.replaceAll('https://origin.zolotoy.dev', 'https://zolotoy.dev')
    .replaceAll('staging health', 'production health')
    .replaceAll('staging HTTP upgrade', 'production HTTP upgrade')
    .replaceAll('staging additions', 'operational additions')
    .replaceAll('Selectel routing:', 'Selectel production routing:')
}

function request(base, path, method = 'GET') {
  const url = new URL(base)
  assert.equal(url.protocol, 'http:')
  assert.equal(url.hostname, '127.0.0.1', 'All checks must remain on loopback')
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path, method }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('error', reject)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => req.destroy(new Error(`Timed out: ${method} ${path}`)))
    req.end()
  })
}

function assertRobotsPolicy(report) {
  const groups = [
    ['canonical public page', undefined],
    ['canonical public page with query', undefined],
    ['unknown document or asset', undefined],
    ['direct error document', undefined],
    ['unknown demo', 'noindex'],
    ['legacy route with query', undefined],
    ['raw legacy segments', undefined],
    ['built static asset', undefined],
  ]
  for (const [label, expected] of groups) {
    const cases = report.results.filter((result) => result.label === label)
    assert(cases.length > 0, `Missing production robots group: ${label}`)
    for (const result of cases) assert.equal(result.caddy.headers['x-robots-tag'], expected, `${result.method} ${result.path} robots policy`)
  }
  const demo = report.results.filter((result) => result.label.startsWith('whitelisted '))
  assert.equal(demo.length, 30, 'All 15 whitelist routes require GET and HEAD robots checks')
  for (const result of demo) assert.equal(result.caddy.headers['x-robots-tag'], 'noindex,follow')
}

async function operationalChecks(startCaddy, temporary) {
  const fixtures = join(temporary, 'published')
  const unpublished = join(temporary, 'unpublished')
  await mkdir(fixtures)
  await mkdir(unpublished)
  await writeFile(join(fixtures, 'index.html'), '<!doctype html><title>Local production fixture</title>')
  await writeFile(join(fixtures, 'release-id.txt'), 'production-test-release\n')
  const results = []
  for (const [dist, published] of [[fixtures, true], [unpublished, false]]) {
    const server = await startCaddy({ dist })
    try {
      for (const path of ['/_health', '/_release', ...(!published ? ['/'] : [])]) {
        for (const method of ['GET', 'HEAD', ...(path !== '/' ? ['POST'] : [])]) {
          const response = await request(server.caddyURL, path, method)
          const status = method === 'POST' ? 405 : path === '/_health' || published ? 200 : 503
          assert.equal(response.status, status, `${method} ${path} with published=${published}`)
          assert.equal(response.headers['cache-control'], 'no-store')
          assert.equal(response.headers['x-robots-tag'], 'noindex')
          if (method === 'HEAD' || method === 'POST') assert.equal(response.body, '')
          else if (path === '/_health') assert.equal(response.body, 'ok')
          else if (published) assert.equal(response.body, 'production-test-release\n')
          else assert.equal(response.body, 'Frontend deployment pending')
          results.push({ published, path, method, status, passed: true })
        }
      }
      for (const path of ['/_health', '/_release']) {
        const response = await request(server.httpURL, path + '?check=1')
        assert.equal(response.status, 308)
        assert.equal(response.headers.location, 'https://zolotoy.dev' + path + '?check=1')
        assert.equal(response.headers['cache-control'], 'no-store')
        assert.equal(response.headers['x-robots-tag'], 'noindex')
        results.push({ published, path, method: 'GET', httpUpgrade: true, status: 308, passed: true })
      }
      for (const [path, status] of [['/.well-known/acme-challenge/production-check', 200], ['/.well-known/acme-challenge/missing-check', 404]]) {
        const response = await request(server.httpURL, path)
        assert.equal(response.status, status, 'ACME challenge must be served over HTTP without an HTTPS redirect')
        assert.equal(response.headers.location, undefined)
        assert.equal(response.headers['cache-control'], 'no-store')
        assert.equal(response.headers['x-robots-tag'], 'noindex')
        if (status === 200) assert.equal(response.body, 'local-acme-check\n')
        results.push({ published, path, method: 'GET', status, passed: true })
      }
    } finally {
      await server.stop()
    }
  }
  return results
}

async function prepareFixture(temporary) {
  const harnessPath = join(temporary, 'selectel-servers.mjs')
  const acmeRoot = join(temporary, 'acme-webroot')
  await mkdir(join(acmeRoot, '.well-known/acme-challenge'), { recursive: true })
  await writeFile(join(acmeRoot, '.well-known/acme-challenge/production-check'), 'local-acme-check\n')
  await writeFile(harnessPath, productionServers(await readFile(join(root, 'scripts/selectel-servers.mjs'), 'utf8'), acmeRoot))
  return import(pathToFileURL(harnessPath).href)
}

async function main() {
  await generateProductionConfig({ check: true })
  const temporary = await mkdtemp(join(tmpdir(), 'zolotoy-production-routing-'))
  try {
    const { startCaddy } = await prepareFixture(temporary)
    const corpusPath = join(temporary, 'check-production.mjs')
    await writeFile(corpusPath, productionCorpus(await readFile(join(root, 'scripts/check-selectel.mjs'), 'utf8')))
    const child = spawn(process.execPath, [corpusPath], { cwd: root, env: process.env, stdio: 'inherit' })
    const [code, signal] = await once(child, 'exit')
    assert.equal(code, 0, `Production differential corpus failed${signal ? ` (${signal})` : ''}`)
    const report = JSON.parse(await readFile(reportPath, 'utf8'))
    assert.equal(report.failures.length, 0)
    assert.equal(report.passed, report.total)
    assertRobotsPolicy(report)
    report.operational = await operationalChecks(startCaddy, temporary)
    report.productionRobotsPolicyVerified = true
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
    console.log(`Production robots policy and ${report.operational.length} published/unpublished operational checks passed`)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

async function serve() {
  await generateProductionConfig({ check: true })
  const temporary = await mkdtemp(join(tmpdir(), 'zolotoy-production-browser-'))
  let server
  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    try {
      if (server) await server.stop()
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }
  try {
    const { startCaddy } = await prepareFixture(temporary)
    server = await startCaddy({ port: 8791 })
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        stop().then(() => process.exit(0), (error) => { console.error(error); process.exit(1) })
      })
    }
    console.log(`Production Caddy browser fixture ready: ${server.caddyURL}`)
  } catch (error) {
    await stop()
    throw error
  }
}

assert(process.argv.slice(2).every((arg) => arg === '--serve'), 'Only --serve is supported')
if (process.argv.includes('--serve')) await serve()
else await main()
