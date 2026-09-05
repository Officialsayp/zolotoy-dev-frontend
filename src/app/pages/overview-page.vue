<script setup lang="ts">
import { getServiceRegistry } from '@/shared/config/service-registry'
import ServiceOverviewCard from '@/app/shell/service-overview-card.vue'

const services = getServiceRegistry()
</script>

<template>
  <div class="overview">
    <section class="overview__intro">
      <p class="overview__kicker">zolotoy.dev</p>
      <p class="overview__blurb">
        A technical developer/admin environment for four Go backend portfolio services. Each module
        demonstrates a distinct backend mechanic with deterministic mock demos and live-ready
        integration.
      </p>
    </section>

    <div class="overview__grid">
      <ServiceOverviewCard v-for="service in services" :key="service.id" :service="service" />
    </div>
  </div>
</template>

<style scoped>
.overview__intro {
  margin-bottom: var(--space-6);
}

.overview__kicker {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-accent);
}

.overview__blurb {
  margin: 0;
  max-width: 64ch;
  color: var(--c-text-muted);
}

.overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: var(--space-4);
}
</style>
