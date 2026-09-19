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
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Orders', ru: 'Заказы' }, locale.value),
  subtitle: tr(
    { en: 'Order lifecycle, payment state and concurrency demo.', ru: 'Демо жизненного цикла заказов, состояния оплаты и конкурентности.' },
    locale.value,
  ),
  create: tr({ en: 'Create order', ru: 'Создать заказ' }, locale.value),
  loadError: tr({ en: 'Unable to load orders', ru: 'Не удалось загрузить заказы' }, locale.value),
  emptyTitle: tr(
    { en: 'No orders in this demo scenario', ru: 'В этом демо-сценарии нет заказов' },
    locale.value,
  ),
  emptyDesc: tr(
    {
      en: 'Switch the demo scenario or create a new order to start the lifecycle.',
      ru: 'Переключите демо-сценарий или создайте новый заказ, чтобы запустить жизненный цикл.',
    },
    locale.value,
  ),
  previous: tr({ en: 'Previous', ru: 'Назад' }, locale.value),
  next: tr({ en: 'Next', ru: 'Далее' }, locale.value),
  pagination: tr({ en: 'Orders pagination', ru: 'Пагинация заказов' }, locale.value),
}))

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

const rows = computed(() => (query.data.value ? query.data.value.items.map((dto) => toOrderRowView(dto, locale.value)) : []))
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
        <h2 class="orders-list-page__title">{{ labels.title }}</h2>
        <p class="orders-list-page__subtitle">{{ labels.subtitle }}</p>
      </div>
      <div class="orders-list-page__actions">
        <OrderRoleSwitcher />
        <AppButton @click="router.push('/orders/new')">{{ labels.create }}</AppButton>
      </div>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="4" :columns="6" />

    <ErrorState
      v-else-if="query.isError.value"
      :title="labels.loadError"
      :message="listErrorMessage"
      :on-retry="() => query.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      :title="labels.emptyTitle"
      :description="labels.emptyDesc"
    >
      <AppButton @click="router.push('/orders/new')">{{ labels.create }}</AppButton>
    </EmptyState>

    <template v-else>
      <OrderListTable :rows="rows" />

      <nav class="orders-list-page__pager" :aria-label="labels.pagination">
        <AppButton variant="secondary" size="sm" :disabled="cursorStack.length === 0" @click="previousPage">
          {{ labels.previous }}
        </AppButton>
        <AppButton variant="secondary" size="sm" :disabled="!hasNext" @click="nextPage">
          {{ labels.next }}
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
