<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  >
    <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-80 shadow-xl">
      <div class="text-sm text-zinc-200 mb-1">画布有未保存的改动</div>
      <div class="text-xs text-zinc-500 mb-5">离开前是否保存当前画布？</div>
      <div class="flex gap-3">
        <button
          class="flex-1 h-8 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors"
          @click="emit('save')"
        >
          保存
        </button>
        <button
          class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          @click="emit('discard')"
        >
          不保存
        </button>
        <button
          class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors"
          @click="emit('cancel')"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>
