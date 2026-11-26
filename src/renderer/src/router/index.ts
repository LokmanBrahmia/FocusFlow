import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import type { MessageKey } from '@shared/i18n'
import {
  CalendarRange,
  ChartColumn,
  House,
  ListChecks,
  Settings2,
  Timer
} from '@lucide/vue'

export interface NavItem {
  name: string
  path: string
  /** i18n key for the label. */
  label: MessageKey
  icon: Component
  /** Digit used with Ctrl/Cmd, when the spec assigns one. */
  shortcut?: string
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', path: '/', label: 'nav.dashboard', icon: House, shortcut: '1' },
  { name: 'focus', path: '/focus', label: 'nav.focus', icon: Timer, shortcut: '2' },
  { name: 'tasks', path: '/tasks', label: 'nav.tasks', icon: ListChecks, shortcut: '3' },
  { name: 'planner', path: '/planner', label: 'nav.planner', icon: CalendarRange },
  { name: 'statistics', path: '/statistics', label: 'nav.statistics', icon: ChartColumn, shortcut: '4' },
  { name: 'settings', path: '/settings', label: 'nav.settings', icon: Settings2 }
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { titleKey: 'nav.dashboard' }
  },
  {
    path: '/focus',
    name: 'focus',
    component: () => import('@/views/FocusView.vue'),
    meta: { titleKey: 'nav.focus' }
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/TasksView.vue'),
    meta: { titleKey: 'nav.tasks' }
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('@/views/PlannerView.vue'),
    meta: { titleKey: 'nav.planner' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/StatisticsView.vue'),
    meta: { titleKey: 'nav.statistics' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { titleKey: 'nav.settings' }
  },
  {
    path: '/mini',
    name: 'mini',
    component: () => import('@/views/MiniTimerView.vue'),
    meta: { titleKey: 'mini.title' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
