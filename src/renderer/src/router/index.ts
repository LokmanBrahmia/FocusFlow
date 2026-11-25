import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import type { Messages } from '@/i18n/en'
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
  label: keyof Messages
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
    meta: { title: 'Today', subtitle: '' }
  },
  {
    path: '/focus',
    name: 'focus',
    component: () => import('@/views/FocusView.vue'),
    meta: { title: 'Focus', subtitle: 'One task, one timer, nothing else on screen.' }
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/TasksView.vue'),
    meta: { title: 'Tasks', subtitle: 'Everything you need to study, grouped by subject.' }
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('@/views/PlannerView.vue'),
    meta: { title: 'Planner', subtitle: 'Plan the week, then compare it with what you actually did.' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/StatisticsView.vue'),
    meta: { title: 'Statistics', subtitle: 'Where your study time really goes.' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Settings', subtitle: 'Saved on this computer and kept between restarts.' }
  },
  {
    path: '/mini',
    name: 'mini',
    component: () => import('@/views/MiniTimerView.vue'),
    meta: { title: 'Timer', subtitle: '' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
