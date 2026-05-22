<script setup lang="ts">
defineProps<{
  name: string
  dirty: boolean
}>()

const emit = defineEmits<{
  save: []
}>()
</script>

<template>
  <header class="h-10 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
    <span class="text-sm text-zinc-400 tracking-wide">{{ name }}</span>
    <div class="flex items-center gap-2">
      <span v-if="dirty" class="text-xs text-zinc-500">未保存</span>
      <button
        class="px-3 h-7 rounded text-xs transition-colors"
        :class="dirty ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-500'"
        @click="emit('save')"
      >
        保存
      </button>
    </div>
  </header>
</template>
