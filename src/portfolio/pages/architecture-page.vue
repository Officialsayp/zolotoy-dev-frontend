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

const sections = computed(() => ARCHITECTURE_CONTENT.sections)
const diagrams = computed(() => ARCHITECTURE_CONTENT.diagrams)
const contracts = computed(() => ARCHITECTURE_CONTENT.unresolvedContracts)

const currentDiagram = computed(() => diagrams.value.find((d) => d.category === 'current'))
const targetDiagram = computed(() => diagrams.value.find((d) => d.category === 'target'))
</script>

<template>
  <section class="portfolio-hero">
    <h1>System Architecture</h1>
    <p class="portfolio-hero__intro">
      How zolotoy.dev is built today, where it is going, and which contracts are
      still unresolved. Current and target states are kept deliberately separate.
    </p>
  </section>

  <template v-for="section in sections" :key="section.id">
    <section :id="section.id" class="portfolio-section" :aria-labelledby="`${section.id}-heading`">
      <h2 :id="`${section.id}-heading`">{{ section.title }}</h2>
      <p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ paragraph }}</p>
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
        <h3>{{ contract.title }}</h3>
        <p>{{ contract.description }}</p>
        <ul>
          <li v-for="question in contract.openQuestions" :key="question">{{ question }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
