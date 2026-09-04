/**
 * Single place that reads Vite runtime environment variables.
 * Rest of the config layer works against plain objects so it stays unit-testable
 * without a running Vite/`import.meta.env`.
 */
export interface RuntimeEnv {
  VITE_API_MODE?: string
  VITE_DEPLOY_ENV?: string
  VITE_ORDER_API_BASE_URL?: string
  VITE_AUTH_API_BASE_URL?: string
  VITE_NOTIFICATION_API_BASE_URL?: string
  VITE_SHORTENER_API_BASE_URL?: string
  VITE_SHORTENER_PUBLIC_BASE_URL?: string
  VITE_GITHUB_REPO_URL?: string
  VITE_GRAFANA_URL?: string
  VITE_API_DOCS_URL?: string
}

export function getRuntimeEnv(): RuntimeEnv {
  return import.meta.env as RuntimeEnv
}
