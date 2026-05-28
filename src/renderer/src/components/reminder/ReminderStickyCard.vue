<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useReminderStore, type ReminderCategory, type ReminderNote, type ReminderVisualState } from '../../stores/reminder'

type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const props = defineProps<{
  note: ReminderNote
  category: ReminderCategory
  visual: ReminderVisualState
  visualKey: string
}>()

const store = useReminderStore()
const isDragging = ref(false)
const isResizing = ref(false)
const activeHandle = ref<ResizeHandle | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const resizeStart = ref({ pointerX: 0, pointerY: 0, x: 0, y: 0, width: 0, height: 0 })
const draftX = ref(props.visual.x)
const draftY = ref(props.visual.y)
const draftWidth = ref(props.visual.width)
const draftHeight = ref(props.visual.height)
const minWidth = 220
const minHeight = 96
const collapsedHeight = 50
const bottomReserve = 76

const title = computed(() => props.note.title.trim() || '未命名便利贴')
const currentWidth = computed(() => (isResizing.value ? draftWidth.value : props.visual.width))
const currentHeight = computed(() => {
  if (props.visual.collapsed) return collapsedHeight
  return isResizing.value ? draftHeight.value : props.visual.height
})
const cardStyle = computed(() => ({
  left: `${isDragging.value || isResizing.value ? draftX.value : props.visual.x}px`,
  top: `${isDragging.value || isResizing.value ? draftY.value : props.visual.y}px`,
  width: `${currentWidth.value}px`,
  height: `${currentHeight.value}px`,
  zIndex: props.visual.zIndex,
  '--reminder-color': props.category.color,
}))

function maxWidthForX(x: number): number {
  return Math.max(minWidth, window.innerWidth - x - 12)
}

function maxHeightForY(y: number): number {
  return Math.max(minHeight, window.innerHeight - bottomReserve - y - 12)
}

function clampX(x: number, width = currentWidth.value): number {
  return Math.max(12, Math.min(x, window.innerWidth - width - 12))
}

function clampY(y: number, height = currentHeight.value): number {
  return Math.max(12, Math.min(y, window.innerHeight - bottomReserve - height - 12))
}

function onCardPointerDown(event: PointerEvent): void {
  store.bringToFront(props.note.id, props.visualKey)
  onDragPointerDown(event)
}

function onDragPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  isDragging.value = true
  draftX.value = props.visual.x
  draftY.value = props.visual.y
  dragOffset.value = { x: event.clientX - props.visual.x, y: event.clientY - props.visual.y }
  store.bringToFront(props.note.id, props.visualKey)
  window.addEventListener('pointermove', onDragPointerMove)
  window.addEventListener('pointerup', onDragPointerUp)
}

function onDragPointerMove(event: PointerEvent): void {
  if (!isDragging.value) return
  draftX.value = clampX(event.clientX - dragOffset.value.x, props.visual.width)
  draftY.value = clampY(event.clientY - dragOffset.value.y, currentHeight.value)
}

function onDragPointerUp(): void {
  if (!isDragging.value) return
  isDragging.value = false
  store.moveVisual(props.note.id, props.visualKey, clampX(draftX.value, props.visual.width), clampY(draftY.value, currentHeight.value))
  window.removeEventListener('pointermove', onDragPointerMove)
  window.removeEventListener('pointerup', onDragPointerUp)
}

function onResizePointerDown(handle: ResizeHandle, event: PointerEvent): void {
  if (event.button !== 0 || props.visual.collapsed) return
  isResizing.value = true
  activeHandle.value = handle
  draftX.value = props.visual.x
  draftY.value = props.visual.y
  draftWidth.value = props.visual.width
  draftHeight.value = props.visual.height
  resizeStart.value = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: props.visual.x,
    y: props.visual.y,
    width: props.visual.width,
    height: props.visual.height,
  }
  store.bringToFront(props.note.id, props.visualKey)
  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp)
}

function onResizePointerMove(event: PointerEvent): void {
  if (!isResizing.value || !activeHandle.value) return

  const dx = event.clientX - resizeStart.value.pointerX
  const dy = event.clientY - resizeStart.value.pointerY
  let nextX = resizeStart.value.x
  let nextY = resizeStart.value.y
  let nextWidth = resizeStart.value.width
  let nextHeight = resizeStart.value.height

  if (activeHandle.value.includes('e')) {
    nextWidth = Math.max(minWidth, Math.min(resizeStart.value.width + dx, maxWidthForX(nextX)))
  }
  if (activeHandle.value.includes('s')) {
    nextHeight = Math.max(minHeight, Math.min(resizeStart.value.height + dy, maxHeightForY(nextY)))
  }
  if (activeHandle.value.includes('w')) {
    const maxDelta = resizeStart.value.width - minWidth
    const clampedDx = Math.max(-resizeStart.value.x + 12, Math.min(dx, maxDelta))
    nextX = resizeStart.value.x + clampedDx
    nextWidth = resizeStart.value.width - clampedDx
  }
  if (activeHandle.value.includes('n')) {
    const maxDelta = resizeStart.value.height - minHeight
    const clampedDy = Math.max(-resizeStart.value.y + 12, Math.min(dy, maxDelta))
    nextY = resizeStart.value.y + clampedDy
    nextHeight = resizeStart.value.height - clampedDy
  }

  draftX.value = clampX(nextX, nextWidth)
  draftY.value = clampY(nextY, nextHeight)
  draftWidth.value = Math.max(minWidth, Math.min(nextWidth, maxWidthForX(draftX.value)))
  draftHeight.value = Math.max(minHeight, Math.min(nextHeight, maxHeightForY(draftY.value)))
}

