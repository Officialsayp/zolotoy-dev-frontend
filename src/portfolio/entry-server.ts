/**
 * Public server entry: renders one public document to HTML strings. Used by
 * scripts/prerender.mjs (build) and scripts/vite-site-plugin.ts (dev).
 */
import { renderToString } from 'vue/server-renderer'

import { createPublicApp, resolvePublicPage } from './app'
import { PUBLIC_ROUTES } from '@/shared/routing/site-routes'

export interface RenderedPublicPage {
  routeId: string
  canonicalPath: string | null
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
  return { routeId: mounted.result.routeId, canonicalPath: mounted.result.canonicalPath, html }
}

/** The six prerendered public routes (for prerender + sitemap tooling). */
export function publicRoutePaths(): string[] {
  return PUBLIC_ROUTES.map((route) => route.path)
}

export { resolvePublicPage }
