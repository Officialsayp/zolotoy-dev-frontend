/**
 * Demo SPA locale state: a narrow Pinia store + router binding.
 *
 * Resolution order (see the i18n spec): explicit `?lang=` query → persisted
 * preference → English. Switching keeps the current route, other query
 * params and the hash intact. The store is intentionally independent from
 * the theme store; each changes only its own state.
 */
import { defineStore } from 'pinia'
import type { Router } from 'vue-router'

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from './locale'

function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(value)) return value
  } catch {
    // storage unavailable; fall through to default
  }
  return DEFAULT_LOCALE
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // non-fatal
  }
}

export const useLocaleStore = defineStore('locale', () => {
  let current: Locale = DEFAULT_LOCALE

  function get(): Locale {
    return current
  }

  function initialize(initial: Locale = readStoredLocale()): void {
    current = isLocale(initial) ? initial : DEFAULT_LOCALE
    persistLocale(current)
    syncDocumentLang()
  }

  function set(next: Locale): void {
    if (!isLocale(next)) return
    current = next
    persistLocale(next)
    syncDocumentLang()
  }

  function syncDocumentLang(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = current
    }
  }

  return { get, initialize, set, syncDocumentLang }
})

/**
 * Router binding: apply ?lang= on every navigation. An explicit valid lang
 * param wins; otherwise the persisted preference stays. Returns the afterEach
 * sync so document.lang always matches the active locale.
 */
export function bindLocaleToRouter(
  setLocale: (next: Locale) => void,
  getLocale: () => Locale,
  router: Router,
): void {
  router.beforeEach((to) => {
    const fromQuery = localeFromQuery(to.query.lang)
    if (fromQuery !== null && fromQuery !== getLocale()) {
      setLocale(fromQuery)
    }
    return true
  })
}

/** Read the initial locale from a ?lang= query value (null when invalid/absent). */
export function localeFromQuery(value: unknown): Locale | null {
  return isLocale(value) ? value : null
}

/** Computed-style helper for components: returns the current locale getter. */
export function useDemoLocale() {
  const store = useLocaleStore()
  return {
    locale: () => store.get(),
    setLocale: (next: Locale) => store.set(next),
  }
}
