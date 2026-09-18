/**
 * Pure typed content layer for the public portfolio.
 *
 * This module owns the single source of truth for service facts, evidence,
 * roadmap and architecture claims. Home cards, case-study headings, status
 * displays and page metadata all read the same records — components never
 * hardcode separate status strings.
 *
 * Status semantics:
 *  - implementationStatus describes backend implementation:
 *    planned < in-development < implemented.
 *  - demoMode describes which data source the visible demo flow uses:
 *    mock < mixed < live.
 *  - runtime describes backend availability: not-deployed < local < public-demo.
 *  - claim categories: current (confirmed in implementation), target (planned,
 *    including specification mechanisms), measured (implemented + reproducible
 *    measurement artifact).
 */

import type { ServiceId } from '@/shared/routing/site-routes'

export type { ServiceId } from '@/shared/routing/site-routes'

/** Backend implementation status. */
export type ImplementationStatus = 'planned' | 'in-development' | 'implemented'

/** Data source of the visible demo flow. */
export type DemoMode = 'mock' | 'mixed' | 'live'

/** Backend runtime availability (frontend hosting is separate). */
export type ServiceRuntime = 'not-deployed' | 'local' | 'public-demo'

/** A roadmap milestone ID from src/content/roadmap.ts. */
export type MilestoneId =
  | 'order-http-service'
  | 'order-persistence'
  | 'order-lifecycle'
  | 'auth-live-frontend'
  | 'order-events-notification'
  | 'shortener-performance'
  | 'operations-evidence'

/** Claim category: confirmed in implementation, planned, or measured. */
export type ClaimCategory = 'current' | 'target' | 'measured'

export interface EvidenceSource {
  /** Stable evidence ID referenced by ServiceClaim.evidenceIds. */
  id: string
  kind: 'source-code' | 'specification' | 'test-report' | 'measurement'
  /** Repository the evidence lives in. */
  repository: string
  /** Immutable revision where applicable; otherwise a stable URL. */
  revision?: string
  /** File path inside the repository, or an absolute URL. */
  path: string
  /** Descriptive human-readable label. */
  label: string
  /** Date the evidence was last reviewed against the repository. */
  reviewedOn: string
}

/** A reproducible measurement artifact. The initial list is empty by design. */
export interface MeasurementRecord {
  id: string
  /** Implementation revision measured. */
  implementationRevision: string
  /** Reproduction command or tool. */
  reproduction: string
  environment: string
  workload: string
  date: string
  result: string
  units: string
  methodologyUrl: string
  limitations: string
}

/** One technical claim with a stable ID, category, text and evidence refs. */
export interface ServiceClaim {
  id: string
  category: ClaimCategory
  text: string
  /** Evidence record IDs backing this claim. */
  evidenceIds: string[]
}

export interface ServiceDecision {
  id: string
  title: string
  text: string
  claimIds?: string[]
}

export interface ServiceFailureMode {
  id: string
  topic: string
  text: string
}

export interface ServiceDiagram {
  id: string
  caption: string
  category: ClaimCategory
  nodes: DiagramNode[]
  connections: DiagramConnection[]
  groups?: DiagramGroup[]
}

export interface DiagramNode {
  id: string
  label: string
  description: string
  kind: 'browser' | 'frontend' | 'service' | 'infrastructure' | 'data'
  /** Planned/absent infrastructure — must not look currently deployed. */
  planned?: boolean
}

export interface DiagramConnection {
  from: string
  to: string
  label: string
  /** Planned connection — labelled as target in the rendering. */
  planned?: boolean
}

export interface DiagramGroup {
  id: string
  label: string
  nodeIds: string[]
}

export interface ServiceCase {
  id: ServiceId
  slug: string
  name: string
  shortLabel: string
  summary: string
  declaredScope: string
  /** What the service explicitly is NOT (scope honesty). */
  notScope: string[]
  implementationStatus: ImplementationStatus
  currentMilestone: MilestoneId | null
  nextMilestone: MilestoneId | null
  demoMode: DemoMode
  runtime: ServiceRuntime
  /** Visible wording for runtime availability, e.g. "Local development only". */
  runtimeLabel: string
  engineeringFocus: string
  currentImplementation: ServiceClaim[]
  targetArchitecture: ServiceClaim[]
  decisions: ServiceDecision[]
  failureModes: ServiceFailureMode[]
  diagrams: ServiceDiagram[]
  evidence: EvidenceSource[]
  sourceUrl?: string
  specUrl?: string
  demoUrl?: string
  openApiUrl?: string
  observabilityUrl?: string
}

export interface RoadmapMilestone {
  id: MilestoneId
  title: string
  state: 'completed' | 'current' | 'future'
  serviceIds: ServiceId[]
  summary: string
  /** What will prove this milestone done (planned acceptance evidence). */
  acceptanceEvidence: string[]
  /** Reference into the backend roadmap documentation. */
  sourceReference: string
}

export interface ArchitectureContent {
  sections: ArchitectureSection[]
  diagrams: ServiceDiagram[]
  unresolvedContracts: IntegrationContractArea[]
}

export interface ArchitectureSection {
  id: string
  title: string
  paragraphs: string[]
  claims?: ServiceClaim[]
}

export interface IntegrationContractArea {
  id: string
  title: string
  description: string
  openQuestions: string[]
}

export interface SiteContent {
  hero: {
    title: string
    subtitle: string
    intro: string
  }
  principles: { id: string; title: string; text: string }[]
  architecture: ArchitectureContent
  services: Record<ServiceId, ServiceCase>
  roadmap: RoadmapMilestone[]
}
