<script setup lang="ts">
import { computed, ref } from 'vue'
import { lang, m } from '../i18n'
import { shots } from '../screenshots'

/** Real screenshots of the app (sample data) in the page's language, switched by tabs. */
const ids = ['planner', 'week', 'tasks', 'stats'] as const
type Id = (typeof ids)[number]
const screens = computed(() => ids.map((id) => ({ id, src: shots.value[id], ...m.value.preview.screens[id] })))

const active = ref<Id>('planner')
const current = computed(() => screens.value.find((s) => s.id === active.value) ?? screens.value[0])

/** Arrow keys move between tabs in reading order, so they swap in right-to-left. */
function onKey(e: KeyboardEvent): void {
  const forward = lang.value === 'ar' ? 'ArrowLeft' : 'ArrowRight'
  const back = lang.value === 'ar' ? 'ArrowRight' : 'ArrowLeft'
  const i = ids.indexOf(active.value)
  const next = e.key === forward ? i + 1 : e.key === back ? i - 1 : null
  if (next === null) return
  e.preventDefault()
  const id = ids[(next + ids.length) % ids.length]
  active.value = id
  document.getElementById(`tab-${id}`)?.focus()
}
</script>

<template>
  <section aria-labelledby="preview-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <h2 id="preview-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.preview.title }}</h2>
    <p class="mt-3 max-w-[40rem] text-lg text-muted">{{ m.preview.intro }}</p>

    <div role="tablist" :aria-label="m.preview.tabs" class="mt-8 flex flex-wrap gap-1" @keydown="onKey">
      <button
        v-for="s in screens"
        :id="`tab-${s.id}`"
        :key="s.id"
        type="button"
        role="tab"
        :aria-selected="active === s.id"
        :aria-controls="`panel-${s.id}`"
        :tabindex="active === s.id ? 0 : -1"
        class="h-10 rounded-lg px-4 transition-colors"
        :class="active === s.id ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'"
        @click="active = s.id"
      >
        {{ s.label }}
      </button>
    </div>

    <figure :id="`panel-${current.id}`" role="tabpanel" :aria-labelledby="`tab-${current.id}`" class="mt-5">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface">
        <img :src="current.src" :alt="current.alt" width="1600" height="1000" loading="lazy" class="block h-auto w-full" />
      </div>
      <figcaption class="mt-3 max-w-[48rem] text-muted">{{ current.caption }}</figcaption>
    </figure>
  </section>
</template>
