<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'

const projectStore = useProjectStore()

const statusText = computed(() => {
  if (projectStore.isHydrating) return '正在载入项目…'
  if (projectStore.isSaving) return '正在保存…'
  if (projectStore.lastError) return projectStore.lastError
  if (!projectStore.projectPath) return '尚未选择保存位置'
  if (projectStore.hasUnsavedChanges) return '有未保存修改'
  if (projectStore.lastSavedAt)
    return `已保存 ${new Date(projectStore.lastSavedAt).toLocaleTimeString()}`
  return '已选择保存位置'
})

const pathText = computed(() => projectStore.projectPath ?? '请先保存为 .story.json')
</script>

<template>
  <header class="h-10 border-b border-zinc-800 bg-zinc-950/95 px-4 flex items-center gap-3 text-xs">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <span class="text-zinc-500 shrink-0">项目存储</span>
      <span class="text-zinc-300 truncate" :title="pathText">{{ pathText }}</span>
      <span
        class="shrink-0 rounded-full px-2 py-0.5 border"
        :class="
          projectStore.lastError
            ? 'border-red-500/50 text-red-300'
            : 'border-zinc-700 text-zinc-400'
        "
      >
        {{ statusText }}
      </span>
    </div>

    <button
      class="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
      :disabled="projectStore.isSaving || projectStore.isHydrating"
      @click="projectStore.saveNow()"
    >
      保存项目
    </button>
    <button
      class="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
      :disabled="projectStore.isSaving || projectStore.isHydrating"
      @click="projectStore.saveAs()"
    >
      另存为
    </button>
    <button
      class="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
      :disabled="projectStore.isSaving || projectStore.isHydrating"
      @click="projectStore.importJson()"
    >
      导入JSON
    </button>
  </header>
</template>
