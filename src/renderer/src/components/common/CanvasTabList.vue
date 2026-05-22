<script setup lang="ts">
defineProps<{
  canvases: { id: string; name: string; cards: any[] }[]
  activeCanvasId: string | null
  renamingCanvasId: string | null
}>()

const emit = defineEmits<{
  new: []
  open: [id: string]
  'start-rename': [id: string]
  'finish-rename': [id: string, event: Event]
  delete: [id: string]
}>()
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="p-2">
      <button
        class="w-full h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
        @click="emit('new')"
      >
        + 新建画布
      </button>
    </div>
    <div
      v-for="canvas in canvases"
      :key="canvas.id"
      class="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
      :class="{ 'bg-zinc-800/60': activeCanvasId === canvas.id }"
      @click="emit('open', canvas.id)"
      @dblclick.stop="emit('start-rename', canvas.id)"
    >
      <div class="flex-1 min-w-0">
        <input
          v-if="renamingCanvasId === canvas.id"
          :value="canvas.name"
          class="w-full bg-zinc-800 text-sm text-zinc-200 px-1 py-0.5 rounded border border-zinc-600 outline-none"
          @keydown.enter="emit('finish-rename', canvas.id, $event)"
          @blur="emit('finish-rename', canvas.id, $event)"
          @click.stop
        />
        <template v-else>
          <div class="text-sm text-zinc-300 truncate">{{ canvas.name }}</div>
          <div class="text-xs text-zinc-600 mt-0.5">{{ canvas.cards.length }} 张卡片</div>
        </template>
      </div>
      <button
        v-if="renamingCanvasId !== canvas.id"
        class="text-zinc-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
        title="删除画布"
        @click.stop="emit('delete', canvas.id)"
      >
        &#10005;
      </button>
    </div>
    <div v-if="canvases.length === 0" class="px-3 py-6 text-center text-zinc-600 text-sm">
      暂无保存的画布
    </div>
  </div>
</template>
