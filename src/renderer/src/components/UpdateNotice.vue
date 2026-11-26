<script setup lang="ts">
import { useI18n } from '@/i18n'
import { computed, ref } from 'vue'
import { ArrowUpCircle, Copy, Download, ExternalLink, RotateCw } from '@lucide/vue'
import { useUpdateStore } from '@/stores/updates'
import { useTimerStore } from '@/stores/timer'
import { useToastStore } from '@/stores/toasts'
import ConfirmDialog from './ConfirmDialog.vue'

/**
 * Compact update notice in the sidebar. Never modal, never automatic:
 * every download and install starts from a button here.
 */
const store = useUpdateStore()
const timer = useTimerStore()
const toasts = useToastStore()
const { t } = useI18n()

const status = computed(() => store.state?.status)
const mode = computed(() => store.state?.mode ?? 'manual')
const u = computed(() => store.update)
const showSteps = ref(false)
const confirmOpen = ref(false)

const sessionActive = computed(() => !!timer.state && timer.state.status !== 'idle')

function installNow(): void {
  if (sessionActive.value) confirmOpen.value = true
  else void store.install(false)
}

async function copyCommand(cmd: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(cmd)
    toasts.show(t('toast.commandCopied'))
  } catch {
    toasts.show(t('toast.copyManually'), 'error')
  }
}
</script>

<template>
  <section
    v-if="store.noticeVisible && u && status"
    aria-labelledby="update-title"
    aria-live="polite"
    class="rounded-xl border border-line bg-surface-2/60 p-3 text-sm max-lg:hidden"
  >
    <h2 id="update-title" class="flex items-center gap-2 font-medium">
      <ArrowUpCircle :size="16" :stroke-width="1.75" class="text-accent" aria-hidden="true" />
      {{ t('update.available', { version: u.version }) }}
    </h2>

    <!-- Downloading (Windows) -->
    <template v-if="status.kind === 'downloading'">
      <p class="mt-2 text-muted">{{ t('update.downloading', { percent: status.percent }) }}</p>
      <div
        class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        :aria-valuenow="status.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('update.downloadLabel')"
      >
        <div class="h-full rounded-full bg-accent transition-[width]" :style="{ width: `${status.percent}%` }" />
      </div>
    </template>

    <!-- Downloaded (Windows): install only on request -->
    <template v-else-if="status.kind === 'downloaded'">
      <p class="mt-1.5 text-muted">
        {{ status.installOnQuit ? t('update.willInstallOnQuit') : t('update.ready') }}
      </p>
      <div class="mt-2.5 flex flex-col gap-1.5">
        <button type="button" class="btn-primary" :disabled="store.busy" @click="installNow">
          <RotateCw :size="14" /> {{ t('update.installRestart') }}
        </button>
        <button
          type="button"
          class="btn-quiet"
          :disabled="store.busy"
          @click="store.installOnQuit(!status.installOnQuit)"
        >
          {{ status.installOnQuit ? t('update.dontInstallOnQuit') : t('update.installOnQuit') }}
        </button>
      </div>
    </template>

    <!-- Error during download or install -->
    <template v-else-if="status.kind === 'error'">
      <p class="mt-1.5 text-danger" role="alert">{{ status.message }}</p>
      <div class="mt-2.5 flex flex-wrap gap-1.5">
        <button v-if="mode === 'install'" type="button" class="btn-primary" :disabled="store.busy" @click="store.download()">
          {{ t('common.tryAgain') }}
        </button>
        <button type="button" class="btn-quiet" @click="store.open(u.releaseUrl)">
          {{ t('update.releasePage') }} <ExternalLink :size="12" />
        </button>
      </div>
    </template>

    <!-- Available -->
    <template v-else-if="status.kind === 'available'">
      <p class="mt-1.5 text-muted">{{ t('update.youHave', { version: store.state?.currentVersion ?? '' }) }}</p>

      <div v-if="mode === 'install'" class="mt-2.5 flex flex-col gap-1.5">
        <button type="button" class="btn-primary" :disabled="store.busy" @click="store.download()">
          <Download :size="14" /> {{ t('update.download') }}
        </button>
      </div>

      <div v-else class="mt-2.5 flex flex-col gap-1.5">
        <button type="button" class="btn-primary" @click="store.open(u.assetUrl ?? u.releaseUrl)">
          <Download :size="14" /> {{ t('update.download') }}
        </button>
        <button v-if="u.installCommand" type="button" class="btn-quiet" :aria-expanded="showSteps" @click="showSteps = !showSteps">
          {{ t('update.howToInstall') }}
        </button>
        <div v-if="showSteps && u.installCommand" class="mt-1 text-xs text-muted">
          <p>{{ t('update.runThis') }}</p>
          <div class="mt-1 flex items-center gap-1">
            <code dir="ltr" class="min-w-0 flex-1 overflow-x-auto rounded bg-bg px-1.5 py-1 whitespace-nowrap text-text">{{ u.installCommand }}</code>
            <button type="button" :aria-label="t('update.copy')" class="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-text" @click="copyCommand(u.installCommand)">
              <Copy :size="13" />
            </button>
          </div>
          <p class="mt-1">{{ t('update.kept') }}</p>
        </div>
      </div>
    </template>

    <div class="mt-2 flex items-center justify-between">
      <button type="button" class="text-xs text-muted hover:text-text" @click="store.open(u.releaseUrl)">{{ t('update.whatsNew') }}</button>
      <button
        v-if="status.kind !== 'downloading'"
        type="button"
        class="text-xs text-muted hover:text-text"
        @click="store.later(u.version)"
      >
        {{ t('update.later') }}
      </button>
    </div>
  </section>

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="t('update.restartTitle')"
    :message="t('update.restartMessage')"
    :confirm-label="t('update.restartConfirm')"
    @confirm="
      confirmOpen = false;
      store.install(true)
    "
  >
    <p class="mt-3 text-sm text-muted">{{ t('update.orOnQuit') }}</p>
  </ConfirmDialog>
</template>

<style scoped>
.btn-primary {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 500;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}
.btn-quiet {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  border: 1px solid var(--line);
  padding: 0 0.625rem;
}
.btn-quiet:hover {
  background: var(--surface-2);
}
button:disabled {
  opacity: 0.5;
}
</style>
