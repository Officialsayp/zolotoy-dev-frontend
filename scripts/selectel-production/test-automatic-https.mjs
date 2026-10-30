import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import { renderProductionConfig } from '../generate-selectel-production.mjs'
import { BASELINE_SHA256, renderAutomaticHttpsCandidate } from './render-caddy-automatic-https.mjs'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../../', import.meta.url))
const baseline = await readFile(root + 'deploy/caddy/zolotoy-dev-production.caddy', 'utf8')
const candidate = await readFile(root + 'deploy/caddy/zolotoy-dev-production.automatic-https.caddy', 'utf8')
const staging = await readFile(root + 'deploy/caddy/zolotoy-dev.caddy', 'utf8')

test('recorded production baseline exactly matches VPS SHA-256 and verified staging generator', () => {
  assert.equal(createHash('sha256').update(baseline).digest('hex'), BASELINE_SHA256)
  assert.equal(renderProductionConfig(staging), baseline)
})

test('Automatic HTTPS candidate is reproducible, isolated and never imported by the active Caddyfile', () => {
  assert.equal(candidate, renderAutomaticHttpsCandidate(baseline))
  assert.match(candidate, /^# MIGRATION CANDIDATE ONLY; NOT ACTIVE\./)
  assert.match(candidate, /https:\/\/zolotoy\.dev \{/)
  assert.match(candidate, /http:\/\/zolotoy\.dev \{/)
  assert.match(candidate, /redir https:\/\/zolotoy\.dev\{uri\} 308/)
  assert.doesNotMatch(candidate, /\/var\/lib\/zolotoy-dev-acme\/webroot/)
  assert.doesNotMatch(candidate, /tls \/etc\/caddy\/zolotoy-dev-tls\//)
  assert.equal((candidate.match(/^https?:\/\/zolotoy\.dev \{/gm) ?? []).length, 2)
})

test('all application handlers, redirects, routes and headers from the production root onwards are untouched', () => {
  const marker = '\troot * /var/www/zolotoy-dev-production/current'
  assert.equal(baseline.split(marker).length, 2)
  assert.equal(candidate.split(marker).length, 2)
  assert.equal(candidate.slice(candidate.indexOf(marker)), baseline.slice(baseline.indexOf(marker)))
})

test('renderer refuses a baseline drift rather than silently overwriting newer routing', () => {
  assert.throws(
    () => renderAutomaticHttpsCandidate(baseline.replace('redir https://zolotoy.dev{uri} 308', 'redir https://zolotoy.dev{uri} 301')),
    /Refuse to migrate from a different production Caddyfile/,
  )
})
