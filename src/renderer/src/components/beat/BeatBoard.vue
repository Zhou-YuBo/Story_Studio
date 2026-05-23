<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorBridge } from '../../stores/editor-bridge'
import { DEFAULT_BEAT_LINES, useBeatStore } from '../../stores/beat'
import { createDefaultEndPlacement, snapToBlockBoundary, useBeatTracking } from '../../composables/useBeatTracking'
import { createBeatState } from './beat-state'

const bridge = useEditorBridge()
const store = useBeatStore()
const state = createBeatState()

useBeatTracking(state)

const boardRef = ref<HTMLElement | null>(null)
let offsetResizeObserver: ResizeObserver | null = null
let scrollHandler: (() => void) | null = null

function updateContentOffsetY(): void {
  if (!boardRef.value || !bridge.scrollEl) return
  const pageContainer = bridge.scrollEl.querySelector('.page-container') as HTMLElement | null
  if (!pageContainer) return

  const boardRect = boardRef.value.getBoundingClientRect()
  const containerRect = pageContainer.getBoundingClientRect()
  state.contentOffsetY = containerRect.top - boardRect.top
}

onMounted(() => {
  updateContentOffsetY()
  if (bridge.scrollEl) {
    const pageContainer = bridge.scrollEl.querySelector('.page-container')
    if (pageContainer) {
      offsetResizeObserver = new ResizeObserver(updateContentOffsetY)
      offsetResizeObserver.observe(pageContainer)
    }
  }
})

watch(() => bridge.scrollEl, (el, oldEl) => {
  if (oldEl && scrollHandler) {
    oldEl.removeEventListener('scroll', scrollHandler)
  }
  if (el) {
    scrollHandler = () => {
      state.scrollTop = el.scrollTop
    }
    el.addEventListener('scroll', scrollHandler, { passive: true })
    state.scrollTop = el.scrollTop
    updateContentOffsetY()
  }
}, { immediate: true })

watch(() => bridge.editor, updateContentOffsetY)

onBeforeUnmount(() => {
  if (offsetResizeObserver) offsetResizeObserver.disconnect()
  if (bridge.scrollEl && scrollHandler) {
    bridge.scrollEl.removeEventListener('scroll', scrollHandler)
  }
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
})

const editingCardId = ref<string | null>(null)
const editingContent = ref('')
const dragBoundaryId = ref<string | null>(null)
const dragPreviewY = ref(0)
const dragPreviewPos = ref<number | null>(null)

function defaultPlacementFromBoundary(boundaryId: string) {
  const start = store.boundaryById(boundaryId)
  if (!start) return { docPos: 0, virtual: true, anchorBoundaryId: boundaryId, lineOffset: DEFAULT_BEAT_LINES }

  const editor = bridge.editor
  if (!editor) {
    return { docPos: start.docPos, virtual: true, anchorBoundaryId: boundaryId, lineOffset: DEFAULT_BEAT_LINES }
  }

  return createDefaultEndPlacement(editor, start.docPos, boundaryId, Boolean(start.virtual))
}

function addBeat(cardId: string): void {
  const card = store.cardById(cardId)
  if (!card) return
  store.insertBeatAfter(cardId, defaultPlacementFromBoundary(card.endBoundaryId))
}

function addScene(cardId: string): void {
  const card = store.cardById(cardId)
  if (!card) return
  store.insertSceneAfter(cardId, defaultPlacementFromBoundary(card.endBoundaryId))
}

function removeCard(cardId: string): void {
  store.removeCard(cardId)
}

function startEdit(cardId: string, content: string): void {
  editingCardId.value = cardId
  editingContent.value = content
}

function finishEdit(cardId: string): void {
  if (editingCardId.value !== cardId) return
  store.updateCardContent(cardId, editingContent.value)
  editingCardId.value = null
}

function onDragStart(boundaryId: string, y: number, event: MouseEvent): void {
  const boundary = store.boundaryById(boundaryId)
  if (!boundary || boundary.locked) return

  event.preventDefault()
  dragBoundaryId.value = boundaryId
  dragPreviewY.value = y
  dragPreviewPos.value = boundary.docPos
  state.isDragging = true

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(event: MouseEvent): void {
  const editor = bridge.editor
  if (!editor || !dragBoundaryId.value || !bridge.scrollEl) return

  const pageContainer = bridge.scrollEl.querySelector('.page-container') as HTMLElement | null
  if (!pageContainer) return

  const containerRect = pageContainer.getBoundingClientRect()
  const posInfo = editor.view.posAtCoords({
    left: containerRect.left + containerRect.width / 2,
    top: event.clientY,
  })
  if (!posInfo) return

  const snapped = snapToBlockBoundary(editor.state.doc, posInfo.pos)
  if (!store.canMoveBoundary(dragBoundaryId.value, snapped)) return

  dragPreviewPos.value = snapped
  try {
    const coords = editor.view.coordsAtPos(snapped)
    dragPreviewY.value = coords.top - containerRect.top + state.contentOffsetY
  } catch {
    dragPreviewY.value = event.clientY - containerRect.top + state.contentOffsetY
  }
}

function onDragEnd(): void {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)

  if (dragBoundaryId.value && dragPreviewPos.value !== null) {
    store.moveBoundary(dragBoundaryId.value, dragPreviewPos.value)
  }

  dragBoundaryId.value = null
  dragPreviewPos.value = null
  state.isDragging = false
}
</script>

