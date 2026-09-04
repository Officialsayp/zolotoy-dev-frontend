import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppButton from './app-button.vue'

describe('AppButton', () => {
  it('renders slot content and default type/variant', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Save' } })
    const button = wrapper.get('button')
    expect(button.text()).toBe('Save')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toContain('app-button--primary')
  })

  it('is disabled and reports busy while loading', () => {
    const wrapper = mount(AppButton, { props: { loading: true }, slots: { default: 'Save' } })
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })

  it('emits click on user interaction', async () => {
    const wrapper = mount(AppButton, { slots: { default: 'Go' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(AppButton, { props: { disabled: true }, slots: { default: 'Go' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('exposes focus on the underlying native button', () => {
    const wrapper = mount(AppButton, {
      attachTo: document.body,
      slots: { default: 'Focus me' },
    })

    const instance = wrapper.vm as unknown as { focus: (options?: FocusOptions) => void }
    instance.focus()

    expect(document.activeElement).toBe(wrapper.get('button').element)
    wrapper.unmount()
  })
})
