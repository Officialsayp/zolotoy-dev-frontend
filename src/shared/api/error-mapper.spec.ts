import { describe, expect, it } from 'vitest'

import { sanitizeMessage } from './api-error'
import {
  errorFromResponse,
  mapHttpError,
  mapNetworkError,
  parseErrorEnvelope,
  statusToKind,
} from './error-mapper'

describe('statusToKind', () => {
  it('maps well-known statuses and 5xx fallback', () => {
    expect(statusToKind(400)).toBe('validation')
    expect(statusToKind(401)).toBe('authentication')
    expect(statusToKind(403)).toBe('authorization')
    expect(statusToKind(404)).toBe('not-found')
    expect(statusToKind(409)).toBe('conflict')
    expect(statusToKind(429)).toBe('rate-limit')
    expect(statusToKind(500)).toBe('server')
    expect(statusToKind(503)).toBe('server')
    expect(statusToKind(418)).toBe('unknown')
  })
})

describe('parseErrorEnvelope', () => {
  it('extracts the backend error envelope', () => {
    const envelope = parseErrorEnvelope({ error: { code: 'ORDER_INVALID_STATE', message: 'No', details: { a: 1 } } })
    expect(envelope).toEqual({ code: 'ORDER_INVALID_STATE', message: 'No', details: { a: 1 } })
  })

  it('returns undefined for non-envelope bodies', () => {
    expect(parseErrorEnvelope(null)).toBeUndefined()
    expect(parseErrorEnvelope('boom')).toBeUndefined()
    expect(parseErrorEnvelope([1, 2])).toBeUndefined()
  })
})

describe('mapHttpError', () => {
  it('prefers backend envelope message and keeps the code', () => {
    const error = mapHttpError(409, { error: { code: 'ORDER_VERSION_CONFLICT', message: 'Stale version' } })
    expect(error.kind).toBe('conflict')
    expect(error.code).toBe('ORDER_VERSION_CONFLICT')
    expect(error.message).toBe('Stale version')
    expect(error.status).toBe(409)
  })

  it('uses a safe default message when the backend body is opaque', () => {
    expect(mapHttpError(403, undefined).message).toContain('permission')
    expect(mapHttpError(429, { detail: 'x' }).kind).toBe('rate-limit')
  })

  it('treats an otherwise-unknown 4xx with backend code as business error', () => {
    const error = mapHttpError(422, { error: { code: 'DOMAIN_RULE', message: 'Not allowed' } })
    expect(error.kind).toBe('business')
    expect(error.code).toBe('DOMAIN_RULE')
  })
})

describe('sanitizeMessage', () => {
  it('caps long messages', () => {
    expect(sanitizeMessage('x'.repeat(2000)).length).toBe(501)
  })

  it('drops obvious stack-trace content', () => {
    expect(sanitizeMessage('boom\nat main (http://x)')).toBe('Unexpected error')
  })
})

describe('network error mapping', () => {
  it('distinguishes timeouts from generic network failures', () => {
    expect(mapNetworkError(new Error('down')).kind).toBe('network')
    expect(mapNetworkError(new Error('took long'), true).kind).toBe('timeout')
  })
})

describe('errorFromResponse', () => {
  it('maps a real Response without throwing', async () => {
    const response = new Response(JSON.stringify({ error: { code: 'AUTH_REFRESH_REUSE_DETECTED', message: 'Replayed' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
    const error = await errorFromResponse(response)
    expect(error.kind).toBe('authentication')
    expect(error.code).toBe('AUTH_REFRESH_REUSE_DETECTED')
  })
})
