import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StatusBadge from './status-badge.vue'

describe('StatusBadge', () => {
  it('renders the label and tone class', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Live', tone: 'success' } })
    expect(wrapper.classes()).toContain('status-badge--success')
    expect(wrapper.text()).toContain('Live')
  })

  it('renders a status dot when requested', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Busy', dot: true } })
    expect(wrapper.find('.status-badge__dot').exists()).toBe(true)
  })

  it('carries the label text even without a dot (never color alone)', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Degraded', tone: 'danger' } })
    expect(wrapper.find('.status-badge__label').text()).toBe('Degraded')
  })
})
