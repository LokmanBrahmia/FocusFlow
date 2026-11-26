<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import ToastHost from '@/components/ToastHost.vue'
import FocusRatingPrompt from '@/components/FocusRatingPrompt.vue'

const route = useRoute()
/** Focus is an immersive space: no page container, the timer owns the canvas. */
const immersive = computed(() => route.name === 'focus')
</script>

<template>
  <div class="flex h-full">
    <AppSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div
        :class="immersive ? 'h-full' : 'mx-auto w-full max-w-[78rem] px-10 pt-9 pb-14 max-lg:px-5 max-lg:pt-6'"
      >
        <RouterView v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>
    <TaskFormDialog />
    <FocusRatingPrompt />
    <ToastHost />
  </div>
</template>
