<script setup lang="ts">
/**
 * Public portfolio shell: semantic header/nav/main/footer, usable without
 * JavaScript. Public navigation is ordinary anchors (full document
 * navigation) — there is no second Vue Router here. The language switcher
 * navigates to the equivalent document in the other locale.
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { serviceCaseStudyUrl } from '@/content/service-registry'
import { AUTHOR_SITE_URL, publicPathFor } from '@/shared/routing/site-routes'
import { tr } from '@/portfolio/i18n'
import PortfolioLocaleSwitcher from '@/portfolio/components/portfolio-locale-switcher.vue'
import PortfolioThemeToggle from '@/portfolio/components/portfolio-theme-toggle.vue'

const props = defineProps<{
  /** Canonical path of the current document ('/', '/architecture/', ...). */
  currentPath: string
  locale?: 'en' | 'ru'
}>()

const locale = computed(() => props.locale ?? 'en')

const services = [
  { id: 'order', label: { en: 'Order', ru: 'Заказы' } },
  { id: 'auth', label: { en: 'Auth', ru: 'Аутентификация' } },
  { id: 'notification', label: { en: 'Notification', ru: 'Уведомления' } },
  { id: 'shortener', label: { en: 'URL Shortener', ru: 'Сокращатель' } },
] as const

const nav = computed(() => ({
  home: tr({ en: 'Home', ru: 'Главная' }, locale.value),
  architecture: tr({ en: 'Architecture', ru: 'Архитектура' }, locale.value),
  demo: tr({ en: 'Demo', ru: 'Демо' }, locale.value),
  author: tr({ en: 'Author', ru: 'Автор' }, locale.value),
  ariaLabel: tr({ en: 'Portfolio', ru: 'Портфолио' }, locale.value),
  skip: tr({ en: 'Skip to main content', ru: 'Перейти к основному содержимому' }, locale.value),
  brandAria: tr(
    { en: 'zolotoy.dev — portfolio home', ru: 'zolotoy.dev — главная портфолио' },
    locale.value,
  ),
}))

const footer = computed(() => ({
  tagline: tr(
    { en: 'zolotoy.dev — Go backend engineering portfolio', ru: 'zolotoy.dev — портфолио Go-бэкенд-инженера' },
    locale.value,
  ),
  backendSource: tr({ en: 'Backend source', ru: 'Исходники бэкенда' }, locale.value),
}))

const isRu = computed(() => locale.value === 'ru')

// One visible glyph moves between the header logo and the fixed icon dock.
// Keep the original SVG for SSR/no-JS; after hydration its dimensions remain
// as the source coordinate while the fixed SVG takes over visually.
const headerElement = ref<HTMLElement | null>(null)
const sourceGlyph = ref<SVGSVGElement | null>(null)
const floatingGlyph = ref<HTMLAnchorElement | null>(null)
const motionMounted = ref(false)
const motionReady = ref(false)
const logoDocked = ref(false)

const MORPH_SCROLL_DISTANCE = 160
let originOffsetX = 0
let originOffsetY = 0
let frame = 0
let needsMeasure = false
let reduceMotion: MediaQueryList | undefined

function measureLogo(): void {
  const source = sourceGlyph.value
  const dock = floatingGlyph.value
  if (!source || !dock) return

  // Measure the final fixed dock without the previous frame's translation.
  dock.style.transform = 'none'
  const from = source.getBoundingClientRect()
  const to = dock.getBoundingClientRect()
  originOffsetX = from.left + from.width / 2 - (to.left + to.width / 2)
  originOffsetY = from.top + window.scrollY + from.height / 2 - (to.top + to.height / 2)
}

function updateLogo(): void {
  const dock = floatingGlyph.value
  if (!dock) return
  const fraction = Math.min(1, Math.max(0, window.scrollY) / MORPH_SCROLL_DISTANCE)
  // A direct jump respects reduced-motion; normal scrolling drives the morph.
  const progress = reduceMotion?.matches ? (fraction >= 1 ? 1 : 0) :
    fraction * fraction * (3 - 2 * fraction)

  dock.style.transform = `translate3d(${(1 - progress) * originOffsetX}px, ${(1 - progress) * originOffsetY}px, 0)`
  dock.style.setProperty('--float-progress', String(progress))
  const shouldDock = fraction >= 1
  if (logoDocked.value !== shouldDock) logoDocked.value = shouldDock
}

