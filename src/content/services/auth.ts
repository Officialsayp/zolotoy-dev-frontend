import type { ServiceCase } from '../types'

/**
 * Auth service case study. Backend implementation is absent; the useful
 * content is the proposed boundary, flows, decisions, failure cases and the
 * real specification link. No source/OpenAPI/observability URLs exist yet.
 */
export const authServiceCase: ServiceCase = {
  id: 'auth',
  slug: 'auth',
  name: 'Auth Service',
  shortLabel: 'Auth',
  summary:
    'A credentials-and-sessions service for the demo environment: Argon2id credential storage, short-lived access tokens, opaque rotating refresh credentials and reuse detection.',
  declaredScope:
    'A backend engineering case study of credential storage, session lifecycle, RBAC and rate limiting for the zolotoy.dev demo environment.',
  notScope: [
    'Not enterprise IAM.',
    'Not social login or federated identity.',
    'Not a general OAuth authorization server.',
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'auth-live-frontend',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: 'No deployed runtime — specification stage',
  engineeringFocus:
    'Session lifecycle, rotation and replay detection, RBAC, rate limiting.',
  currentImplementation: [
    {
      id: 'auth-current-absent',
      category: 'current',
      text:
        'No backend implementation exists yet: the service is at the specification stage and is represented in the demo by deterministic MSW scenarios only.',
      evidenceIds: ['auth-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'auth-target-credentials',
      category: 'target',
      text:
        'Argon2id credential storage with per-user salts and tuned cost parameters; login responses are time-constant with respect to credential enumeration.',
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-tokens',
      category: 'target',
      text:
        'Short-lived access tokens in memory on the client; opaque rotating refresh credentials delivered as HttpOnly, Secure, SameSite cookies — never persisted browser storage.',
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-rotation',
      category: 'target',
      text:
        'Refresh rotation with session-family revocation and reuse detection: presenting an already-rotated refresh credential revokes the whole family.',
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-rbac',
      category: 'target',
      text:
        'user/admin roles enforced server-side, plus rate limiting on credential endpoints and bounded login/register responses.',
      evidenceIds: ['auth-spec'],
    },
  ],
  decisions: [
    {
      id: 'auth-dec-opaque-refresh',
      title: 'Opaque refresh credentials over JWT refresh tokens',
      text:
        'Target design: refresh credentials are opaque server-side records, so revocation is a database write rather than a waiting game with token expiry. Access tokens stay short-lived to bound the revocation gap.',
      claimIds: ['auth-target-tokens'],
    },
    {
      id: 'auth-dec-reuse-family',
      title: 'Reuse detection revokes the session family',
      text:
        'Target design: a replayed refresh credential is treated as theft evidence. The whole session family is revoked, forcing re-authentication on every device in that family.',
      claimIds: ['auth-target-rotation'],
    },
    {
      id: 'auth-dec-enumeration',
      title: 'Credential enumeration resistance is a response-shape contract',
      text:
        'Target design: identical error text, comparable timing and identical status codes for unknown user and wrong password on login and password reset flows.',
      claimIds: ['auth-target-credentials'],
    },
  ],
  failureModes: [
    {
      id: 'auth-fm-concurrent-refresh',
      topic: 'Concurrent refresh requests',
      text:
        'Multiple in-flight refreshes with one credential: exactly one rotation wins; the rest must reuse the coordinator result instead of rotating again and tripping reuse detection.',
    },
    {
      id: 'auth-fm-reuse-detection',
      topic: 'Reused refresh token',
      text:
        'Rotate-on-use means a replayed credential signals theft: revoke the session family, refuse the refresh, and return a distinguishable error so the client can force re-login.',
    },
    {
      id: 'auth-fm-enumeration',
      topic: 'Credential enumeration',
      text:
        'Login/register/reset responses must not reveal whether an account exists — same message, same status, similar time profile including hash cost for unknown users.',
    },
    {
      id: 'auth-fm-redis-outage',
      topic: 'Redis outage policy',
      text:
        'Planned: session lookup must degrade safely (deny or read-through from primary storage) rather than fail open; rate limiting must not silently disappear when Redis is down.',
    },
    {
      id: 'auth-fm-jwt-revocation',
      topic: 'Limits of already-issued JWT revocation',
      text:
        'Access tokens cannot be recalled before expiry; revocation only affects refresh. Short access TTL plus server-side session checks for sensitive operations bound the exposure.',
    },
  ],
  diagrams: [
    {
      id: 'auth-diagram-target',
      caption: 'Target auth flow: cookie rotation with reuse detection.',
      category: 'target',
      nodes: [
        { id: 'browser', label: 'Browser demo', description: 'Memory-only access token', kind: 'browser' },
        { id: 'auth', label: 'Auth service', description: 'Login, refresh rotation, sessions, RBAC', kind: 'service', planned: true },
        { id: 'store', label: 'Session store', description: 'Opaque refresh records, families', kind: 'data', planned: true },
        { id: 'order', label: 'Order service', description: 'Validates access tokens; owns no credentials', kind: 'service', planned: true },
      ],
      connections: [
        { from: 'browser', to: 'auth', label: 'refresh cookie (HttpOnly, Secure)', planned: true },
        { from: 'auth', to: 'store', label: 'rotate + family revocation', planned: true },
        { from: 'browser', to: 'order', label: 'Bearer access token', planned: true },
        { from: 'order', to: 'auth', label: 'token introspection / shared JWKS — contract TBD', planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'auth-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/02_auth_service.md',
      label: 'Auth service specification (target contract)',
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/02_auth_service.md',
  demoUrl: 'https://zolotoy.dev/demo/auth/',
}

export const AUTH_SERVICE_CASE = authServiceCase
