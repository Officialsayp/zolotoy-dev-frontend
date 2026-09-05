<script setup lang="ts">
import { getService } from '@/shared/config/service-registry'
import CardPanel from '@/shared/ui/card-panel.vue'

const service = getService('shortener')
</script>

<template>
  <CardPanel class="shortener-help" data-testid="shortener-help">
    <h3 class="shortener-help__title">Cache &amp; performance boundary</h3>
    <p class="shortener-help__text">
      This console shows the observable management surface of the shortener. Redis cache-aside,
      singleflight stampede protection, negative caching and the bounded analytics pipeline are
      backend internals — there is intentionally no Redis-key inspector or cache state UI here.
      Their evidence lives in observability and the performance report.
    </p>

    <div class="shortener-help__links">
      <a
        v-if="service.grafanaUrl"
        :href="service.grafanaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="shortener-help__link"
      >
        Open Grafana
      </a>
      <span v-else class="shortener-help__muted">Grafana is not configured for this deployment.</span>

      <a
        v-if="service.githubUrl"
        :href="service.githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="shortener-help__link"
      >
        Performance report / load tests
      </a>

      <span class="shortener-help__muted">
        Operational endpoints: <code>{{ service.swaggerPath }}</code>, <code>/metrics</code>,
        <code>/health/*</code>.
      </span>
    </div>
  </CardPanel>
</template>

<style scoped>
.shortener-help__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-md);
}

.shortener-help__text {
  margin: 0 0 var(--space-2);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
  max-width: 70ch;
}

.shortener-help__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-sm);
}

.shortener-help__link {
  color: var(--c-accent);
  font-weight: 600;
}

.shortener-help__muted {
  color: var(--c-text-subtle);
}

.shortener-help__links code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
