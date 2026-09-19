import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppSidebar from './app-sidebar.vue'

describe('AppSidebar portfolio link', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it.each(['/', '/auth/login', '/shortener/'])('uses a document link outside the demo router from %s', async (path) => {
    const router = createRouter({
      history: createMemoryHistory('/demo/'),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(AppSidebar, { global: { plugins: [router], stubs: { RouterLink: false } } })
    const brand = wrapper.get('.app-sidebar__brand')
    expect(brand.element.tagName).toBe('A')
    expect(brand.attributes('href')).toBe('/')
    expect(brand.attributes('aria-label')).toBe('zolotoy.dev — Portfolio home')
    expect(brand.text()).toBe('zolotoy.dev')
    expect(brand.find('svg').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'RouterLink' }).some((link) => link.classes().includes('app-sidebar__brand'))).toBe(false)
    wrapper.unmount()
  })
})
