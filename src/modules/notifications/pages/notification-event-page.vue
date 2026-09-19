<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'

import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import NotificationStatusBadge from '../components/notification-status-badge.vue'
import { useNotificationEventQuery } from '../queries/use-notification-queries'
import { formatDateTime, shortenId } from '../utils/notification-format'

const route = useRoute()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Notification event', ru: 'Событие уведомления' }, locale.value),
  subtitle: tr(
    { en: 'Input event origin, consumption/deduplication and resulting jobs.', ru: 'Источник входного события, консьюминг/дедупликация и созданные задачи.' },
    locale.value,
  ),
  denied: tr({ en: 'Access denied', ru: 'Доступ запрещён' }, locale.value),
  deniedMsg: tr(
    { en: 'This event requires access that the backend denied (403).', ru: 'Для этого события бэкенд отклонил доступ (403).' },
    locale.value,
  ),
  notFound: tr({ en: 'Event not found', ru: 'Событие не найдено' }, locale.value),
  loadError: tr({ en: 'Unable to load event', ru: 'Не удалось загрузить событие' }, locale.value),
  metadata: tr({ en: 'Event metadata', ru: 'Метаданные события' }, locale.value),
  eventId: tr({ en: 'Event ID', ru: 'ID события' }, locale.value),
  eventType: tr({ en: 'Event type', ru: 'Тип события' }, locale.value),
  occurred: tr({ en: 'Occurred', ru: 'Время события' }, locale.value),
  producer: tr({ en: 'Producer', ru: 'Продюсер' }, locale.value),
  aggregate: tr({ en: 'Order / aggregate', ru: 'Заказ / агрегат' }, locale.value),
  correlation: tr({ en: 'Correlation', ru: 'Корреляция' }, locale.value),
  consumption: tr({ en: 'Consumption & deduplication', ru: 'Консьюминг и дедупликация' }, locale.value),
  consumed: tr({ en: 'Durably consumed', ru: 'Надёжно обработано' }, locale.value),
  duplicate: tr({ en: 'Duplicate received — deduplicated, no new job', ru: 'Получен дубликат — дедуплицирован, новая задача не создана' }, locale.value),
  jobs: tr({ en: 'Resulting jobs', ru: 'Созданные задачи' }, locale.value),
  noJobs: tr({ en: 'No delivery jobs were produced from this event.', ru: 'Из этого события не было создано задач доставки.' }, locale.value),
}))
const eventId = computed(() => String(route.params.eventId ?? ''))

const query = useNotificationEventQuery(eventId)

const isDenied = computed(
  () =>
    typeof query.error.value === 'object' &&
    query.error.value !== null &&
    (query.error.value as { kind?: string }).kind === 'authorization',
)

const isNotFound = computed(
  () =>
    typeof query.error.value === 'object' &&
    query.error.value !== null &&
    (query.error.value as { kind?: string }).kind === 'not-found',
)

const mainError = computed(() => {
  const error = query.error.value
  if (!error) return 'The event could not be loaded.'
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : 'The event could not be loaded.'
})

const view = computed(() => query.data.value)
</script>

