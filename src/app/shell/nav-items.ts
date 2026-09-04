import { getServiceRegistry } from '@/shared/config/service-registry'
import { ROUTE_NAMES } from '@/app/router/route-names'

export interface NavItem {
  label: string
  to: string
  /** Route name used to highlight the active item. */
  activeName: string
}

/** Shell navigation: overview + one entry per registered service. */
export function buildNavItems(): NavItem[] {
  const services = getServiceRegistry()
  return [
    { label: 'Overview', to: '/', activeName: ROUTE_NAMES.overview },
    ...services.map((service) => ({
      label: service.shortLabel,
      to: service.routePath,
      activeName: service.id,
    })),
  ]
}
