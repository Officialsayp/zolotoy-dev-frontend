<script setup lang="ts">
import { SITE_CONTENT } from '@/content/site'
</script>

<template>
  <section class="portfolio-hero">
    <p class="portfolio-hero__subtitle">{{ SITE_CONTENT.hero.subtitle }}</p>
    <h1>{{ SITE_CONTENT.hero.title }}</h1>
    <p class="portfolio-hero__intro">{{ SITE_CONTENT.hero.intro }}</p>
    <div class="portfolio-hero__ctas">
      <a class="portfolio-btn portfolio-btn--primary" href="/services/order/">Explore Order Service</a>
      <a
        class="portfolio-btn portfolio-btn--secondary"
        href="https://github.com/Officialsayp/zolotoy-dev-backend"
        rel="noopener noreferrer"
      >View backend source</a>
      <a class="portfolio-btn portfolio-btn--secondary" href="/demo/">Open interactive demo</a>
    </div>
  </section>
</template>
