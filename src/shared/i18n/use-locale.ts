/**
 * Demo SPA locale state: a narrow Pinia store + router binding.
 *
 * Resolution order: persisted explicit preference → valid entry `?lang=`
 * (only when no preference) → browser's primary language → English.
 * Switching keeps the current route, other query
 * params and the hash intact. The store is intentionally independent from
 * the theme store; each changes only its own state.
 *
 * The current locale is a Vue `ref`: components derive localized UI from
 * `store.get()` inside computeds, so an in-place switch (router binding with
 * the same route component) must be reactive to re-render the text without a
 * reload.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Router } from 'vue-router'

import {
  DEFAULT_LOCALE,
  browserPreferredLocale,
  readPersistedLocale,
  persistLocalePreference,
  isLocale,
  type Locale,
} from './locale'

export const useLocaleStore = defineStore('locale', () => {
  const current = ref<Locale>(DEFAULT_LOCALE)

  function get(): Locale {
    return current.value
  }

  function initialize(initial: Locale = readPersistedLocale() ?? browserPreferredLocale()): void {
    current.value = isLocale(initial) ? initial : DEFAULT_LOCALE
    // Automatic detection is not a manual preference. Persist only in set().
    syncDocumentLang()
  }

  function set(next: Locale): void {
    if (!isLocale(next)) return
    current.value = next
    persistLocalePreference(current.value)
    syncDocumentLang()
  }

  function syncDocumentLang(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = current.value
    }
  }

  return { get, initialize, set, syncDocumentLang }
})

/**
 * Router binding: a query can supply an initial language only before the user
 * has a saved choice. A stale ?lang= on a history entry cannot reverse a later
 * manual choice. The switcher writes the preference directly before navigation.
 */
export function bindLocaleToRouter(
  setLocale: (next: Locale) => void,
  getLocale: () => Locale,
  router: Router,
): void {
  router.beforeEach((to) => {
    const fromQuery = localeFromQuery(to.query.lang)
    if (fromQuery !== null && readPersistedLocale() === null && fromQuery !== getLocale()) {
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
