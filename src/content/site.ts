/**
 * Site-level content: hero, principles, and the aggregated typed content
 * record used by the public pages and metadata generation. All user-facing
 * copy carries both locales; technical facts stay single-source.
 */

import { SITE_ORIGIN } from '@/shared/routing/site-routes'
import { ARCHITECTURE_CONTENT } from './architecture'
import { SERVICE_CASES } from './service-registry'
import { ROADMAP_MILESTONES } from './roadmap'
import type { SiteContent } from './types'

export const SITE_CONTENT: SiteContent = {
  hero: {
    title: { en: 'Maxim Zolotoy · Go Backend', ru: 'Максим Золотой · Go Backend' },
    subtitle: {
      en: 'Go Backend Engineering Portfolio',
      ru: 'Портфолио Go-бэкенд-инженера',
    },
    intro: {
      en: 'Four backend case studies that separate current implementation from target architecture, backed by an interactive demo and a real Go repository.',
      ru: 'Четыре бэкенд-кейса, разделяющие текущую реализацию и целевую архитектуру, с интерактивным демо и реальным Go-репозиторием.',
    },
  },
  principles: [
    {
      id: 'principle-boundaries',
      title: { en: 'Boundaries over shortcuts', ru: 'Границы важнее быстрых решений' },
      text: {
        en: 'Transport parsing never reaches business logic; services never read each other’s storage. Integration happens through APIs and explicit contracts.',
        ru: 'Разбор транспортного уровня не попадает в бизнес-логику; сервисы не читают хранилища друг друга. Интеграция — через API и явные контракты.',
      },
    },
    {
      id: 'principle-honesty',
      title: { en: 'Honest status labels', ru: 'Честные статусы' },
      text: {
        en: 'Current, target and measured are different claims with different evidence. Planned infrastructure is never rendered as deployed.',
        ru: 'Current, target и measured — разные утверждения с разной доказательной базой. Планируемая инфраструктура никогда не выдаётся за развёрнутую.',
      },
    },
    {
      id: 'principle-failures',
      title: { en: 'Design the failure modes', ru: 'Проектируйте сценарии отказа' },
      text: {
        en: 'Idempotency, optimistic concurrency, at-least-once delivery and cache-staleness bounds are first-class design content, not afterthoughts.',
        ru: 'Идемпотентность, оптимистичная конкурентность, доставка at-least-once и границы устаревания кэша — полноценная часть дизайна, а не запоздалая мысль.',
      },
    },
  ],
  architecture: ARCHITECTURE_CONTENT,
  services: Object.fromEntries(SERVICE_CASES.map((s) => [s.id, s])) as SiteContent['services'],
  roadmap: [...ROADMAP_MILESTONES],
}

export { SITE_ORIGIN }
