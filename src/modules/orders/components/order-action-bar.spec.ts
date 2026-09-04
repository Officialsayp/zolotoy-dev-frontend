import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import OrderActionBar from './order-action-bar.vue'
import type { OrderActionSpec } from '../models/order-action-policy'

const enabled: OrderActionSpec = {
  action: 'PAY',
  label: 'Pay',
  enabled: true,
  requiresConfirmation: false,
}

const blocked: OrderActionSpec = {
  action: 'COMPLETE',
  label: 'Complete',
  enabled: false,
  disabledReason: 'Payment is required before this action.',
  requiresConfirmation: false,
}

describe('OrderActionBar', () => {
  it('renders one button per action and emits run with the action on click', async () => {
    const wrapper = mount(OrderActionBar, {
      props: { actions: [enabled], pendingAction: null },
    })
    expect(wrapper.text()).toContain('Pay')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('run')).toHaveLength(1)
    expect(wrapper.emitted('run')![0]).toEqual(['PAY'])
  })

  it('disables buttons when busy or the action is already pending', () => {
    const wrapper = mount(OrderActionBar, {
      props: { actions: [enabled], pendingAction: 'PAY' },
    })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('disables a blocked action and exposes the reason with the label', () => {
    const wrapper = mount(OrderActionBar, {
      props: { actions: [blocked], pendingAction: null },
    })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Payment is required before this action.')
  })

  it('shows an empty state when no actions are available (no fake/TBD actions)', () => {
    const wrapper = mount(OrderActionBar, {
      props: { actions: [], pendingAction: null },
    })
    expect(wrapper.text()).toContain('No actions available')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
