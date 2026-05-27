<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CastUniverseDragHandle from '../components/character/CastUniverseDragHandle.vue'
import CastUniverseExpandedNode from '../components/character/CastUniverseExpandedNode.vue'
import CastUniversePersonNode from '../components/character/CastUniversePersonNode.vue'
import type { CharacterDetail } from '../components/character/detail/types'
import PortableCharacterDetailPanel from '../components/character/detail/PortableCharacterDetailPanel.vue'
import PortableCharacterDetailTrigger from '../components/character/detail/PortableCharacterDetailTrigger.vue'
import { useCharacterStore } from '../stores/character'
import {
  CAST_UNIVERSE_CENTER,
  type CastUniverseBoard,
  type CastUniversePlacedNode,
  type CastUniverseRing,
  useCharacterCastUniverseStore
} from '../stores/characterCastUniverse'

const CHARACTER_DRAG_TYPE = 'application/x-story-studio-character-id'
const MAX_UNDO_STACK_SIZE = 50

const characterStore = useCharacterStore()
const castStore = useCharacterCastUniverseStore()

const selectedNodeId = ref('')
const detailPanelOpen = ref(false)
const portableCharacterId = ref('')
const pageRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const pan = ref({ x: 0, y: 0 })
const zoom = ref(0.86)
const panning = ref(false)
const draggingNodeId = ref('')
const dragPointerId = ref(-1)
const panStart = ref({ x: 0, y: 0 })
const panOrigin = ref({ x: 0, y: 0 })
const dragStart = ref({ x: 0, y: 0 })
const dragOrigin = ref({ x: 0, y: 0 })
const dragSnapshot = ref<CastUniverseBoard | null>(null)
const undoStack = ref<CastUniverseBoard[]>([])

const selectedNode = computed(() => {
  return castStore.board.placedNodes.find((node) => node.id === selectedNodeId.value)
})

const selectedCharacter = computed(() => {
  return selectedNode.value
    ? characterStore.getCharacterById(selectedNode.value.characterId)
    : undefined
})

const selectedNodeSystem = computed(() => {
  if (!selectedNode.value?.systemId) return undefined
  return castStore.board.circleSystems.find((system) => system.id === selectedNode.value?.systemId)
})

const portableCharacterName = computed(() => {
  const character =
    characterStore.getCharacterById(portableCharacterId.value) ??
    selectedCharacter.value ??
    characterStore.characters[0]
  return character?.profile.name || '未命名人物'
})

const canvasTransform = computed(() => {
  return `translate(calc(-50% + ${pan.value.x}px), calc(-50% + ${pan.value.y}px)) scale(${zoom.value})`
})

const selectedRingValue = computed(() => {
  return selectedNode.value?.ring ? String(selectedNode.value.ring) : 'free'
})

const canUndo = computed(() => undoStack.value.length > 0)

const selectedNodeLocation = computed(() => {
  if (!selectedNode.value) return '未选择实例'
  if (!selectedNode.value.systemId) return '自由位置'
  if (selectedNodeSystem.value?.centerNodeIds.includes(selectedNode.value.id)) return '中心'
  return selectedNode.value.ring ? `第 ${selectedNode.value.ring} 圈` : '已吸附'
})

watch(
  () => characterStore.characters.map((character) => character.id),
  (characterIds) => {
    castStore.syncAvailableCharacters(characterIds)
    if (
      selectedNodeId.value &&
      !castStore.board.placedNodes.some((node) => node.id === selectedNodeId.value)
    ) {
      selectedNodeId.value = ''
    }
  },
  { immediate: true }
)

function cloneBoardSnapshot(): CastUniverseBoard {
  return JSON.parse(JSON.stringify(castStore.board)) as CastUniverseBoard
}

function pushBoardSnapshot(snapshot: CastUniverseBoard = cloneBoardSnapshot()): void {
  undoStack.value.push(snapshot)
  if (undoStack.value.length > MAX_UNDO_STACK_SIZE) undoStack.value.shift()
}

function undoBoardChange(): void {
  const snapshot = undoStack.value.pop()
  if (!snapshot) return

  castStore.restoreBoard(snapshot)
  if (
    selectedNodeId.value &&
    !castStore.board.placedNodes.some((node) => node.id === selectedNodeId.value)
  ) {
    selectedNodeId.value = ''
  }
}

