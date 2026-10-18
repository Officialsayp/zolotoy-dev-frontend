import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  getOrderHistory: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: queryMocks.useQuery,
}))

vi.mock('../api/order-api', () => ({
  orderApi: {
    listOrders: queryMocks.listOrders,
    getOrder: queryMocks.getOrder,
    getOrderHistory: queryMocks.getOrderHistory,
  },
}))

import {
  useOrderDetailQuery,
  useOrderHistoryQuery,
  useOrdersListQuery,
} from './use-order-queries'

/** `.at(n)` needs the ES2022 lib, which the app tsconfig does not include. */
function keyTail(key: readonly unknown[], fromEnd: number): unknown {
  return key[key.length - fromEnd]
}

describe('Order query composable reactivity', () => {
  beforeEach(() => {
    queryMocks.useQuery.mockClear()
    queryMocks.listOrders.mockReset()
    queryMocks.getOrder.mockReset()
    queryMocks.getOrderHistory.mockReset()
  })

  it('updates the list query key and request when the cursor changes', async () => {
    const input = ref({ cursor: undefined as string | undefined, limit: 5 })
    const options = useOrdersListQuery(input) as unknown as {
      queryKey: { value: readonly unknown[] }
      queryFn: () => Promise<unknown>
    }

    expect(keyTail(options.queryKey.value, 2)).toBeNull()

    input.value = { cursor: 'cursor-2', limit: 5 }
    expect(keyTail(options.queryKey.value, 2)).toBe('cursor-2')

    queryMocks.listOrders.mockResolvedValue({ items: [], has_more: false, next_cursor: null })
    await options.queryFn()

    expect(queryMocks.listOrders).toHaveBeenCalledWith({
      cursor: 'cursor-2',
      limit: 5,
    })
  })

  it('keeps detail and history queries bound to a changing route id', async () => {
    const orderId = ref('order-1')

    const detail = useOrderDetailQuery(orderId) as unknown as {
      queryKey: { value: readonly unknown[] }
      queryFn: () => Promise<unknown>
    }
    const history = useOrderHistoryQuery(orderId) as unknown as {
      queryKey: { value: readonly unknown[] }
      queryFn: () => Promise<unknown>
    }

    orderId.value = 'order-2'

    expect(keyTail(detail.queryKey.value, 1)).toBe('order-2')
    expect(keyTail(history.queryKey.value, 1)).toBe('order-2')

    queryMocks.getOrder.mockResolvedValue({})
    queryMocks.getOrderHistory.mockResolvedValue([])

    await detail.queryFn()
    await history.queryFn()

    expect(queryMocks.getOrder).toHaveBeenCalledWith('order-2')
    expect(queryMocks.getOrderHistory).toHaveBeenCalledWith('order-2')
  })
})
