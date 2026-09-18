/**
 * Browser theme preference mechanics shared by the demo theme store (Pinia
 * adapter) and the public portfolio theme control. Deliberately framework- and
 * Pinia-free so the public bundle never pulls the demo store.
 *
 * Semantics preserved from the existing demo behavior:
 *  - localStorage key `zolotoy.dev:theme`;
 *  - `system` removes the `<html data-theme>` override so the CSS
 *    `prefers-color-scheme` rule applies; `light`/`dark` set it explicitly;
 *  - safe fallback when localStorage is unavailable.
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'zolotoy.dev:theme'

const VALID_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

export function readStoredThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value && VALID_PREFERENCES.includes(value as ThemePreference)) {
      return value as ThemePreference
    }
  } catch {
    // storage unavailable (e.g. disabled); fall through to system
  }
  return 'system'
}

export function systemResolvedTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemResolvedTheme() : preference
}

/** Apply a preference to `<html data-theme>` (no-op on the server). */
export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (preference === 'system') {
    delete root.dataset.theme
  } else {
    root.dataset.theme = preference
  }
}

export function persistThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // non-fatal
  }
}

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && VALID_PREFERENCES.includes(value as ThemePreference)
}