<template>
  <div class="beat-board" ref="boardRef">
    <div
      class="beat-board-inner"
      :style="{
        height: `${state.totalHeight}px`,
        transform: `translateY(${-state.scrollTop}px)`,
      }"
    >
      <div class="boundary-layer">
        <div
          v-for="boundary in state.boundaries"
          :key="boundary.boundaryId"
          class="boundary-line"
          :class="{ locked: boundary.locked }"
          :style="{ top: `${boundary.y}px` }"
          @mousedown="onDragStart(boundary.boundaryId, boundary.y, $event)"
        />
        <div
          v-if="dragBoundaryId"
          class="drag-preview-line"
          :style="{ top: `${dragPreviewY}px` }"
        />
      </div>

      <div class="card-layer">
        <div
          v-for="card in state.cards"
          :key="card.cardId"
          class="beat-card"
          :class="{ 'is-scene-start': card.sceneStart }"
          :style="{
            top: `${card.topY}px`,
            height: `${card.height}px`,
          }"
        >
          <div class="beat-header">
            <span class="beat-label">{{ card.label }}</span>
            <button
              v-if="state.cards.length > 1"
              class="beat-delete"
              title="删除节拍"
              @click="removeCard(card.cardId)"
            >
              ×
            </button>
          </div>

          <div class="beat-body">
            <textarea
              v-if="editingCardId === card.cardId"
              v-model="editingContent"
              class="beat-textarea"
              @blur="finishEdit(card.cardId)"
              @keydown.escape="editingCardId = null"
            />
            <div
              v-else
              class="beat-content"
              @dblclick="startEdit(card.cardId, card.content)"
            >
              {{ card.content }}
            </div>
          </div>

          <div class="beat-actions">
            <button class="beat-action-btn" @click="addBeat(card.cardId)">+ 节拍</button>
            <button class="beat-action-btn" @click="addScene(card.cardId)">+ 场景</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beat-board {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.beat-board-inner {
  position: relative;
  width: 100%;
  will-change: transform;
}

.boundary-layer,
.card-layer {
  position: absolute;
  inset: 0;
}

.boundary-layer {
  z-index: 20;
  pointer-events: none;
}

.card-layer {
  z-index: 10;
}

.boundary-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #7aa2f7;
  box-shadow: 0 0 4px rgba(122, 162, 247, 0.5);
  cursor: ns-resize;
  pointer-events: auto;
}

.boundary-line.locked {
  background: #52525b;
  box-shadow: none;
  cursor: default;
}

.boundary-line:not(.locked):hover {
  height: 3px;
  background: #a5b4fc;
}

.drag-preview-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #fbbf24;
  z-index: 30;
  pointer-events: none;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
}

.beat-card {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 10px 36px;
  box-sizing: border-box;
  overflow: hidden;
  border-left: 1px solid transparent;
}

.beat-card.is-scene-start {
  border-left: 3px solid #7aa2f7;
}

.beat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-bottom: 6px;
}

.beat-label {
  font-size: 13px;
  font-weight: 700;
  color: #a1a1aa;
  letter-spacing: 0.5px;
}

.is-scene-start .beat-label {
  color: #7aa2f7;
}

.beat-delete {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #52525b;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.beat-delete:hover {
  background: #3f3f46;
  color: #ef4444;
}

.beat-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.beat-content {
  font-size: 12.5px;
  color: #d4d4d8;
  line-height: 1.6;
  white-space: pre-wrap;
  cursor: text;
}

.beat-textarea {
  width: 100%;
  height: 100%;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 3px;
  color: #d4d4d8;
  font-size: 12.5px;
  line-height: 1.6;
  padding: 4px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.beat-textarea:focus {
  border-color: #7aa2f7;
}

.beat-actions {
  position: absolute;
  right: 8px;
  bottom: 6px;
  display: flex;
  gap: 4px;
}

.beat-action-btn {
  height: 24px;
  padding: 0 8px;
  border: 1px solid #3f3f46;
  border-radius: 3px;
  background: #18181b;
  color: #a1a1aa;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.beat-action-btn:hover {
  background: #27272a;
  color: #d4d4d8;
  border-color: #52525b;
}
</style>