function schedulePosition(): void {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    if (needsMeasure) {
      needsMeasure = false
      measureLogo()
    }
    updateLogo()
  })
}

function scheduleMeasure(): void {
  needsMeasure = true
  schedulePosition()
}

function returnToNavigation(): void {
  headerElement.value?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: reduceMotion?.matches ? 'instant' : 'smooth' })
}

onMounted(async () => {
  // The overlay is client-only, so prerendered markup and hydration match.
  motionMounted.value = true
  await nextTick()
  if (!sourceGlyph.value || !floatingGlyph.value) return
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  measureLogo()
  updateLogo()
  motionReady.value = true
  window.addEventListener('scroll', schedulePosition, { passive: true })
  window.addEventListener('resize', scheduleMeasure, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleMeasure)
  reduceMotion.addEventListener('change', schedulePosition)
})

onUnmounted(() => {
  if (frame) window.cancelAnimationFrame(frame)
  window.removeEventListener('scroll', schedulePosition)
  window.removeEventListener('resize', scheduleMeasure)
  window.visualViewport?.removeEventListener('resize', scheduleMeasure)
  reduceMotion?.removeEventListener('change', schedulePosition)
})

function serviceHref(id: 'order' | 'auth' | 'notification' | 'shortener'): string {
  const en = serviceCaseStudyUrl(id)
  return isRu.value ? '/ru' + en : en
}

function serviceCurrent(id: 'order' | 'auth' | 'notification' | 'shortener'): boolean {
  return props.currentPath === serviceHref(id)
}
</script>

