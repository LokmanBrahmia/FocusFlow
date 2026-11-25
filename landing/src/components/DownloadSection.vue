<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, Download, ExternalLink, LoaderCircle } from '@lucide/vue'
import { formatSize, releasesPage, type PackageKind } from '../release'
import { REPOSITORY } from '../site'
import { useLatestRelease } from '../useLatestRelease'

const state = useLatestRelease()

interface Platform {
  kind: PackageKind
  os: string
  format: string
  arch: string
  requirement: string
  install: (file: string) => string
}

const platforms: Platform[] = [
  {
    kind: 'rpm',
    os: 'Fedora Linux',
    format: 'RPM package',
    arch: 'x86_64',
    requirement: 'Tested on Fedora 41. Needs glibc 2.34 or newer (Fedora 35+).',
    install: (f) => `sudo dnf install ./${f}`
  },
  {
    kind: 'deb',
    os: 'Ubuntu Linux',
    format: 'DEB package',
    arch: 'x64 (amd64)',
    requirement: 'Tested on Ubuntu 22.04 LTS. Needs glibc 2.34 or newer.',
    install: (f) => `sudo apt install ./${f}`
  },
  {
    kind: 'exe',
    os: 'Windows',
    format: 'EXE installer',
    arch: 'x64',
    requirement: 'Windows 10 or 11, 64-bit. Installs for your user only, no administrator rights needed.',
    install: () => ''
  }
]

const release = computed(() => (state.value.status === 'ready' ? state.value.release : null))
const pageUrl = computed(() => (REPOSITORY ? releasesPage(REPOSITORY) : null))

/** Why a card has no download button. Null when the button is real. */
function unavailable(kind: PackageKind): string | null {
  switch (state.value.status) {
    case 'unconfigured':
      return 'Downloads will appear here once FocusFlow’s GitHub repository is set up.'
    case 'loading':
      return null
    case 'none':
      return 'No stable release has been published yet.'
    case 'error':
      return `${state.value.message} You can still find every release on GitHub.`
    case 'ready':
      return state.value.release.assets[kind] ? null : `Not included in version ${state.value.release.version}.`
  }
}
</script>

<template>
  <section id="download" aria-labelledby="download-title" class="border-t border-line bg-surface/50">
    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 id="download-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">Download FocusFlow</h2>
      <p class="mt-3 max-w-[40rem] text-lg text-muted">
        <template v-if="release">
          Version {{ release.version }}<template v-if="release.publishedAt">, released
            {{ new Date(release.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) }}</template>.
          Files are served from GitHub Releases.
        </template>
        <template v-else>Packages are published on GitHub Releases.</template>
      </p>

      <ul class="mt-10 grid gap-5 md:grid-cols-3">
        <li v-for="p in platforms" :key="p.kind" class="flex flex-col rounded-2xl border border-line bg-bg p-6">
          <h3 class="text-xl font-semibold">{{ p.os }}</h3>
          <dl class="mt-4 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
            <dt class="text-muted">Format</dt>
            <dd>{{ p.format }}</dd>
            <dt class="text-muted">Architecture</dt>
            <dd>{{ p.arch }}</dd>
            <dt class="text-muted">Version</dt>
            <dd>
              <span v-if="release">{{ release.version }}</span>
              <span v-else-if="state.status === 'loading'" class="text-faint">Checking…</span>
              <span v-else class="text-faint">Not available yet</span>
            </dd>
          </dl>
          <p class="mt-4 text-sm text-muted">{{ p.requirement }}</p>
          <p v-if="release?.assets[p.kind] && p.install(release.assets[p.kind]!.name)" class="mt-4 text-xs text-muted">
            Install from a terminal:
            <code class="mt-1 block overflow-x-auto rounded-md bg-surface-2 px-2 py-1.5 whitespace-nowrap text-text">{{ p.install(release.assets[p.kind]!.name) }}</code>
          </p>

          <div class="mt-auto pt-6">
            <p v-if="state.status === 'loading'" class="flex h-11 items-center gap-2 text-muted" role="status">
              <LoaderCircle :size="17" class="animate-spin" aria-hidden="true" /> Checking the latest release…
            </p>

            <template v-else-if="release && release.assets[p.kind]">
              <a
                :href="release.assets[p.kind]!.url"
                class="flex h-11 items-center justify-center gap-2 rounded-xl bg-iris font-medium text-white transition-[filter] hover:brightness-110"
                :aria-label="`Download FocusFlow ${release.version} for ${p.os} (${p.format})`"
              >
                <Download :size="17" :stroke-width="2" /> Download
                <span class="font-normal text-white/75">{{ formatSize(release.assets[p.kind]!.size) }}</span>
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
                class="mt-3 inline-flex items-center gap-1.5 text-sm text-iris hover:underline"
              >
                See releases on GitHub <ExternalLink :size="13" />
              </a>
            </template>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
