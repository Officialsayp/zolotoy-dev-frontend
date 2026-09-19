<script setup lang="ts">
/**
 * Reusable case-study page for all four services. Eleven-section skeleton
 * with a data-driven TOC generated from the sections actually rendered.
 * All copy resolves through `tr(…, locale)`.
 */
import { computed } from 'vue'
import { getServiceCase } from '@/content/service-registry'
import type { ServiceId } from '@/shared/routing/site-routes'
import ServiceHero from '@/portfolio/components/service-hero.vue'
import ClaimSection from '@/portfolio/components/claim-section.vue'
import ArchitectureDiagram from '@/portfolio/components/architecture-diagram.vue'
import CaseStudyToc from '@/portfolio/components/case-study-toc.vue'
import EvidenceList from '@/portfolio/components/evidence-list.vue'
import DemoCallout from '@/portfolio/components/demo-callout.vue'
import { ROADMAP_MILESTONES } from '@/content/roadmap'
import { SERVICE_CASES, serviceCaseStudyUrl } from '@/content/service-registry'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ serviceId: ServiceId; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')
const service = computed(() => getServiceCase(props.serviceId))

const milestone = computed(() =>
  ROADMAP_MILESTONES.find((m) => m.id === service.value.nextMilestone),
)

const sectionTitles = computed(() => ({
  engineeringFocus: tr({ en: 'Engineering Focus', ru: 'Инженерный фокус' }, locale.value),
  currentImplementation: tr({ en: 'Current Implementation', ru: 'Текущая реализация' }, locale.value),
  targetArchitecture: tr({ en: 'Target Architecture', ru: 'Целевая архитектура' }, locale.value),
  architectureFlow: tr({ en: 'Architecture / Core Flow', ru: 'Архитектура / основной поток' }, locale.value),
  decisions: tr({ en: 'Engineering Decisions', ru: 'Инженерные решения' }, locale.value),
  failureModes: tr({ en: 'Reliability / Failure Modes', ru: 'Надёжность / сценарии отказа' }, locale.value),
  evidence: tr({ en: 'Evidence', ru: 'Доказательства' }, locale.value),
  interactiveDemo: tr({ en: 'Interactive Demo', ru: 'Интерактивное демо' }, locale.value),
  nextMilestone: tr({ en: 'Next Milestone', ru: 'Следующая веха' }, locale.value),
  related: tr({ en: 'Related Services / Source', ru: 'Связанные сервисы / исходники' }, locale.value),
}))

const tocSections = computed(() => {
  const list: { id: string; title: string }[] = [
    { id: 'engineering-focus', title: sectionTitles.value.engineeringFocus },
    { id: 'current-implementation', title: sectionTitles.value.currentImplementation },
    { id: 'target-architecture', title: sectionTitles.value.targetArchitecture },
    { id: 'architecture-flow', title: sectionTitles.value.architectureFlow },
    { id: 'decisions', title: sectionTitles.value.decisions },
    { id: 'failure-modes', title: sectionTitles.value.failureModes },
    { id: 'evidence', title: sectionTitles.value.evidence },
    { id: 'interactive-demo', title: sectionTitles.value.interactiveDemo },
  ]
  if (milestone.value) list.push({ id: 'next-milestone', title: sectionTitles.value.nextMilestone })
  list.push({ id: 'related', title: sectionTitles.value.related })
  return list
})

const related = computed(() =>
  SERVICE_CASES.filter((s) => s.id !== service.value.id).map((s) => ({
    id: s.id,
    name: tr(s.nameLocalized, locale.value),
    url: serviceCaseStudyUrl(s.id),
  })),
)

const plannedNotice = computed(() =>
  tr(
    {
      en: 'Backend implementation is not present yet. The demo module renders the planned flows with deterministic mock data; the content below is the proposed boundary, not a shipped system.',
      ru: 'Бэкенд-реализации пока нет. Демо-модуль отображает планируемые потоки на детерминированных моках; содержимое ниже — предлагаемая граница, а не работающая система.',
    },
    locale.value,
  ),
)

const acceptanceEvidenceLabel = computed(() =>
  tr({ en: 'Acceptance evidence (planned):', ru: 'Критерии приёмки (план):' }, locale.value),
)

const caseStudyWord = computed(() => tr({ en: 'case study', ru: 'кейс' }, locale.value))
const backendSource = computed(() => tr({ en: 'Backend source', ru: 'Исходники бэкенда' }, locale.value))
const serviceSpecificationLabel = computed(() =>
  tr({ en: 'Service specification', ru: 'Спецификация сервиса' }, locale.value),
)
</script>

