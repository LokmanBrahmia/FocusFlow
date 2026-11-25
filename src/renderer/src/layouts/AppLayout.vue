<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import ToastHost from '@/components/ToastHost.vue'
import FocusRatingPrompt from '@/components/FocusRatingPrompt.vue'
</script>

<template>
  <div class="flex h-full">
    <AppSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="max-w-5xl px-12 py-10 max-lg:px-6">
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
