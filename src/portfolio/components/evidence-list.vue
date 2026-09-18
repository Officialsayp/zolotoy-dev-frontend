<script setup lang="ts">
import type { EvidenceSource } from '@/content/types'

defineProps<{ evidence: EvidenceSource[] }>()

function evidenceHref(item: EvidenceSource): string {
  if (item.repository.startsWith('http')) {
    const base = item.repository.replace(/\/+$/, '')
    return `${base}/tree/${item.revision ?? 'main'}/${item.path}`
  }
  return `#${item.path}`
}

function isLink(item: EvidenceSource): boolean {
  return item.repository.startsWith('http')
}
</script>

<template>
  <ul class="evidence-list">
    <li v-for="item in evidence" :key="item.id">
      <strong>{{ item.label }}</strong>
      <span aria-hidden="true"> — </span>
      <template v-if="isLink(item)">
        <a :href="evidenceHref(item)" rel="noopener noreferrer">
          <code>{{ item.path }}</code>
        </a>
      </template>
      <template v-else>
        <code>{{ item.path }}</code>
      </template>
      <span aria-hidden="true"> · </span>
      <span>{{ item.repository }}</span>
      <span v-if="item.revision" aria-hidden="true"> · </span>
      <span v-if="item.revision"><code>{{ item.revision.slice(0, 8) }}</code></span>
      <span aria-hidden="true"> · </span>
      <span>reviewed {{ item.reviewedOn }}</span>
    </li>
  </ul>
</template>
