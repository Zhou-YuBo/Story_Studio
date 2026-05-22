<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorldStore, type ObjectDetailState } from '../../stores/world'

const props = defineProps<{
  detail: ObjectDetailState
}>()

const store = useWorldStore()
const obj = computed(() => store.getObjectById(props.detail.objectId))

// 拖动状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

function onHeaderPointerDown(e: PointerEvent) {
  isDragging.value = true
  dragOffset.value = { x: e.clientX - props.detail.x, y: e.clientY - props.detail.y }
  store.bringDetailToFront(props.detail.objectId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  store.moveDetail(props.detail.objectId, e.clientX - dragOffset.value.x, e.clientY - dragOffset.value.y)
}

function onPointerUp() {
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function onPanelPointerDown() {
  store.bringDetailToFront(props.detail.objectId)
}

function updateContent(e: Event) {
  const textarea = e.target as HTMLTextAreaElement
  store.updateObjectDetail(props.detail.objectId, 'text', textarea.value)
}

import { computed } from 'vue'
</script>

<template>
  <div
    v-if="obj"
    class="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col select-none"
    :style="{
      left: detail.x + 'px',
      top: detail.y + 'px',
      width: '480px',
      height: '400px',
      zIndex: detail.zIndex,
    }"
    @pointerdown="onPanelPointerDown"
  >
    <!-- 顶栏：拖动手柄 -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-zinc-700 cursor-move rounded-t-lg bg-zinc-800/50"
      @pointerdown.stop="onHeaderPointerDown"
    >
      <span class="text-sm text-zinc-300 font-medium truncate">{{ obj.name }}</span>
      <button
        class="text-zinc-500 hover:text-zinc-200 text-lg leading-none ml-2"
        @click.stop="store.closeDetail(detail.objectId)"
      >&times;</button>
    </div>
    <!-- 正文：文本编辑区 -->
    <textarea
      :value="obj.detailContent"
      class="flex-1 bg-transparent text-zinc-300 text-sm p-4 resize-none outline-none placeholder-zinc-600"
      placeholder="在此输入对象详情..."
      @input="updateContent"
      @pointerdown.stop
    ></textarea>
  </div>
</template>
