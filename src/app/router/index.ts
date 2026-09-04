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
        path: 'notifications',
        name: ROUTE_NAMES.notifications,
        component: () => import('@/modules/notifications/pages/notifications-overview.vue'),
        meta: { title: 'Notifications' },
      },
      {
        path: 'shortener',
        name: ROUTE_NAMES.shortener,
        component: () => import('@/modules/shortener/pages/shortener-overview.vue'),
        meta: { title: 'URL Shortener' },
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
