<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import ConfirmDialog from '@/shared/ui/confirm-dialog.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import NotificationStatusBadge from '../components/notification-status-badge.vue'
import NotificationTimeline from '../components/notification-timeline.vue'
import { canManuallyRetry, CHANNEL_LABELS } from '../models/notification-domain'
import {
  useNotificationDetailQuery,
  useNotificationEventQuery,
  useRetryNotificationMutation,
} from '../queries/use-notification-queries'
import { formatDateTime } from '../utils/notification-format'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { labelFor } from '@/shared/i18n/label-strings'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Notification detail', ru: 'Детали уведомления' }, locale.value),
  subtitle: tr(
    { en: 'Operational chain: event → job → attempts → provider result.', ru: 'Операционная цепочка: событие → задача → попытки → результат провайдера.' },
    locale.value,
  ),
  retry: tr({ en: 'Retry', ru: 'Повторить' }, locale.value),
  denied: tr({ en: 'Access denied', ru: 'Доступ запрещён' }, locale.value),
  deniedMsg: tr(
    { en: 'This notification requires access that the backend denied (403).', ru: 'Для этого уведомления бэкенд отклонил доступ (403).' },
    locale.value,
  ),
  notFound: tr({ en: 'Notification not found', ru: 'Уведомление не найдено' }, locale.value),
  loadError: tr({ en: 'Unable to load notification', ru: 'Не удалось загрузить уведомление' }, locale.value),
  emptyTitle: tr({ en: 'No notification data', ru: 'Нет данных уведомления' }, locale.value),
  emptyDesc: tr({ en: 'The API returned no content.', ru: 'API вернул пустой ответ.' }, locale.value),
  jobMetadata: tr({ en: 'Job metadata', ru: 'Метаданные задачи' }, locale.value),
  jobId: tr({ en: 'Job ID', ru: 'ID задачи' }, locale.value),
  channel: tr({ en: 'Channel', ru: 'Канал' }, locale.value),
  recipient: tr({ en: 'Recipient', ru: 'Получатель' }, locale.value),
  status: tr({ en: 'Status', ru: 'Статус' }, locale.value),
  attemptCount: tr({ en: 'Attempt count', ru: 'Число попыток' }, locale.value),
  nextAttempt: tr({ en: 'Next attempt', ru: 'Следующая попытка' }, locale.value),
  providerMessage: tr({ en: 'Provider message', ru: 'Сообщение провайдера' }, locale.value),
  lastError: tr({ en: 'Last error', ru: 'Последняя ошибка' }, locale.value),
  created: tr({ en: 'Created', ru: 'Создана' }, locale.value),
  sent: tr({ en: 'Sent', ru: 'Отправлено' }, locale.value),
  retryTitle: tr({ en: 'Retry delivery?', ru: 'Повторить доставку?' }, locale.value),
  retryNow: tr({ en: 'Retry now', ru: 'Повторить сейчас' }, locale.value),
}))

const retryConfirmMessage = computed(() =>
  tr(
    {
      en: 'Retry creates another delivery attempt for this job. Because provider side effects are not atomic with the local transaction, a rare crash window can mean the provider already performed the side effect even though success was not recorded — so an operational retry can occasionally result in duplicate delivery.',
      ru: 'Повтор создаёт ещё одну попытку доставки для этой задачи. Побочные эффекты провайдера не атомарны с локальной транзакцией: в редком окне падения провайдер мог уже выполнить отправку, хотя успех не был записан, — поэтому операционный ретрай изредка может привести к дубликату доставки.',
    },
    locale.value,
  ),
)

const route = useRoute()
const notificationId = computed(() => String(route.params.notificationId ?? ''))

const query = useNotificationDetailQuery(notificationId)

const eventId = computed(() => query.data.value?.job.event_id ?? '')
const eventQuery = useNotificationEventQuery(eventId)
const event = computed(() => eventQuery.data.value?.event ?? null)

const retryMutation = useRetryNotificationMutation()
const confirmOpen = ref(false)
const retryBusy = computed(() => retryMutation.isPending.value)

const retryError = computed(() => {
  const error = retryMutation.error.value
  if (!error) return ''
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'The retry could not be performed.'
})

const defaultNotFound = computed(
  () =>
    typeof query.error.value === 'object' &&
    query.error.value !== null &&
    (query.error.value as { kind?: string }).kind === 'not-found',
)

const isDenied = computed(
  () =>
    typeof query.error.value === 'object' &&
    query.error.value !== null &&
    (query.error.value as { kind?: string }).kind === 'authorization',
)

const mainError = computed(() => {
  const error = query.error.value
  if (!error) return 'The notification could not be loaded.'
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : 'The notification could not be loaded.'
})

