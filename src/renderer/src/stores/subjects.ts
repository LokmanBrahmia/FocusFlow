import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CreateSubjectInput, Subject, UpdateSubjectInput } from '@shared/tasks'
import { desktop } from '@/services/desktop'

export const useSubjectStore = defineStore('subjects', () => {
  const subjects = ref<Subject[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let subscribed = false

  const byId = computed(() => new Map(subjects.value.map((s) => [s.id, s])))

  async function load(): Promise<void> {
    if (!subscribed) {
      subscribed = true
      // Counts and focus totals depend on tasks and sessions too.
      desktop().onDataChanged(() => void load())
    }
    try {
      subjects.value = await desktop().subjects.getAll()
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Subjects could not be loaded.'
    } finally {
      loaded.value = true
    }
  }

  const create = (input: CreateSubjectInput): Promise<Subject> => desktop().subjects.create(input)
  const update = (id: string, input: UpdateSubjectInput): Promise<Subject> => desktop().subjects.update(id, input)
  const remove = (id: string, reassignTo: string | null): Promise<void> => desktop().subjects.delete(id, reassignTo)

  return { subjects, loaded, error, byId, load, create, update, remove }
})