<template>
  <section class="notification-event-page">
    <header class="notification-event-page__header">
      <div>
        <h2 class="notification-event-page__title">{{ labels.title }}</h2>
        <p class="notification-event-page__subtitle">{{ labels.subtitle }}</p>
      </div>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="6" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      :title="labels.denied"
      :message="labels.deniedMsg"
    />

    <ErrorState
      v-else-if="isNotFound"
      :title="labels.notFound"
      :message="
        tr({ en: `No input event exists for ${eventId}.`, ru: `Входного события ${eventId} не существует.` }, locale)
      "
    />

    <ErrorState
      v-else-if="query.isError.value"
      :title="labels.loadError"
      :message="mainError"
      :on-retry="() => query.refetch()"
    />

    <template v-else-if="view">
      <CardPanel class="notification-event-page__card">
        <h3 class="notification-event-page__card-title">{{ labels.metadata }}</h3>
        <dl class="notification-event-page__list">
          <div class="notification-event-page__row">
            <dt>{{ labels.eventId }}</dt>
            <dd><CodeValue :value="view.event.event_id" /></dd>
          </div>
          <div class="notification-event-page__row">
            <dt>{{ labels.eventType }}</dt>
            <dd><code class="notification-event-page__mono">{{ view.event.event_type }}</code></dd>
          </div>
          <div v-if="view.event.occurred_at" class="notification-event-page__row">
            <dt>{{ labels.occurred }}</dt>
            <dd>{{ formatDateTime(view.event.occurred_at) }}</dd>
          </div>
          <div v-if="view.event.producer" class="notification-event-page__row">
            <dt>{{ labels.producer }}</dt>
            <dd>{{ view.event.producer }}</dd>
          </div>
          <div v-if="view.event.aggregate_id" class="notification-event-page__row">
            <dt>{{ labels.aggregate }}</dt>
            <dd><CodeValue :value="view.event.aggregate_id" /></dd>
          </div>
          <div v-if="view.event.correlation_id" class="notification-event-page__row">
            <dt>{{ labels.correlation }}</dt>
            <dd><CodeValue :value="view.event.correlation_id" /></dd>
          </div>
        </dl>
      </CardPanel>

      <CardPanel class="notification-event-page__card">
        <h3 class="notification-event-page__card-title">{{ labels.consumption }}</h3>
        <div class="notification-event-page__badges">
          <StatusBadge tone="success"  :label="labels.consumed" dot />
          <StatusBadge
            v-if="view.duplicate_received"
            tone="warning"
             :label="labels.duplicate"
          />
        </div>
        <p v-if="view.received_count != null" class="notification-event-page__hint">
          {{ tr({ en: 'Received', ru: 'Получено' }, locale) }} {{ view.received_count }} {{ tr({ en: 'time(s) (Kafka at-least-once). At-least-once means duplicates are normal; the inbox deduplicated them so no second job was created.', ru: 'раз (Kafka at-least-once). At-least-once означает, что дубликаты нормальны; inbox их дедуплицировал, поэтому второй задачи не создано.' }, locale) }}
        </p>
      </CardPanel>

      <CardPanel class="notification-event-page__card" padding="none">
        <h3 class="notification-event-page__jobs-title">{{ labels.jobs }}</h3>
        <template v-if="view.jobs && view.jobs.length > 0">
          <ul class="notification-event-page__jobs" data-testid="event-jobs">
            <li v-for="job in view.jobs" :key="job.id" class="notification-event-page__job">
              <RouterLink :to="`/notifications/${job.id}`" class="notification-event-page__job-link">
                <CodeValue :value="job.id" :display="shortenId(job.id)" />
              </RouterLink>
              <NotificationStatusBadge :status="job.status" />
            </li>
          </ul>
        </template>
        <p v-else class="notification-event-page__hint">{{ labels.noJobs }}</p>
      </CardPanel>
    </template>

    <EmptyState v-else :title="tr({ en: 'No event data', ru: 'Нет данных события' }, locale)" :description="tr({ en: 'The API returned no content.', ru: 'API вернул пустой ответ.' }, locale)" />
  </section>
</template>

<style scoped>
.notification-event-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.notification-event-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.notification-event-page__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.notification-event-page__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.notification-event-page__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.notification-event-page__card-title,
.notification-event-page__jobs-title {
  margin: 0;
  font-size: var(--text-md);
}

.notification-event-page__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.notification-event-page__row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-sm);
}

.notification-event-page__row dt {
  color: var(--c-text-subtle);
}

.notification-event-page__row dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.notification-event-page__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.notification-event-page__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.notification-event-page__hint {
  margin: 0;
  color: var(--c-text-muted);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.notification-event-page__jobs-title {
  padding: var(--space-4);
  padding-bottom: var(--space-2);
}

.notification-event-page__jobs {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notification-event-page__job {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--c-border);
}

.notification-event-page__job-link {
  min-width: 0;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
}

.notification-event-page__job-link:hover {
  color: var(--c-accent);
}

@media (max-width: 519.98px) {
  .notification-event-page__row {
    grid-template-columns: 1fr;
    gap: 2px;
    align-items: start;
  }
}
</style>
