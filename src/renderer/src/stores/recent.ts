import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RecentProjectEntry } from '../../../shared/project'

export const useRecentStore = defineStore('recent', () => {
  const projects = ref<RecentProjectEntry[]>([])

  async function fetch(): Promise<void> {
    projects.value = await window.api.recent.get()
  }

  async function add(projectPath: string, title: string): Promise<void> {
    await window.api.recent.add(projectPath, title)
    await fetch()
  }

  async function remove(projectPath: string): Promise<void> {
    await window.api.recent.remove(projectPath)
    await fetch()
  }

  return { projects, fetch, add, remove }
})
