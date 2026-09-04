<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import OrderListTable from '../components/order-list-table.vue'
import OrderRoleSwitcher from '../components/order-role-switcher.vue'
import { toOrderRowView } from '../models/order-view-model'
import { useOrdersListQuery } from '../queries/use-order-queries'

const PAGE_LIMIT = 5
const router = useRouter()

// Pagination state lives in the page (server cursors are opaque to the UI);
// exact query-parameter names are PROPOSED CONTRACT (source leaves them open).
const cursor = ref<string | undefined>(undefined)
const cursorStack = ref<string[]>([])

const listQuery = computed(() => ({
  cursor: cursor.value,
  limit: PAGE_LIMIT,
}))

const query = useOrdersListQuery(listQuery)

const rows = computed(() => (query.data.value ? query.data.value.items.map(toOrderRowView) : []))
const hasNext = computed(() => Boolean(query.data.value?.has_more))
const listErrorMessage = computed(() => {
  const error = query.error.value as { message?: string } | undefined
  return error?.message ?? 'Orders could not be loaded.'
})

function nextPage(): void {
  const next = query.data.value?.next_cursor
  if (!next) return
  cursorStack.value = [...cursorStack.value, cursor.value ?? '']
  cursor.value = next
}

function previousPage(): void {
  const prev = cursorStack.value.pop()
  cursor.value = prev || undefined
}
</script>

<template>
  <section class="orders-list-page">
    <header class="orders-list-page__header">
      <div>
        <h2 class="orders-list-page__title">Orders</h2>
        <p class="orders-list-page__subtitle">Order lifecycle, payment state and concurrency demo.</p>
      </div>
      <div class="orders-list-page__actions">
        <OrderRoleSwitcher />
        <AppButton @click="router.push('/orders/new')">Create order</AppButton>
      </div>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="4" :columns="6" />

    <ErrorState
      v-else-if="query.isError.value"
      title="Unable to load orders"
      :message="listErrorMessage"
      :on-retry="() => query.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      title="No orders in this demo scenario"
      description="Switch the demo scenario or create a new order to start the lifecycle."
    >
      <AppButton @click="router.push('/orders/new')">Create order</AppButton>
    </EmptyState>

    <template v-else>
      <OrderListTable :rows="rows" />

      <nav class="orders-list-page__pager" aria-label="Orders pagination">
        <AppButton variant="secondary" size="sm" :disabled="cursorStack.length === 0" @click="previousPage">
          Previous
        </AppButton>
        <AppButton variant="secondary" size="sm" :disabled="!hasNext" @click="nextPage">
          Next
        </AppButton>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.orders-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.orders-list-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.orders-list-page__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.orders-list-page__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.orders-list-page__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.orders-list-page__pager {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
