<script setup lang="ts">
/**
 * Architecture page with the ten semantic sections from the approved plan.
 * "Current" claims trace to the verified backend baseline; planned
 * infrastructure is always labelled.
 */
import { computed } from 'vue'
import { ARCHITECTURE_CONTENT } from '@/content/architecture'
import ArchitectureDiagram from '@/portfolio/components/architecture-diagram.vue'
import ClaimSection from '@/portfolio/components/claim-section.vue'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()
const locale = computed(() => props.locale ?? 'en')

const sections = computed(() => ARCHITECTURE_CONTENT.sections)
const diagrams = computed(() => ARCHITECTURE_CONTENT.diagrams)
const contracts = computed(() => ARCHITECTURE_CONTENT.unresolvedContracts)

const currentDiagram = computed(() => diagrams.value.find((d) => d.category === 'current'))
const targetDiagram = computed(() => diagrams.value.find((d) => d.category === 'target'))
</script>

<template>
  <section class="portfolio-hero">
    <h1>{{ tr({ en: 'System Architecture', ru: 'Архитектура системы' }, locale) }}</h1>
    <p class="portfolio-hero__intro">
      {{
        tr(
          {
            en: 'How zolotoy.dev is built today, where it is going, and which contracts are still unresolved. Current and target states are kept deliberately separate.',
            ru: 'Как устроен zolotoy.dev сегодня, куда он движется и какие контракты ещё не решены. Current и target намеренно разделены.',
          },
          locale,
        )
      }}
    </p>
  </section>

  <template v-for="section in sections" :key="section.id">
    <section :id="section.id" class="portfolio-section" :aria-labelledby="`${section.id}-heading`">
      <h2 :id="`${section.id}-heading`">{{ tr(section.title, locale) }}</h2>
      <p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ tr(paragraph, locale) }}</p>
      <ClaimSection
        v-if="section.claims && section.claims.length > 0"
        title=""
        :claims="section.claims"
        :evidence="[]"
      />
      <template v-if="section.id === 'current-architecture' && currentDiagram">
        <ArchitectureDiagram :diagram="currentDiagram" />
      </template>
      <template v-if="section.id === 'target-architecture' && targetDiagram">
        <ArchitectureDiagram :diagram="targetDiagram" />
      </template>
    </section>
  </template>

  <section class="portfolio-section" aria-labelledby="contracts-heading">
    <h2 id="contracts-heading">Integration Contracts (unresolved areas)</h2>
    <p>
      These areas require explicit API-contract decisions before the corresponding
      frontend flows switch from mock to live. None of them has a canonical
      OpenAPI document yet.
    </p>
    <div class="portfolio-grid">
      <article v-for="contract in contracts" :key="contract.id" class="portfolio-card">
        <h3>{{ tr(contract.title, locale) }}</h3>
        <p>{{ tr(contract.description, locale) }}</p>
        <ul>
          <li v-for="question in contract.openQuestions" :key="question.en">{{ tr(question, locale) }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
