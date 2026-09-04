import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { orderApi } from '../api/order-api'
import type { OrderListQuery } from '../models/order-dto'
import { orderKeys } from './order-query-keys'

/**
 * Cursor-paginated orders list (source §12 keyset pagination).
 *
 * The input stays reactive so changing an opaque cursor on the page updates the
 * TanStack Query key and request without recreating the component.
 */
export function useOrdersListQuery(query: MaybeRefOrGetter<OrderListQuery>) {
  const resolvedQuery = computed(() => toValue(query))

  return useQuery({
    queryKey: computed(() =>
      orderKeys.list(resolvedQuery.value.cursor ?? undefined, resolvedQuery.value.limit),
    ),
    queryFn: () => orderApi.listOrders(resolvedQuery.value),
  })
}

/**
 * Single order detail (aggregate read).
 *
 * Accepting a ref/computed keeps the query bound to Vue Router param changes
 * when the same route component instance is reused for another order id.
 */
export function useOrderDetailQuery(orderId: MaybeRefOrGetter<string>) {
  const resolvedOrderId = computed(() => toValue(orderId))

  return useQuery({
    queryKey: computed(() => orderKeys.detail(resolvedOrderId.value)),
    queryFn: () => orderApi.getOrder(resolvedOrderId.value),
    enabled: computed(() => Boolean(resolvedOrderId.value)),
  })
}

/** Order lifecycle history timeline (source `GET .../history`). */
export function useOrderHistoryQuery(orderId: MaybeRefOrGetter<string>) {
  const resolvedOrderId = computed(() => toValue(orderId))

  return useQuery({
    queryKey: computed(() => orderKeys.history(resolvedOrderId.value)),
    queryFn: () => orderApi.getOrderHistory(resolvedOrderId.value),
    enabled: computed(() => Boolean(resolvedOrderId.value)),
  })
}
