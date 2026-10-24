import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyThemePreference,
  nextThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
} from './theme-preference'

describe('shared theme policy', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to system without persisting an inferred choice', () => {
    expect(readStoredThemePreference()).toBe('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('cycles identically across public pages and demo', () => {
    expect(nextThemePreference('system')).toBe('light')
    expect(nextThemePreference('light')).toBe('dark')
    expect(nextThemePreference('dark')).toBe('system')
  })

  it('resolves system preference from the operating-system color scheme', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(resolveTheme('system')).toBe('dark')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(resolveTheme('system')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('applies explicit colors and clears the override when returning to system', () => {
    applyThemePreference('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyThemePreference('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyThemePreference('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('persists a manual choice, including return to system', () => {
    persistThemePreference('dark')
    expect(readStoredThemePreference()).toBe('dark')
    persistThemePreference('system')
    expect(readStoredThemePreference()).toBe('system')
  })
})
