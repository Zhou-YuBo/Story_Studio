<script setup lang="ts">
import { computed, markRaw, reactive, ref, provide } from 'vue'
import { VueFlow, useVueFlow, SelectionMode } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useWorldStore } from '../stores/world'
import { useCanvasHistory } from '../composables/useCanvasHistory'
import { canvasHistoryKey, type CanvasHistoryHandle } from '../composables/canvasHistoryKey'
import { useRightClickConnect } from '../composables/useRightClickConnect'
import { useDrawingTool } from '../composables/useDrawingTool'
import { useCanvasShortcuts } from '../composables/useCanvasShortcuts'
import WorldCard from '../components/WorldCard.vue'
import CenterEdge from '../components/CenterEdge.vue'
import ObjectDetailPanel from '../components/ObjectDetailPanel.vue'
import UndoButton from '../components/UndoButton.vue'

const store = useWorldStore()
const storeRefs = storeToRefs(store)
const history = useCanvasHistory({ cards: storeRefs.cards, edges: storeRefs.edges, drawings: storeRefs.drawings, dirty: storeRefs.dirty })
provide(canvasHistoryKey, { beginBatch: history.beginBatch, endBatch: history.endBatch } satisfies CanvasHistoryHandle)

const vueFlowRef = ref<InstanceType<typeof VueFlow>>()
const { findNode, screenToFlowCoordinate, getSelectedNodes, getSelectedEdges, viewport, onViewportChange } = useVueFlow()

const nodeTypes = { 'world-card': markRaw(WorldCard) } as any
const edgeTypes = { 'center-edge': markRaw(CenterEdge) } as any

// ---- 右键菜单 ----
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'node' | 'edge' | '',
  targetId: '',
  showColorPicker: false,
})

function closeContextMenu() {
  contextMenu.visible = false
  contextMenu.showColorPicker = false
}

interface ContextMenuItem {
  label: string
  danger?: boolean
  action: () => void
}

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  if (contextMenu.type === 'node') {
    return [
      { label: '修改颜色', action: () => { contextMenu.showColorPicker = true } },
      { label: '删除', danger: true, action: () => { history.pushSnapshot(); store.removeCard(contextMenu.targetId); closeContextMenu() } },
    ]
  }
  if (contextMenu.type === 'edge') {
    return [
      { label: '删除', danger: true, action: () => { history.pushSnapshot(); store.removeEdge(contextMenu.targetId); closeContextMenu() } },
    ]
  }
  return []
})

function onCardColorInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input && input.value) store.updateCardColor(contextMenu.targetId, input.value)
}

function onCardColorChange(e: Event) {
  history.pushSnapshot()
  onCardColorInput(e)
}

function resetCardColor() {
  history.pushSnapshot()
  store.updateCardColor(contextMenu.targetId, undefined)
  contextMenu.showColorPicker = false
}

// ---- 组合式函数 ----
const rc = useRightClickConnect({
  cards: storeRefs.cards,
  findNode,
  screenToFlowCoordinate,
  onConnect(sourceId, targetId) {
    history.pushSnapshot()
    store.addEdge(sourceId, targetId)
  },
  onContextMenu(targetId, type, x, y) {
    contextMenu.visible = true
    contextMenu.x = x
    contextMenu.y = y
    contextMenu.type = type
    contextMenu.targetId = targetId
    contextMenu.showColorPicker = false
  },
  defaultCardSize: { width: 220, height: 120 },
})

const { drawingCanvasRef, ...drawing } = useDrawingTool({
  store: {
    activeDrawingTool: storeRefs.activeDrawingTool,
    isDrawing: storeRefs.isDrawing,
    drawingPreview: storeRefs.drawingPreview,
    drawingConfig: storeRefs.drawingConfig,
    drawings: storeRefs.drawings,
    dirty: storeRefs.dirty,
  },
  screenToFlowCoordinate,
  viewport,
  vueFlowRef: vueFlowRef as any,
  onViewportChange,
  pushSnapshot: () => history.pushSnapshot(),
})

const renamingCanvasId = ref<string | null>(null)

const { onKeyDown } = useCanvasShortcuts({
  getSelectedNodes,
  getSelectedEdges,
  removeCard: store.removeCard,
  removeEdge: store.removeEdge,
  undo: () => history.undo(),
  pushSnapshot: () => history.pushSnapshot(),
  onF2: () => {
    if (store.activeCanvasId) renamingCanvasId.value = store.activeCanvasId
  },
})

