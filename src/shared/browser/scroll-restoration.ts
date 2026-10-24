/**
 * Restore a pixel scroll offset on a reload of the same document (or after a
 * deliberate public EN/RU switch), not on ordinary links or Back/Forward.
 * sessionStorage scopes the position to this tab and this URL pathname.
 *
 * The prerendered portfolio and /demo/ SPA use the same mechanism. The router
 * retains responsibility for popstate and hashes; this helper never touches
 * browser history entries or any page element IDs.
 */
const SCROLL_PREFIX = 'zolotoy.dev:scroll:'
const LOCALE_HANDOFF = 'zolotoy.dev:scroll-locale-handoff'

function readPosition(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return null
    const position = Number(raw)
    return Number.isFinite(position) && position >= 0 ? position : null
  } catch {
    return null
  }
}

function writePosition(pathname: string): void {
  try {
    sessionStorage.setItem(SCROLL_PREFIX + pathname, String(window.scrollY))
  } catch {
    // UI enhancement only; storage may be blocked.
  }
}

/** Call synchronously from a user click before changing public language URLs. */
export function rememberLocaleSwitchScroll(href: string): void {
  try {
    const target = new URL(href, window.location.href)
    if (target.origin !== window.location.origin) return
    sessionStorage.setItem(LOCALE_HANDOFF, JSON.stringify({
      path: target.pathname,
      top: window.scrollY,
      created: Date.now(),
    }))
  } catch {
    // Navigation must still work when storage is blocked.
  }
}

function consumeLocaleSwitchScroll(pathname: string): number | null {
  try {
    const raw = sessionStorage.getItem(LOCALE_HANDOFF)
    if (raw === null) return null
    sessionStorage.removeItem(LOCALE_HANDOFF)
    const entry: unknown = JSON.parse(raw)
    if (typeof entry !== 'object' || entry === null) return null
    const item = entry as { path?: unknown; top?: unknown; created?: unknown }
    if (item.path !== pathname ||
        typeof item.top !== 'number' || !Number.isFinite(item.top) || item.top < 0 ||
        typeof item.created !== 'number' || Date.now() - item.created > 30_000) {
      return null
    }
    return item.top
  } catch {
    return null
  }
}

/**
 * Attach recording before hydration/router bootstrap. Start restoration only
 * after the application is mounted and layout can be measured. The restore
 * loop is bounded, and any user interaction cancels it immediately.
 */
export function preparePageScrollRestoration(mode: 'public' | 'demo'): () => void {
  const entryPath = window.location.pathname
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const navigationType = entry?.type
  const reload = navigationType === 'reload'
  const handoff = navigationType === 'navigate'
    ? consumeLocaleSwitchScroll(entryPath)
    : null
  const target = window.location.hash ? null :
    (handoff ?? (reload ? readPosition(SCROLL_PREFIX + entryPath) : null))
  let restoring = target !== null
  const previousScrollRestoration = history.scrollRestoration
  if (restoring) history.scrollRestoration = 'manual'

  function save(): void {
    if (!restoring) writePosition(window.location.pathname)
  }
  window.addEventListener('scroll', save, { passive: true })
  window.addEventListener('pagehide', save)

  return function restoreAfterMount(): void {
    if (target === null) return

    let cancelled = false
    const timers: number[] = []
    let observer: ResizeObserver | null = null

    function finish(): void {
      if (cancelled) return
      cancelled = true
      restoring = false
      for (const timer of timers) clearTimeout(timer)
      observer?.disconnect()
      window.removeEventListener('wheel', finish)
      window.removeEventListener('touchstart', finish)
      window.removeEventListener('pointerdown', finish)
      window.removeEventListener('keydown', finish)
      window.removeEventListener('hashchange', finish)
      if (mode === 'public') history.scrollRestoration = previousScrollRestoration
      save()
    }

    function attempt(): void {
      if (cancelled) return
      if (window.location.pathname !== entryPath || window.location.hash) {
        finish()
        return
      }
      const maxTop = Math.max(0, (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight)
      const top = Math.min(target!, maxTop)
      if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, behavior: 'instant' })
    }

    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange'] as const) {
      window.addEventListener(event, finish, { once: true })
    }
    // Re-evaluate after hydration, image load and late content expansion.
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => requestAnimationFrame(attempt))
      if (document.body) observer.observe(document.body)
    }
    window.addEventListener('load', attempt, { once: true })
    for (const delay of [0, 75, 200, 500, 1000, 1800, 2800]) {
      timers.push(window.setTimeout(attempt, delay))
    }
    timers.push(window.setTimeout(finish, 3200))
    requestAnimationFrame(attempt)
  }
}
