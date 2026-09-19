<script setup lang="ts">
import { computed } from 'vue'
import { SERVICE_CASES } from '@/content/service-registry'
import { currentMilestone } from '@/content/roadmap'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()
const locale = computed(() => props.locale ?? 'en')

const order = computed(() => SERVICE_CASES.find((s) => s.id === 'order'))
const milestone = computed(() => currentMilestone())

const copy = computed(() => ({
  currentMilestone: tr({ en: 'Current milestone', ru: 'Текущая веха' }, locale.value),
  acceptance: tr({ en: 'Acceptance evidence (planned):', ru: 'Критерии приёмки (план):' }, locale.value),
  orderNow: tr({ en: 'Order service now', ru: 'Order-сервис сейчас' }, locale.value),
  runtime: tr({ en: 'Runtime', ru: 'Рантайм' }, locale.value),
  demoData: tr({ en: 'Demo data', ru: 'Данные демо' }, locale.value),
  mocked: tr({ en: 'mocked (MSW)', ru: 'моки (MSW)' }, locale.value),
}))
</script>

<template>
  <div class="portfolio-grid">
    <article class="portfolio-card">
      <h3>{{ copy.currentMilestone }}: {{ milestone ? tr(milestone.title, locale) : '' }}</h3>
      <p>{{ milestone ? tr(milestone.summary, locale) : '' }}</p>
      <p><strong>{{ copy.acceptance }}</strong></p>
      <ul>
        <li v-for="item in milestone?.acceptanceEvidence" :key="item.en">{{ tr(item, locale) }}</li>
      </ul>
    </article>
    <article class="portfolio-card">
      <h3>{{ copy.orderNow }}</h3>
      <p>{{ order ? tr(order.summary, locale) : '' }}</p>
      <p>
        <strong>{{ copy.runtime }}:</strong> {{ order ? tr(order.runtimeLabel, locale) : '' }}.
        <strong>{{ copy.demoData }}:</strong> {{ copy.mocked }}
      </p>
    </article>
  </div>
</template>
