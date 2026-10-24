import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ThemeToggle from './theme-toggle.vue'
import { useThemeStore } from '@/app/stores/theme-store'

describe('demo theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    setActivePinia(createPinia())
  })

  it('starts in system mode without creating a stored preference', () => {
    const wrapper = mount(ThemeToggle)
    expect(wrapper.attributes('title')).toContain('Theme: System')
    expect(wrapper.attributes('aria-label')).toContain('Theme: System')
    expect(useThemeStore().preference).toBe('system')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBeNull()
    wrapper.unmount()
  })

  it('cycles System → Light → Dark → System and persists only explicit choices', async () => {
    const wrapper = mount(ThemeToggle, { props: { locale: 'ru' } })
    expect(wrapper.attributes('title')).toContain('Тема: системная')

    await wrapper.get('button').trigger('click')
    expect(useThemeStore().preference).toBe('light')
    expect(wrapper.attributes('title')).toBe('Тема: светлая')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBe('light')

    await wrapper.get('button').trigger('click')
    expect(useThemeStore().preference).toBe('dark')
    expect(wrapper.attributes('title')).toBe('Тема: тёмная')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await wrapper.get('button').trigger('click')
    expect(useThemeStore().preference).toBe('system')
    expect(wrapper.attributes('title')).toContain('Тема: системная')
    expect(localStorage.getItem('zolotoy.dev:theme')).toBe('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    wrapper.unmount()
  })

  it('honors an earlier manual choice from public pages', () => {
    localStorage.setItem('zolotoy.dev:theme', 'dark')
    setActivePinia(createPinia())
    const wrapper = mount(ThemeToggle)
    expect(wrapper.attributes('title')).toBe('Theme: Dark')
    expect(useThemeStore().preference).toBe('dark')
    wrapper.unmount()
  })
})
