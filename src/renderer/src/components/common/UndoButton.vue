<script setup lang="ts">
defineProps<{
  canUndo: boolean
}>()

const emit = defineEmits<{
  undo: []
}>()
</script>

<template>
  <button
    class="w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
    :class="canUndo
      ? 'text-zinc-400 hover:bg-zinc-800'
      : 'text-zinc-700 cursor-default'"
    :disabled="!canUndo"
    @click="emit('undo')"
    title="撤销 (Ctrl+Z)"
  >
    &#8617;
  </button>
</template>
