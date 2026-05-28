<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useReminderStore, type ReminderCategory, type ReminderNote, type ReminderVisualState } from '../../stores/reminder'

const props = defineProps<{
  note: ReminderNote
  category: ReminderCategory
  visual: ReminderVisualState
  visualKey: string
}>()

const store = useReminderStore()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const draftX = ref(props.visual.x)
const draftY = ref(props.visual.y)
const cardWidth = 300
const expandedHeight = 228
const collapsedHeight = 50
const bottomReserve = 76

const title = computed(() => props.note.title.trim() || '未命名便利贴')
const cardHeight = computed(() => (props.visual.collapsed ? collapsedHeight : expandedHeight))
const cardStyle = computed(() => ({
  left: `${isDragging.value ? draftX.value : props.visual.x}px`,
  top: `${isDragging.value ? draftY.value : props.visual.y}px`,
  width: `${cardWidth}px`,
  zIndex: props.visual.zIndex,
  '--reminder-color': props.category.color,
}))

function clampX(x: number): number {
  return Math.max(12, Math.min(x, window.innerWidth - cardWidth - 12))
}

function clampY(y: number): number {
  return Math.max(12, Math.min(y, window.innerHeight - bottomReserve - cardHeight.value - 12))
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
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value) return
  draftX.value = clampX(event.clientX - dragOffset.value.x)
  draftY.value = clampY(event.clientY - dragOffset.value.y)
}

function onPointerUp(): void {
  if (!isDragging.value) return
  isDragging.value = false
  store.moveVisual(props.note.id, props.visualKey, clampX(draftX.value), clampY(draftY.value))
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function toggleCollapsed(): void {
  store.toggleCollapsed(props.note.id, props.visualKey)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
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
      <p>{{ note.content || '还没有写提醒内容。' }}</p>
      <div class="sticky-footer">
        <span>{{ category.name }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sticky-card {
  position: fixed;
  border: 1px solid color-mix(in srgb, var(--reminder-color) 45%, transparent);
  border-radius: 16px;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--reminder-color) 18%, transparent), transparent 72%),
    rgba(24, 24, 27, 0.46);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(8px);
  color: #f4f4f5;
  pointer-events: auto;
}

.sticky-header {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: move;
  user-select: none;
}

.sticky-card {
  cursor: move;
  user-select: none;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--reminder-color);
  box-shadow: 0 0 16px color-mix(in srgb, var(--reminder-color) 70%, transparent);
}

.sticky-header strong {
  min-width: 0;
  overflow: hidden;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticky-header button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #d4d4d8;
  font-size: 11px;
  cursor: pointer;
}

.sticky-body {
  display: flex;
  flex-direction: column;
  height: 178px;
}

.sticky-body p {
  flex: 1;
  margin: 0;
  overflow: auto;
  padding: 12px 14px;
  color: rgba(244, 244, 245, 0.84);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.sticky-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: #a1a1aa;
  font-size: 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
