// Serve the exact staging route configuration with only transport/root replaced.
// Child processes own their temporary state; no Caddy reload, installed service,
// Cloudflare upload, system trust-store or production filesystem is involved.
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { setTimeout } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))
const binary = process.env.CADDY_BIN || resolve(root, '.tools/bin/caddy')

async function freePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise((done) => server.close(done))
  return port
}

async function start(command, args, env, readyURL, readyStatus = 200) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  let failure
  child.on('error', (error) => { failure = error })
  for (const pipe of [child.stdout, child.stderr]) pipe.on('data', (data) => { log = (log + data).slice(-12000) })
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    child.kill('SIGTERM')
    await Promise.race([once(child, 'exit'), setTimeout(5000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (failure || child.exitCode !== null) throw new Error(`${command} exited: ${failure || log}`)
      if (!log.includes('serving initial configuration') && !log.includes('Ready on')) {
        await setTimeout(200)
        continue
      }
      try {
        const response = await globalThis.fetch(readyURL, { redirect: 'manual', signal: globalThis.AbortSignal.timeout(1000) })
        await response.arrayBuffer()
        if (response.status === readyStatus) return { stop }
      } catch { /* Poll only the newly spawned local test server. */ }
      await setTimeout(200)
    }
    throw new Error(`Local server startup timed out: ${log}`)
  } catch (error) {
    await stop()
    throw error
  }
}

export async function startCaddy({ port, dist = resolve(root, 'dist'), tls = false, tlsHostname = 'localhost' } = {}) {
  if (!['localhost', 'origin.zolotoy.dev'].includes(tlsHostname)) throw new Error('Unsupported local TLS test hostname')
  const version = execFileSync(binary, ['version'], { encoding: 'utf8' })
  if (!version.startsWith('v2.11.4 ')) throw new Error(`Expected Caddy 2.11.4, got ${version}`)
  const state = await mkdtemp(join(tmpdir(), 'zolotoy-caddy-'))
  const caddyPort = port || await freePort()
  const httpPort = await freePort()
  const caddyURL = tls ? `https://${tlsHostname}:${caddyPort}` : `http://127.0.0.1:${caddyPort}`
  const httpURL = `http://127.0.0.1:${httpPort}`
  const source = await readFile(resolve(root, 'deploy/caddy/zolotoy-dev.caddy'), 'utf8')
  const substitutions = [
    ['http://origin.zolotoy.dev {', `http://:${httpPort} {\n bind 127.0.0.1`],
    ['https://origin.zolotoy.dev {', `${caddyURL} {\n bind 127.0.0.1${tls ? '\n tls internal' : ''}`],
    ['/var/www/zolotoy-dev/releases/current', dist],
  ]
  let local = source
  for (const [from, to] of substitutions) {
    if (local.split(from).length !== 2) throw new Error(`Expected one fixture replacement for ${from}`)
    local = local.replace(from, to)
  }
  const config = join(state, 'Caddyfile')
  await writeFile(config, `{\n admin off\n auto_https ${tls ? 'disable_redirects' : 'off'}\n persist_config off\n skip_install_trust\n storage file_system {\n  root ${state}/data\n }\n}\n${local}`)
  try {
    const server = await start(binary, ['run', '--config', config, '--adapter', 'caddyfile'], {
      XDG_CONFIG_HOME: state, XDG_DATA_HOME: state,
    }, tls ? httpURL : `${caddyURL}/_health`, tls ? 308 : 200)
    return { caddyURL, httpURL, caPath: join(state, 'data/pki/authorities/local/root.crt'), stop: async () => { await server.stop(); await rm(state, { recursive: true, force: true }) } }
  } catch (error) {
    await rm(state, { recursive: true, force: true })
    throw error
  }
}

export async function startServers() {
  const caddy = await startCaddy()
  const state = await mkdtemp(join(tmpdir(), 'zolotoy-worker-'))
  const port = await freePort()
  const workerURL = `http://127.0.0.1:${port}`
  try {
    const worker = await start(process.execPath, [
      resolve(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--ip', '127.0.0.1',
      '--port', String(port), '--compatibility-date', '2026-06-24', '--persist-to', join(state, 'storage'),
    ], {
      XDG_CONFIG_HOME: state, WRANGLER_REGISTRY_PATH: join(state, 'registry'),
      WRANGLER_LOG_PATH: join(state, 'wrangler.log'), WRANGLER_SEND_METRICS: 'false',
    }, workerURL)
    return { ...caddy, workerURL, stop: async () => {
      await worker.stop()
      await caddy.stop()
      await rm(state, { recursive: true, force: true })
    } }
  } catch (error) {
    await caddy.stop()
    await rm(state, { recursive: true, force: true })
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startCaddy({ port: 8790 })
  console.log(`Selectel staging fixture ready: ${server.caddyURL}`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.stop(); process.exit(0) })
}