function hasNodeChanged(before: CastUniverseBoard, nodeId: string): boolean {
  const beforeNode = before.placedNodes.find((node) => node.id === nodeId)
  const afterNode = castStore.board.placedNodes.find((node) => node.id === nodeId)
  return JSON.stringify(beforeNode) !== JSON.stringify(afterNode)
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select'))
}

function getCharacter(characterId: string): CharacterDetail | undefined {
  return characterStore.getCharacterById(characterId)
}

function getCharacterName(characterId: string): string {
  return characterStore.getCharacterById(characterId)?.profile.name || '未命名人物'
}

function getCharacterLayer(characterId: string): string {
  return characterStore.getCharacterById(characterId)?.profile.layer || '第三圈人物'
}

function getNodeKeyword(node: CastUniversePlacedNode): string {
  const character = characterStore.getCharacterById(node.characterId)
  return node.keyword || character?.profile.brief || character?.profile.layer || '关键词'
}

function isCenterNode(node: CastUniversePlacedNode): boolean {
  return castStore.board.circleSystems.some((system) => system.centerNodeIds.includes(node.id))
}

function shouldRenderExpanded(node: CastUniversePlacedNode): boolean {
  return node.expanded || isCenterNode(node)
}

function sourceDragStart(characterId: string, event: DragEvent): void {
  event.dataTransfer?.setData(CHARACTER_DRAG_TYPE, characterId)
  event.dataTransfer?.setData('text/plain', characterId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function screenToCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return { x: CAST_UNIVERSE_CENTER, y: CAST_UNIVERSE_CENTER }

  return {
    x: CAST_UNIVERSE_CENTER + (clientX - rect.left - rect.width / 2 - pan.value.x) / zoom.value,
    y: CAST_UNIVERSE_CENTER + (clientY - rect.top - rect.height / 2 - pan.value.y) / zoom.value
  }
}

function dropCharacterOnCanvas(event: DragEvent): void {
  const characterId =
    event.dataTransfer?.getData(CHARACTER_DRAG_TYPE) || event.dataTransfer?.getData('text/plain')
  const character = characterId ? characterStore.getCharacterById(characterId) : undefined
  if (!character) return

  pushBoardSnapshot()
  const point = screenToCanvasPoint(event.clientX, event.clientY)
  const node = castStore.addPlacedNode(character.id, point.x, point.y, {
    expanded: character.dimensions.length > 0
  })
  selectedNodeId.value = node.id
}

function focusPage(): void {
  pageRef.value?.focus()
}

function selectNode(nodeId: string): void {
  selectedNodeId.value = nodeId
  focusPage()
}

function startDragNode(node: CastUniversePlacedNode, event: PointerEvent): void {
  if (event.button !== 0) return

  event.stopPropagation()
  draggingNodeId.value = node.id
  dragPointerId.value = event.pointerId
  dragStart.value = { x: event.clientX, y: event.clientY }
  dragOrigin.value = { x: node.x, y: node.y }
  dragSnapshot.value = cloneBoardSnapshot()
  selectedNodeId.value = node.id
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveDragNode(event: PointerEvent): void {
  if (!draggingNodeId.value || event.pointerId !== dragPointerId.value) return

  event.stopPropagation()
  const nextX = dragOrigin.value.x + (event.clientX - dragStart.value.x) / zoom.value
  const nextY = dragOrigin.value.y + (event.clientY - dragStart.value.y) / zoom.value
  castStore.updatePlacedNodePosition(draggingNodeId.value, nextX, nextY)
}

function stopDragNode(event: PointerEvent): void {
  if (!draggingNodeId.value || event.pointerId !== dragPointerId.value) return

  event.stopPropagation()
  const nodeId = draggingNodeId.value
  const snapshot = dragSnapshot.value
  castStore.settlePlacedNode(nodeId)
  if (snapshot && hasNodeChanged(snapshot, nodeId)) pushBoardSnapshot(snapshot)
  draggingNodeId.value = ''
  dragPointerId.value = -1
  dragSnapshot.value = null
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function startPan(event: PointerEvent): void {
  if (event.button !== 0) return

  const target = event.target as HTMLElement
  if (target.closest('.cast-drag-handle, .source-character, button, input, select')) return

  panning.value = true
  panStart.value = { x: event.clientX, y: event.clientY }
  panOrigin.value = { ...pan.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function movePan(event: PointerEvent): void {
  if (!panning.value) return

  pan.value = {
    x: panOrigin.value.x + event.clientX - panStart.value.x,
    y: panOrigin.value.y + event.clientY - panStart.value.y
  }
}

function stopPan(event: PointerEvent): void {
  if (!panning.value) return

  panning.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function zoomCanvas(delta: number): void {
  zoom.value = Math.min(1.35, Math.max(0.52, zoom.value + delta))
}

function handleWheel(event: WheelEvent): void {
  event.preventDefault()
  zoomCanvas(event.deltaY > 0 ? -0.06 : 0.06)
}

function resetCanvasView(): void {
  pan.value = { x: 0, y: 0 }
  zoom.value = 0.86
}

function fitCanvasView(): void {
  pan.value = { x: 0, y: 0 }
  zoom.value = 0.68
}

function updateSelectedRing(value: string): void {
  if (!selectedNode.value || value === selectedRingValue.value) return

  pushBoardSnapshot()
  if (value === 'free') {
    castStore.detachNode(selectedNode.value.id)
    return
  }

  const ring = Number(value) as CastUniverseRing
  castStore.setNodeRing(selectedNode.value.id, castStore.board.activeSystemId, ring)
}

function updateSelectedKeyword(value: string): void {
  if (!selectedNode.value || value === selectedNode.value.keyword) return

  pushBoardSnapshot()
  castStore.setNodeKeyword(selectedNode.value.id, value)
}

function toggleSelectedExpanded(): void {
  if (!selectedNode.value) return

  pushBoardSnapshot()
  castStore.toggleNodeExpanded(selectedNode.value.id)
}

function setSelectedAsCenter(): void {
  if (!selectedNode.value) return

  pushBoardSnapshot()
  castStore.setNodeAsCenter(selectedNode.value.id)
}

function detachSelectedNode(): void {
  if (!selectedNode.value || !selectedNode.value.systemId) return

  pushBoardSnapshot()
  castStore.detachNode(selectedNode.value.id)
}

function deleteSelectedNode(): void {
  if (!selectedNode.value) return

  pushBoardSnapshot()
  castStore.removePlacedNode(selectedNode.value.id)
  selectedNodeId.value = ''
}

function handleKeyDown(event: KeyboardEvent): void {
  if (isEditableTarget(event.target)) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoBoardChange()
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!selectedNode.value) return

    event.preventDefault()
    deleteSelectedNode()
  }
}
</script>

<template>
  <div ref="pageRef" class="cast-universe-page" tabindex="0" @keydown="handleKeyDown">
    <header class="cast-header">
      <div>
        <p class="section-kicker">人物工作台 / 卡司宇宙</p>
        <h1>把卡司摆成一张宇宙图</h1>
      </div>
      <RouterLink class="back-button" to="/character">返回首页</RouterLink>
    </header>

    <main class="cast-stage">
      <aside class="source-panel">
        <div>
          <p class="section-kicker">Cast Source</p>
          <h2>人物列表</h2>
          <p class="source-hint">把人物拖进画布；同一个人物可以拖入多次。</p>
        </div>

        <div class="source-list">
          <div
            v-for="character in characterStore.characters"
            :key="character.id"
            class="source-character"
            draggable="true"
            @dragstart="sourceDragStart(character.id, $event)"
          >
            <strong>{{ character.profile.name || '未命名人物' }}</strong>
            <span>{{ character.profile.layer }}</span>
          </div>
        </div>
      </aside>

      <section
        ref="viewportRef"
        class="cast-map"
        :class="{ 'cast-map-panning': panning }"
        aria-label="卡司宇宙图"
        @dragover.prevent
        @drop.prevent="dropCharacterOnCanvas"
        @wheel="handleWheel"
        @pointerdown="startPan"
        @pointermove="movePan"
        @pointerup="stopPan"
        @pointercancel="stopPan"
      >
        <div class="map-controls">
          <button type="button" @click="zoomCanvas(0.08)">放大</button>
          <button type="button" @click="zoomCanvas(-0.08)">缩小</button>
          <button type="button" @click="fitCanvasView">适配</button>
          <button type="button" @click="resetCanvasView">回中心</button>
          <button type="button" :disabled="!canUndo" @click="undoBoardChange">撤回</button>
          <span>{{ Math.round(zoom * 100) }}%</span>
        </div>
        <p class="map-hint">从左侧拖入人物；空白处平移，滚轮缩放。</p>

        <div class="cast-canvas" :style="{ transform: canvasTransform }">
          <div
            v-for="system in castStore.board.circleSystems"
            :key="system.id"
            class="circle-system"
            :style="{ left: `${system.x}px`, top: `${system.y}px` }"
          >
            <div
              class="orbit orbit-first"
              :style="{ width: `${system.radius1 * 2}px`, height: `${system.radius1 * 2}px` }"
            ></div>
            <div
              class="orbit orbit-second"
              :style="{ width: `${system.radius2 * 2}px`, height: `${system.radius2 * 2}px` }"
            ></div>
            <div
              class="orbit orbit-third"
              :style="{ width: `${system.radius3 * 2}px`, height: `${system.radius3 * 2}px` }"
            ></div>
            <span v-if="!system.centerNodeIds.length" class="center-placeholder">拖入中心人物</span>
          </div>

          <CastUniverseDragHandle
            v-for="node in castStore.board.placedNodes"
            :key="node.id"
            class="placed-node"
            :class="{ 'placed-node-free': !node.systemId }"
            :active="draggingNodeId === node.id"
            :expanded="shouldRenderExpanded(node)"
            :style="{ left: `${node.x}px`, top: `${node.y}px` }"
            @click.stop="selectNode(node.id)"
            @pointerdown="startDragNode(node, $event)"
            @pointermove="moveDragNode"
            @pointerup="stopDragNode"
            @pointercancel="stopDragNode"
          >
            <CastUniverseExpandedNode
              v-if="shouldRenderExpanded(node) && getCharacter(node.characterId)"
              :character="getCharacter(node.characterId)!"
              :keyword="getNodeKeyword(node)"
              :active="node.id === selectedNodeId"
            />
            <CastUniversePersonNode
              v-else
              :name="getCharacterName(node.characterId)"
              :layer="getCharacterLayer(node.characterId)"
              :keyword="getNodeKeyword(node)"
              :active="node.id === selectedNodeId"
            />
          </CastUniverseDragHandle>
        </div>
      </section>

      <aside class="cast-editor">
        <template v-if="selectedNode && selectedCharacter">
          <div>
            <p class="section-kicker">Selected Cast</p>
            <h2>{{ selectedCharacter.profile.name || '未命名人物' }}</h2>
            <span class="node-location">{{ selectedNodeLocation }}</span>
          </div>

          <label>
            <span>所在位置</span>
            <select
              :value="selectedRingValue"
              @change="updateSelectedRing(($event.target as HTMLSelectElement).value)"
            >
              <option value="free">自由位置</option>
              <option value="1">第一圈人物</option>
              <option value="2">第二圈人物</option>
              <option value="3">第三圈人物</option>
            </select>
          </label>

          <label>
            <span>宇宙关键词</span>
            <input
              :value="selectedNode.keyword"
              placeholder="他在这张宇宙图里的作用"
              @blur="updateSelectedKeyword(($event.target as HTMLInputElement).value)"
            />
          </label>

          <div class="editor-actions">
            <button class="ghost-button" type="button" @click="toggleSelectedExpanded">
              {{ selectedNode.expanded ? '收起维度圈' : '展开维度圈' }}
            </button>
            <button class="ghost-button" type="button" @click="setSelectedAsCenter">
              设为中心
            </button>
            <button class="ghost-button" type="button" @click="detachSelectedNode">移出吸附</button>
            <button class="ghost-button danger-button" type="button" @click="deleteSelectedNode">
              删除
            </button>
          </div>
        </template>

        <p v-else class="empty-editor">从左侧拖入人物，或选中画布上的人物实例。</p>
      </aside>
    </main>

    <PortableCharacterDetailTrigger
      :character-name="portableCharacterName"
      @open="detailPanelOpen = true"
    />

    <PortableCharacterDetailPanel
      :open="detailPanelOpen"
      :characters="characterStore.characters"
      @close="detailPanelOpen = false"
      @save="characterStore.saveCharacters"
      @select-character="(characterId) => (portableCharacterId = characterId)"
      @add-note="(characterId, content) => characterStore.addQuickNote(characterId, content)"
    />
  </div>
</template>

<style scoped>
.cast-universe-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 50% 44%, rgba(82, 82, 91, 0.2), transparent 36%), #09090b;
  color: #f4f4f5;
  outline: none;
}

.cast-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
  padding: 18px 26px;
}

.cast-header h1,
.source-panel h2,
.cast-editor h2 {
  margin: 0;
  color: #fafafa;
  font-weight: 620;
}

.section-kicker {
  margin: 0 0 6px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.back-button,
.ghost-button {
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 9px 12px;
  text-decoration: none;
}

.cast-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.source-panel {
  grid-row: 1 / 3;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  border-right: 1px solid rgba(63, 63, 70, 0.82);
  background: rgba(9, 9, 11, 0.72);
  padding: 18px;
}

.source-hint {
  margin: 8px 0 0;
  color: #71717a;
  font-size: 12px;
  line-height: 1.7;
}

.source-list {
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 10px;
  padding-right: 4px;
}

.source-character {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(82, 82, 91, 0.82);
  border-radius: 16px;
  background: rgba(24, 24, 27, 0.82);
  cursor: grab;
  padding: 12px;
}

.source-character:active {
  cursor: grabbing;
}

.source-character strong {
  color: #f4f4f5;
  font-size: 14px;
}

.source-character span {
  color: #a1a1aa;
  font-size: 12px;
}

.cast-map {
  position: relative;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.cast-map-panning {
  cursor: grabbing;
}

.cast-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1400px;
  height: 1400px;
  transform-origin: center;
}

.map-controls {
  position: absolute;
  z-index: 20;
  left: 24px;
  top: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 999px;
  background: rgba(9, 9, 11, 0.68);
  padding: 7px;
  backdrop-filter: blur(12px);
}

.map-controls button {
  border: 0;
  border-radius: 999px;
  background: rgba(39, 39, 42, 0.86);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 6px 10px;
}

.map-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.map-controls span {
  min-width: 42px;
  color: #a1a1aa;
  font-size: 12px;
  text-align: center;
}

.map-hint {
  position: absolute;
  z-index: 20;
  left: 32px;
  top: 72px;
  margin: 0;
  color: #71717a;
  font-size: 12px;
}

.circle-system {
  position: absolute;
  pointer-events: none;
}

.orbit {
  position: absolute;
  left: 0;
  top: 0;
  border: 1px solid rgba(244, 244, 245, 0.32);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.orbit-second {
  border-style: dashed;
  border-color: rgba(244, 244, 245, 0.24);
}

.orbit-third {
  border-color: rgba(244, 244, 245, 0.2);
}

.center-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  color: #71717a;
  font-size: 12px;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

.placed-node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.placed-node-free :deep(.cast-person-node),
.placed-node-free :deep(.cast-expanded-node) {
  border-style: dashed;
}

.cast-editor {
  display: grid;
  grid-template-columns: minmax(180px, 0.75fr) minmax(160px, 0.8fr) minmax(260px, 1.2fr) auto;
  align-items: end;
  gap: 14px;
  border-top: 1px solid rgba(63, 63, 70, 0.82);
  background: rgba(9, 9, 11, 0.9);
  padding: 14px 26px;
}

.node-location {
  display: inline-block;
  margin-top: 6px;
  color: #a1a1aa;
  font-size: 12px;
}

.cast-editor label,
.editor-actions {
  display: grid;
  gap: 7px;
  color: #a1a1aa;
  font-size: 12px;
}

.editor-actions {
  grid-template-columns: auto auto auto auto;
  align-items: end;
}

.danger-button {
  border-color: rgba(248, 113, 113, 0.72);
  color: #fecaca;
}

.cast-editor input,
.cast-editor select {
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 12px;
  background: rgba(24, 24, 27, 0.86);
  color: #f4f4f5;
  font: inherit;
  outline: none;
  padding: 9px 11px;
}

.empty-editor {
  grid-column: 1 / -1;
  margin: 0;
  color: #71717a;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .cast-stage {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .cast-editor {
    grid-template-columns: 1fr;
  }
}
</style>
