<script setup lang="ts">
/**
 * Portfolio home. Fixed section order:
 * Hero → Current Engineering Focus → Services → System Architecture →
 * Engineering Principles → Roadmap → Source/Demo/Author → (footer in shell).
 * All copy resolves through `tr(…, locale)`.
 */
import { computed } from 'vue'
import HomeHero from '@/portfolio/components/home-hero.vue'
import CurrentFocus from '@/portfolio/components/current-focus.vue'
import ServiceGrid from '@/portfolio/components/service-grid.vue'
import RoadmapTimeline from '@/portfolio/components/roadmap-timeline.vue'
import { SITE_CONTENT } from '@/content/site'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()
const locale = computed(() => props.locale ?? 'en')

const copy = computed(() => ({
  focusHeading: tr({ en: 'Current Engineering Focus', ru: 'Текущий инженерный фокус' }, locale.value),
  servicesHeading: tr({ en: 'Services', ru: 'Сервисы' }, locale.value),
  servicesIntro: tr(
    {
      en: 'Four backend case studies. Order is in development; Auth, Notification and the URL shortener are at the specification stage with real specifications.',
      ru: 'Четыре бэкенд-кейса. Order в разработке; Auth, Notification и URL-сокращатель — на стадии спецификации с настоящими спецификациями.',
    },
    locale.value,
  ),
  architectureHeading: tr({ en: 'System Architecture', ru: 'Архитектура системы' }, locale.value),
  architectureIntro: tr(
    {
      en: 'One repository, one deployment: a statically generated portfolio layer and the interactive demo SPA under /demo/. Four independently owned Go services are the target; today the order service runs locally and the demo is mocked.',
      ru: 'Один репозиторий, одно развёртывание: статически сгенерированный слой портфолио и интерактивное демо-SPA под /demo/. Цель — четыре независимо владеемых Go-сервиса; сегодня сервис заказов работает локально, демо — на моках.',
    },
    locale.value,
  ),
  readArchitecture: tr(
    { en: 'Read the full architecture overview →', ru: 'Читать полный обзор архитектуры →' },
    locale.value,
  ),
  principlesHeading: tr({ en: 'Engineering Principles', ru: 'Инженерные принципы' }, locale.value),
  roadmapHeading: tr({ en: 'Roadmap', ru: 'Роадмап' }, locale.value),
  roadmapIntro: tr(
    {
      en: 'Mirrors the backend repository roadmap. States describe the sequence, not percentages.',
      ru: 'Отражает роадмап бэкенд-репозитория. Состояния описывают последовательность, а не проценты.',
    },
    locale.value,
  ),
  linksHeading: tr({ en: 'Source / Demo / Author', ru: 'Исходники / Демо / Автор' }, locale.value),
  backendRepo: tr({ en: 'Backend repository', ru: 'Бэкенд-репозиторий' }, locale.value),
  backendTruth: tr({ en: 'Go source of truth', ru: 'исходная истина Go-кода' }, locale.value),
  interactiveDemo: tr({ en: 'Interactive demo', ru: 'Интерактивное демо' }, locale.value),
  demoNote: tr(
    { en: 'the four service modules on mock data', ru: 'четыре модуля сервисов на мок-данных' },
    locale.value,
  ),
  authorSite: tr(
    { en: 'author identity, résumé and contacts', ru: 'идентичность автора, резюме и контакты' },
    locale.value,
  ),
}))
</script>

<template>
  <HomeHero :locale="locale" />

  <section class="portfolio-section" aria-labelledby="focus-heading">
    <h2 id="focus-heading">{{ copy.focusHeading }}</h2>
    <CurrentFocus :locale="locale" />
  </section>

  <section class="portfolio-section" aria-labelledby="services-heading">
    <h2 id="services-heading">{{ copy.servicesHeading }}</h2>
    <p>{{ copy.servicesIntro }}</p>
    <ServiceGrid :locale="locale" />
  </section>

  <section class="portfolio-section" aria-labelledby="architecture-heading">
    <h2 id="architecture-heading">{{ copy.architectureHeading }}</h2>
    <p>{{ copy.architectureIntro }}</p>
    <p><a href="/architecture/">{{ copy.readArchitecture }}</a></p>
  </section>

  <section class="portfolio-section" aria-labelledby="principles-heading">
    <h2 id="principles-heading">{{ copy.principlesHeading }}</h2>
    <div class="portfolio-grid">
      <article v-for="principle in SITE_CONTENT.principles" :key="principle.id" class="portfolio-card">
        <h3>{{ tr(principle.title, locale) }}</h3>
        <p>{{ tr(principle.text, locale) }}</p>
      </article>
    </div>
  </section>

  <section class="portfolio-section" aria-labelledby="roadmap-heading">
    <h2 id="roadmap-heading">{{ copy.roadmapHeading }}</h2>
    <p>{{ copy.roadmapIntro }}</p>
    <RoadmapTimeline :locale="locale" />
  </section>

  <section class="portfolio-section" aria-labelledby="links-heading">
    <h2 id="links-heading">{{ copy.linksHeading }}</h2>
    <ul class="home-links">
      <li>
        <a href="https://github.com/Officialsayp/zolotoy-dev-backend" rel="noopener noreferrer">{{ copy.backendRepo }}</a> — {{ copy.backendTruth }}
      </li>
      <li><a :href="locale === 'ru' ? '/demo/?lang=ru' : '/demo/'">{{ copy.interactiveDemo }}</a> — {{ copy.demoNote }}</li>
      <li>
        <a href="https://maxzolotoy.com" rel="noopener noreferrer">maxzolotoy.com</a> — {{ copy.authorSite }}
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
</style>