// ---- 左侧面板 Tab ----
const leftTab = ref<'entries' | 'canvases'>('entries')

// ---- 条目面板状态 ----
const expandedCategories = ref<Set<string>>(new Set(store.categories.map((c) => c.id)))
const newCategoryName = ref('')
const showNewCategory = ref(false)
const newObjectCategoryId = ref<string | null>(null)
const newObjectName = ref('')
const renamingCategoryId = ref<string | null>(null)
const renamingObjectId = ref<string | null>(null)
const editingObjectColorId = ref<string | null>(null)
const editingCategoryColorId = ref<string | null>(null)

function toggleCategory(id: string) {
  if (expandedCategories.value.has(id)) expandedCategories.value.delete(id)
  else expandedCategories.value.add(id)
}

function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  const cat = store.addCategory(name)
  expandedCategories.value.add(cat.id)
  newCategoryName.value = ''
  showNewCategory.value = false
}

function startRenameCategory(id: string) { renamingCategoryId.value = id }

function finishRenameCategory(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value.trim()) store.renameCategory(id, input.value.trim())
  renamingCategoryId.value = null
}

function handleCategoryColorChange(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value) store.updateCategoryColor(id, input.value)
  editingCategoryColorId.value = null
}

function startNewObject(categoryId: string) {
  newObjectCategoryId.value = categoryId
  newObjectName.value = ''
}

function handleCreateObject() {
  if (!newObjectCategoryId.value) return
  const name = newObjectName.value.trim() || '新对象'
  store.createObject(newObjectCategoryId.value, name)
  newObjectCategoryId.value = null
  newObjectName.value = ''
}

function startRenameObject(id: string) { renamingObjectId.value = id }

function finishRenameObject(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value.trim()) store.renameObject(id, input.value.trim())
  renamingObjectId.value = null
}

function handleObjectColorChange(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value) store.updateObjectColor(id, input.value)
  editingObjectColorId.value = null
}

function clearObjectColor(id: string) { store.updateObjectColor(id, undefined) }

function onObjectDragStart(e: DragEvent, objectId: string) {
  e.dataTransfer!.setData('world-object-id', objectId)
  e.dataTransfer!.effectAllowed = 'copy'
}

function handleDeleteObject(id: string) {
  history.pushSnapshot()
  store.deleteObject(id)
}

// ---- 画布 ----
const activeCanvasName = computed(() => {
  if (!store.activeCanvasId) return '未命名画布'
  const c = store.canvases.find((c) => c.id === store.activeCanvasId)
  return c?.name ?? '未命名画布'
})

function handleNewCanvas() {
  store.requestAction(() => {
    store.newCanvas()
    leftTab.value = 'entries'
  })
  history.clear()
}

function handleOpenCanvas(id: string) {
  store.requestAction(() => store.openCanvas(id))
  history.clear()
}

function startRenameCanvas(id: string) { renamingCanvasId.value = id }

function finishRenameCanvas(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value.trim()) store.renameCanvas(id, input.value.trim())
  renamingCanvasId.value = null
}

// ---- VueFlow nodes/edges ----
const nodes = computed(() =>
  store.cards.map((card) => ({
    id: card.id,
    type: 'world-card',
    position: { x: card.x, y: card.y },
    data: { objectId: card.objectId },
  })),
)

const edges = computed(() =>
  store.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: 'source',
    targetHandle: 'target',
    type: 'center-edge',
  })),
)

// ---- 拖入对象 ----
function onDrop(event: DragEvent) {
  const objectId = event.dataTransfer?.getData('world-object-id')
  if (!objectId || !vueFlowRef.value) return
  const position = vueFlowRef.value.screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  history.pushSnapshot()
  store.addCard(objectId, position.x - 110, position.y - 20)
  ;(event.currentTarget as HTMLElement)?.focus()
}

function onNodeDragStop({ node }: { node: { id: string; position: { x: number; y: number } } }) {
  history.pushSnapshot()
  store.updateCardPosition(node.id, node.position.x, node.position.y)
}

// ---- 双击创建自由文本 ----
let lastPaneClickTime = 0

