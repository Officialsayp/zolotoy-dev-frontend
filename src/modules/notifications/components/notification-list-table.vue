<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'

import { CHANNEL_LABELS, maskRecipient } from '../models/notification-domain'
import type { NotificationJobDto } from '../models/notification-dto'
import NotificationStatusBadge from './notification-status-badge.vue'

defineProps<{ jobs: NotificationJobDto[] }>()

function shortId(value: string): string {
  if (value.length <= 18) return value
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}
</script>

<template>
  <CardPanel class="notification-list" padding="none">
    <!-- Wide desktop: dense operational table. -->
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
              <div class="notification-list__job-ref">
                <CodeValue :value="job.id" :display="shortId(job.id)" />
                <RouterLink
                  :to="`/notifications/${job.id}`"
                  class="notification-list__link notification-list__open-link"
                >
                  Open
                </RouterLink>
              </div>
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

    <!-- Phones, tablets and narrower desktop content: cards avoid horizontal scrolling. -->
    <div class="notification-list__cards" role="list" aria-label="Delivery jobs, newest first">
      <article v-for="job in jobs" :key="job.id" class="notification-list__card" role="listitem">
        <header class="notification-list__card-header">
          <div class="notification-list__card-job">
            <span class="notification-list__field-label">Job</span>
            <div class="notification-list__job-ref">
              <CodeValue :value="job.id" :display="shortId(job.id)" />
              <RouterLink
                :to="`/notifications/${job.id}`"
                class="notification-list__link notification-list__open-link"
              >
                Open
              </RouterLink>
            </div>
          </div>
          <NotificationStatusBadge :status="job.status" />
        </header>

        <dl class="notification-list__details">
          <div class="notification-list__detail notification-list__detail--wide">
            <dt>Event</dt>
            <dd>
              <RouterLink :to="`/notifications/events/${job.event_id}`" class="notification-list__link">
                <code class="notification-list__mono notification-list__wrap">{{ job.event_type }}</code>
              </RouterLink>
            </dd>
          </div>

          <div class="notification-list__detail">
            <dt>Channel</dt>
            <dd>{{ CHANNEL_LABELS[job.channel] }}</dd>
          </div>

          <div class="notification-list__detail">
            <dt>Attempts</dt>
            <dd>{{ job.attempt_count }}</dd>
          </div>

          <div class="notification-list__detail notification-list__detail--wide">
            <dt>Recipient</dt>
            <dd class="notification-list__wrap">{{ maskRecipient(job.recipient, job.channel) }}</dd>
          </div>

          <div class="notification-list__detail notification-list__detail--wide">
            <dt>Last error</dt>
            <dd>
              <code v-if="job.last_error_code" class="notification-list__mono notification-list__wrap">
                {{ job.last_error_code }}
              </code>
              <span v-else>—</span>
            </dd>
          </div>

          <div class="notification-list__detail notification-list__detail--wide">
            <dt>Next attempt</dt>
            <dd class="notification-list__wrap">{{ job.next_attempt_at || '—' }}</dd>
          </div>

          <div class="notification-list__detail notification-list__detail--wide">
            <dt>Created</dt>
            <dd class="notification-list__wrap">{{ job.created_at }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </CardPanel>
</template>

<style scoped>
.notification-list__scroll {
  overflow-x: auto;
}

.notification-list__cards {
  display: none;
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
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.notification-list__table th,
.notification-list__table td {
  min-width: 0;
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.notification-list__table thead th {
  color: var(--c-text-muted);
  font-weight: 600;
}

.notification-list__num {
  text-align: right !important;
}

.notification-list__job-ref {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.notification-list__job-ref :deep(.code-value) {
  min-width: 0;
}

.notification-list__link {
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.notification-list__link:hover,
.notification-list__link:focus-visible {
  color: var(--c-accent);
}

.notification-list__open-link {
  flex: 0 0 auto;
  color: var(--c-accent);
  font-size: var(--text-xs);
  font-weight: 600;
}

.notification-list__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.notification-list__recipient {
  white-space: normal;
  overflow-wrap: anywhere;
}

.notification-list__wrap {
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* The desktop shell reserves 240px for the sidebar. Keep the card layout until
   the viewport is wide enough for all nine operational columns to remain readable. */
@media (max-width: 1399.98px) {
  .notification-list__scroll {
    display: none;
  }

  .notification-list__cards {
    display: block;
  }

  .notification-list__card {
    padding: var(--space-4);
  }

  .notification-list__card + .notification-list__card {
    border-top: 1px solid var(--c-border);
  }

  .notification-list__card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .notification-list__card-job {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .notification-list__field-label,
  .notification-list__detail dt {
    color: var(--c-text-muted);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .notification-list__details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3) var(--space-4);
    margin: var(--space-4) 0 0;
  }

  .notification-list__detail {
    min-width: 0;
  }

  .notification-list__detail--wide {
    grid-column: 1 / -1;
  }

  .notification-list__detail dt,
  .notification-list__detail dd {
    margin: 0;
  }

  .notification-list__detail dd {
    margin-top: 2px;
    color: var(--c-text);
    line-height: 1.45;
  }
}

@media (max-width: 479.98px) {
  .notification-list__details {
    grid-template-columns: 1fr;
  }

  .notification-list__detail--wide {
    grid-column: auto;
  }
}
</style>
