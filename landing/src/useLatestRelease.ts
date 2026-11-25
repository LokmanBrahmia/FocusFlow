import { onMounted, ref } from 'vue'
import { fetchLatestRelease, type ReleaseState } from './release'
import { REPOSITORY } from './site'

/** One shared request for the whole page (hero version line and download cards). */
const state = ref<ReleaseState>(REPOSITORY ? { status: 'loading' } : { status: 'unconfigured' })
let started = false

export function useLatestRelease() {
  onMounted(() => {
    if (started || !REPOSITORY) return
    started = true
    void fetchLatestRelease(REPOSITORY).then((s) => (state.value = s))
  })
  return state
}
