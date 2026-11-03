/**
 * Two-position, scroll-triggered logo handoff.
 *
 * The header SVG remains visible when at rest in the header. A fixed copy
 * becomes visible only during an autonomous transition or when docked.
 * Unlike scroll-driven animations, transitions finish after scrolling stops.
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
  let offsetX = 0
  let offsetY = 0
  let transitionDistance = 1
  let animationFrame = 0
  let lastFrameTime = 0
  let disposed = false

  function measureDockCenter(): void {
    const previousTransform = floating.style.transform
    floating.style.transform = 'none'
    const box = floating.getBoundingClientRect()
    floating.style.transform = previousTransform
    dockX = box.left + box.width / 2
    dockY = box.top + box.height / 2
  }

  function headerOffset(): { x: number; y: number; bottom: number } {
    const box = source.getBoundingClientRect()
    return {
      x: box.left + box.width / 2 - dockX,
      y: box.top + box.height / 2 - dockY,
      bottom: box.bottom,
    }
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
      paint()
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
      floating.style.pointerEvents = 'none'
      floating.tabIndex = -1
      floating.setAttribute('aria-hidden', 'true')
      onDockedChange(false)
    }
  }

  function animateFrame(time: number): void {
    animationFrame = 0
    if (disposed || phase !== 'moving') return

    // The header target can move while the page scrolls. Re-measure only
    // during the short return animation; a docked logo needs no geometry.
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
      finish()
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

  function onScroll(): void {
    const sourceBox = source.getBoundingClientRect()
    if (destination === 'header' && sourceBox.bottom <= EXIT_BOTTOM_PX) {
      // Scroll restoration / large jumps skip flights that start offscreen.
      moveTo('dock', sourceBox.bottom < -sourceBox.height)
    } else if (destination === 'dock' && sourceBox.bottom >= RETURN_BOTTOM_PX) {
      moveTo('header')
    }
  }

  function onResize(): void {
    const previousX = dockX
    const previousY = dockY
    measureDockCenter()
    if (phase === 'moving') {
      // Preserve the current on-screen position if the dock moves during
      // viewport resize, orientation change, or Safari toolbar adjustment.
      offsetX += previousX - dockX
      offsetY += previousY - dockY
      transitionDistance = Math.max(1, Math.hypot(offsetX, offsetY))
      paint()
    } else if (phase === 'dock') {
      offsetX = 0
      offsetY = 0
      paint()
    }
    onScroll()
  }

  function onReducedMotionChange(): void {
    if (phase === 'moving') moveTo(destination, true)
  }

  measureDockCenter()
  // Initial scroll may be restored by the browser before hydration.
  if (headerOffset().bottom <= EXIT_BOTTOM_PX) moveTo('dock', true)

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.visualViewport?.addEventListener('resize', onResize)
  reduced.addEventListener('change', onReducedMotionChange)

  return () => {
    disposed = true
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.visualViewport?.removeEventListener('resize', onResize)
    reduced.removeEventListener('change', onReducedMotionChange)
    source.style.opacity = ''
    floating.style.opacity = ''
    floating.style.transform = ''
    floating.style.pointerEvents = ''
    floating.style.removeProperty('--float-progress')
  }
}
