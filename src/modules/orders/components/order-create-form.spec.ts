import { defineComponent, h, onMounted } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  push: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../queries/use-order-commands', () => ({
  useOrderCommands: () => ({
    createOrder: {
      mutateAsync: mocks.createOrder,
    },
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

vi.mock('@/shared/ui/toast-store', () => ({
  useToastStore: () => ({
    push: mocks.toastPush,
  }),
}))

import OrderCreateForm from './order-create-form.vue'

const ValidItemsEditor = defineComponent({
  name: 'OrderItemsEditor',
  props: {
    items: {
      type: Array,
      required: true,
    },
  },
  emits: ['update:items'],
  setup(_props, { emit }) {
    onMounted(() => {
      emit('update:items', [
        {
          key: 1,
          product_id: '20000000-0000-4000-8000-0000000000b1',
          name: 'Mechanical Keyboard',
          quantity: 1,
          unit_price: 4990,
          currency: 'RUB',
        },
      ])
    })
    return () => h('div', { 'data-testid': 'items-editor-stub' })
  },
})

describe('OrderCreateForm idempotency retry', () => {
  beforeEach(() => {
    mocks.createOrder.mockReset()
    mocks.push.mockReset()
    mocks.toastPush.mockReset()
  })

  it('reuses the same Idempotency-Key after a timeout with an unchanged payload', async () => {
    mocks.createOrder
      .mockRejectedValueOnce({ kind: 'timeout', message: 'Request timed out.' })
      .mockResolvedValueOnce({ id: '90000000-0000-4000-8000-000000000001' })

    const wrapper = mount(OrderCreateForm, {
      global: {
        stubs: {
          OrderItemsEditor: ValidItemsEditor,
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="order-buyer"]').setValue(
      '11111111-1111-4111-8111-111111111111',
    )
    await wrapper.get('[data-testid="order-address"]').setValue('Moscow, Test st 1')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.createOrder).toHaveBeenCalledTimes(1)
    const firstKey = mocks.createOrder.mock.calls[0][0].idempotencyKey
    expect(firstKey).toBeTruthy()
    expect(wrapper.text()).toContain('Retry (same idempotency key)')

    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Retry (same idempotency key)'))
    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await flushPromises()

    expect(mocks.createOrder).toHaveBeenCalledTimes(2)
    const secondKey = mocks.createOrder.mock.calls[1][0].idempotencyKey
    expect(secondKey).toBe(firstKey)
  })
})
