/**
 * Two-position logo handoff resilient to iOS inertial / rubber-band scrolling.
 *
 * The header SVG remains visible when at rest in the header. A fixed copy
 * becomes visible only during an autonomous transition or when docked.
 * Unlike scroll-driven animations, transitions finish after scrolling stops.
 * The final state is also reconciled after the browser settles.
 */
export interface LogoMotionElements {
  source: SVGSVGElement
  floating: HTMLAnchorElement
  onDockedChange: (docked: boolean) => void
}

type Destination = 'header' | 'dock'
type Phase = 'header' | 'moving' | 'dock'

// The entire mobile menu is taller than its logo. Waiting for its bottom
// edge would allow the logo to disappear before animation could start.
// Trigger near the source glyph's viewport edge instead. Hysteresis protects
// against oscillation on elastic iOS Safari scroll.
const EXIT_BOTTOM_PX = 18
const RETURN_BOTTOM_PX = 28
const EASING_TIME_MS = 65
const FINISH_DISTANCE_PX = 0.35
const SCROLL_IDLE_MS = 160

function clampedScrollY(): number {
  // Safari exposes negative/over-max coordinates during elastic scrolling.
  const max = Math.max(0, (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight)
  return Math.min(max, Math.max(0, window.scrollY))
}

export function attachPortfolioLogoMotion({
  source,
  floating,
  onDockedChange,
}: LogoMotionElements): () => void {
  let phase: Phase = 'header'
  let destination: Destination = 'header'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let dockX = 0
  let dockY = 0
  let sourceDocumentBottom = 0
  let offsetX = 0
  let offsetY = 0
  let transitionDistance = 1
  let animationFrame = 0
  let lastFrameTime = 0
  let layoutFrame = 0
  let idleTimer = 0
  let disposed = false
  let touching = false
  let layoutObserver: ResizeObserver | undefined
  let layoutViewportWidth = window.innerWidth

  function measureDockCenter(): void {
    // offsetLeft/Top exclude transforms. Never clear an animated transform
    // solely to measure: WebKit can briefly composite an untransformed layer.
    dockX = floating.offsetLeft + floating.offsetWidth / 2
    dockY = floating.offsetTop + floating.offsetHeight / 2
  }

  function headerOffset(): { x: number; y: number } {
    const box = source.getBoundingClientRect()
    return {
      x: box.left + box.width / 2 - dockX,
      y: box.top + box.height / 2 - dockY,
    }
  }

  function measureSourceDocumentBottom(): void {
    // Measure only on actual layout changes, NOT on scrollend. During
    // Safari rubber-banding viewport rects can temporarily disagree with Y.
    const rect = source.getBoundingClientRect()
    sourceDocumentBottom = rect.bottom + clampedScrollY()
  }

  function desiredDestination(): Destination {
    const y = clampedScrollY()
    // Hysteresis prevents repeated reversals from momentum jitter.
    if (destination === 'header' && y >= sourceDocumentBottom - EXIT_BOTTOM_PX) return 'dock'
    if (destination === 'dock' && y <= sourceDocumentBottom - RETURN_BOTTOM_PX) return 'header'
    return destination
  }

  function paint(): void {
    floating.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`
    const proximity = 1 - Math.min(1, Math.hypot(offsetX, offsetY) / transitionDistance)
    floating.style.setProperty('--float-progress', String(Math.max(0, proximity)))
  }

  function claimVisualOwnership(): void {
    const point = headerOffset()
    offsetX = point.x
    offsetY = point.y
    transitionDistance = Math.max(1, Math.hypot(offsetX, offsetY))
    paint()

    // Both copies coincide at the handoff: no flicker, blank frame or
    // visible duplicate. The original stays in the document flow.
    floating.style.opacity = '1'
    source.style.opacity = '0'
    floating.style.pointerEvents = 'none'
    floating.tabIndex = -1
    floating.setAttribute('aria-hidden', 'true')
  }

  function finish(): void {
    animationFrame = 0
    lastFrameTime = 0
    if (destination === 'dock') {
      phase = 'dock'
      offsetX = 0
      offsetY = 0
      floating.style.transform = 'none'
      floating.style.setProperty('--float-progress', '1')
      floating.style.pointerEvents = 'auto'
      floating.tabIndex = 0
      floating.setAttribute('aria-hidden', 'false')
      onDockedChange(true)
    } else {
      phase = 'header'
      // Return visual ownership only when the flying copy has reached the
      // live position of the real SVG, which follows scrolling naturally.
      source.style.opacity = ''
      floating.style.opacity = ''
      floating.style.transform = 'none'
      floating.style.pointerEvents = 'none'
      floating.tabIndex = -1
      floating.setAttribute('aria-hidden', 'true')
      onDockedChange(false)
    }
  }

  function animateFrame(time: number): void {
    animationFrame = 0
    if (disposed || phase !== 'moving') return
    if (reconcile()) return // retargeted from current coordinates

    // Only the *position* of the returning target uses a live viewport rect.
    // Destination selection uses stable document coordinates instead.
    const target = destination === 'dock' ? { x: 0, y: 0 } : headerOffset()
    const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 80) : 16
    lastFrameTime = time
    const alpha = 1 - Math.exp(-Math.max(1, elapsed) / EASING_TIME_MS)
    offsetX += (target.x - offsetX) * alpha
    offsetY += (target.y - offsetY) * alpha
    paint()

    if (Math.hypot(target.x - offsetX, target.y - offsetY) < FINISH_DISTANCE_PX) {
      offsetX = target.x
      offsetY = target.y
      paint()
      if (!reconcile()) finish()
    } else {
      animationFrame = window.requestAnimationFrame(animateFrame)
    }
  }

  function moveTo(next: Destination, instant = false): void {
    if (destination === next && !instant) return
    destination = next
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
    lastFrameTime = 0

    if (phase === 'header' && next === 'dock') claimVisualOwnership()
    if (phase === 'dock' && next === 'header') {
      floating.style.pointerEvents = 'none'
      floating.tabIndex = -1
      floating.setAttribute('aria-hidden', 'true')
    }
    onDockedChange(false)

    if (instant || reduced.matches) {
      if (next === 'dock') {
        source.style.opacity = '0'
        floating.style.opacity = '1'
        offsetX = 0
        offsetY = 0
      } else {
        const target = headerOffset()
        offsetX = target.x
        offsetY = target.y
      }
      paint()
      finish()
      return
    }

    phase = 'moving'
    animationFrame = window.requestAnimationFrame(animateFrame)
  }

  function reconcile(): boolean {
    const next = desiredDestination()
    if (next === destination) return false
    const rect = source.getBoundingClientRect()
    // Large restoration/jump: do not try to launch from an offscreen source.
    const jumpedPastSource = phase === 'header' && next === 'dock' && rect.bottom < -rect.height
    moveTo(next, jumpedPastSource)
    return true
  }

  function reconcileSettled(): void {
    if (disposed) return
    // No source re-measurement here: it could capture an overscroll artifact.
    // In particular, a missing/coalesced scroll event cannot strand the icon.
    reconcile()
    if (phase === 'dock') finish()
  }

  function onScroll(): void {
    if (disposed) return
    reconcile()
    window.clearTimeout(idleTimer)
    // Fallback for browsers without scrollend and for occasionally lost events.
    if (!touching) idleTimer = window.setTimeout(reconcileSettled, SCROLL_IDLE_MS)
  }

  function onTouchStart(): void {
    touching = true
    window.clearTimeout(idleTimer)
  }

  function onTouchEnd(): void {
    touching = false
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(reconcileSettled, SCROLL_IDLE_MS)
  }

  function onResize(): void {
    const previousX = dockX
    const previousY = dockY
    measureDockCenter()
    if (phase === 'moving') {
      // Compensate for Safari toolbar/viewport movement without jumping.
      offsetX += previousX - dockX
      offsetY += previousY - dockY
      transitionDistance = Math.max(1, Math.hypot(offsetX, offsetY))
      paint()
    } else if (phase === 'dock') {
      floating.style.transform = 'none'
    }
    if (window.innerWidth !== layoutViewportWidth) {
      layoutViewportWidth = window.innerWidth
      scheduleLayout()
    } else {
      // Toolbar height changes are not document-layout changes.
      reconcile()
    }
  }

  function scheduleLayout(): void {
    if (layoutFrame) return
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = 0
      if (disposed) return
      measureSourceDocumentBottom()
      reconcile()
    })
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden' && phase === 'moving') {
      // Background RAF may freeze for minutes; leave no half-finished icon.
      moveTo(destination, true)
    } else if (document.visibilityState === 'visible') {
      reconcileSettled()
    }
  }

  function onReducedMotionChange(): void {
    if (phase === 'moving') moveTo(destination, true)
  }

  measureDockCenter()
  measureSourceDocumentBottom()
  // Browser restoration may happen before Vue hydration.
  if (desiredDestination() === 'dock') moveTo('dock', true)

  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('scrollend', reconcileSettled, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.visualViewport?.addEventListener('resize', onResize)
  window.addEventListener('pageshow', reconcileSettled)
  document.addEventListener('visibilitychange', onVisibilityChange)
  reduced.addEventListener('change', onReducedMotionChange)
  if (typeof ResizeObserver !== 'undefined') {
    layoutObserver = new ResizeObserver(scheduleLayout)
    layoutObserver.observe(source.parentElement ?? source)
    const header = source.closest('header')
    if (header) layoutObserver.observe(header)
  }

  return () => {
    disposed = true
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    if (layoutFrame) window.cancelAnimationFrame(layoutFrame)
    window.clearTimeout(idleTimer)
    layoutObserver?.disconnect()
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('scrollend', reconcileSettled)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchEnd)
    window.removeEventListener('resize', onResize)
    window.visualViewport?.removeEventListener('resize', onResize)
    window.removeEventListener('pageshow', reconcileSettled)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    reduced.removeEventListener('change', onReducedMotionChange)
    source.style.opacity = ''
    floating.style.opacity = ''
    floating.style.transform = ''
    floating.style.pointerEvents = ''
    floating.style.removeProperty('--float-progress')
  }
}
