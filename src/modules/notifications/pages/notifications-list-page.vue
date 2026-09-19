<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import NotificationFilters from '../components/notification-filters.vue'
import NotificationHelpPanel from '../components/notification-help-panel.vue'
import NotificationListTable from '../components/notification-list-table.vue'
import type { NotificationChannel, NotificationEventType, NotificationJobStatus } from '../models/notification-types'
import { useNotificationsListQuery } from '../queries/use-notification-queries'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

const PAGE_LIMIT = 10

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Notifications', ru: 'Уведомления' }, locale.value),
  subtitle: tr(
    { en: 'Kafka at-least-once → durable delivery jobs → provider attempts.', ru: 'Kafka at-least-once → durable-задачи доставки → попытки провайдера.' },
    locale.value,
  ),
  denied: tr({ en: 'Access denied', ru: 'Доступ запрещён' }, locale.value),
  loadError: tr({ en: 'Unable to load notifications', ru: 'Не удалось загрузить уведомления' }, locale.value),
  emptyTitle: tr(
    { en: 'No notification jobs in this scenario', ru: 'В этом сценарии нет задач уведомлений' },
    locale.value,
  ),
  emptyDesc: tr(
    {
      en: 'Switch the demo scenario or clear the filters to see delivery jobs.',
      ru: 'Переключите демо-сценарий или сбросьте фильтры, чтобы увидеть задачи доставки.',
    },
    locale.value,
  ),
  previous: tr({ en: 'Previous', ru: 'Назад' }, locale.value),
  next: tr({ en: 'Next', ru: 'Далее' }, locale.value),
  pagination: tr({ en: 'Notifications pagination', ru: 'Пагинация уведомлений' }, locale.value),
}))

const status = ref<NotificationJobStatus | undefined>(undefined)
const channel = ref<NotificationChannel | undefined>(undefined)
const eventType = ref<NotificationEventType | undefined>(undefined)
const cursor = ref<string | undefined>(undefined)
const cursorStack = ref<string[]>([])

const listQuery = computed(() => ({
  status: status.value,
  channel: channel.value,
  event_type: eventType.value,
  cursor: cursor.value,
  limit: PAGE_LIMIT,
}))

// Any filter change restarts pagination from the first page.
watch([status, channel, eventType], () => {
  cursor.value = undefined
  cursorStack.value = []
})

const query = useNotificationsListQuery(listQuery)

const rows = computed(() => (query.data.value ? query.data.value.items : []))
const hasNext = computed(() => Boolean(query.data.value?.has_more))

const listError = computed(() => {
  const error = query.error.value
  return error ? safeListError(error) : 'Notifications could not be loaded.'
})

function safeListError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const kind = (error as { kind?: string }).kind
    if (kind === 'authorization') return 'You do not have access to these notifications (403).'
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Notifications could not be loaded.'
}

const isDenied = computed(
  () =>
    typeof query.error.value === 'object' &&
    query.error.value !== null &&
    (query.error.value as { kind?: string }).kind === 'authorization',
)

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
  <section class="notifications-list-page">
    <header class="notifications-list-page__header">
      <div>
        <h2 class="notifications-list-page__title">{{ labels.title }}</h2>
        <p class="notifications-list-page__subtitle">{{ labels.subtitle }}</p>
      </div>
    </header>

    <NotificationFilters
      :status="status"
      :channel="channel"
      :event-type="eventType"
      @update:status="status = $event"
      @update:channel="channel = $event"
      @update:event-type="eventType = $event"
    />

    <LoadingSkeleton v-if="query.isLoading.value" :rows="6" :columns="6" />

    <ErrorState
      v-else-if="query.isError.value"
      :title="isDenied ? labels.denied : labels.loadError"
      :message="listError"
      :on-retry="() => query.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      :title="labels.emptyTitle"
      :description="labels.emptyDesc"
    />

    <template v-else>
      <NotificationListTable :jobs="rows" />

      <nav class="notifications-list-page__pager" :aria-label="labels.pagination">
        <AppButton variant="secondary" size="sm" :disabled="cursorStack.length === 0" @click="previousPage">
          {{ labels.previous }}
        </AppButton>
        <AppButton variant="secondary" size="sm" :disabled="!hasNext" @click="nextPage">{{ labels.next }}</AppButton>
      </nav>
    </template>

    <NotificationHelpPanel />
  </section>
</template>

<style scoped>
.notifications-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.notifications-list-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.notifications-list-page__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.notifications-list-page__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.notifications-list-page__pager {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
