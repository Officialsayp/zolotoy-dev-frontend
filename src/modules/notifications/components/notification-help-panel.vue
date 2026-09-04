<script setup lang="ts">
import { getService } from '@/shared/config/service-registry'
import CardPanel from '@/shared/ui/card-panel.vue'

const grafanaUrl = getService('notification').grafanaUrl
const swaggerPath = getService('notification').swaggerPath
</script>

<template>
  <CardPanel class="notification-help" data-testid="notification-help">
    <h3 class="notification-help__title">Delivery semantics</h3>
    <ul class="notification-help__list">
      <li>
        <strong>Kafka DLQ</strong> — an input event that could not be parsed/validated (a poison
        message). There is no HTTP listing endpoint for it here.
      </li>
      <li>
        <strong>Dead delivery job</strong> — a valid event whose specific notification exhausted its
        retry budget (<code>status=dead</code>). These are retriable from the job detail.
      </li>
      <li>
        <strong>Not exactly-once.</strong> Kafka events are processed at-least-once; duplicates are
        normal and durably deduplicated. External providers can rarely see a duplicate side effect in
        a crash window, so we never claim exactly-once delivery.
      </li>
      <li>
        <strong>No paginated-page statistics.</strong> In-app global success rates would be
        misleading when derived from one page; real operational metrics belong in an observability
        system, which we link to when configured.
      </li>
    </ul>

    <div v-if="grafanaUrl" class="notification-help__links">
      <a :href="grafanaUrl" target="_blank" rel="noopener noreferrer" class="notification-help__link">
        Open Grafana
      </a>
    </div>
    <div v-else class="notification-help__links">
      <span class="notification-help__muted">Grafana is not configured for this deployment.</span>
      <span class="notification-help__muted">
        Operational endpoints: <code>{{ swaggerPath }}</code>, <code>/metrics</code>, <code>/health/*</code>.
      </span>
    </div>
  </CardPanel>
</template>

<style scoped>
.notification-help__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-md);
}

.notification-help__list {
  margin: 0;
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.notification-help__list strong {
  color: var(--c-text);
}

.notification-help__list code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.notification-help__links {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-sm);
}

.notification-help__link {
  color: var(--c-accent);
  font-weight: 600;
}

.notification-help__muted {
  color: var(--c-text-subtle);
}
</style>
