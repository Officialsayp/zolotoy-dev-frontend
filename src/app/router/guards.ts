import type { Router } from 'vue-router'

/**
 * App-wide guards installed once from `main.ts`.
 *
 * Foundation only adds document-title behavior. Auth route guarding (Prompt 02)
 * plugs into this same spot without a second guard pipeline.
 */
export function installAppGuards(router: Router): void {
  router.afterEach((to) => {
    const metaTitle = typeof to.meta.title === 'string' ? to.meta.title : undefined
    document.title = metaTitle ? `${metaTitle} · zolotoy.dev` : 'zolotoy.dev'
  })
}
