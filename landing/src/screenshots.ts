import { computed } from 'vue'
import { lang } from './i18n'
// Imported (not served from public/) so each build gives them content-hashed
// URLs: a new screenshot is never hidden behind a browser's cached copy.
// Each language shows the app running in that language.
import focusEn from './assets/screenshots/focus.webp'
import plannerEn from './assets/screenshots/planner.webp'
import weekEn from './assets/screenshots/week.webp'
import tasksEn from './assets/screenshots/tasks.webp'
import statsEn from './assets/screenshots/stats.webp'
import focusAr from './assets/screenshots/ar/focus.webp'
import plannerAr from './assets/screenshots/ar/planner.webp'
import weekAr from './assets/screenshots/ar/week.webp'
import tasksAr from './assets/screenshots/ar/tasks.webp'
import statsAr from './assets/screenshots/ar/stats.webp'

const sets = {
  en: { focus: focusEn, planner: plannerEn, week: weekEn, tasks: tasksEn, stats: statsEn },
  ar: { focus: focusAr, planner: plannerAr, week: weekAr, tasks: tasksAr, stats: statsAr }
}

export const shots = computed(() => sets[lang.value])
