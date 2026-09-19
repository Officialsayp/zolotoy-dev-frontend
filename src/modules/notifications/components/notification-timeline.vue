<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { labelFor } from '@/shared/i18n/label-strings'
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

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  eventOrigin: tr({ en: 'Event origin', ru: 'Источник события' }, locale.value),
  eventType: tr({ en: 'Event type', ru: 'Тип события' }, locale.value),
  event: tr({ en: 'Event', ru: 'Событие' }, locale.value),
  attempts: tr({ en: 'Attempts', ru: 'Попытки' }, locale.value),
  noAttempts: tr({ en: 'No attempts recorded yet.', ru: 'Попытки пока не записаны.' }, locale.value),
  jobKicker: tr({ en: 'Notification job', ru: 'Задача уведомления' }, locale.value),
  channel: tr({ en: 'Channel', ru: 'Канал' }, locale.value),
  template: tr({ en: 'Template', ru: 'Шаблон' }, locale.value),
  attemptKicker: tr({ en: 'Attempt', ru: 'Попытка' }, locale.value),
  result: tr({ en: 'Result', ru: 'Результат' }, locale.value),
  providerStatus: tr({ en: 'Provider status', ru: 'Статус провайдера' }, locale.value),
  errorCode: tr({ en: 'Error code', ru: 'Код ошибки' }, locale.value),
  latency: tr({ en: 'Latency', ru: 'Задержка' }, locale.value),
  started: tr({ en: 'Started', ru: 'Начата' }, locale.value),
  outcome: tr({ en: 'Outcome', ru: 'Итог' }, locale.value),
  lastErrorCode: tr({ en: 'Last error code', ru: 'Код последней ошибки' }, locale.value),
}))
</script>

<template>
  <ol class="notification-timeline" data-testid="notification-timeline">
    <!-- Event origin -->
    <li class="notification-timeline__node">
      <div class="notification-timeline__rail" aria-hidden="true" />
      <div class="notification-timeline__card notification-timeline__card--event">
        <p class="notification-timeline__kicker">{{ labels.eventOrigin }}</p>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.eventType }}</span>
          <code class="notification-timeline__mono">{{ event?.event_type ?? job.event_type }}</code>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.event }}</span>
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
        <p class="notification-timeline__kicker">{{ labels.jobKicker }}</p>
        <div class="notification-timeline__status">
          <NotificationStatusBadge :status="job.status" />
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.channel }}</span>
          <span>{{ labelFor(CHANNEL_LABELS[job.channel], locale) }}</span>
        </div>
        <div v-if="job.template_key" class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.template }}</span>
          <code class="notification-timeline__mono">{{ job.template_key }}</code>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.attempts }}</span>
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
        <p class="notification-timeline__kicker">{{ labels.attemptKicker }} #{{ attempt.attempt_no }}</p>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.result }}</span>
          <code class="notification-timeline__mono">{{ attemptDisplay(attempt).label }}</code>
        </div>
        <div v-if="attempt.provider_status" class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.providerStatus }}</span>
          <code class="notification-timeline__mono">{{ attempt.provider_status }}</code>
        </div>
        <div v-if="attempt.error_code" class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.errorCode }}</span>
          <code class="notification-timeline__mono" data-testid="attempt-error-code">{{ attempt.error_code }}</code>
        </div>
        <div v-if="attempt.latency_ms != null" class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.latency }}</span>
          <span>{{ attempt.latency_ms }} ms</span>
        </div>
        <div class="notification-timeline__row">
          <span class="notification-timeline__label">{{ labels.started }}</span>
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
        <p class="notification-timeline__kicker">{{ labels.outcome }}</p>
        <div class="notification-timeline__status">
          <NotificationStatusBadge :status="job.status" />
        </div>
        <p v-if="job.last_error_code" class="notification-timeline__hint">
          {{ labels.lastErrorCode }}: <code class="notification-timeline__mono">{{ job.last_error_code }}</code>
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
