/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Runtime API mode: `mock` uses MSW network interception, `real` uses live backend hosts. */
  readonly VITE_API_MODE: 'mock' | 'real'
  /** Deployment environment label, e.g. `local`, `dev`, `demo`, `production`. */
  readonly VITE_DEPLOY_ENV?: string
  readonly VITE_ORDER_API_BASE_URL?: string
  readonly VITE_AUTH_API_BASE_URL?: string
  readonly VITE_NOTIFICATION_API_BASE_URL?: string
  readonly VITE_SHORTENER_API_BASE_URL?: string
  /** Public short redirect host, e.g. `https://s.zolotoy.dev`. */
  readonly VITE_SHORTENER_PUBLIC_BASE_URL?: string
  readonly VITE_GITHUB_REPO_URL?: string
  readonly VITE_GRAFANA_URL?: string
  readonly VITE_API_DOCS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
