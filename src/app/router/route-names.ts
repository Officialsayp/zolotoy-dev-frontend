/** Centralized, typed route names (query keys follow the same "centralized" idea). */
export const ROUTE_NAMES = {
  overview: 'overview',
  orders: 'orders',
  orderNew: 'order-new',
  orderDetail: 'order-detail',
  auth: 'auth',
  authLogin: 'auth-login',
  authRegister: 'auth-register',
  authProfile: 'auth-profile',
  authSessions: 'auth-sessions',
  authAdmin: 'auth-admin',
  notifications: 'notifications',
  shortener: 'shortener',
  notFound: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
