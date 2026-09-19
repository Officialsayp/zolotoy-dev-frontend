<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ service: ServiceCase; locale?: 'en' | 'ru' }>()

const statusText = computed(() => {
  const locale = props.locale ?? 'en'
  switch (props.service.implementationStatus) {
    case 'implemented':
      return tr({ en: 'Implemented', ru: 'Реализован' }, locale)
    case 'in-development':
      return tr({ en: 'In development', ru: 'В разработке' }, locale)
    default:
      return tr({ en: 'Planned', ru: 'Запланирован' }, locale)
  }
})
</script>

<template>
  <span :class="['status-pill', `status-pill--${service.implementationStatus}`]">
    {{ statusText }}
  </span>
</template>
