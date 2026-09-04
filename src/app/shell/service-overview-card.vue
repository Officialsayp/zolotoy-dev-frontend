<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { BookOpen, Github, Gauge, ArrowRight } from 'lucide-vue-next'

import type { ServiceEntry } from '@/shared/config/service-registry'
import StatusBadge from '@/shared/ui/status-badge.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import { useAppStore } from '@/app/stores/app-store'
import { useServiceHealth } from './use-service-health'

const props = defineProps<{ service: ServiceEntry }>()

const app = useAppStore()
const { isMock } = storeToRefs(app)
const { data: health } = useServiceHealth(props.service.id)

const healthLabel = computed(() => {
  if (health.value === 'healthy') return isMock.value ? 'Simulated' : 'Live'
  if (health.value === 'degraded') return 'Degraded'
  return 'Unknown'
})

const healthTone = computed(() => {
  if (health.value === 'healthy') return 'success'
  if (health.value === 'degraded') return 'warning'
  return 'neutral'
})
</script>

<template>
  <CardPanel class="service-card">
    <div class="service-card__head">
      <h3 class="service-card__name">{{ service.name }}</h3>
      <StatusBadge :tone="healthTone" :label="healthLabel" />
    </div>

    <p class="service-card__focus">{{ service.focus }}</p>

    <div class="service-card__actions">
      <RouterLink :to="service.routePath" class="service-card__demo">
        Open demo <ArrowRight aria-hidden="true" />
      </RouterLink>

      <a
        v-if="service.apiDocsUrl"
        :href="service.apiDocsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="service-card__link"
        title="OpenAPI specification"
      >
        <BookOpen aria-hidden="true" /> OpenAPI
      </a>
      <a
        v-if="service.githubUrl"
        :href="service.githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="service-card__link"
        title="Source repository"
      >
        <Github aria-hidden="true" /> Source
      </a>
      <a
        v-if="service.grafanaUrl"
        :href="service.grafanaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="service-card__link"
        title="Observability dashboard"
      >
        <Gauge aria-hidden="true" /> Grafana
      </a>
    </div>
  </CardPanel>
</template>

<style scoped>
.service-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.service-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.service-card__name {
  margin: 0;
  font-size: var(--text-lg);
}

.service-card__focus {
  margin: 0;
  color: var(--c-text-muted);
}

.service-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.service-card__demo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--c-accent);
  color: var(--c-accent-contrast);
  font-size: var(--text-sm);
  font-weight: 550;
  text-decoration: none;
}

.service-card__demo:hover {
  background: var(--c-accent-strong);
  text-decoration: none;
}

.service-card__demo :deep(svg) {
  width: 14px;
  height: 14px;
}

.service-card__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.service-card__link:hover {
  color: var(--c-accent);
}

.service-card__link :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
