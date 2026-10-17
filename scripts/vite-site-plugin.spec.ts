// @vitest-environment node
import { describe, expect, it, afterAll } from 'vitest'
import type { IncomingMessage } from 'node:http'

import { isDocumentRequest, viteSitePlugin } from './vite-site-plugin'
import { createServer, type ViteDevServer } from 'vite'

function fakeReq(accept?: string): IncomingMessage {
  return { headers: accept === undefined ? {} : { accept } } as unknown as IncomingMessage
}

describe('isDocumentRequest', () => {
  it('treats extension-less paths with text/html accept as document navigations', () => {
    expect(isDocumentRequest(fakeReq('text/html,application/xhtml+xml'), '/unknown/path')).toBe(true)
    expect(isDocumentRequest(fakeReq('text/html,*/*;q=0.8'), '/ru/unknown/')).toBe(true)
    expect(isDocumentRequest(fakeReq('text/html,application/xhtml+xml'), '/demo')).toBe(true)
  })

  it('never treats the root or file URLs as unknown-document navigations', () => {
    expect(isDocumentRequest(fakeReq('text/html'), '/')).toBe(false)
    expect(isDocumentRequest(fakeReq('text/html'), '/src/portfolio/entry-client.ts')).toBe(false)
    expect(isDocumentRequest(fakeReq('*/*'), '/demo/mockServiceWorker.js')).toBe(false)
    expect(isDocumentRequest(fakeReq('*/*'), '/og/portfolio.png')).toBe(false)
  })

  it('treats module fetches and asset loads (accept */*) as non-documents', () => {
    expect(isDocumentRequest(fakeReq('*/*'), '/src/main.ts')).toBe(false)
    expect(isDocumentRequest(fakeReq('*/*'), '/src/app/shell/app-shell.vue')).toBe(false)
    expect(isDocumentRequest(fakeReq('application/json'), '/api/v1/orders')).toBe(false)
    expect(isDocumentRequest(fakeReq(), '/whatever')).toBe(false)
  })
})

describe('vite dev server integration (npm run dev parity)', () => {
  let server: ViteDevServer | null = null

  afterAll(async () => {
    await server?.close()
  })

  it('serves module URLs, the MSW worker script and public assets while keeping document 404s', async () => {
    server = await createServer({
      root: new URL('..', import.meta.url).pathname,
      logLevel: 'error',
      server: { port: 0, strictPort: false },
      plugins: [viteSitePlugin()],
    })
    await server.listen()
    const address = server.resolvedUrls?.local?.[0]
    if (!address) throw new Error('dev server did not resolve a local URL')
    const base = address.replace(/\/$/, '')

    const get = async (path: string, accept = '*/*'): Promise<number> => {
      const res = await fetch(base + path, { headers: { accept } })
      await res.arrayBuffer() // drain body
      return res.status
    }

    // Module URLs must reach Vite's transform pipeline (200, JS served).
    expect(await get('/src/portfolio/entry-client.ts')).toBe(200)
    expect(await get('/src/main.ts')).toBe(200)

    // The MSW worker script lives in public/demo/ and must be served.
    expect(await get('/demo/mockServiceWorker.js')).toBe(200)

    // Public assets fall through to Vite's static middleware.
    expect(await get('/favicon.ico')).toBe(200)

    // Known documents still render through SSR.
    expect(await get('/', 'text/html')).toBe(200)
    expect(await get('/demo/', 'text/html')).toBe(200)

    // Unknown document navigations keep the deliberate 404.
    expect(await get('/this-does-not-exist/', 'text/html')).toBe(404)
    expect(await get('/demo/unknown-route/', 'text/html')).toBe(404)
  })
})
