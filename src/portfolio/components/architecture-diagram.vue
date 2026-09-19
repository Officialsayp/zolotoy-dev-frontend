<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceDiagram } from '@/content/types'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ diagram: ServiceDiagram; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')
const plannedWord = computed(() => tr({ en: 'planned', ru: 'план' }, locale.value))
</script>

<template>
  <figure class="arch-diagram">
    <span :class="['arch-diagram__badge', `arch-diagram__badge--${diagram.category}`]">
      {{ diagram.category === 'current' ? tr({ en: 'Current', ru: 'Текущая' }, locale) : tr({ en: 'Target', ru: 'Целевая' }, locale) }}
    </span>
    <ul class="arch-diagram__flow">
      <li
        v-for="node in diagram.nodes"
        :key="node.id"
        :class="{ 'is-planned': node.planned === true }"
      >
        <span class="arch-diagram__node-label">{{ tr(node.label, locale) }}</span>
        <span class="arch-diagram__node-desc">{{ tr(node.description, locale) }}</span>
      </li>
    </ul>
    <ul class="arch-diagram__connections">
      <li v-for="(connection, index) in diagram.connections" :key="index">
        {{ tr(connection.label, locale) }}: {{ connection.from }} → {{ connection.to }}
        <template v-if="connection.planned"> ({{ plannedWord }})</template>
      </li>
    </ul>
    <figcaption>{{ tr(diagram.caption, locale) }}</figcaption>
  </figure>
</template>
