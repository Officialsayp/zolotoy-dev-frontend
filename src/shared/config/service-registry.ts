import type { RuntimeEnv } from './runtime-env'

/**
 * Canonical registry of the four backend services the SPA shells around.
 * Keeps Vite env access out of components and gives every module one typed
 * source for base URLs, health/doc paths and external links.
 *
 * Default hosts follow MASTER_FRONTEND_PLAN §5 (frontend proposal). In `mock`
 * mode these hosts are intercepted by MSW; in `real` mode they are used as-is,
 * so switching modes never requires component changes.
 */

export type ServiceId = 'order' | 'auth' | 'notification' | 'shortener'

export interface ServiceEntry {
  id: ServiceId
  /** Registry/canonical name used by backend deployment. */
  registryName: string
  /** Display name shown in the shell. */
  name: string
  /** Short label for compact navigation. */
  shortLabel: string
  /** Default API base path shared by the backend (`/api/v1`). */
  basePath: string
  /** Resolved service base URL (from env or the default host). */
  apiBaseUrl: string
  healthLivePath: string
  healthReadyPath: string
  /** Backend OpenAPI JSON path (explicitly `/swagger.json`, never a guessed UI route). */
  swaggerPath: string
  /** Frontend route root for this service module. */
  routePath: string
  /** One-sentence engineering focus shown on the overview page. */
  focus: string
  /** Public short base for links shared externally (shortener only). */
  publicBaseUrl?: string
  githubUrl?: string
  grafanaUrl?: string
  apiDocsUrl?: string
}

interface ServiceDescriptors {
  entry: Omit<
    ServiceEntry,
    'apiBaseUrl' | 'githubUrl' | 'grafanaUrl' | 'apiDocsUrl' | 'healthLivePath' | 'healthReadyPath' | 'swaggerPath'
  >
  env: {
    baseUrl?: string
    githubUrl?: string
    grafanaUrl?: string
    apiDocsUrl?: string
    publicBaseUrl?: string
  }
}

const DEFAULT_HOSTS: Record<ServiceId, string> = {
  order: 'https://order-api.zolotoy.dev',
  auth: 'https://auth-api.zolotoy.dev',
  notification: 'https://notification-api.zolotoy.dev',
  shortener: 'https://shortener-api.zolotoy.dev',
}

const GUARANTEED_SHARED: { healthLivePath: string; healthReadyPath: string; swaggerPath: string } = {
  healthLivePath: '/health/live',
  healthReadyPath: '/health/ready',
  swaggerPath: '/swagger.json',
}

const DESCRIPTORS: Record<ServiceId, ServiceDescriptors> = {
  order: {
    entry: {
      id: 'order',
      registryName: 'order-service',
      name: 'Order Service',
      shortLabel: 'Orders',
      basePath: '/api/v1',
      routePath: '/orders',
      focus: 'State machines, transactions, idempotency, optimistic concurrency, outbox.',
    },
    env: { baseUrl: 'VITE_ORDER_API_BASE_URL', githubUrl: 'VITE_GITHUB_REPO_URL' },
  },
  auth: {
    entry: {
      id: 'auth',
      registryName: 'auth-service',
      name: 'Auth Service',
      shortLabel: 'Auth',
      basePath: '/api/v1',
      routePath: '/auth',
      focus: 'Token/session lifecycle, rotation and replay detection, RBAC, rate limiting.',
    },
    env: { baseUrl: 'VITE_AUTH_API_BASE_URL', githubUrl: 'VITE_GITHUB_REPO_URL' },
  },
  notification: {
    entry: {
      id: 'notification',
      registryName: 'notification-service',
      name: 'Notification Service',
      shortLabel: 'Notifications',
      basePath: '/api/v1',
      routePath: '/notifications',
      focus: 'Kafka at-least-once processing, durable jobs, retry/DLQ, workers.',
    },
    env: { baseUrl: 'VITE_NOTIFICATION_API_BASE_URL', githubUrl: 'VITE_GITHUB_REPO_URL' },
  },
  shortener: {
    entry: {
      id: 'shortener',
      registryName: 'url-shortener',
      name: 'URL Shortener',
      shortLabel: 'Shortener',
      basePath: '/api/v1',
      routePath: '/shortener',
      focus: 'Redis cache-aside, singleflight, hot path, bounded analytics.',
    },
    env: {
      baseUrl: 'VITE_SHORTENER_API_BASE_URL',
      publicBaseUrl: 'VITE_SHORTENER_PUBLIC_BASE_URL',
      githubUrl: 'VITE_GITHUB_REPO_URL',
    },
  },
}

function readOptional(env: RuntimeEnv, key?: string): string | undefined {
  if (!key) return undefined
  const value = env[key as keyof RuntimeEnv]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export function buildServiceRegistry(env: RuntimeEnv): ServiceEntry[] {
  return (Object.keys(DESCRIPTORS) as ServiceId[]).map((id) => {
    const { entry, env: envMap } = DESCRIPTORS[id]
    const host = readOptional(env, envMap.baseUrl) ?? DEFAULT_HOSTS[id]
    const publicBaseUrl =
      id === 'shortener' ? readOptional(env, envMap.publicBaseUrl) : undefined
    return {
      ...entry,
      ...GUARANTEED_SHARED,
      apiBaseUrl: host.replace(/\/+$/, ''),
      publicBaseUrl,
      githubUrl: readOptional(env, envMap.githubUrl),
      grafanaUrl: readOptional(env, envMap.grafanaUrl),
      apiDocsUrl: readOptional(env, envMap.apiDocsUrl),
    }
  })
}

let cachedRegistry: ServiceEntry[] | undefined

export function getServiceRegistry(
  env: RuntimeEnv = import.meta.env as RuntimeEnv,
): ServiceEntry[] {
  cachedRegistry ??= buildServiceRegistry(env)
  return cachedRegistry
}

export function getService(id: ServiceId): ServiceEntry {
  const found = getServiceRegistry().find((entry) => entry.id === id)
  if (!found) {
    throw new Error(`Unknown service id: ${id}`)
  }
  return found
}