function onPaneClick(event: MouseEvent) {
  const now = Date.now()
  if (now - lastPaneClickTime < 350) {
    const pos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const uncat = store.categories.find((c) => c.name === '未分类')
    if (uncat) {
      const obj = store.createObject(uncat.id, '自由文本')
      history.pushSnapshot()
      store.addCard(obj.id, pos.x - 110, pos.y - 20)
    }
  }
  lastPaneClickTime = now
}
</script>

<template>
  <div class="flex-1 flex overflow-hidden">

    <!-- 左侧管理器 -->
    <aside class="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div class="flex border-b border-zinc-800">
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'entries' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'entries'"
        >
          条目
        </button>
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'canvases' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'canvases'"
        >
          画布
        </button>
      </div>

      <!-- 条目 Tab -->
      <div v-show="leftTab === 'entries'" class="flex-1 overflow-y-auto">
        <div v-for="cat in store.categories" :key="cat.id" class="border-b border-zinc-800/50">
          <div
            class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800/40 transition-colors select-none"
            @click="toggleCategory(cat.id)"
          >
            <span class="text-xs text-zinc-500 transition-transform" :class="expandedCategories.has(cat.id) ? 'rotate-90' : ''">&#9654;</span>
            <span
              class="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
              :style="{ background: cat.color }"
              @click.stop="editingCategoryColorId = editingCategoryColorId === cat.id ? null : cat.id"
            ></span>
            <input
              v-if="renamingCategoryId === cat.id"
              :value="cat.name"
              class="flex-1 bg-zinc-800 text-sm text-zinc-200 px-1 py-0.5 rounded border border-zinc-600 outline-none min-w-0"
              @keydown.enter="finishRenameCategory(cat.id, $event)"
              @blur="finishRenameCategory(cat.id, $event)"
              @click.stop
            />
            <span v-else class="flex-1 text-sm text-zinc-300 truncate">{{ cat.name }}</span>
            <span class="text-xs text-zinc-600">{{ store.getObjectsByCategory(cat.id).length }}</span>
            <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
              <button class="text-zinc-600 hover:text-zinc-300 text-xs" title="重命名" @click="startRenameCategory(cat.id)">&#9998;</button>
              <button v-if="cat.name !== '未分类'" class="text-zinc-600 hover:text-red-400 text-xs" title="删除目录" @click="store.deleteCategory(cat.id)">&#10005;</button>
            </div>
          </div>
          <div v-if="editingCategoryColorId === cat.id" class="px-3 pb-2" @click.stop>
            <input
              type="color"
              :value="cat.color"
              class="w-full h-7 rounded cursor-pointer bg-transparent border border-zinc-700"
              @input="handleCategoryColorChange(cat.id, $event)"
              @change="handleCategoryColorChange(cat.id, $event)"
            />
          </div>
          <div v-show="expandedCategories.has(cat.id)">
            <div
              v-for="obj in store.getObjectsByCategory(cat.id)"
              :key="obj.id"
              draggable="true"
              class="flex items-center gap-2 px-3 pl-8 py-1.5 cursor-grab hover:bg-zinc-800/40 transition-colors active:cursor-grabbing group"
              @dragstart="onObjectDragStart($event, obj.id)"
              @dblclick="store.openDetail(obj.id)"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: obj.color ?? cat.color }"></span>
              <input
                v-if="renamingObjectId === obj.id"
                :value="obj.name"
                class="flex-1 bg-zinc-800 text-sm text-zinc-200 px-1 py-0.5 rounded border border-zinc-600 outline-none min-w-0"
                @keydown.enter="finishRenameObject(obj.id, $event)"
                @blur="finishRenameObject(obj.id, $event)"
                @click.stop @mousedown.stop @pointerdown.stop
              />
              <span v-else class="flex-1 text-sm text-zinc-400 truncate">{{ obj.name }}</span>
              <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                <button class="text-zinc-600 hover:text-zinc-300 text-xs" title="对象颜色" @click="editingObjectColorId = editingObjectColorId === obj.id ? null : obj.id">&#9673;</button>
                <button class="text-zinc-600 hover:text-zinc-300 text-xs" title="重命名" @click="startRenameObject(obj.id)">&#9998;</button>
                <button class="text-zinc-600 hover:text-red-400 text-xs" title="删除" @click="handleDeleteObject(obj.id)">&#10005;</button>
              </div>
            </div>
            <div v-if="editingObjectColorId && store.getObjectById(editingObjectColorId)?.categoryId === cat.id" class="px-3 pl-8 pb-2" @click.stop>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  :value="store.getObjectById(editingObjectColorId!)?.color ?? cat.color"
                  class="w-8 h-6 rounded cursor-pointer bg-transparent border border-zinc-700"
                  @input="handleObjectColorChange(editingObjectColorId!, $event)"
                  @change="handleObjectColorChange(editingObjectColorId!, $event)"
                />
                <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="clearObjectColor(editingObjectColorId!)">使用目录颜色</button>
              </div>
            </div>
            <div v-if="newObjectCategoryId === cat.id" class="px-3 pl-8 pb-2">
              <input
                v-model="newObjectName"
                class="w-full bg-zinc-800 text-sm text-zinc-200 px-2 py-1 rounded border border-zinc-600 outline-none"
                placeholder="对象名称"
                @keydown.enter="handleCreateObject"
                @keydown.escape="newObjectCategoryId = null"
                @blur="handleCreateObject"
              />
            </div>
            <div class="px-3 pl-8 py-1">
              <button class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" @click="startNewObject(cat.id)">+ 新建对象</button>
            </div>
          </div>
        </div>
        <div class="p-2 border-t border-zinc-800/50">
          <div v-if="showNewCategory" class="flex gap-2">
            <input
              v-model="newCategoryName"
              class="flex-1 bg-zinc-800 text-sm text-zinc-200 px-2 py-1 rounded border border-zinc-600 outline-none min-w-0"
              placeholder="目录名称"
              @keydown.enter="handleAddCategory"
              @keydown.escape="showNewCategory = false"
              @blur="handleAddCategory"
            />
          </div>
          <button v-else class="w-full h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-400 transition-colors" @click="showNewCategory = true">
            + 新建目录
          </button>
        </div>
      </div>

      <!-- 画布 Tab -->
      <div v-show="leftTab === 'canvases'" class="flex-1 overflow-y-auto">
        <div class="p-2">
          <button class="w-full h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors" @click="handleNewCanvas()">
            + 新建画布
          </button>
        </div>
        <div
          v-for="canvas in store.canvases"
          :key="canvas.id"
          class="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
          :class="{ 'bg-zinc-800/60': store.activeCanvasId === canvas.id }"
          @click="handleOpenCanvas(canvas.id)"
          @dblclick.stop="startRenameCanvas(canvas.id)"
        >
          <div class="flex-1 min-w-0">
            <input
              v-if="renamingCanvasId === canvas.id"
              :value="canvas.name"
              class="w-full bg-zinc-800 text-sm text-zinc-200 px-1 py-0.5 rounded border border-zinc-600 outline-none"
              @keydown.enter="finishRenameCanvas(canvas.id, $event)"
              @blur="finishRenameCanvas(canvas.id, $event)"
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
            @click.stop="store.deleteCanvas(canvas.id)"
          >&#10005;</button>
        </div>
        <div v-if="store.canvases.length === 0" class="px-3 py-6 text-center text-zinc-600 text-sm">
          暂无保存的画布
        </div>
      </div>
    </aside>

    <!-- 右侧画布区 -->
    <main class="flex-1 bg-zinc-900 flex flex-col min-w-0">
      <header class="h-10 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
        <span class="text-sm text-zinc-400 tracking-wide">{{ activeCanvasName }}</span>
        <div class="flex items-center gap-2">
          <span v-if="store.dirty" class="text-xs text-zinc-500">未保存</span>
          <button
            class="px-3 h-7 rounded text-xs transition-colors"
            :class="store.dirty ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-500'"
            @click="store.saveCurrentCanvas()"
          >
            保存
          </button>
        </div>
      </header>
      <div
        class="flex-1 relative outline-none"
        tabindex="0"
        @dragover.prevent
        @drop="onDrop"
        @mousedown.right="rc.onCanvasRightDown"
        @click="closeContextMenu"
        @keydown="onKeyDown"
      >
        <VueFlow
          ref="vueFlowRef"
          v-model:nodes="nodes"
          :edges="edges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-viewport="{ x: 0, y: 0, zoom: 1 }"
          :connect-on-click="false"
          :delete-key-code="null"
          :selection-mode="SelectionMode.Partial"
          :select-on-click="!store.activeDrawingTool"
          :draggable="!store.activeDrawingTool"
          :zoom-on-pan="!store.activeDrawingTool"
          :pan-on-drag="!store.activeDrawingTool"
          class="world-flow"
          @node-drag-stop="onNodeDragStop"
          @edge-context-menu="rc.handleEdgeContextMenu"
          @pane-click="onPaneClick"
          @contextmenu.prevent
        >
          <!-- 右键连线临时线 -->
          <svg
            v-if="rc.isConnecting.value"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;"
          >
            <path
              :d="`M${rc.connectLine.sourceX},${rc.connectLine.sourceY} L${rc.connectLine.cursorX},${rc.connectLine.cursorY}`"
              fill="none"
              stroke="#a78bfa"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
          </svg>

          <!-- 绘图工具栏 -->
          <div class="drawing-toolbar absolute bottom-6 right-6 bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1 z-50">
            <UndoButton :can-undo="history.canUndo.value" @undo="history.undo()" />
            <div class="w-full h-px bg-zinc-800 my-1"></div>
            <button
              v-for="tool in drawing.drawingTools"
              :key="tool.type"
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-sm"
              :class="store.activeDrawingTool === tool.type ? 'bg-violet-600 text-white' : 'text-zinc-400'"
              @click.stop="drawing.switchDrawingTool(tool.type)"
              :title="tool.label"
            >
              {{ tool.icon }}
            </button>
            <div class="w-full h-px bg-zinc-800 my-1"></div>
            <input type="color" v-model="store.drawingConfig.color" class="w-8 h-8 rounded border-0 cursor-pointer" title="线条颜色" />
            <div class="w-full h-px bg-zinc-800 my-1"></div>
            <input type="range" v-model="store.drawingConfig.lineWidth" min="1" max="10" class="w-8 h-12 -rotate-90 origin-center" title="线条宽度" />
          </div>

          <!-- 绘图层 Canvas -->
          <canvas
            ref="drawingCanvasRef"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"
          />

          <!-- 绘图交互层 -->
          <div
            v-if="store.activeDrawingTool"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; cursor: crosshair;"
            @mousedown="drawing.onDrawingOverlayDown"
          />

          <template #pane>
            <div v-if="store.cards.length === 0" class="absolute inset-0 flex items-center justify-center text-zinc-700 text-sm pointer-events-none">
              从左侧拖入对象到画布
            </div>
          </template>
        </VueFlow>
      </div>
    </main>

    <!-- 对象详情弹窗 -->
    <ObjectDetailPanel
      v-for="detail in store.openDetails"
      :key="detail.objectId"
      :detail="detail"
    />

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg py-1 shadow-xl min-w-28"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <template v-for="(item, idx) in contextMenuItems" :key="idx">
        <button
          class="w-full px-4 py-1.5 text-left text-sm hover:bg-zinc-800 transition-colors"
          :class="item.danger ? 'text-red-400' : 'text-zinc-300'"
          @click="item.action"
        >
          {{ item.label }}
        </button>
        <div
          v-if="item.label === '修改颜色' && contextMenu.showColorPicker"
          class="px-3 py-2 flex items-center gap-2"
          @click.stop @mousedown.stop @pointerdown.stop
        >
          <input
            type="color"
            :value="store.cards.find(c => c.id === contextMenu.targetId)?.color ?? store.resolveCardColor(contextMenu.targetId)"
            class="w-8 h-6 rounded cursor-pointer bg-transparent border border-zinc-700"
            @input="onCardColorInput"
            @change="onCardColorChange"
          />
          <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="resetCardColor">重置</button>
        </div>
      </template>
    </div>

    <!-- 未保存确认弹窗 -->
    <div
      v-if="store.confirmDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-80 shadow-xl">
        <div class="text-sm text-zinc-200 mb-1">画布有未保存的改动</div>
        <div class="text-xs text-zinc-500 mb-5">离开前是否保存当前画布？</div>
        <div class="flex gap-3">
          <button class="flex-1 h-8 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors" @click="store.confirmSave()">保存</button>
          <button class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors" @click="store.confirmDiscard()">不保存</button>
          <button class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors" @click="store.confirmCancel()">取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.world-flow {
  width: 100%;
  height: 100%;
  background: #18181b;
}
</style>
