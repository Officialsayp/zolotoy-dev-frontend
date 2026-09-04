import { computed, ref, type ComputedRef } from 'vue'

import type { AppError } from '@/shared/api/api-error'

import type { OrderDto } from '../models/order-dto'
import {
  getOrderActions,
  type OrderAction,
  type OrderActionSpec,
} from '../models/order-action-policy'
import { isIdempotencyConflict, isVersionConflict } from '../models/order-error'
import type { OrderRole } from '../models/order-types'
import { useOrderCommands } from './use-order-commands'
import { useIdempotency } from './use-idempotency'

/**
 * Detail-page orchestration: derives the centralized action policy result for
 * the current order + role, and executes the selected action with the correct
 * idempotency lifecycle, targeted invalidation and dedicated concurrency /
 * idempotency conflict UX (MASTER_FRONTEND_PLAN §14.6, §14.7).
 *
 * Unknown-outcome failures (network/timeout) leave the idempotency key
 * unresolved so the SAME key + payload can be retried; definitive responses
 * (success or any domain/idempotency/concurrency error) resolve the attempt so
 * the next logical attempt gets a fresh key.
 */

interface DispatchRecord {
  action: OrderAction
  key: string
  payload: unknown
}

interface OrderCommandMutation {
  isPending: { value: boolean }
  mutateAsync: (vars: { orderId: string; idempotencyKey?: string }) => Promise<OrderDto>
}

const COMMAND_PAYLOAD: Record<string, never> = {}

export function useOrderActions(
  order: ComputedRef<OrderDto | undefined>,
  role: ComputedRef<OrderRole>,
) {
  const commands = useOrderCommands()
  const { queryClient, refreshOrder } = commands

  const payIdem = useIdempotency()
  const cancelIdem = useIdempotency()

  const pendingAction = ref<OrderAction | null>(null)
  const lastError = ref<string | null>(null)
  const concurrencyConflict = ref(false)
  const idempotencyConflict = ref(false)
  const canRetrySameKey = ref(false)
  const lastDispatch = ref<DispatchRecord | null>(null)

  const actions = computed<OrderActionSpec[]>(() => {
    const current = order.value
    if (!current) return []
    return getOrderActions({
      status: current.status,
      paymentStatus: current.payment_status,
      paymentMethod: current.payment_method,
      role: role.value,
    })
  })

  function clearTransient(): void {
    lastError.value = null
    concurrencyConflict.value = false
    idempotencyConflict.value = false
    canRetrySameKey.value = false
  }

  function controllerFor(action: OrderAction) {
    if (action === 'PAY') return payIdem
    if (action === 'CANCEL') return cancelIdem
    return null
  }

  function mutationFor(action: OrderAction): OrderCommandMutation | null {
    switch (action) {
      case 'PAY':
        return commands.payOrder as unknown as OrderCommandMutation
      case 'CONFIRM':
        return commands.confirmOrder as unknown as OrderCommandMutation
      case 'CANCEL':
        return commands.cancelOrder as unknown as OrderCommandMutation
      case 'COMPLETE':
        return commands.completeOrder as unknown as OrderCommandMutation
      default:
        return null
    }
  }

  function classify(error: unknown): AppError | null {
    if (typeof error === 'object' && error !== null && 'kind' in error) {
      return error as AppError
    }
    return null
  }

  /** Re-fetch latest detail + history after a concurrency conflict. */
  function refetchLatest(orderId: string): void {
    void queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] })
    void queryClient.invalidateQueries({ queryKey: ['orders', 'history', orderId] })
  }

  async function execute(
    action: OrderAction,
    opts: { overrideKey?: string } = {},
  ): Promise<boolean> {
    const current = order.value
    if (!current) return false

    clearTransient()
    const mutation = mutationFor(action)
    if (!mutation) return false

    const controller = controllerFor(action)
    const key = opts.overrideKey ?? (controller ? controller.begin(COMMAND_PAYLOAD) : undefined)
    if (controller && key === undefined) return false

    lastDispatch.value = { action, key, payload: COMMAND_PAYLOAD } as DispatchRecord
    pendingAction.value = action

    try {
      await mutation.mutateAsync({
        orderId: current.id,
        ...(key !== undefined ? { idempotencyKey: key } : {}),
      })
      controller?.resolveOutcome()
      refreshOrder(queryClient, current.id)
      return true
    } catch (error) {
      const appError = classify(error)
      const isUnknownOutcome =
        appError !== null && (appError.kind === 'network' || appError.kind === 'timeout')

      if (appError) {
        if (isVersionConflict(appError)) {
          concurrencyConflict.value = true
          refetchLatest(current.id)
          lastError.value = appError.message
        } else if (isIdempotencyConflict(appError)) {
          idempotencyConflict.value = true
          lastError.value = appError.message
        } else if (isUnknownOutcome) {
          // Unknown outcome: offer a same-key retry by keeping the attempt open.
          canRetrySameKey.value = true
          lastError.value = appError.message
        } else {
          lastError.value = appError.message
        }
      } else {
        lastError.value = 'The command could not be completed.'
      }

      // Only definitive responses resolve the idempotency attempt.
      if (!isUnknownOutcome) {
        controller?.resolveOutcome()
      }
      return false
    } finally {
      pendingAction.value = null
    }
  }

  /**
   * Re-execute the exact previous dispatch with the same idempotency key +
   * payload. Used both for the unknown-outcome same-key retry and the advanced
   * demo "Replay exact request" control.
   */
  async function replayExact(): Promise<boolean> {
    const last = lastDispatch.value
    if (!last) return false
    return execute(last.action, { overrideKey: last.key })
  }

  return {
    actions,
    pendingAction,
    lastError,
    concurrencyConflict,
    idempotencyConflict,
    canRetrySameKey,
    lastReplayKey: computed(() => lastDispatch.value?.key ?? null),
    clearTransient,
    execute,
    replayExact,
  }
}
