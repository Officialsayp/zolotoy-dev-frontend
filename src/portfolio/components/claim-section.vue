<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceClaim, EvidenceSource } from '@/content/types'
import { tr } from '@/portfolio/i18n'
import EvidenceList from './evidence-list.vue'

const props = defineProps<{
  title: string
  claims: ServiceClaim[]
  evidence: EvidenceSource[]
  locale?: 'en' | 'ru'
}>()

const locale = computed(() => props.locale ?? 'en')

function evidenceFor(claim: ServiceClaim): EvidenceSource[] {
  return props.evidence.filter((item) => claim.evidenceIds.includes(item.id))
}

function categoryLabel(category: string): string {
  if (category === 'current') return tr({ en: 'Current', ru: 'Current' }, locale.value)
  if (category === 'target') return tr({ en: 'Target', ru: 'Target' }, locale.value)
  return tr({ en: 'Measured', ru: 'Measured' }, locale.value)
}
</script>

<template>
  <ul class="claim-list">
    <li v-for="claim in claims" :key="claim.id" class="claim-list__item">
      <span :class="['status-pill', `status-pill--${claim.category}`]">
        {{ categoryLabel(claim.category) }}
      </span>
      <p>{{ tr(claim.text, locale) }}</p>
      <EvidenceList
        v-if="evidenceFor(claim).length > 0"
        :evidence="evidenceFor(claim)"
        :locale="locale"
      />
    </li>
  </ul>
</template>

<style scoped>
.claim-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.claim-list__item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.claim-list__item p {
  margin: var(--space-2) 0;
  color: var(--c-text);
  max-width: 76ch;
}
</style>
