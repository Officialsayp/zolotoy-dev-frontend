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

  it('preserves its label and blocks clicks while loading, then becomes interactive again', async () => {
    const wrapper = mount(AppButton, { props: { loading: true }, slots: { default: 'Save' } })
    const button = wrapper.get('button')
    expect(button.text()).toBe('Save')
    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    await wrapper.setProps({ loading: false })
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBeUndefined()
    await button.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    wrapper.unmount()
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
