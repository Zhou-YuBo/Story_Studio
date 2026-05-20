<script setup lang="ts">
import { ref } from 'vue'

const leftTab = ref<'entries' | 'canvases'>('entries')
</script>

<template>
  <div class="flex-1 flex overflow-hidden">

    <!-- 左侧管理器 -->
    <aside class="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div class="flex border-b border-zinc-800">
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'entries' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'entries'"
        >
          条目
        </button>
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'canvases' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'canvases'"
        >
          画布
        </button>
      </div>

      <!-- 条目 Tab -->
      <div v-show="leftTab === 'entries'" class="flex-1 overflow-y-auto">
        <div class="p-3 text-zinc-600 text-sm">暂无条目</div>
      </div>

      <!-- 画布 Tab -->
      <div v-show="leftTab === 'canvases'" class="flex-1 overflow-y-auto">
        <div class="p-3 text-zinc-600 text-sm">暂无画布</div>
      </div>
    </aside>

    <!-- 右侧画布区 -->
    <main class="flex-1 bg-zinc-900 flex items-center justify-center">
      <div class="text-zinc-600 text-sm">选择或新建一个画布开始</div>
    </main>

  </div>
</template>