<template>
  <ServiceHero :service="service" :locale="locale" />

  <CaseStudyToc :sections="tocSections" :locale="locale" />

  <section id="engineering-focus" class="portfolio-section" :aria-labelledby="'engineering-focus-heading'">
    <h2 :id="'engineering-focus-heading'">{{ sectionTitles.engineeringFocus }}</h2>
    <p>{{ tr(service.engineeringFocus, locale) }}</p>
  </section>

  <section id="current-implementation" class="portfolio-section" :aria-labelledby="'current-implementation-heading'">
    <h2 :id="'current-implementation-heading'">{{ sectionTitles.currentImplementation }}</h2>
    <p v-if="service.implementationStatus === 'planned'">{{ plannedNotice }}</p>
    <ClaimSection
      title=""
      :claims="service.currentImplementation"
      :evidence="service.evidence"
      :locale="locale"
    />
  </section>

  <section id="target-architecture" class="portfolio-section" :aria-labelledby="'target-architecture-heading'">
    <h2 :id="'target-architecture-heading'">{{ sectionTitles.targetArchitecture }}</h2>
    <ClaimSection
      title=""
      :claims="service.targetArchitecture"
      :evidence="service.evidence"
      :locale="locale"
    />
  </section>

  <section id="architecture-flow" class="portfolio-section" :aria-labelledby="'architecture-flow-heading'">
    <h2 :id="'architecture-flow-heading'">{{ sectionTitles.architectureFlow }}</h2>
    <ArchitectureDiagram
      v-for="diagram in service.diagrams"
      :key="diagram.id"
      :diagram="diagram"
      :locale="locale"
    />
  </section>

  <section id="decisions" class="portfolio-section" :aria-labelledby="'decisions-heading'">
    <h2 :id="'decisions-heading'">{{ sectionTitles.decisions }}</h2>
    <div class="portfolio-grid">
      <article v-for="decision in service.decisions" :key="decision.id" class="portfolio-card">
        <h3>{{ tr(decision.title, locale) }}</h3>
        <p>{{ tr(decision.text, locale) }}</p>
      </article>
    </div>
  </section>

  <section id="failure-modes" class="portfolio-section" :aria-labelledby="'failure-modes-heading'">
    <h2 :id="'failure-modes-heading'">{{ sectionTitles.failureModes }}</h2>
    <dl class="failure-modes">
      <template v-for="failure in service.failureModes" :key="failure.id">
        <dt>{{ tr(failure.topic, locale) }}</dt>
        <dd>{{ tr(failure.text, locale) }}</dd>
      </template>
    </dl>
  </section>

  <section id="evidence" class="portfolio-section" :aria-labelledby="'evidence-heading'">
    <h2 :id="'evidence-heading'">{{ sectionTitles.evidence }}</h2>
    <EvidenceList :evidence="service.evidence" :locale="locale" />
  </section>

  <section id="interactive-demo" class="portfolio-section" :aria-labelledby="'interactive-demo-heading'">
    <h2 :id="'interactive-demo-heading'">{{ sectionTitles.interactiveDemo }}</h2>
    <DemoCallout :service="service" :locale="locale" />
  </section>

  <section v-if="milestone" id="next-milestone" class="portfolio-section" :aria-labelledby="'next-milestone-heading'">
    <h2 :id="'next-milestone-heading'">{{ sectionTitles.nextMilestone }}: {{ tr(milestone.title, locale) }}</h2>
    <p>{{ tr(milestone.summary, locale) }}</p>
    <p><strong>{{ acceptanceEvidenceLabel }}</strong></p>
    <ul>
      <li v-for="item in milestone.acceptanceEvidence" :key="item.en">{{ tr(item, locale) }}</li>
    </ul>
  </section>

  <section id="related" class="portfolio-section" :aria-labelledby="'related-heading'">
    <h2 :id="'related-heading'">{{ sectionTitles.related }}</h2>
    <ul class="related-list">
      <li v-for="item in related" :key="item.id">
        <a :href="item.url">{{ item.name }} {{ caseStudyWord }}</a>
      </li>
      <li v-if="service.sourceUrl">
        <a :href="service.sourceUrl" rel="noopener noreferrer">{{ backendSource }}</a>
      </li>
      <li v-if="service.specUrl">
        <a :href="service.specUrl" rel="noopener noreferrer">{{ serviceSpecificationLabel }}</a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.failure-modes {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  max-width: 76ch;
}

.failure-modes dt {
  font-weight: 700;
}

.failure-modes dd {
  margin: 0;
  color: var(--c-text-muted);
}

.related-list {
  color: var(--c-text-muted);
}

.related-list a {
  color: var(--c-accent);
  font-weight: 600;
}
</style>
