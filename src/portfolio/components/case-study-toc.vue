<script setup lang="ts">
import { computed } from 'vue'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{
  /** Section anchors actually rendered on the page. */
  sections: { id: string; title: string }[]
  locale?: 'en' | 'ru'
}>()

const locale = computed(() => props.locale ?? 'en')
const navLabel = computed(() =>
  tr({ en: 'Case study sections', ru: 'Разделы кейса' }, locale.value),
)
const onThisPage = computed(() =>
  tr({ en: 'On this page', ru: 'На этой странице' }, locale.value),
)
</script>

<template>
  <nav class="case-toc" :aria-label="navLabel">
    <p class="case-toc__title">{{ onThisPage }}</p>
    <ol>
      <li v-for="section in sections" :key="section.id">
        <a :href="`#${section.id}`">{{ section.title }}</a>
      </li>
    </ol>
  </nav>
</template>
