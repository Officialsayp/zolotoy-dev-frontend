import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, cp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import { startCaddy } from './selectel-servers.mjs'

// Missing first release / failed-first-release rollback must retain liveness
// while returning an explicit unavailable status for all frontend routes.
const empty = await mkdtemp(join(tmpdir(), 'zolotoy-unpublished-'))
const unavailable = await startCaddy({ dist: empty })
try {
  for (const path of ['/', '/demo/', '/ru/', '/_release', '/assets/missing.js']) {
    const response = await globalThis.fetch(unavailable.caddyURL + path)
    assert.equal(response.status, 503, path)
    assert.equal(response.headers.get('cache-control'), 'no-store', path)
    assert.equal(response.headers.get('x-robots-tag'), 'noindex,nofollow', path)
    assert.equal(await response.text(), 'Frontend deployment pending', path)
  }
  const health = await globalThis.fetch(unavailable.caddyURL + '/_health')
  assert.equal(health.status, 200)
  assert.equal(await health.text(), 'ok')
} finally {
  await unavailable.stop()
  await rm(empty, { recursive: true, force: true })
}

// Use an ephemeral internal test CA, explicitly trusted by curl for this call.
// No -k, operating-system trust installation, ACME issuance or remote writes.
const tls = await startCaddy({ tls: true })
try {
  const curl = (path, args = []) => execFileSync('curl', [
    '--silent', '--show-error', '--fail', '--max-time', '10', '--tlsv1.2',
    '--cacert', tls.caPath, ...args, tls.caddyURL + path,
  ], { encoding: 'utf8' })
  assert.equal(curl('/_health'), 'ok')
  assert.equal(curl('/'), await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'))
  assert.equal(curl('/ru/'), await readFile(new URL('../dist/ru/index.html', import.meta.url), 'utf8'))
  const headers = curl('/demo/', ['--head'])
  assert.match(headers, /HTTP\/\S+ 200/)
  assert.match(headers, /x-robots-tag: noindex,nofollow/i)
  const redirect = await globalThis.fetch(tls.httpURL + '/demo/orders/123?lang=ru&x=1', { redirect: 'manual' })
  assert.equal(redirect.status, 308)
  assert.equal(redirect.headers.get('location'), 'https://origin.zolotoy.dev/demo/orders/123?lang=ru&x=1')
  console.log('Selectel runtime: missing-release 503, health 200, verified TLS/hostname, EN/RU bytes, HEAD, and HTTP upgrade passed')
} finally {
  await tls.stop()
}

// Exercise the actual deployment smoke program against real Caddy responses.
// The test CA covers the staging hostname, but connect-to maps both listeners
// to isolated loopback ports; no request reaches the live VPS or public DNS.
const releaseRoot = await mkdtemp(join(tmpdir(), 'zolotoy-release-smoke-'))
const releaseID = 'a'.repeat(40) + '-1-1'
let candidate
try {
  await cp(new URL('../dist/', import.meta.url), join(releaseRoot, 'site'), { recursive: true })
  await writeFile(join(releaseRoot, 'site/release-id.txt'), releaseID + '\n')
  const metadata = join(releaseRoot, 'metadata')
  await mkdir(metadata)
  await cp(new URL('./selectel/smoke.py', import.meta.url), join(metadata, 'smoke.py'))
  candidate = await startCaddy({ tls: true, tlsHostname: 'origin.zolotoy.dev', dist: join(releaseRoot, 'site') })
  const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'"
  const wrapperDir = join(releaseRoot, 'bin')
  await mkdir(wrapperDir)
  const tlsPort = new URL(candidate.caddyURL).port
  const httpPort = new URL(candidate.httpURL).port
  await writeFile(join(wrapperDir, 'curl'), `#!/bin/sh\nexec /usr/bin/curl --disable --cacert ${quote(candidate.caPath)} --connect-to origin.zolotoy.dev:443:127.0.0.1:${tlsPort} --connect-to origin.zolotoy.dev:80:127.0.0.1:${httpPort} "$@"\n`, { mode: 0o755 })
  const output = execFileSync('python3', [join(metadata, 'smoke.py'), '--host', 'origin.zolotoy.dev', '--release', releaseID], {
    env: { ...process.env, PATH: wrapperDir + ':' + process.env.PATH }, encoding: 'utf8', timeout: 30_000,
  })
  assert.match(output, /Staging smoke passed/)
  console.log('Selectel deployment smoke: real Caddy routes, release marker and verified test TLS passed over loopback')
} finally {
  if (candidate) await candidate.stop()
  await rm(releaseRoot, { recursive: true, force: true })
}
