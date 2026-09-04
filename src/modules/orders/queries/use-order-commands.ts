import { useMutation, useQueryClient, type QueryClient } from '@tanstack/vue-query'

import { orderApi } from '../api/order-api'
import type { CreateOrderRequestDto } from '../models/order-dto'
import { orderKeys } from './order-query-keys'

/** Invalidate only the query families affected by a change to one order. */
export function refreshOrder(queryClient: QueryClient, orderId: string): void {
  void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
  void queryClient.invalidateQueries({ queryKey: orderKeys.history(orderId) })
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
}

/**
 * Order command mutations (TanStack Query v5-style: `mutationFn` only, with
 * invalidation handled by the caller via `mutateAsync().then(...)` so it can
 * coordinate idempotency and conflict UX). Components call these through
 * `use-order-actions.ts`, never directly.
 */
export function useOrderCommands() {
  const queryClient = useQueryClient()

  const createOrder = useMutation({
    mutationFn: (vars: { body: CreateOrderRequestDto; idempotencyKey: string }) =>
      orderApi.createOrder(vars.body, vars.idempotencyKey),
  })

  const payOrder = useMutation({
    mutationFn: (vars: { orderId: string; idempotencyKey: string }) =>
      orderApi.payOrder(vars.orderId, vars.idempotencyKey),
  })

  const confirmOrder = useMutation({
    mutationFn: (vars: { orderId: string }) => orderApi.confirmOrder(vars.orderId),
  })

  const requestCancellation = useMutation({
    mutationFn: (vars: { orderId: string }) => orderApi.requestCancellation(vars.orderId),
  })

  const cancelOrder = useMutation({
    mutationFn: (vars: { orderId: string; idempotencyKey: string }) =>
      orderApi.cancelOrder(vars.orderId, vars.idempotencyKey),
  })

  const completeOrder = useMutation({
    mutationFn: (vars: { orderId: string }) => orderApi.completeOrder(vars.orderId),
  })

  return {
    queryClient,
    refreshOrder,
    createOrder,
    payOrder,
    confirmOrder,
    requestCancellation,
    cancelOrder,
    completeOrder,
  }
}
