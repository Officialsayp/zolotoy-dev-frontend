import { getServiceRegistry } from '@/shared/config/service-registry'
import { ROUTE_NAMES } from '@/app/router/route-names'
import type { UiStringKey } from '@/shared/i18n/ui-strings'

export interface NavItem {
  label: UiStringKey | string
  /** Service short label for localized resolution (module label map key). */
  labelEn?: string
  to: string
  /** Route name used to highlight the active item. */
  activeName: string
}

/** Shell navigation: overview + one entry per registered service. */
export function buildNavItems(): NavItem[] {
  const services = getServiceRegistry()
  return [
    { label: 'overview', to: '/', activeName: ROUTE_NAMES.overview },
    ...services.map((service) => ({
      label: service.shortLabel,
      to: service.routePath,
      activeName: service.id,
    })),
  ]
}
