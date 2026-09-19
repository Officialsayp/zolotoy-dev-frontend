<script setup lang="ts">
import { computed } from 'vue'
import { ROADMAP_MILESTONES } from '@/content/roadmap'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()
const locale = computed(() => props.locale ?? 'en')

const stateLabel = computed(() => ({
  current: tr({ en: 'Current', ru: 'Текущая' }, locale.value),
  completed: tr({ en: 'Completed', ru: 'Завершена' }, locale.value),
  future: tr({ en: 'Future', ru: 'Далее' }, locale.value),
  services: tr({ en: 'Services', ru: 'Сервисы' }, locale.value),
}))
</script>

<template>
  <ol class="roadmap-list">
    <li
      v-for="milestone in ROADMAP_MILESTONES"
      :key="milestone.id"
      :class="['roadmap-item', milestone.state === 'current' ? 'roadmap-item--current' : '']"
    >
      <span :class="['roadmap-item__state', `roadmap-item__state--${milestone.state}`]">
        {{ stateLabel[milestone.state] }}
      </span>
      <h3>{{ tr(milestone.title, locale) }}</h3>
      <p>{{ tr(milestone.summary, locale) }}</p>
      <p class="roadmap-item__services">
        {{ stateLabel.services }}: {{ milestone.serviceIds.join(', ') }}
      </p>
    </li>
  </ol>
</template>

<style scoped>
.roadmap-item h3 {
  margin: var(--space-1) 0;
}

.roadmap-item__services {
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
  margin: 0;
}
</style>
