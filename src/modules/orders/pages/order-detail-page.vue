<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/app/stores/app-store'
import type { AppError } from '@/shared/api/api-error'
import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import ConfirmDialog from '@/shared/ui/confirm-dialog.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import OrderActionBar from '../components/order-action-bar.vue'
import OrderConcurrencyAlert from '../components/order-concurrency-alert.vue'
import OrderHistoryTimeline from '../components/order-history-timeline.vue'
import OrderIdempotencyPanel from '../components/order-idempotency-panel.vue'
import OrderItemsTable from '../components/order-items-table.vue'
import OrderRoleSwitcher from '../components/order-role-switcher.vue'
import OrderStatusBadge from '../components/order-status-badge.vue'
import OrderSummaryCard from '../components/order-summary-card.vue'
import PaymentMethodLabel from '../components/payment-method-label.vue'
import PaymentStatusBadge from '../components/payment-status-badge.vue'
import { actionRequiresConfirmation, type OrderAction } from '../models/order-action-policy'
import { toHistoryEntryView, toOrderDetailView } from '../models/order-view-model'
import { useOrderActions } from '../queries/use-order-actions'
import { useOrderDetailQuery, useOrderHistoryQuery } from '../queries/use-order-queries'
import { useOrderRole } from '../queries/use-order-role'

const route = useRoute()
const app = useAppStore()
const { isMock } = storeToRefs(app)

const orderId = computed(() => String(route.params.orderId ?? ''))

const detail = useOrderDetailQuery(orderId)
const history = useOrderHistoryQuery(orderId)
const { role } = useOrderRole()

function asAppError(error: unknown): AppError | undefined {
  return typeof error === 'object' && error !== null && 'kind' in error
    ? (error as AppError)
    : undefined
}

const orderDto = computed(() => detail.data.value)
const detailView = computed(() => (orderDto.value ? toOrderDetailView(orderDto.value) : undefined))

const actionsApi = useOrderActions(orderDto, role)

const confirmAction = ref<OrderAction | null>(null)

const detailError = computed<AppError | undefined>(() => asAppError(detail.error.value))

const isNotFound = computed(() => detailError.value?.kind === 'not-found')
const isForbidden = computed(() => detailError.value?.kind === 'authorization')

function onRun(action: OrderAction): void {
  actionsApi.clearTransient()
  if (actionRequiresConfirmation(action)) {
    confirmAction.value = action
    return
  }
  void actionsApi.execute(action)
}

async function onConfirm(): Promise<void> {
  const action = confirmAction.value
  confirmAction.value = null
  if (action) void actionsApi.execute(action)
}

const historyEntries = computed(() => (history.data.value ?? []).map(toHistoryEntryView))
</script>

<template>
  <LoadingSkeleton v-if="detail.isLoading.value" :rows="9" :columns="2" />

  <ErrorState
    v-else-if="isNotFound"
    title="Order not found"
    message="This order does not exist or is not visible to the current viewer."
  />

  <ErrorState
    v-else-if="isForbidden"
    title="Access denied"
    message="You do not have permission to view this order."
  />

  <ErrorState
    v-else-if="detail.isError.value"
    title="Unable to load order"
    :message="detailError?.message ?? 'The order could not be loaded.'"
    :on-retry="() => detail.refetch()"
  />

  <section v-else-if="detailView && orderDto" class="order-detail">
    <div class="order-detail__toolbar">
      <CodeValue :value="orderDto.id" />
      <OrderRoleSwitcher />
    </div>

    <header class="order-detail__header">
      <div class="order-detail__badges">
        <OrderStatusBadge :status="orderDto.status" />
        <PaymentStatusBadge :status="orderDto.payment_status" />
      </div>
      <div class="order-detail__payment-method">
        <PaymentMethodLabel :method="orderDto.payment_method" :show-description="true" />
      </div>
    </header>

    <div class="order-detail__grid">
      <div class="order-detail__main">
        <OrderSummaryCard :order="detailView" />

        <CardPanel class="order-detail__section">
          <h3 class="order-detail__section-title">Items</h3>
          <OrderItemsTable :items="detailView.items" />
        </CardPanel>

        <CardPanel class="order-detail__section">
          <h3 class="order-detail__section-title">Payment</h3>
          <p class="order-detail__payment-status">
            Payment status: <PaymentStatusBadge :status="orderDto.payment_status" />
          </p>
          <p class="order-detail__payment-note">
            No card / provider UI — real online acquiring is out of project scope. Use the
            <strong>Pay</strong> action to drive the payment state machine.
          </p>
        </CardPanel>
      </div>

      <div class="order-detail__side">
        <CardPanel class="order-detail__section">
          <h3 class="order-detail__section-title">Actions</h3>
          <OrderActionBar
            :actions="actionsApi.actions.value"
            :pending-action="actionsApi.pendingAction.value"
            :busy="false"
            @run="onRun"
          />
        </CardPanel>

        <CardPanel class="order-detail__section">
          <h3 class="order-detail__section-title">History</h3>
          <LoadingSkeleton v-if="history.isLoading.value" :rows="3" :columns="1" />
          <OrderHistoryTimeline v-else-if="!history.isError.value" :entries="historyEntries" />
          <ErrorState
            v-else
            title="Unable to load history"
            :message="asAppError(history.error.value)?.message ?? 'History could not be loaded.'"
          />
        </CardPanel>
      </div>
    </div>

    <OrderConcurrencyAlert
      v-if="actionsApi.concurrencyConflict.value"
      :version="detailView?.version"
      @review="actionsApi.clearTransient()"
    />

    <div v-if="actionsApi.lastError.value" class="order-detail__error" role="alert" data-testid="order-action-error">
      <span>{{ actionsApi.lastError.value }}</span>
      <span v-if="actionsApi.idempotencyConflict.value" class="order-detail__error-note">
        Idempotency-Key was reused with a different request — this is not silently retried.
      </span>
    </div>

    <AppButton
      v-if="actionsApi.canRetrySameKey.value"
      variant="secondary"
      @click="actionsApi.replayExact()"
    >
      Retry request (same idempotency key)
    </AppButton>

    <OrderIdempotencyPanel
      v-if="isMock && actionsApi.lastReplayKey.value"
      :last-key="actionsApi.lastReplayKey.value"
      :busy="actionsApi.pendingAction.value !== null"
      @replay="actionsApi.replayExact()"
    />

    <ConfirmDialog
      :open="confirmAction !== null"
      title="Cancel order"
      :message="
        'Cancelling this order is irreversible. ' +
        (orderDto.payment_status === 'paid'
          ? 'This order is paid — cancellation requires a refund workflow and is not available.'
          : 'Confirm to cancel the order.')
      "
      confirm-label="Cancel order"
      variant="danger"
      :busy="actionsApi.pendingAction.value !== null"
      @confirm="onConfirm"
      @update:open="confirmAction = null"
    />
  </section>
</template>

<style scoped>
.order-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-detail__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.order-detail__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--c-border);
}

.order-detail__badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.order-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .order-detail__grid {
    grid-template-columns: 1fr;
  }
}

.order-detail__main,
.order-detail__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.order-detail__section-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
}

.order-detail__payment-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
}

.order-detail__payment-note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.order-detail__error {
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--c-danger) 45%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--c-danger) 10%, transparent);
  color: var(--c-danger);
  font-size: var(--text-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.order-detail__error-note {
  opacity: 0.9;
}
</style>
