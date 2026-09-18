<script setup lang="ts">
import type { ServiceDiagram } from '@/content/types'

defineProps<{ diagram: ServiceDiagram }>()
</script>

<template>
  <figure class="arch-diagram">
    <span :class="['arch-diagram__badge', `arch-diagram__badge--${diagram.category}`]">
      {{ diagram.category === 'current' ? 'Current' : 'Target' }}
    </span>
    <ul class="arch-diagram__flow">
      <li
        v-for="node in diagram.nodes"
        :key="node.id"
        :class="{ 'is-planned': node.planned === true }"
      >
        <span class="arch-diagram__node-label">{{ node.label }}</span>
        <span class="arch-diagram__node-desc">{{ node.description }}</span>
      </li>
    </ul>
    <ul class="arch-diagram__connections">
      <li v-for="(connection, index) in diagram.connections" :key="index">
        {{ connection.label }}: {{ connection.from }} → {{ connection.to }}
        <template v-if="connection.planned"> (planned)</template>
      </li>
    </ul>
    <figcaption>{{ diagram.caption }}</figcaption>
  </figure>
</template>
