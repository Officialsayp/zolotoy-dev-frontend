/**
 * Public server entry: renders one public document to HTML strings. Used by
 * scripts/prerender.mjs (build) and scripts/vite-site-plugin.ts (dev).
 * Renders both locales: six EN + six RU documents.
 */
import { renderToString } from 'vue/server-renderer'

import { createPublicApp, resolvePublicPage } from './app'
import { PUBLIC_ROUTES } from '@/shared/routing/site-routes'

export interface RenderedPublicPage {
  routeId: string
  locale: 'en' | 'ru'
  canonicalPath: string
  html: string
}

/**
 * Render a public document by request pathname. Returns null when the path is
 * not a public document (the caller renders the static 404).
 */
export async function renderPublicPage(pathname: string): Promise<RenderedPublicPage | null> {
  const mounted = createPublicApp(pathname)
  if (mounted === null) return null
  const html = await renderToString(mounted.app)
  return {
    routeId: mounted.result.routeId,
    locale: mounted.result.locale,
    canonicalPath: mounted.result.canonicalPath,
    html,
  }
}

/**
 * All prerendered public route paths: six EN + six RU (12 documents).
 */
export function publicRoutePaths(): string[] {
  const paths: string[] = []
  for (const route of PUBLIC_ROUTES) {
    paths.push(route.path)
    paths.push('/ru' + (route.path === '/' ? '/' : route.path))
  }
  return paths
}

export { resolvePublicPage }
