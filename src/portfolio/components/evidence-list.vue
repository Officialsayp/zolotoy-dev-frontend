<script setup lang="ts">
import { computed } from 'vue'
import type { EvidenceSource } from '@/content/types'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ evidence: EvidenceSource[]; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')

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

const reviewedLabel = computed(() =>
  tr({ en: 'reviewed', ru: 'проверено' }, locale.value),
)
</script>

<template>
  <ul class="evidence-list">
    <li v-for="item in evidence" :key="item.id">
      <strong>{{ tr(item.label, locale) }}</strong>
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
      <span>{{ reviewedLabel }} {{ item.reviewedOn }}</span>
    </li>
  </ul>
</template>
