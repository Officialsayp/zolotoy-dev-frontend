<script setup lang="ts">
defineProps<{
  /** Section anchors actually rendered on the page. */
  sections: { id: string; title: string }[]
}>()
</script>

<template>
  <nav class="case-toc" aria-label="Case study sections">
    <p class="case-toc__title">On this page</p>
    <ol>
      <li v-for="section in sections" :key="section.id">
        <a :href="`#${section.id}`">{{ section.title }}</a>
      </li>
    </ol>
  </nav>
</template>
