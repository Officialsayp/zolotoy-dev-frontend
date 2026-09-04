<script setup lang="ts">
import CodeValue from '@/shared/ui/code-value.vue'

import { attemptDisplay, CHANNEL_LABELS } from '../models/notification-domain'
import type { NotificationAttemptDto, NotificationEventDto, NotificationJobDto } from '../models/notification-dto'
import NotificationStatusBadge from './notification-status-badge.vue'

withDefaults(
  defineProps<{
    job: NotificationJobDto
    attempts: NotificationAttemptDto[]
    event?: NotificationEventDto | null
  }>(),
  { event: null },
)
</script>

<template>
  <ol class="notification-timeline" data-testid="notification-timeline">
    <!-- Event origin -->
    <li class="notification-timeline__node">
      <div class="notification-timeline__rail" aria-hidden="true" />
      <div class="notification-timeline__card notification-timeline__card--event">
        <p class="notification-timeline__kicker">Event origin</p>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Event type</span>
          <code class="notification-timeline__mono">{{ event?.event_type ?? job.event_type }}</code>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Event</span>
          <RouterLink :to="`/notifications/events/${job.event_id}`" class="notification-timeline__link">
            <CodeValue :value="job.event_id" />
          </RouterLink>
        </div>
        <template v-if="event">
          <div v-if="event.producer" class="notification-timeline__row">
            <span class="notification-timeline__label">Producer</span>
            <code class="notification-timeline__mono">{{ event.producer }}</code>
          </div>
          <div v-if="event.aggregate_id" class="notification-timeline__row">
            <span class="notification-timeline__label">Order / aggregate</span>
            <CodeValue :value="event.aggregate_id" />
          </div>
          <div v-if="event.correlation_id" class="notification-timeline__row">
            <span class="notification-timeline__label">Correlation</span>
            <CodeValue :value="event.correlation_id" />
          </div>
        </template>
      </div>
    </li>

    <!-- Notification job -->
    <li class="notification-timeline__node">
      <div class="notification-timeline__rail" aria-hidden="true" />
      <div class="notification-timeline__card notification-timeline__card--job">
        <p class="notification-timeline__kicker">Notification job</p>
        <div class="notification-timeline__status">
          <NotificationStatusBadge :status="job.status" />
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Channel</span>
          <span>{{ CHANNEL_LABELS[job.channel] }}</span>
        </div>
        <div v-if="job.template_key" class="notification-timeline__row">
          <span class="notification-timeline__label">Template</span>
          <code class="notification-timeline__mono">{{ job.template_key }}</code>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Attempts</span>
          <span>{{ job.attempt_count }}</span>
        </div>
      </div>
    </li>

    <!-- Attempts -->
    <li
      v-for="attempt in attempts"
      :key="attempt.attempt_no"
      class="notification-timeline__node"
    >
      <div class="notification-timeline__rail" aria-hidden="true" />
      <div class="notification-timeline__card notification-timeline__card--attempt">
        <p class="notification-timeline__kicker">Attempt #{{ attempt.attempt_no }}</p>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Result</span>
          <code class="notification-timeline__mono">{{ attemptDisplay(attempt).label }}</code>
        </div>
        <div v-if="attempt.provider_status" class="notification-timeline__row">
          <span class="notification-timeline__label">Provider status</span>
          <code class="notification-timeline__mono">{{ attempt.provider_status }}</code>
        </div>
        <div v-if="attempt.error_code" class="notification-timeline__row">
          <span class="notification-timeline__label">Error code</span>
          <code class="notification-timeline__mono" data-testid="attempt-error-code">{{ attempt.error_code }}</code>
        </div>
        <div v-if="attempt.latency_ms != null" class="notification-timeline__row">
          <span class="notification-timeline__label">Latency</span>
          <span>{{ attempt.latency_ms }} ms</span>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">Started</span>
          <span>{{ attempt.started_at ?? '—' }}</span>
        </div>
        <p v-if="attemptDisplay(attempt).safeErrorMessage" class="notification-timeline__hint">
          {{ attemptDisplay(attempt).safeErrorMessage }}
        </p>
      </div>
    </li>

    <!-- Terminal outcome -->
    <li class="notification-timeline__node">
      <div class="notification-timeline__rail--end" aria-hidden="true" />
      <div
        class="notification-timeline__card notification-timeline__card--outcome"
        :class="{
          'notification-timeline__card--outcome-sent': job.status === 'sent',
          'notification-timeline__card--outcome-dead': job.status === 'dead',
          'notification-timeline__card--outcome-active':
            job.status === 'pending' || job.status === 'processing' || job.status === 'retry_wait',
        }"
      >
        <p class="notification-timeline__kicker">Outcome</p>
        <div class="notification-timeline__status">
          <NotificationStatusBadge :status="job.status" />
        </div>
        <p v-if="job.last_error_code" class="notification-timeline__hint">
          Last error code: <code class="notification-timeline__mono">{{ job.last_error_code }}</code>
        </p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.notification-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.notification-timeline__node {
  position: relative;
  display: flex;
  gap: var(--space-3);
}

.notification-timeline__rail,
.notification-timeline__rail--end {
  flex: none;
  width: 2px;
  background: var(--c-border-strong);
  align-self: stretch;
  margin-left: 7px;
}

.notification-timeline__rail--end {
  background: var(--c-accent);
}

.notification-timeline__card {
  flex: 1;
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--surface-card);
}

.notification-timeline__card--event {
  border-left: 3px solid var(--c-accent);
}

.notification-timeline__card--job {
  border-left: 3px solid var(--c-info);
}

.notification-timeline__card--attempt {
  border-left: 3px solid var(--c-text-subtle);
}

.notification-timeline__card--outcome {
  border-left: 3px solid var(--c-border-strong);
}

.notification-timeline__card--outcome-sent {
  border-left-color: var(--c-success);
}

.notification-timeline__card--outcome-dead {
  border-left-color: var(--c-danger);
}

.notification-timeline__card--outcome-active {
  border-left-color: var(--c-info);
}

.notification-timeline__kicker {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 650;
  color: var(--c-text-muted);
}

.notification-timeline__status {
  margin-bottom: var(--space-2);
}

.notification-timeline__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-sm);
  padding: 2px 0;
}

.notification-timeline__label {
  color: var(--c-text-subtle);
  flex: 0 0 140px;
}

.notification-timeline__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.notification-timeline__link {
  color: inherit;
  text-decoration: none;
}

.notification-timeline__link:hover {
  color: var(--c-accent);
}

.notification-timeline__hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
}
</style>
