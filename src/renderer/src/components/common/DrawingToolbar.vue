<script setup lang="ts">
defineProps<{
  tools: readonly { type: string; label: string; icon: string }[]
  activeTool: string | null
  config: { color: string; lineWidth: number }
  canUndo: boolean
}>()

const emit = defineEmits<{
  'switch-tool': [type: string]
  undo: []
}>()
</script>

<template>
  <div class="absolute bottom-6 right-6 bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1 z-50">
    <button
      class="w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
      :class="canUndo ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'"
      :disabled="!canUndo"
      title="撤销"
      @click="emit('undo')"
    >
      ↩
    </button>
    <div class="w-full h-px bg-zinc-800 my-1"></div>
    <button
      v-for="tool in tools"
      :key="tool.type"
      class="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-sm"
      :class="activeTool === tool.type ? 'bg-violet-600 text-white' : 'text-zinc-400'"
      :title="tool.label"
      @click.stop="emit('switch-tool', tool.type)"
    >
      {{ tool.icon }}
    </button>
    <div class="w-full h-px bg-zinc-800 my-1"></div>
    <input
      type="color"
      :value="config.color"
      class="w-8 h-8 rounded border-0 cursor-pointer"
      title="线条颜色"
      @input="config.color = ($event.target as HTMLInputElement).value"
    />
    <div class="w-full h-px bg-zinc-800 my-1"></div>
    <input
      type="range"
      :value="config.lineWidth"
      min="1"
      max="10"
      class="w-8 h-12 -rotate-90 origin-center"
      title="线条宽度"
      @input="config.lineWidth = Number(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