async function doRetry(): Promise<void> {
  const current = query.data.value
  if (retryBusy.value || !current || !canManuallyRetry(current.job.status)) return

  confirmOpen.value = false
  const id = notificationId.value
  try {
    await retryMutation.mutateAsync(id)
  } catch {
    // `retryError` renders the normalized mutation error.
  }
}
</script>

<template>
  <section class="notification-detail-page">
    <header class="notification-detail-page__header">
      <div>
        <h2 class="notification-detail-page__title">{{ labels.title }}</h2>
        <p class="notification-detail-page__subtitle">{{ labels.subtitle }}</p>
      </div>
      <AppButton
        v-if="query.data.value && canManuallyRetry(query.data.value.job.status)"
        variant="primary"
        data-testid="retry-button"
        :disabled="retryBusy"
        @click="confirmOpen = true"
      >
        {{ labels.retry }}
      </AppButton>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="7" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      :title="labels.denied"
      :message="labels.deniedMsg"
    />

    <ErrorState
      v-else-if="defaultNotFound"
      :title="labels.notFound"
      :message="
        tr(
          { en: `No delivery job exists for ${notificationId}.`, ru: `Задачи доставки ${notificationId} не существует.` },
          locale,
        )
      "
    />

    <ErrorState
      v-else-if="query.isError.value"
      :title="labels.loadError"
      :message="mainError"
      :on-retry="() => query.refetch()"
    />

    <template v-else-if="query.data.value">
      <NotificationTimeline
        :job="query.data.value.job"
        :attempts="query.data.value.attempts"
        :event="event"
      />

      <CardPanel class="notification-detail-page__meta">
        <h3 class="notification-detail-page__meta-title">{{ labels.jobMetadata }}</h3>
        <dl class="notification-detail-page__list">
          <div class="notification-detail-page__row">
            <dt>{{ labels.jobId }}</dt>
            <dd><CodeValue :value="query.data.value.job.id" /></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>{{ labels.channel }}</dt>
            <dd>{{ labelFor(CHANNEL_LABELS[query.data.value.job.channel], locale) }}</dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>{{ labels.recipient }}</dt>
            <dd>{{ query.data.value.job.recipient }}</dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>{{ labels.status }}</dt>
            <dd><NotificationStatusBadge :status="query.data.value.job.status" /></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>{{ labels.attemptCount }}</dt>
            <dd>{{ query.data.value.job.attempt_count }}</dd>
          </div>
          <div v-if="query.data.value.job.next_attempt_at" class="notification-detail-page__row">
            <dt>{{ labels.nextAttempt }}</dt>
            <dd>{{ formatDateTime(query.data.value.job.next_attempt_at) }}</dd>
          </div>
          <div v-if="query.data.value.job.provider_message_id" class="notification-detail-page__row">
            <dt>{{ labels.providerMessage }}</dt>
            <dd><CodeValue :value="query.data.value.job.provider_message_id" /></dd>
          </div>
          <div v-if="query.data.value.job.last_error_code" class="notification-detail-page__row">
            <dt>{{ labels.lastError }}</dt>
            <dd><code class="notification-detail-page__mono">{{ query.data.value.job.last_error_code }}</code></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>{{ labels.created }}</dt>
            <dd>{{ formatDateTime(query.data.value.job.created_at) }}</dd>
          </div>
          <div v-if="query.data.value.job.sent_at" class="notification-detail-page__row">
            <dt>{{ labels.sent }}</dt>
            <dd>{{ formatDateTime(query.data.value.job.sent_at) }}</dd>
          </div>
        </dl>

        <p v-if="retryError" class="notification-detail-page__retry-error" role="alert" data-testid="retry-error">
          {{ retryError }}
        </p>
      </CardPanel>
    </template>

    <EmptyState v-else :title="labels.emptyTitle" :description="labels.emptyDesc" />

    <ConfirmDialog
      :open="confirmOpen"
      :title="labels.retryTitle"
      :message="retryConfirmMessage"
      :confirm-label="labels.retryNow"
      variant="primary"
      :busy="retryBusy"
      @confirm="doRetry"
      @update:open="confirmOpen = false"
    />
  </section>
</template>

<style scoped>
.notification-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.notification-detail-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.notification-detail-page__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.notification-detail-page__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.notification-detail-page__meta-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.notification-detail-page__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.notification-detail-page__row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-sm);
}

.notification-detail-page__row dt {
  color: var(--c-text-subtle);
}

.notification-detail-page__row dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.notification-detail-page__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.notification-detail-page__retry-error {
  margin: var(--space-3) 0 0;
  color: var(--c-danger);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

@media (max-width: 519.98px) {
  .notification-detail-page__row {
    grid-template-columns: 1fr;
    gap: 2px;
    align-items: start;
  }
}
</style>
