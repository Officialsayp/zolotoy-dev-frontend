<script setup lang="ts">
import { computed } from 'vue'
import { SERVICE_CASES } from '@/content/service-registry'
import { currentMilestone } from '@/content/roadmap'

const order = computed(() => SERVICE_CASES.find((s) => s.id === 'order'))
const milestone = computed(() => currentMilestone())
</script>

<template>
  <div class="portfolio-grid">
    <article class="portfolio-card">
      <h3>Current milestone: {{ milestone?.title }}</h3>
      <p>{{ milestone?.summary }}</p>
      <p><strong>Acceptance evidence (planned):</strong></p>
      <ul>
        <li v-for="item in milestone?.acceptanceEvidence" :key="item">{{ item }}</li>
      </ul>
    </article>
    <article class="portfolio-card">
      <h3>Order service now</h3>
      <p>{{ order?.summary }}</p>
      <p><strong>Runtime:</strong> {{ order?.runtimeLabel }}. <strong>Demo data:</strong> mocked (MSW).</p>
    </article>
  </div>
</template>
