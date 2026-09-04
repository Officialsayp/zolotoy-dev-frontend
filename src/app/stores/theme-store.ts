import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Shell-only theme preference (non-sensitive, allowed to persist locally —
 * MASTER_FRONTEND_PLAN §7, P1-04).
 *
 * `system` removes the explicit `<html data-theme>` override so the CSS
 * `prefers-color-scheme` rule applies; `light`/`dark` set an explicit override.
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'zolotoy.dev:theme'

const VALID_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value && VALID_PREFERENCES.includes(value as ThemePreference)) {
      return value as ThemePreference
    }
  } catch {
    // storage unavailable (e.g. disabled); fall through to system
  }
  return 'system'
}

function systemResolvedTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(readStoredPreference())
  const resolved = ref<ResolvedTheme>(
    preference.value === 'system' ? systemResolvedTheme() : preference.value,
  )

  function apply(): void {
    const root = document.documentElement
    if (preference.value === 'system') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = preference.value
    }
  }

  function setPreference(next: ThemePreference): void {
    if (!VALID_PREFERENCES.includes(next)) return
    preference.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // non-fatal
    }
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
