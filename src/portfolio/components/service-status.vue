<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'

const props = defineProps<{ service: ServiceCase }>()

const statusText = computed(() => {
  switch (props.service.implementationStatus) {
    case 'implemented':
      return 'Implemented'
    case 'in-development':
      return 'In development'
    default:
      return 'Planned'
  }
})
</script>

<template>
  <span :class="['status-pill', `status-pill--${service.implementationStatus}`]">
    {{ statusText }}
  </span>
</template>
