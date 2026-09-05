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
        meta: { title: 'Overview' },
      },
      {
        path: 'orders',
        name: ROUTE_NAMES.orders,
        component: () => import('@/modules/orders/pages/orders-list-page.vue'),
        meta: { title: 'Orders' },
      },
      {
        path: 'orders/new',
        name: ROUTE_NAMES.orderNew,
        component: () => import('@/modules/orders/pages/order-create-page.vue'),
        meta: { title: 'Create order' },
      },
      {
        path: 'orders/:orderId',
        name: ROUTE_NAMES.orderDetail,
        component: () => import('@/modules/orders/pages/order-detail-page.vue'),
        meta: { title: 'Order detail' },
      },
      {
        path: 'auth',
        name: ROUTE_NAMES.auth,
        component: () => import('@/modules/auth/pages/auth-overview.vue'),
        meta: { title: 'Auth' },
      },
      {
        path: 'auth/login',
        name: ROUTE_NAMES.authLogin,
        component: () => import('@/modules/auth/pages/auth-login-page.vue'),
        meta: { title: 'Sign in', public: true },
      },
      {
        path: 'auth/register',
        name: ROUTE_NAMES.authRegister,
        component: () => import('@/modules/auth/pages/auth-register-page.vue'),
        meta: { title: 'Create account', public: true },
      },
      {
        path: 'auth/profile',
        name: ROUTE_NAMES.authProfile,
        component: () => import('@/modules/auth/pages/auth-profile-page.vue'),
        meta: { title: 'Profile', requiresAuth: true },
      },
      {
        path: 'auth/sessions',
        name: ROUTE_NAMES.authSessions,
        component: () => import('@/modules/auth/pages/auth-sessions-page.vue'),
        meta: { title: 'Sessions', requiresAuth: true },
      },
      {
        path: 'auth/admin',
        name: ROUTE_NAMES.authAdmin,
        component: () => import('@/modules/auth/pages/auth-admin-page.vue'),
        meta: { title: 'Admin demo', requiresAuth: true, requiredRole: 'admin' },
      },
      {
        path: 'notifications',
        name: ROUTE_NAMES.notifications,
        component: () => import('@/modules/notifications/pages/notifications-list-page.vue'),
        meta: { title: 'Notifications' },
      },
      {
        path: 'notifications/events/:eventId',
        name: ROUTE_NAMES.notificationEvent,
        component: () => import('@/modules/notifications/pages/notification-event-page.vue'),
        meta: { title: 'Notification event' },
      },
      {
        path: 'notifications/:notificationId',
        name: ROUTE_NAMES.notificationDetail,
        component: () => import('@/modules/notifications/pages/notification-detail-page.vue'),
        meta: { title: 'Notification detail' },
      },
      {
        path: 'shortener',
        name: ROUTE_NAMES.shortener,
        component: () => import('@/modules/shortener/pages/shortener-overview.vue'),
        meta: { title: 'URL Shortener' },
      },
      {
        path: 'shortener/:linkId',
        name: ROUTE_NAMES.shortenerDetail,
        component: () => import('@/modules/shortener/pages/shortener-detail-page.vue'),
        meta: { title: 'Link detail' },
      },
      {
        path: ':pathMatch(.*)*',
        name: ROUTE_NAMES.notFound,
        component: () => import('@/app/pages/not-found-page.vue'),
        meta: { title: 'Not found' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
