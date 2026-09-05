<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'

import NotificationStatusBadge from '../components/notification-status-badge.vue'
import { useNotificationEventQuery } from '../queries/use-notification-queries'
import { formatDateTime, shortenId } from '../utils/notification-format'

const route = useRoute()
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
        <h2 class="notification-event-page__title">Notification event</h2>
        <p class="notification-event-page__subtitle">
          Input event origin, consumption/deduplication and resulting jobs.
        </p>
      </div>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="6" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      title="Access denied"
      :message="'This event requires access that the backend denied (403).'"
    />

    <ErrorState
      v-else-if="isNotFound"
      title="Event not found"
      :message="`No input event exists for ${eventId}.`"
    />

    <ErrorState
      v-else-if="query.isError.value"
      title="Unable to load event"
      :message="mainError"
      :on-retry="() => query.refetch()"
    />

    <template v-else-if="view">
      <CardPanel class="notification-event-page__card">
        <h3 class="notification-event-page__card-title">Event metadata</h3>
        <dl class="notification-event-page__list">
          <div class="notification-event-page__row">
            <dt>Event ID</dt>
            <dd><CodeValue :value="view.event.event_id" /></dd>
          </div>
          <div class="notification-event-page__row">
            <dt>Event type</dt>
            <dd><code class="notification-event-page__mono">{{ view.event.event_type }}</code></dd>
          </div>
          <div v-if="view.event.occurred_at" class="notification-event-page__row">
            <dt>Occurred</dt>
            <dd>{{ formatDateTime(view.event.occurred_at) }}</dd>
          </div>
          <div v-if="view.event.producer" class="notification-event-page__row">
            <dt>Producer</dt>
            <dd>{{ view.event.producer }}</dd>
          </div>
          <div v-if="view.event.aggregate_id" class="notification-event-page__row">
            <dt>Order / aggregate</dt>
            <dd><CodeValue :value="view.event.aggregate_id" /></dd>
          </div>
          <div v-if="view.event.correlation_id" class="notification-event-page__row">
            <dt>Correlation</dt>
            <dd><CodeValue :value="view.event.correlation_id" /></dd>
          </div>
        </dl>
      </CardPanel>

      <CardPanel class="notification-event-page__card">
        <h3 class="notification-event-page__card-title">Consumption &amp; deduplication</h3>
        <div class="notification-event-page__badges">
          <StatusBadge tone="success" label="Durably consumed" dot />
          <StatusBadge
            v-if="view.duplicate_received"
            tone="warning"
            label="Duplicate received — deduplicated, no new job"
          />
        </div>
        <p v-if="view.received_count != null" class="notification-event-page__hint">
          Received {{ view.received_count }} time(s) (Kafka at-least-once). At-least-once means
          duplicates are normal; the inbox deduplicated them so no second job was created.
        </p>
      </CardPanel>

      <CardPanel class="notification-event-page__card" padding="none">
        <h3 class="notification-event-page__jobs-title">Resulting jobs</h3>
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
        <p v-else class="notification-event-page__hint">No delivery jobs were produced from this event.</p>
      </CardPanel>
    </template>

    <EmptyState v-else title="No event data" description="The API returned no content." />
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
