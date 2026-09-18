<script setup lang="ts">
/**
 * Reusable case-study page for all four services. Eleven-section skeleton
 * with a data-driven TOC generated from the sections actually rendered.
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
import { SERVICE_CASES } from '@/content/service-registry'
import { serviceCaseStudyUrl } from '@/content/service-registry'

const props = defineProps<{ serviceId: ServiceId }>()

const service = computed(() => getServiceCase(props.serviceId))

const milestone = computed(() =>
  ROADMAP_MILESTONES.find((m) => m.id === service.value.nextMilestone),
)

const sections = computed(() => {
  const list: { id: string; title: string }[] = [
    { id: 'engineering-focus', title: 'Engineering Focus' },
    { id: 'current-implementation', title: 'Current Implementation' },
    { id: 'target-architecture', title: 'Target Architecture' },
    { id: 'architecture-flow', title: 'Architecture / Core Flow' },
    { id: 'decisions', title: 'Engineering Decisions' },
    { id: 'failure-modes', title: 'Reliability / Failure Modes' },
    { id: 'evidence', title: 'Evidence' },
    { id: 'interactive-demo', title: 'Interactive Demo' },
  ]
  if (milestone.value) list.push({ id: 'next-milestone', title: 'Next Milestone' })
  list.push({ id: 'related', title: 'Related Services / Source' })
  return list
})

const related = computed(() =>
  SERVICE_CASES.filter((s) => s.id !== service.value.id).map((s) => ({
    id: s.id,
    name: s.name,
    url: serviceCaseStudyUrl(s.id),
  })),
)
</script>

<template>
  <ServiceHero :service="service" />

  <CaseStudyToc :sections="sections" />

  <section id="engineering-focus" class="portfolio-section" :aria-labelledby="'engineering-focus-heading'">
    <h2 :id="'engineering-focus-heading'">Engineering Focus</h2>
    <p>{{ service.engineeringFocus }}</p>
  </section>

  <section id="current-implementation" class="portfolio-section" :aria-labelledby="'current-implementation-heading'">
    <h2 :id="'current-implementation-heading'">Current Implementation</h2>
    <p v-if="service.implementationStatus === 'planned'">
      Backend implementation is not present yet. The demo module renders the
      planned flows with deterministic mock data; the content below is the
      proposed boundary, not a shipped system.
    </p>
    <ClaimSection
      title=""
      :claims="service.currentImplementation"
      :evidence="service.evidence"
    />
  </section>

  <section id="target-architecture" class="portfolio-section" :aria-labelledby="'target-architecture-heading'">
    <h2 :id="'target-architecture-heading'">Target Architecture</h2>
    <ClaimSection
      title=""
      :claims="service.targetArchitecture"
      :evidence="service.evidence"
    />
  </section>

  <section id="architecture-flow" class="portfolio-section" :aria-labelledby="'architecture-flow-heading'">
    <h2 :id="'architecture-flow-heading'">Architecture / Core Flow</h2>
    <ArchitectureDiagram v-for="diagram in service.diagrams" :key="diagram.id" :diagram="diagram" />
  </section>

  <section id="decisions" class="portfolio-section" :aria-labelledby="'decisions-heading'">
    <h2 :id="'decisions-heading'">Engineering Decisions</h2>
    <div class="portfolio-grid">
      <article v-for="decision in service.decisions" :key="decision.id" class="portfolio-card">
        <h3>{{ decision.title }}</h3>
        <p>{{ decision.text }}</p>
      </article>
    </div>
  </section>

  <section id="failure-modes" class="portfolio-section" :aria-labelledby="'failure-modes-heading'">
    <h2 :id="'failure-modes-heading'">Reliability / Failure Modes</h2>
    <dl class="failure-modes">
      <template v-for="failure in service.failureModes" :key="failure.id">
        <dt>{{ failure.topic }}</dt>
        <dd>{{ failure.text }}</dd>
      </template>
    </dl>
  </section>

  <section id="evidence" class="portfolio-section" :aria-labelledby="'evidence-heading'">
    <h2 :id="'evidence-heading'">Evidence</h2>
    <EvidenceList :evidence="service.evidence" />
  </section>

  <section id="interactive-demo" class="portfolio-section" :aria-labelledby="'interactive-demo-heading'">
    <h2 :id="'interactive-demo-heading'">Interactive Demo</h2>
    <DemoCallout :service="service" />
  </section>

  <section v-if="milestone" id="next-milestone" class="portfolio-section" :aria-labelledby="'next-milestone-heading'">
    <h2 :id="'next-milestone-heading'">Next Milestone: {{ milestone.title }}</h2>
    <p>{{ milestone.summary }}</p>
    <p><strong>Acceptance evidence (planned):</strong></p>
    <ul>
      <li v-for="item in milestone.acceptanceEvidence" :key="item">{{ item }}</li>
    </ul>
  </section>

  <section id="related" class="portfolio-section" :aria-labelledby="'related-heading'">
    <h2 :id="'related-heading'">Related Services / Source</h2>
    <ul class="related-list">
      <li v-for="item in related" :key="item.id">
        <a :href="item.url">{{ item.name }} case study</a>
      </li>
      <li v-if="service.sourceUrl">
        <a :href="service.sourceUrl" rel="noopener noreferrer">Backend source</a>
      </li>
      <li v-if="service.specUrl">
        <a :href="service.specUrl" rel="noopener noreferrer">Service specification</a>
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
