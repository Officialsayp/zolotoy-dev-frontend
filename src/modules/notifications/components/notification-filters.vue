<script setup lang="ts">
import type { NotificationChannel, NotificationEventType, NotificationJobStatus } from '../models/notification-types'
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENT_TYPES, NOTIFICATION_STATUSES } from '../models/notification-types'

defineProps<{
  status: NotificationJobStatus | undefined
  channel: NotificationChannel | undefined
  eventType: NotificationEventType | undefined
}>()

const emit = defineEmits<{
  (e: 'update:status', value: NotificationJobStatus | undefined): void
  (e: 'update:channel', value: NotificationChannel | undefined): void
  (e: 'update:event-type', value: NotificationEventType | undefined): void
}>()

function emptyToUndefined(value: string): string | undefined {
  return value === '' ? undefined : value
}
</script>

<template>
  <div class="notification-filters" role="group" aria-label="Notification filters">
    <label class="notification-filters__field">
      <span class="notification-filters__label">Status</span>
      <select
        class="notification-filters__select"
        :value="status ?? ''"
        data-testid="filter-status"
        @change="emit('update:status', emptyToUndefined(($event.target as HTMLSelectElement).value) as NotificationJobStatus | undefined)"
      >
        <option value="">All</option>
        <option v-for="s in NOTIFICATION_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
    </label>

    <label class="notification-filters__field">
      <span class="notification-filters__label">Channel</span>
      <select
        class="notification-filters__select"
        :value="channel ?? ''"
        data-testid="filter-channel"
        @change="emit('update:channel', emptyToUndefined(($event.target as HTMLSelectElement).value) as NotificationChannel | undefined)"
      >
        <option value="">All</option>
        <option v-for="c in NOTIFICATION_CHANNELS" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>

    <label class="notification-filters__field notification-filters__field--event">
      <span class="notification-filters__label">Event type</span>
      <select
        class="notification-filters__select"
        :value="eventType ?? ''"
        data-testid="filter-event-type"
        @change="emit('update:event-type', emptyToUndefined(($event.target as HTMLSelectElement).value) as NotificationEventType | undefined)"
      >
        <option value="">All</option>
        <option v-for="e in NOTIFICATION_EVENT_TYPES" :key="e" :value="e">{{ e }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.notification-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.notification-filters__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.notification-filters__label {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.notification-filters__select {
  width: 100%;
  min-width: 0;
  padding: 6px var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  font-family: inherit;
}

@media (max-width: 760px) {
  .notification-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .notification-filters__field--event {
    grid-column: 1 / -1;
  }
}

@media (max-width: 420px) {
  .notification-filters {
    grid-template-columns: 1fr;
  }

  .notification-filters__field--event {
    grid-column: auto;
  }
}
</style>
