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
  counterpartPath,
  publicPathFor,
  resolvePublicPathForLocale,
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

  it('canonicalizes /ru aliases including the RU home', () => {
    expect(canonicalizePublicUrl('/ru')).toBe('/ru/')
    expect(canonicalizePublicUrl('/ru/index.html')).toBe('/ru/')
    expect(canonicalizePublicUrl('/ru/architecture')).toBe('/ru/architecture/')
    expect(canonicalizePublicUrl('/ru/services/url-shortener/')).toBe('/ru/services/url-shortener/')
    expect(canonicalizePublicUrl('/ru/nope/')).toBeNull()
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

describe('site-routes locale mapping', () => {
  it('maps every EN route to an RU counterpart under /ru/', () => {
    for (const route of PUBLIC_ROUTES) {
      const resolved = resolvePublicPathForLocale(route.path)
      expect(resolved?.locale).toBe('en')
      const ru = counterpartPath(route.path, 'ru')
      expect(ru).toBe('/ru' + (route.path === '/' ? '/' : route.path))
      // Round trip: RU path resolves back to the same document.
      const resolvedRu = resolvePublicPathForLocale(ru!)
      expect(resolvedRu?.id).toBe(route.id)
      expect(resolvedRu?.locale).toBe('ru')
      expect(resolvedRu?.canonicalPath).toBe('/ru' + (route.path === '/' ? '/' : route.path))
    }
  })

  it('keeps EN canonical paths unprefixed', () => {
    expect(publicPathFor('home', 'en')).toBe('/')
    expect(publicPathFor('architecture', 'en')).toBe('/architecture/')
    expect(publicPathFor('shortener', 'en')).toBe('/services/url-shortener/')
    expect(publicPathFor('home', 'ru')).toBe('/ru/')
    expect(publicPathFor('shortener', 'ru')).toBe('/ru/services/url-shortener/')
  })

  it('rejects non-public /ru/ paths; bare /ru is the RU home', () => {
    expect(resolvePublicPathForLocale('/ru/nope/')).toBeNull()
    expect(resolvePublicPathForLocale('/ru')?.id).toBe('home')
  })

  it('switch preserves the semantic page both ways', () => {
    expect(counterpartPath('/ru/services/auth/', 'en')).toBe('/services/auth/')
    expect(counterpartPath('/services/auth/', 'ru')).toBe('/ru/services/auth/')
  })
})
