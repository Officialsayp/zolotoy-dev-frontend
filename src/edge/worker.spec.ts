import { describe, expect, it } from 'vitest'

import {
  matchDemoRoute,
  legacyRedirectTarget,
  canonicalizePublic,
  isLegacyNamespacePath,
} from './worker'

describe('edge worker routing helpers', () => {
  it('matches demo route patterns', () => {
    expect(matchDemoRoute('/')).toBe('/')
    expect(matchDemoRoute('/orders/')).toBe('/orders/')
    expect(matchDemoRoute('/orders/123')).toBe('/orders/:orderId')
    expect(matchDemoRoute('/notifications/events/abc')).toBe('/notifications/events/:eventId')
    expect(matchDemoRoute('/unknown-path')).toBeNull()
    expect(matchDemoRoute('/orders/new/extra')).toBeNull()
  })

  it('maps legacy namespaces with query preservation left to the caller', () => {
    expect(legacyRedirectTarget('/orders')).toBe('/demo/orders/')
    expect(legacyRedirectTarget('/orders/123?details=true'.split('?')[0])).toBe('/demo/orders/123')
    expect(legacyRedirectTarget('/auth/profile')).toBe('/demo/auth/profile')
    expect(legacyRedirectTarget('/notifications/events/abc')).toBe('/demo/notifications/events/abc')
    expect(legacyRedirectTarget('/shortener/abc')).toBe('/demo/shortener/abc')
  })

  it('does not match /orders-extra or unknown nested paths', () => {
    expect(isLegacyNamespacePath('/orders-extra')).toBe(false)
    expect(isLegacyNamespacePath('/authx/profile')).toBe(false)
    expect(legacyRedirectTarget('/orders/new/extra')).toBeNull()
  })

  it('canonicalizes public document aliases only', () => {
    expect(canonicalizePublic('/index.html')).toBe('/')
    expect(canonicalizePublic('/architecture/index.html')).toBe('/architecture/')
    expect(canonicalizePublic('/services/order/index.html')).toBe('/services/order/')
    expect(canonicalizePublic('/nope/index.html')).toBeNull()
  })
})