function onResizePointerUp(): void {
  if (!isResizing.value) return
  isResizing.value = false
  activeHandle.value = null
  store.resizeVisual(
    props.note.id,
    props.visualKey,
    clampX(draftX.value, draftWidth.value),
    clampY(draftY.value, draftHeight.value),
    draftWidth.value,
    draftHeight.value,
  )
  window.removeEventListener('pointermove', onResizePointerMove)
  window.removeEventListener('pointerup', onResizePointerUp)
}

function toggleCollapsed(): void {
  store.toggleCollapsed(props.note.id, props.visualKey)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragPointerMove)
  window.removeEventListener('pointerup', onDragPointerUp)
  window.removeEventListener('pointermove', onResizePointerMove)
  window.removeEventListener('pointerup', onResizePointerUp)
})
</script>

<template>
  <section class="sticky-card" :style="cardStyle" @pointerdown="onCardPointerDown">
    <header class="sticky-header">
      <span class="color-dot"></span>
      <strong>{{ title }}</strong>
      <button :title="visual.collapsed ? '展开' : '折叠'" @click.stop="toggleCollapsed" @pointerdown.stop>
        {{ visual.collapsed ? '展开' : '折叠' }}
      </button>
    </header>

    <div v-if="!visual.collapsed" class="sticky-body">
      <p class="scrollbar-floating">{{ note.content || '还没有写提醒内容。' }}</p>
      <div class="sticky-footer">
        <span>{{ category.name }}</span>
      </div>
      <span
        v-for="handle in ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']"
        :key="handle"
        class="resize-handle"
        :class="`resize-${handle}`"
        @pointerdown.stop="onResizePointerDown(handle as ResizeHandle, $event)"
      ></span>
    </div>
  </section>
</template>

<style scoped>
.sticky-card {
  position: fixed;
  display: flex;
  flex-direction: column;
  border: 1px solid color-mix(in srgb, var(--reminder-color) 42%, transparent);
  border-radius: 16px;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--reminder-color) 14%, transparent), transparent 74%),
    rgba(24, 24, 27, 0.34);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  color: #f4f4f5;
  cursor: move;
  pointer-events: auto;
  user-select: none;
  transition:
    background 140ms ease,
    box-shadow 140ms ease,
    border-color 140ms ease;
}

.sticky-card:hover,
.sticky-card:focus-within {
  border-color: color-mix(in srgb, var(--reminder-color) 58%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--reminder-color) 18%, transparent), transparent 72%),
    rgba(24, 24, 27, 0.56);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.26);
}

.sticky-header {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: move;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--reminder-color);
}

.sticky-header strong {
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Inter', 'Noto Sans SC', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticky-header button {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(244, 244, 245, 0.78);
  cursor: pointer;
  font-size: 11px;
}

.sticky-body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.sticky-body p {
  flex: 1;
  margin: 0;
  overflow: auto;
  padding: 12px 14px;
  color: rgba(244, 244, 245, 0.82);
  cursor: move;
  font-family: 'Inter', 'Noto Sans SC', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.015em;
  line-height: 1.75;
  white-space: pre-wrap;
}

.sticky-footer {
  display: flex;
  align-items: center;
  padding: 7px 12px;
  color: rgba(212, 212, 216, 0.66);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
}

.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 120ms ease;
}

.sticky-card:hover .resize-handle {
  opacity: 1;
}

.resize-n,
.resize-s {
  left: 16px;
  right: 16px;
  height: 8px;
  cursor: ns-resize;
}

.resize-e,
.resize-w {
  top: 16px;
  bottom: 16px;
  width: 8px;
  cursor: ew-resize;
}

.resize-n {
  top: 0;
}

.resize-s {
  bottom: 0;
}

.resize-e {
  right: 0;
}

.resize-w {
  left: 0;
}

.resize-ne,
.resize-nw,
.resize-se,
.resize-sw {
  width: 14px;
  height: 14px;
}

.resize-ne,
.resize-sw {
  cursor: nesw-resize;
}

.resize-nw,
.resize-se {
  cursor: nwse-resize;
}

.resize-ne {
  top: 0;
  right: 0;
}

.resize-nw {
  top: 0;
  left: 0;
}

.resize-se {
  right: 0;
  bottom: 0;
}

.resize-sw {
  bottom: 0;
  left: 0;
}
</style>
