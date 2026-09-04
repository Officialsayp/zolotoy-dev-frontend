<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'

import { CHANNEL_LABELS, maskRecipient } from '../models/notification-domain'
import type { NotificationJobDto } from '../models/notification-dto'
import NotificationStatusBadge from './notification-status-badge.vue'

defineProps<{ jobs: NotificationJobDto[] }>()
</script>

<template>
  <CardPanel class="notification-list" padding="none">
    <div class="notification-list__scroll">
      <table class="notification-list__table">
        <caption class="notification-list__caption">
          Delivery jobs, newest first (keyset pagination)
        </caption>
        <thead>
          <tr>
            <th scope="col">Job</th>
            <th scope="col">Event</th>
            <th scope="col">Channel</th>
            <th scope="col">Recipient</th>
            <th scope="col">Status</th>
            <th scope="col" class="notification-list__num">Attempts</th>
            <th scope="col">Next attempt</th>
            <th scope="col">Last error</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id">
            <td>
              <RouterLink :to="`/notifications/${job.id}`" class="notification-list__link">
                <CodeValue :value="job.id" />
              </RouterLink>
            </td>
            <td>
              <RouterLink :to="`/notifications/events/${job.event_id}`" class="notification-list__link">
                <code class="notification-list__mono">{{ job.event_type }}</code>
              </RouterLink>
            </td>
            <td>{{ CHANNEL_LABELS[job.channel] }}</td>
            <td class="notification-list__recipient">{{ maskRecipient(job.recipient, job.channel) }}</td>
            <td><NotificationStatusBadge :status="job.status" /></td>
            <td class="notification-list__num">{{ job.attempt_count }}</td>
            <td>{{ job.next_attempt_at ? job.next_attempt_at : '—' }}</td>
            <td>
              <code v-if="job.last_error_code" class="notification-list__mono">{{ job.last_error_code }}</code>
              <span v-else>—</span>
            </td>
            <td>{{ job.created_at }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CardPanel>
</template>

<style scoped>
.notification-list__scroll {
  overflow-x: auto;
}

.notification-list__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.notification-list__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  white-space: nowrap;
}

.notification-list__table th,
.notification-list__table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: middle;
}

.notification-list__table thead th {
  color: var(--c-text-muted);
  font-weight: 600;
}

.notification-list__num {
  text-align: right !important;
}

.notification-list__link {
  color: inherit;
  text-decoration: none;
}

.notification-list__link:hover {
  color: var(--c-accent);
}

.notification-list__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.notification-list__recipient {
  white-space: nowrap;
}
</style>
