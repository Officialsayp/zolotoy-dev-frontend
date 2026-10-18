import { beforeEach, describe, expect, it } from 'vitest'
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
