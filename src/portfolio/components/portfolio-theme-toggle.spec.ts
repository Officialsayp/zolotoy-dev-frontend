import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import PortfolioThemeToggle from './portfolio-theme-toggle.vue'

describe('portfolio theme toggle (SSR/hydration semantics)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders deterministically for the system preference (hydration-safe first render)', () => {
    // Dark OS: the initial render must match the server markup ('light'),
    // never resolve matchMedia during hydration.
    window.matchMedia = window.matchMedia
      ?? ((query: string) => ({ matches: query.includes('dark'), media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList))
    const wrapper = mount(PortfolioThemeToggle)
    expect(wrapper.text()).toContain('Theme: System')
    // The deterministic label is corrected after mount; no mismatch is thrown.
    expect(wrapper.find('button').exists()).toBe(true)
    wrapper.unmount()
  })

  it('updates the System (Light/Dark) label live and cleans up media listeners', async () => {
    let osDark = false
    const listeners = new Set<() => void>()
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return osDark },
      addEventListener: (_event: string, callback: () => void) => { listeners.add(callback) },
      removeEventListener: (_event: string, callback: () => void) => { listeners.delete(callback) },
    }))

    const wrapper = mount(PortfolioThemeToggle)
    expect(wrapper.attributes('title')).toBe('Theme: System (Light)')
    expect(listeners.size).toBe(1)
    osDark = true
    for (const listener of listeners) listener()
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('title')).toBe('Theme: System (Dark)')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBeNull()
    wrapper.unmount()
    expect(listeners.size).toBe(0)
  })

  it('applies the stored theme preference on mount', async () => {
    localStorage.setItem('zolotoy.dev:theme', 'dark')
    const wrapper = mount(PortfolioThemeToggle)
    await wrapper.vm.$nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    wrapper.unmount()
  })

  it('cycles system -> light -> dark and persists', async () => {
    const wrapper = mount(PortfolioThemeToggle)
    await wrapper.find('button').trigger('click')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    await wrapper.find('button').trigger('click')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    wrapper.unmount()
  })
})
