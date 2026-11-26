<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, Download, ExternalLink, LoaderCircle } from '@lucide/vue'
import { releasesPage, sizeInMB, type PackageKind } from '../release'
import { REPOSITORY } from '../site'
import { useLatestRelease } from '../useLatestRelease'
import { fill, locale, m } from '../i18n'

const state = useLatestRelease()

const KINDS: PackageKind[] = ['rpm', 'deb', 'exe']
const INSTALL: Record<PackageKind, (file: string) => string> = {
  rpm: (f) => `sudo dnf install ./${f}`,
  deb: (f) => `sudo apt install ./${f}`,
  exe: () => ''
}
const platforms = computed(() => KINDS.map((kind) => ({ kind, ...m.value.download.platforms[kind], install: INSTALL[kind] })))

const release = computed(() => (state.value.status === 'ready' ? state.value.release : null))
const pageUrl = computed(() => (REPOSITORY ? releasesPage(REPOSITORY) : null))

const intro = computed(() => {
  const r = release.value
  const d = m.value.download
  if (!r) return d.fallback
  const date = r.publishedAt
    ? fill(d.released, { date: new Date(r.publishedAt).toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }) })
    : ''
  return `${fill(d.version, { version: r.version })}${date}. ${d.served}`
})

/** Why a card has no download button. Null when the button is real. */
function unavailable(kind: PackageKind): string | null {
  const d = m.value.download
  const s = state.value
  switch (s.status) {
    case 'unconfigured':
      return d.unconfigured
    case 'loading':
      return null
    case 'none':
      return d.none
    case 'error':
      return `${fill(d.errors[s.reason], { status: s.httpStatus ?? '' })} ${d.errorSuffix}`
    case 'ready':
      return s.release.assets[kind] ? null : fill(d.notIncluded, { version: s.release.version })
  }
}
</script>

<template>
  <section id="download" aria-labelledby="download-title" class="border-t border-line bg-surface/50">
    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 id="download-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.download.title }}</h2>
      <p class="mt-3 max-w-[40rem] text-lg text-muted">{{ intro }}</p>

      <ul class="mt-10 grid gap-5 md:grid-cols-3">
        <li v-for="p in platforms" :key="p.kind" class="flex flex-col rounded-2xl border border-line bg-bg p-6">
          <h3 class="text-xl font-semibold">{{ p.os }}</h3>
          <dl class="mt-4 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
            <dt class="text-muted">{{ m.download.format }}</dt>
            <dd>{{ p.format }}</dd>
            <dt class="text-muted">{{ m.download.arch }}</dt>
            <dd><bdi dir="ltr">{{ p.arch }}</bdi></dd>
            <dt class="text-muted">{{ m.download.versionLabel }}</dt>
            <dd>
              <span v-if="release" dir="ltr">{{ release.version }}</span>
              <span v-else-if="state.status === 'loading'" class="text-faint">{{ m.download.checking }}</span>
              <span v-else class="text-faint">{{ m.download.notYet }}</span>
            </dd>
          </dl>
          <p class="mt-4 text-sm text-muted">{{ p.requirement }}</p>
          <p v-if="release?.assets[p.kind] && p.install(release.assets[p.kind]!.name)" class="mt-4 text-xs text-muted">
            {{ m.download.installFrom }}
            <code dir="ltr" class="mt-1 block text-start overflow-x-auto rounded-md bg-surface-2 px-2 py-1.5 whitespace-nowrap text-text">{{ p.install(release.assets[p.kind]!.name) }}</code>
          </p>

          <div class="mt-auto pt-6">
            <p v-if="state.status === 'loading'" class="flex h-11 items-center gap-2 text-muted" role="status">
              <LoaderCircle :size="17" class="animate-spin" aria-hidden="true" /> {{ m.download.checkingRelease }}
            </p>

            <template v-else-if="release && release.assets[p.kind]">
              <a
                :href="release.assets[p.kind]!.url"
                class="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-medium text-on-accent transition-[filter] hover:brightness-110"
                :aria-label="fill(m.download.buttonLabel, { version: release.version, os: p.os, format: p.format })"
              >
                <Download :size="17" :stroke-width="2" /> {{ m.download.button }}
                <span class="font-normal text-on-accent/70">{{ fill(m.download.mb, { n: sizeInMB(release.assets[p.kind]!.size) }) }}</span>
              </a>
            </template>

            <template v-else>
              <p class="flex gap-2 text-sm text-muted">
                <CircleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
                {{ unavailable(p.kind) }}
              </p>
              <a
                v-if="pageUrl && state.status !== 'none'"
                :href="release?.url ?? pageUrl"
                class="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {{ m.download.seeReleases }} <ExternalLink :size="13" />
              </a>
            </template>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