<template>
  <div class="portfolio">
    <a class="portfolio__skip-link" href="#main-content">{{ nav.skip }}</a>

    <a
      v-if="motionMounted"
      ref="floatingGlyph"
      class="portfolio__floating-brand"
      :class="{ 'portfolio__floating-brand--ready': motionReady, 'portfolio__floating-brand--docked': logoDocked }"
      href="#portfolio-header"
      :tabindex="logoDocked ? 0 : -1"
      :aria-hidden="!logoDocked"
      :aria-label="tr({ en: 'Back to portfolio navigation', ru: 'Вернуться к навигации портфолио' }, locale)"
      @click.prevent="returnToNavigation"
    >
      <svg viewBox="0 0 1024 1024" aria-hidden="true">
        <path fill="currentColor" d="m 672.4,130.42 c 56.76329,-6.38169 114.93893,23.3205 143.66,72.55 24.7532,44.51243 43.11022,92.2969 61.33,139.79 40.47809,111.57482 74.44289,227.08462 83.39,345.84 3.99187,44.64405 -4.00131,91.90701 -30.17,129.25 -34.22823,51.15534 -96.88829,80.43706 -158.08,76.16 -65.28191,-0.20566 -122.44364,-36.95943 -172.66,-75.06 -29.80113,-21.1118 -55.76914,-47.83868 -88.02,-65.27 -37.1943,-17.42617 -81.28549,-5.84133 -112.39,18.66 -47.69117,31.39849 -92.05098,67.43326 -138.03,101.11 -42.44103,27.81416 -101.51738,26.57093 -141.77,-4.74 -46.576445,-33.45195 -68.670533,-101.8275 -40,-153.73 23.21529,-41.55088 62.88534,-72.59629 108.24,-86.75 113.13424,-43.47682 226.71305,-85.88549 339.51,-130.18 14.82036,-6.43752 8.66067,-30.49279 -7.52,-28.35 -129.83943,-0.30295 -259.73631,0.55616 -389.54,-0.43 -36.193632,-1.7293 -66.727809,-33.24856 -68.06,-69.29 -1.106386,-32.02682 21.500955,-57.48376 34.11,-85.22 21.96273,-39.71643 41.91012,-80.65977 66.1,-119.08 32.5121,-48.07805 94.7686,-72.14669 151.45,-60.86 47.15984,8.26016 85.2391,43.82881 104.98,86.33 11.06377,24.16746 25.30898,52.15623 54.26,57.34 32.44615,7.58399 61.05887,-17.52199 74.14,-45.03 16.12049,-32.13564 35.32251,-64.94553 67.48,-83.37 17.54732,-10.66503 37.14009,-17.50491 57.59,-19.67 z" />
      </svg>
    </a>

    <header id="portfolio-header" ref="headerElement" class="portfolio__header" tabindex="-1">
      <div class="portfolio__header-inner">
        <a
          class="portfolio__brand"
          :class="{ 'portfolio__brand--motion-ready': motionReady }"
          :href="publicPathFor('home', locale)"
          :aria-label="nav.brandAria"
        >
          <svg ref="sourceGlyph" viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              id="portfolio-brand-glyph"
              fill="currentColor"
              d="m 672.4,130.42 c 56.76329,-6.38169 114.93893,23.3205 143.66,72.55 24.7532,44.51243 43.11022,92.2969 61.33,139.79 40.47809,111.57482 74.44289,227.08462 83.39,345.84 3.99187,44.64405 -4.00131,91.90701 -30.17,129.25 -34.22823,51.15534 -96.88829,80.43706 -158.08,76.16 -65.28191,-0.20566 -122.44364,-36.95943 -172.66,-75.06 -29.80113,-21.1118 -55.76914,-47.83868 -88.02,-65.27 -37.1943,-17.42617 -81.28549,-5.84133 -112.39,18.66 -47.69117,31.39849 -92.05098,67.43326 -138.03,101.11 -42.44103,27.81416 -101.51738,26.57093 -141.77,-4.74 -46.576445,-33.45195 -68.670533,-101.8275 -40,-153.73 23.21529,-41.55088 62.88534,-72.59629 108.24,-86.75 113.13424,-43.47682 226.71305,-85.88549 339.51,-130.18 14.82036,-6.43752 8.66067,-30.49279 -7.52,-28.35 -129.83943,-0.30295 -259.73631,0.55616 -389.54,-0.43 -36.193632,-1.7293 -66.727809,-33.24856 -68.06,-69.29 -1.106386,-32.02682 21.500955,-57.48376 34.11,-85.22 21.96273,-39.71643 41.91012,-80.65977 66.1,-119.08 32.5121,-48.07805 94.7686,-72.14669 151.45,-60.86 47.15984,8.26016 85.2391,43.82881 104.98,86.33 11.06377,24.16746 25.30898,52.15623 54.26,57.34 32.44615,7.58399 61.05887,-17.52199 74.14,-45.03 16.12049,-32.13564 35.32251,-64.94553 67.48,-83.37 17.54732,-10.66503 37.14009,-17.50491 57.59,-19.67 z"
            />
          </svg>
          <span>zolotoy.dev</span>
        </a>

        <nav class="portfolio__nav" :aria-label="nav.ariaLabel">
          <a :href="publicPathFor('home', locale)" :aria-current="currentPath === publicPathFor('home', locale) ? 'page' : undefined">{{ nav.home }}</a>
          <a :href="publicPathFor('architecture', locale)" :aria-current="currentPath === publicPathFor('architecture', locale) ? 'page' : undefined">{{ nav.architecture }}</a>
          <a
            v-for="service in services"
            :key="service.id"
            :href="serviceHref(service.id)"
            :aria-current="serviceCurrent(service.id) ? 'page' : undefined"
          >
            {{ tr(service.label, locale) }}
          </a>
          <a :href="locale === 'ru' ? '/demo/?lang=ru' : '/demo/'">{{ nav.demo }}</a>
          <a :href="AUTHOR_SITE_URL" rel="noopener noreferrer">{{ nav.author }}</a>
        </nav>

        <div class="portfolio__controls">
          <PortfolioLocaleSwitcher :locale="locale" :current-path="currentPath" />
          <PortfolioThemeToggle :locale="locale" />
        </div>
      </div>
    </header>

    <main id="main-content" class="portfolio__main" tabindex="-1">
      <slot />
    </main>

    <footer class="portfolio__footer">
      <div class="portfolio__footer-inner">
        <span>{{ footer.tagline }}</span>
        <span>
          <a href="https://github.com/Officialsayp/zolotoy-dev-backend" rel="noopener noreferrer">{{ footer.backendSource }}</a>
          <span aria-hidden="true"> · </span>
          <a :href="AUTHOR_SITE_URL" rel="noopener noreferrer">maxzolotoy.com</a>
        </span>
      </div>
    </footer>
  </div>
</template>
