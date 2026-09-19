import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { ROUTE_NAMES } from './route-names'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/app/shell/app-shell.vue'),
    children: [
      {
        path: '',
        name: ROUTE_NAMES.overview,
        component: () => import('@/app/pages/overview-page.vue'),
        meta: { titleKey: 'titleOverview' },
      },
      {
        path: 'orders',
        name: ROUTE_NAMES.orders,
        component: () => import('@/modules/orders/pages/orders-list-page.vue'),
        meta: { titleKey: 'titleOrders' },
      },
      {
        path: 'orders/new',
        name: ROUTE_NAMES.orderNew,
        component: () => import('@/modules/orders/pages/order-create-page.vue'),
        meta: { titleKey: 'titleOrderNew' },
      },
      {
        path: 'orders/:orderId',
        name: ROUTE_NAMES.orderDetail,
        component: () => import('@/modules/orders/pages/order-detail-page.vue'),
        meta: { titleKey: 'titleOrderDetail' },
      },
      {
        path: 'auth',
        name: ROUTE_NAMES.auth,
        component: () => import('@/modules/auth/pages/auth-overview.vue'),
        meta: { titleKey: 'titleAuth' },
      },
      {
        path: 'auth/login',
        name: ROUTE_NAMES.authLogin,
        component: () => import('@/modules/auth/pages/auth-login-page.vue'),
        meta: { titleKey: 'titleSignIn', public: true },
      },
      {
        path: 'auth/register',
        name: ROUTE_NAMES.authRegister,
        component: () => import('@/modules/auth/pages/auth-register-page.vue'),
        meta: { titleKey: 'titleCreateAccount', public: true },
      },
      {
        path: 'auth/profile',
        name: ROUTE_NAMES.authProfile,
        component: () => import('@/modules/auth/pages/auth-profile-page.vue'),
        meta: { titleKey: 'titleProfile', requiresAuth: true },
      },
      {
        path: 'auth/sessions',
        name: ROUTE_NAMES.authSessions,
        component: () => import('@/modules/auth/pages/auth-sessions-page.vue'),
        meta: { titleKey: 'titleSessions', requiresAuth: true },
      },
      {
        path: 'auth/admin',
        name: ROUTE_NAMES.authAdmin,
        component: () => import('@/modules/auth/pages/auth-admin-page.vue'),
        meta: { titleKey: 'titleAdminDemo', requiresAuth: true, requiredRole: 'admin' },
      },
      {
        path: 'notifications',
        name: ROUTE_NAMES.notifications,
        component: () => import('@/modules/notifications/pages/notifications-list-page.vue'),
        meta: { titleKey: 'titleNotifications' },
      },
      {
        path: 'notifications/events/:eventId',
        name: ROUTE_NAMES.notificationEvent,
        component: () => import('@/modules/notifications/pages/notification-event-page.vue'),
        meta: { titleKey: 'titleNotificationEvent' },
      },
      {
        path: 'notifications/:notificationId',
        name: ROUTE_NAMES.notificationDetail,
        component: () => import('@/modules/notifications/pages/notification-detail-page.vue'),
        meta: { titleKey: 'titleNotificationDetail' },
      },
      {
        path: 'shortener',
        name: ROUTE_NAMES.shortener,
        component: () => import('@/modules/shortener/pages/shortener-overview.vue'),
        meta: { titleKey: 'titleShortener' },
      },
      {
        path: 'shortener/:linkId',
        name: ROUTE_NAMES.shortenerDetail,
        component: () => import('@/modules/shortener/pages/shortener-detail-page.vue'),
        meta: { titleKey: 'titleLinkDetail' },
      },
      {
        path: ':pathMatch(.*)*',
        name: ROUTE_NAMES.notFound,
        component: () => import('@/app/pages/not-found-page.vue'),
        meta: { titleKey: 'notFoundTitle' },
      },
    ],
  },
]

export const router = createRouter({
  // The demo SPA is served from the /demo/ namespace (see
  // src/shared/routing/site-routes.ts): internal paths like /auth/profile
  // resolve to browser URLs under /demo/.
  history: createWebHistory('/demo/'),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
