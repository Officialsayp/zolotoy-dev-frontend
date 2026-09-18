import { describe, expect, it } from 'vitest'

import {
  DEMO_ROUTE_PATTERNS,
  LEGACY_ROOTS,
  PUBLIC_ROUTES,
  canonicalizePublicUrl,
  demoUrl,
  isLegacyNamespacePath,
  isPublicDocumentPath,
  legacyRedirectTarget,
  matchDemoRoute,
  publicCanonicalUrl,
  serviceCaseStudyPath,
  serviceDemoRoot,
} from './site-routes'

describe('site-routes manifest', () => {
  it('contains exactly the six public documents with trailing slashes', () => {
    expect(PUBLIC_ROUTES.map((r) => r.path)).toEqual([
      '/',
      '/architecture/',
      '/services/order/',
      '/services/auth/',
      '/services/notification/',
      '/services/url-shortener/',
    ])
  })

  it('keeps demo patterns with the exact parameter names', () => {
    expect(DEMO_ROUTE_PATTERNS).toContain('/orders/:orderId')
    expect(DEMO_ROUTE_PATTERNS).toContain('/notifications/events/:eventId')
    expect(DEMO_ROUTE_PATTERNS).toContain('/notifications/:notificationId')
    expect(DEMO_ROUTE_PATTERNS).toContain('/shortener/:linkId')
  })

  it('classifies public document paths exactly', () => {
    expect(isPublicDocumentPath('/')).toBe(true)
    expect(isPublicDocumentPath('/architecture/')).toBe(true)
    expect(isPublicDocumentPath('/services/order/')).toBe(true)
    expect(isPublicDocumentPath('/architecture')).toBe(false)
    expect(isPublicDocumentPath('/demo/')).toBe(false)
  })

  it('canonicalizes aliases without inventing documents', () => {
    expect(canonicalizePublicUrl('/architecture')).toBe('/architecture/')
    expect(canonicalizePublicUrl('/index.html')).toBe('/')
    expect(canonicalizePublicUrl('/services/order')).toBe('/services/order/')
    expect(canonicalizePublicUrl('/services/order/index.html')).toBeNull()
    expect(canonicalizePublicUrl('/nope/')).toBeNull()
  })

  it('matches demo routes with and without the root slash', () => {
    expect(matchDemoRoute('/')).toBe('/')
    expect(matchDemoRoute('/orders/')).toBe('/orders/')
    expect(matchDemoRoute('/orders')).toBe('/orders/')
    expect(matchDemoRoute('/orders/new')).toBe('/orders/new')
    expect(matchDemoRoute('/orders/123')).toBe('/orders/:orderId')
    expect(matchDemoRoute('/notifications/events/abc')).toBe('/notifications/events/:eventId')
    expect(matchDemoRoute('/shortener/abc')).toBe('/shortener/:linkId')
    expect(matchDemoRoute('/orders/new/extra')).toBeNull()
    expect(matchDemoRoute('/unknown')).toBeNull()
  })

  it('maps legacy namespaces to demo destinations on complete segments', () => {
    expect(isLegacyNamespacePath('/orders')).toBe(true)
    expect(isLegacyNamespacePath('/orders/123')).toBe(true)
    expect(isLegacyNamespacePath('/orders-extra')).toBe(false)
    expect(isLegacyNamespacePath('/auth/profile')).toBe(true)
    expect(isLegacyNamespacePath('/authx/profile')).toBe(false)
    expect(LEGACY_ROOTS).toEqual(['/orders', '/auth', '/notifications', '/shortener'])
  })

  it('builds legacy redirect targets preserving segments and encoding', () => {
    expect(legacyRedirectTarget('/orders')).toBe('/demo/orders/')
    expect(legacyRedirectTarget('/orders/123')).toBe('/demo/orders/123')
    expect(legacyRedirectTarget('/orders/123/')).toBe('/demo/orders/123')
    expect(legacyRedirectTarget('/auth/profile')).toBe('/demo/auth/profile')
    expect(legacyRedirectTarget('/notifications/events/abc')).toBe(
      '/demo/notifications/events/abc',
    )
    expect(legacyRedirectTarget('/shortener/abc')).toBe('/demo/shortener/abc')
    // Encoded value must not become a new route segment.
    expect(legacyRedirectTarget('/orders/a%2Fb')).toBe('/demo/orders/a%2Fb')
    // Unknown sub-pattern inside a legacy namespace does not redirect.
    expect(legacyRedirectTarget('/orders/new/extra')).toBeNull()
  })

  it('derives service case-study and demo URLs from the manifest', () => {
    expect(serviceCaseStudyPath('shortener')).toBe('/services/url-shortener/')
    expect(serviceDemoRoot('shortener')).toBe('/shortener')
    expect(demoUrl('/auth/profile')).toBe('/demo/auth/profile')
    expect(demoUrl('/')).toBe('/demo/')
    expect(publicCanonicalUrl('home')).toBe('https://zolotoy.dev/')
    expect(publicCanonicalUrl('shortener')).toBe('https://zolotoy.dev/services/url-shortener/')
  })
})
