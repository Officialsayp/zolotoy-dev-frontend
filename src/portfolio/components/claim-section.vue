<script setup lang="ts">
import type { ServiceClaim } from '@/content/types'
import EvidenceList from './evidence-list.vue'
import type { EvidenceSource } from '@/content/types'

const props = defineProps<{
  title: string
  claims: ServiceClaim[]
  evidence: EvidenceSource[]
}>()

function evidenceFor(claim: ServiceClaim): EvidenceSource[] {
  return props.evidence.filter((item) => claim.evidenceIds.includes(item.id))
}
</script>

<template>
  <ul class="claim-list">
    <li v-for="claim in claims" :key="claim.id" class="claim-list__item">
      <span :class="['status-pill', `status-pill--${claim.category}`]">
        {{ claim.category === 'current' ? 'Current' : claim.category === 'target' ? 'Target' : 'Measured' }}
      </span>
      <p>{{ claim.text }}</p>
      <EvidenceList v-if="evidenceFor(claim).length > 0" :evidence="evidenceFor(claim)" />
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
