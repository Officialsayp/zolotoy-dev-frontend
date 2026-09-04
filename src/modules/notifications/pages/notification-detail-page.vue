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

const route = useRoute()
const notificationId = computed(() => String(route.params.notificationId ?? ''))

const query = useNotificationDetailQuery(notificationId)

// Fetch the event origin for the timeline card via the source-backed
// GET /events/{event_id}; only shown when the API returns it (PROPOSED DTO).
// Empty string keeps the query disabled until a real event_id is known.
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
  // Invalidate/refetch the affected families happens in the mutation; we keep
  // the server state authoritative and never set a local terminal status.
  // Mutation state owns the error UI; catch here prevents an unhandled rejected
  // promise from the DOM event handler.
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
        <h2 class="notification-detail-page__title">Notification detail</h2>
        <p class="notification-detail-page__subtitle">
          Operational chain: event → job → attempts → provider result.
        </p>
      </div>
      <AppButton
        v-if="query.data.value && canManuallyRetry(query.data.value.job.status)"
        variant="primary"
        data-testid="retry-button"
        :disabled="retryBusy"
        @click="confirmOpen = true"
      >
        Retry
      </AppButton>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="7" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      title="Access denied"
      :message="'This notification requires access that the backend denied (403).'"
    />

    <ErrorState
      v-else-if="defaultNotFound"
      title="Notification not found"
      :message="`No delivery job exists for ${notificationId}.`"
    />

    <ErrorState
      v-else-if="query.isError.value"
      title="Unable to load notification"
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
        <h3 class="notification-detail-page__meta-title">Job metadata</h3>
        <dl class="notification-detail-page__list">
          <div class="notification-detail-page__row">
            <dt>Job ID</dt>
            <dd><CodeValue :value="query.data.value.job.id" /></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>Channel</dt>
            <dd>{{ CHANNEL_LABELS[query.data.value.job.channel] }}</dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>Recipient</dt>
            <dd>{{ query.data.value.job.recipient }}</dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>Status</dt>
            <dd><NotificationStatusBadge :status="query.data.value.job.status" /></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>Attempt count</dt>
            <dd>{{ query.data.value.job.attempt_count }}</dd>
          </div>
          <div v-if="query.data.value.job.next_attempt_at" class="notification-detail-page__row">
            <dt>Next attempt</dt>
            <dd>{{ formatDateTime(query.data.value.job.next_attempt_at) }}</dd>
          </div>
          <div v-if="query.data.value.job.provider_message_id" class="notification-detail-page__row">
            <dt>Provider message</dt>
            <dd><CodeValue :value="query.data.value.job.provider_message_id" /></dd>
          </div>
          <div v-if="query.data.value.job.last_error_code" class="notification-detail-page__row">
            <dt>Last error</dt>
            <dd><code class="notification-detail-page__mono">{{ query.data.value.job.last_error_code }}</code></dd>
          </div>
          <div class="notification-detail-page__row">
            <dt>Created</dt>
            <dd>{{ formatDateTime(query.data.value.job.created_at) }}</dd>
          </div>
          <div v-if="query.data.value.job.sent_at" class="notification-detail-page__row">
            <dt>Sent</dt>
            <dd>{{ formatDateTime(query.data.value.job.sent_at) }}</dd>
          </div>
        </dl>

        <p v-if="retryError" class="notification-detail-page__retry-error" role="alert" data-testid="retry-error">
          {{ retryError }}
        </p>
      </CardPanel>
    </template>

    <EmptyState v-else title="No notification data" description="The API returned no content." />

    <ConfirmDialog
      :open="confirmOpen"
      title="Retry delivery?"
      :message="
        'Retry creates another delivery attempt for this job. Because provider side effects are not ' +
        'atomic with the local transaction, a rare crash window can mean the provider already performed ' +
        'the side effect even though success was not recorded — so an operational retry can occasionally ' +
        'result in duplicate delivery.'
      "
      confirm-label="Retry now"
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
  grid-template-columns: 160px 1fr;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-sm);
}

.notification-detail-page__row dt {
  color: var(--c-text-subtle);
}

.notification-detail-page__row dd {
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
}
</style>
