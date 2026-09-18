import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  systemResolvedTheme,
} from '@/shared/theme/theme-preference'

/**
 * Shell theme preference (non-sensitive, allowed to persist locally —
 * MASTER_FRONTEND_PLAN §7, P1-04).
 *
 * A thin Pinia adapter over the shared theme mechanics in
 * `src/shared/theme/theme-preference.ts` (which the public portfolio also
 * uses, without importing this store).
 *
 * `system` removes the explicit `<html data-theme>` override so the CSS
 * `prefers-color-scheme` rule applies; `light`/`dark` set an explicit override.
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(readStoredThemePreference())
  const resolved = ref<ResolvedTheme>(resolveTheme(preference.value))

  function apply(): void {
    applyThemePreference(preference.value)
  }

  function setPreference(next: ThemePreference): void {
    preference.value = next
    persistThemePreference(next)
    apply()
    resolved.value = next === 'system' ? systemResolvedTheme() : next
  }

  function initialize(): void {
    apply()
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (preference.value === 'system') {
          resolved.value = systemResolvedTheme()
        }
      })
    }
  }

  return { preference, resolved, setPreference, initialize }
})
