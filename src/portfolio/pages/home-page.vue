<script setup lang="ts">
/**
 * Portfolio home. Fixed section order:
 * Hero → Current Engineering Focus → Services → System Architecture →
 * Engineering Principles → Roadmap → Source/Demo/Author → (footer in shell).
 */
import HomeHero from '@/portfolio/components/home-hero.vue'
import CurrentFocus from '@/portfolio/components/current-focus.vue'
import ServiceGrid from '@/portfolio/components/service-grid.vue'
import RoadmapTimeline from '@/portfolio/components/roadmap-timeline.vue'
import { SITE_CONTENT } from '@/content/site'
</script>

<template>
  <HomeHero />

  <section class="portfolio-section" aria-labelledby="focus-heading">
    <h2 id="focus-heading">Current Engineering Focus</h2>
    <CurrentFocus />
  </section>

  <section class="portfolio-section" aria-labelledby="services-heading">
    <h2 id="services-heading">Services</h2>
    <p>
      Four backend case studies. Order is in development; Auth, Notification and
      the URL shortener are at the specification stage with real specifications.
    </p>
    <ServiceGrid />
  </section>

  <section class="portfolio-section" aria-labelledby="architecture-heading">
    <h2 id="architecture-heading">System Architecture</h2>
    <p>
      One repository, one deployment: a statically generated portfolio layer and
      the interactive demo SPA under /demo/. Four independently owned Go services
      are the target; today the order service runs locally and the demo is mocked.
    </p>
    <p><a href="/architecture/">Read the full architecture overview →</a></p>
  </section>

  <section class="portfolio-section" aria-labelledby="principles-heading">
    <h2 id="principles-heading">Engineering Principles</h2>
    <div class="portfolio-grid">
      <article v-for="principle in SITE_CONTENT.principles" :key="principle.id" class="portfolio-card">
        <h3>{{ principle.title }}</h3>
        <p>{{ principle.text }}</p>
      </article>
    </div>
  </section>

  <section class="portfolio-section" aria-labelledby="roadmap-heading">
    <h2 id="roadmap-heading">Roadmap</h2>
    <p>Mirrors the backend repository roadmap. States describe the sequence, not percentages.</p>
    <RoadmapTimeline />
  </section>

  <section class="portfolio-section" aria-labelledby="links-heading">
    <h2 id="links-heading">Source / Demo / Author</h2>
    <ul class="home-links">
      <li>
        <a href="https://github.com/Officialsayp/zolotoy-dev-backend" rel="noopener noreferrer">Backend repository</a> — Go source of truth
      </li>
      <li><a href="/demo/">Interactive demo</a> — the four service modules on mock data</li>
      <li>
        <a href="https://maxzolotoy.com" rel="noopener noreferrer">maxzolotoy.com</a> — author identity, résumé and contacts
      </li>
    </ul>
  </section>
</template>

<style scoped>
.home-links {
  max-width: 76ch;
  color: var(--c-text-muted);
}

.home-links a {
  color: var(--c-accent);
  font-weight: 600;
}

.section-intro {
  color: var(--c-text-muted);
}
</style>
