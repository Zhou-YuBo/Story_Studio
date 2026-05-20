<script setup lang="ts">
import { computed, markRaw, reactive, ref, onMounted, watch, provide } from 'vue'
import { VueFlow, useVueFlow, SelectionMode } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useInspirationStore, type InspirationItem, type DrawingItem } from '../stores/inspiration'
import { useCanvasHistory } from '../composables/useCanvasHistory'
import { canvasHistoryKey, type CanvasHistoryHandle } from '../composables/canvasHistoryKey'
import InspirationCard from '../components/InspirationCard.vue'
import CenterEdge from '../components/CenterEdge.vue'
import UndoButton from '../components/UndoButton.vue'

const store = useInspirationStore()
const storeRefs = storeToRefs(store)
const history = useCanvasHistory({ cards: storeRefs.cards, edges: storeRefs.edges, drawings: storeRefs.drawings, dirty: storeRefs.dirty })
provide(canvasHistoryKey, { beginBatch: history.beginBatch, endBatch: history.endBatch } satisfies CanvasHistoryHandle)

const vueFlowRef = ref<InstanceType<typeof VueFlow>>()
const drawingCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasCtx = ref<CanvasRenderingContext2D | null>(null)
const { findNode, screenToFlowCoordinate, getSelectedNodes, getSelectedEdges, viewport, onViewportChange } = useVueFlow()

const nodeTypes = { 'inspiration-card': markRaw(InspirationCard) } as any
const edgeTypes = { 'center-edge': markRaw(CenterEdge) } as any

// ---- 左侧面板 Tab ----
const leftTab = ref<'materials' | 'canvases'>('materials')

const activeCanvasName = computed(() => {
  if (!store.activeCanvasId) return '未命名画布'
  const c = store.canvases.find((c) => c.id === store.activeCanvasId)
  return c?.name ?? '未命名画布'
})

const nodes = computed(() =>
  store.cards.map((card) => ({
    id: card.id,
    type: 'inspiration-card',
    position: { x: card.x, y: card.y },
    data: { inspirationId: card.inspirationId, onRightMouseDown },
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

// ---- 绘图工具配置 ----
const drawingTools = [
  { type: 'line', label: '直线', icon: '─' },
  { type: 'arrow', label: '箭头', icon: '→' },
  { type: 'rect', label: '矩形', icon: '▢' },
  { type: 'circle', label: '圆形', icon: '○' },
  { type: 'triangle', label: '三角形', icon: '△' },
  { type: 'brace', label: '大括号', icon: '{' },
  { type: 'pencil', label: '手绘', icon: '✏' },
]

function switchDrawingTool(toolType: string) {
  store.activeDrawingTool = store.activeDrawingTool === toolType ? null : toolType
  store.highlightCardIds = []
}

// ---- 绘图工具 ----
let lastPaneClickTime = 0

function onPaneClick(event: MouseEvent) {
  const now = Date.now()
  if (now - lastPaneClickTime < 350) {
    const pos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const item = store.createTextItem()
    history.pushSnapshot()
    store.addCard(item.id, pos.x - 130, pos.y - 20)
  }
  lastPaneClickTime = now
}

function startDrawing(e: MouseEvent, toolType: string) {
  if (!store.activeDrawingTool) return
  e.preventDefault()
  const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  store.isDrawing = true

  const points = toolType === 'pencil' ? [pos] : [pos, pos]

  store.drawingPreview = {
    id: `draw-${Date.now()}`,
    type: toolType as any,
    color: store.drawingConfig.color,
    lineWidth: store.drawingConfig.lineWidth,
    points
  }

  // 在 window 上监听 mousemove/mouseup，保证拖出画布外也能继续
  window.addEventListener('mousemove', onDrawingMouseMove)
  window.addEventListener('mouseup', onDrawingMouseUp)
}

function onDrawingMouseMove(e: MouseEvent) {
  if (!store.isDrawing || !store.drawingPreview) return
  const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })

  if (store.drawingPreview.type === 'pencil') {
    store.drawingPreview.points.push(pos)
  } else {
    store.drawingPreview.points[1] = pos
  }
}

function onDrawingMouseUp() {
  finishDrawing()
  window.removeEventListener('mousemove', onDrawingMouseMove)
  window.removeEventListener('mouseup', onDrawingMouseUp)
}

function finishDrawing() {
  if (store.isDrawing && store.drawingPreview) {
    history.pushSnapshot()
    store.drawings.push(store.drawingPreview)
    store.dirty = true
  }
  store.isDrawing = false
  store.drawingPreview = null
}

function onDrawingOverlayDown(e: MouseEvent) {
  if (store.activeDrawingTool) {
    startDrawing(e, store.activeDrawingTool)
  }
}

// ---- 右键连线 ----
const connecting = reactive({
  active: false,
  sourceId: '',
  sourceX: 0,
  sourceY: 0,
  cursorX: 0,
  cursorY: 0,
})
let justConnected = false

function onRightMouseDown(nodeId: string) {
  const src = findNode(nodeId)
  if (!src) return

  connecting.active = true
  connecting.sourceId = nodeId
  connecting.sourceX = src.position.x + (src.dimensions?.width ?? 260) / 2
  connecting.sourceY = src.position.y + (src.dimensions?.height ?? 160) / 2
  connecting.cursorX = connecting.sourceX
  connecting.cursorY = connecting.sourceY
}

function onPaneMouseMove(event: MouseEvent) {
  if (!connecting.active) return
  const pos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  connecting.cursorX = pos.x
  connecting.cursorY = pos.y
}

function onPaneMouseUp(event: MouseEvent) {
  finishConnecting(event.clientX, event.clientY)
}

function onCanvasMouseUp(event: MouseEvent) {
  if (!connecting.active) return
  finishConnecting(event.clientX, event.clientY)
}

function finishConnecting(clientX: number, clientY: number) {
  if (!connecting.active) return

  const pos = screenToFlowCoordinate({ x: clientX, y: clientY })
  let targetId = ''
  for (const card of store.cards) {
    const node = findNode(card.id)
    if (!node) continue
    const w = node.dimensions?.width ?? 260
    const h = node.dimensions?.height ?? 160
    if (
      pos.x >= node.position.x &&
      pos.x <= node.position.x + w &&
      pos.y >= node.position.y &&
      pos.y <= node.position.y + h
    ) {
      targetId = card.id
      break
    }
  }

  if (targetId && targetId !== connecting.sourceId) {
    history.pushSnapshot()
    store.addEdge(connecting.sourceId, targetId)
  }

  connecting.active = false
  justConnected = true
  setTimeout(() => { justConnected = false }, 100)
}

// ---- 拖入素材 ----
function typeIcon(type: InspirationItem['type']): string {
  const map: Record<string, string> = {
    image: 'IMG',
    text: 'TXT',
    pdf: 'PDF',
    audio: 'AUD',
  }
  return map[type]
}

function typeLabel(type: InspirationItem['type']): string {
  const map: Record<string, string> = {
    image: '图片',
    text: '文本',
    pdf: 'PDF',
    audio: '音频',
  }
  return map[type]
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[1]}月${parts[2]}日`
}

function onDragStart(event: DragEvent, id: string) {
  event.dataTransfer!.effectAllowed = 'copy'
  event.dataTransfer!.setData('application/inspiration-id', id)
}

function onDrop(event: DragEvent) {
  const inspirationId = event.dataTransfer?.getData('application/inspiration-id')
  if (!inspirationId || !vueFlowRef.value) return

  const position = vueFlowRef.value.screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  history.pushSnapshot()
  store.addCard(inspirationId, position.x - 130, position.y - 20)
  ;(event.currentTarget as HTMLElement)?.focus()
}

function onNodeDragStop({ node }: { node: { id: string; position: { x: number; y: number } } }) {
  history.pushSnapshot()
  store.updateCardPosition(node.id, node.position.x, node.position.y)
}

// ---- 画布切换（带未保存提醒） ----
function handleOpenCanvas(id: string) {
  store.requestAction(() => store.openCanvas(id))
  history.clear()
}

function handleNewCanvas() {
  store.requestAction(() => {
    store.newCanvas()
    leftTab.value = 'materials'
  })
  history.clear()
}

// ---- 右键菜单 ----
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'node' | 'edge' | '',
  targetId: '',
})

function onNodeContextMenu({ event, node }: { event: any; node: { id: string } }) {
  event.preventDefault()
  if (justConnected) return
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.type = 'node'
  contextMenu.targetId = node.id
}

function onEdgeContextMenu({ event, edge }: { event: any; edge: { id: string } }) {
  event.preventDefault()
  if (justConnected) return
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.type = 'edge'
  contextMenu.targetId = edge.id
}

function closeContextMenu() {
  contextMenu.visible = false
}

function deleteContextTarget() {
  history.pushSnapshot()
  if (contextMenu.type === 'node') store.removeCard(contextMenu.targetId)
  if (contextMenu.type === 'edge') store.removeEdge(contextMenu.targetId)
  closeContextMenu()
}

// ---- 绘图层渲染 ----
onMounted(() => {
  if (drawingCanvasRef.value) {
    canvasCtx.value = drawingCanvasRef.value.getContext('2d')
    window.addEventListener('resize', () => {
      if (drawingCanvasRef.value && vueFlowRef.value) {
        const container = vueFlowRef.value.$el as HTMLElement
        drawingCanvasRef.value.width = container.clientWidth
        drawingCanvasRef.value.height = container.clientHeight
        renderDrawings()
      }
    })
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
  }
  onViewportChange(() => {
    renderDrawings()
  })
})

// 渲染绘图元素
function renderDrawings() {
  if (!canvasCtx.value || !drawingCanvasRef.value) return
  const { x, y, zoom } = viewport.value
  canvasCtx.value.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height)
  canvasCtx.value.save()
  canvasCtx.value.translate(x, y)
  canvasCtx.value.scale(zoom, zoom)
  for (const draw of store.drawings) {
    renderDrawingItem(draw)
  }
  if (store.drawingPreview) {
    renderDrawingItem(store.drawingPreview)
  }
  canvasCtx.value.restore()
}

// 渲染单个绘图元素
function renderDrawingItem(item: DrawingItem) {
  if (!canvasCtx.value) return

  canvasCtx.value.strokeStyle = item.color
  canvasCtx.value.lineWidth = item.lineWidth
  canvasCtx.value.lineCap = 'round'
  canvasCtx.value.lineJoin = 'round'

  switch (item.type) {
    case 'line':
      canvasCtx.value.beginPath()
      canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
      canvasCtx.value.lineTo(item.points[1].x, item.points[1].y)
      canvasCtx.value.stroke()
      break

    case 'arrow':
      if (item.points.length >= 2) {
        const headLen = 16
        const angle = Math.atan2(item.points[1].y - item.points[0].y, item.points[1].x - item.points[0].x)
        // 直线提前结束到箭头底边位置
        const lineEnd = {
          x: item.points[1].x - headLen * Math.cos(angle),
          y: item.points[1].y - headLen * Math.sin(angle)
        }
        canvasCtx.value.beginPath()
        canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
        canvasCtx.value.lineTo(lineEnd.x, lineEnd.y)
        canvasCtx.value.stroke()
        drawArrowHead(item.points[1], angle, headLen)
      }
      break

    case 'rect':
      if (item.points.length >= 2) {
        const x = Math.min(item.points[0].x, item.points[1].x)
        const y = Math.min(item.points[0].y, item.points[1].y)
        const width = Math.abs(item.points[1].x - item.points[0].x)
        const height = Math.abs(item.points[1].y - item.points[0].y)
        canvasCtx.value.strokeRect(x, y, width, height)
      }
      break

    case 'circle':
      if (item.points.length >= 2) {
        const dx = item.points[1].x - item.points[0].x
        const dy = item.points[1].y - item.points[0].y
        const radius = Math.sqrt(dx * dx + dy * dy)
        canvasCtx.value.beginPath()
        canvasCtx.value.arc(item.points[0].x, item.points[0].y, radius, 0, 2 * Math.PI)
        canvasCtx.value.stroke()
      }
      break

    case 'pencil':
      if (item.points.length > 1) {
        canvasCtx.value.beginPath()
        canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
        for (let i = 1; i < item.points.length; i++) {
          canvasCtx.value.lineTo(item.points[i].x, item.points[i].y)
        }
        canvasCtx.value.stroke()
      }
      break
    case 'triangle':
      if (item.points.length >= 2) {
        const dx = item.points[1].x - item.points[0].x
        const dy = item.points[1].y - item.points[0].y
        canvasCtx.value.beginPath()
        canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
        canvasCtx.value.lineTo(item.points[1].x, item.points[1].y)
        canvasCtx.value.lineTo(item.points[0].x + dx / 2 - dy * 0.433, item.points[0].y + dy / 2 + dx * 0.433)
        canvasCtx.value.closePath()
        canvasCtx.value.stroke()
      }
      break
    case 'brace':
      if (item.points.length >= 2) {
        const x = Math.min(item.points[0].x, item.points[1].x)
        const y = Math.min(item.points[0].y, item.points[1].y)
        const w = Math.abs(item.points[1].x - item.points[0].x)
        const h = Math.abs(item.points[1].y - item.points[0].y)
        if (w > 10 && h > 10) {
          // 先用矩形高度作为初始字号，测量实际字形尺寸
          canvasCtx.value.font = `${h}px sans-serif`
          const metrics = canvasCtx.value.measureText('{')
          // actualBoundingBoxAscent + Descent 是字形实际高度
          const glyphH = (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0)
          const glyphW = metrics.width
          // 按比例放大字号，让字形撑满矩形
          const scale = Math.min(w / glyphW, h / glyphH)
          const fontSize = h * scale
          canvasCtx.value.font = `${fontSize}px sans-serif`
          canvasCtx.value.textBaseline = 'top'
          canvasCtx.value.textAlign = 'center'
          canvasCtx.value.fillStyle = item.color
          canvasCtx.value.fillText('{', x + w / 2, y + (h - fontSize) / 2)
        }
      }
      break
  }
}

// 绘制箭头头部
function drawArrowHead(tip: {x: number, y: number}, angle: number, headLength: number) {
  if (!canvasCtx.value) return

  const x1 = tip.x - headLength * Math.cos(angle - Math.PI / 4)
  const y1 = tip.y - headLength * Math.sin(angle - Math.PI / 4)
  const x2 = tip.x - headLength * Math.cos(angle + Math.PI / 4)
  const y2 = tip.y - headLength * Math.sin(angle + Math.PI / 4)

  canvasCtx.value.beginPath()
  canvasCtx.value.moveTo(x1, y1)
  canvasCtx.value.lineTo(tip.x, tip.y)
  canvasCtx.value.lineTo(x2, y2)
  canvasCtx.value.closePath()
  canvasCtx.value.fillStyle = canvasCtx.value.strokeStyle
  canvasCtx.value.fill()
}

// 监听绘图变化，自动重绘
watch([() => store.drawings, () => store.drawingPreview], () => {
  renderDrawings()
}, { deep: true })

// ---- 键盘快捷键 ----
function onKeyDown(e: KeyboardEvent) {
  // Ctrl+Z: 撤回
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    history.undo()
    return
  }
  // Delete / Backspace：删除选中的卡片或连线
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 避免在输入框里误删
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

    const selectedNodes = getSelectedNodes.value
    const selectedEdges = getSelectedEdges.value

    if (selectedNodes.length > 0) {
      history.pushSnapshot()
      for (const n of selectedNodes) store.removeCard(n.id)
      e.preventDefault()
    } else if (selectedEdges.length > 0) {
      history.pushSnapshot()
      for (const ed of selectedEdges) store.removeEdge(ed.id)
      e.preventDefault()
    }
  }

  // F2：重命名当前画布
  if (e.key === 'F2') {
    e.preventDefault()
    if (store.activeCanvasId) {
      renamingCanvasId.value = store.activeCanvasId
    }
  }
}

// ---- 画布重命名 ----
const renamingCanvasId = ref<string | null>(null)

function startRename(canvasId: string) {
  renamingCanvasId.value = canvasId
}

function finishRename(canvasId: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input && input.value.trim()) {
    store.renameCanvas(canvasId, input.value.trim())
  }
  renamingCanvasId.value = null
}

// ---- 提炼笔记面板 ----
const canvasNotes = computed(() => {
  if (!store.activeCanvasId) return []
  return store.getNotesForCanvas(store.activeCanvasId)
})

const splitRatio = ref(50)

function onSplitMouseDown(e: MouseEvent) {
  const startY = e.clientY
  const startRatio = splitRatio.value
  const panel = (e.target as HTMLElement).parentElement!
  const panelHeight = panel.offsetHeight

  function onMove(ev: MouseEvent) {
    const delta = ev.clientY - startY
    const pct = startRatio + (delta / panelHeight) * 100
    splitRatio.value = Math.max(20, Math.min(80, pct))
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function handleCreateNote() {
  const note = store.createNote()
  store.editingNoteId = note.id
}

function openNoteEdit(noteId: string) {
  store.editingNoteId = noteId
  updateHighlight(noteId)
}

function closeNoteEdit() {
  store.editingNoteId = null
  store.highlightCardIds = []
}

function onNoteContentInput(e: Event) {
  if (!store.editingNoteId) return
  store.updateNoteContent(store.editingNoteId, (e.target as HTMLTextAreaElement).value)
}

const linkHint = ref('')
let linkHintTimer = 0

function showLinkHint(msg: string) {
  linkHint.value = msg
  clearTimeout(linkHintTimer)
  linkHintTimer = window.setTimeout(() => { linkHint.value = '' }, 3000)
}

function handleLinkCanvas() {
  if (!store.editingNoteId) return
  if (!store.activeCanvasId) { showLinkHint('请先保存当前画布再关联'); return }
  store.addNoteSource(store.editingNoteId, store.activeCanvasId, [])
}

function handleLinkSelected() {
  if (!store.editingNoteId) return
  if (!store.activeCanvasId) { showLinkHint('请先保存当前画布再关联'); return }
  const ids = getSelectedNodes.value.map((n) => n.id)
  if (ids.length === 0) { showLinkHint('请先在画布上选中卡片'); return }
  store.addNoteSource(store.editingNoteId, store.activeCanvasId, ids)
}

function updateHighlight(noteId: string) {
  const note = store.notes.find((n) => n.id === noteId)
  if (!note) { store.highlightCardIds = []; return }
  const ids: string[] = []
  for (const s of note.sources) {
    if (s.canvasId === store.activeCanvasId) {
      if (s.cardIds.length > 0) ids.push(...s.cardIds)
      else ids.push(...store.cards.map((c) => c.id))
    }
  }
  store.highlightCardIds = ids
}

function onNoteHover(noteId: string) {
  updateHighlight(noteId)
}

function onNoteLeave() {
  if (!store.editingNoteId) store.highlightCardIds = []
}

function sourceLabel(source: { canvasId: string; cardIds: string[] }): string {
  const canvas = store.canvases.find((c) => c.id === source.canvasId)
  const name = canvas?.name ?? '未命名画布'
  if (source.cardIds.length === 0) return `${name}（整个画布）`
  return `${name}（${source.cardIds.length} 张卡片）`
}

function notePreview(note: { content: string }): string {
  if (!note.content) return '空笔记'
  return note.content.length > 50 ? note.content.slice(0, 50) + '…' : note.content
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="flex-1 flex overflow-hidden">

    <!-- 左侧面板 -->
    <aside class="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <!-- Tab 切换 -->
      <div class="flex border-b border-zinc-800">
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'materials' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'materials'"
        >
          素材
        </button>
        <button
          class="flex-1 h-10 text-sm transition-colors"
          :class="leftTab === 'canvases' ? 'text-zinc-200 border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'"
          @click="leftTab = 'canvases'"
        >
          画布
        </button>
      </div>

      <!-- 素材 Tab -->
      <div v-show="leftTab === 'materials'" class="flex-1 overflow-y-auto">
        <div
          v-for="item in store.items"
          :key="item.id"
          draggable="true"
          @dragstart="onDragStart($event, item.id)"
          class="flex items-start gap-3 px-3 py-2.5 border-b border-zinc-800/50 cursor-grab hover:bg-zinc-800/40 transition-colors active:cursor-grabbing"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs mt-0.5">
            {{ typeIcon(item.type) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-zinc-300 truncate">{{ item.title }}</div>
            <div class="text-xs text-zinc-600 mt-0.5">{{ typeLabel(item.type) }} &middot; {{ formatDate(item.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 画布 Tab -->
      <div v-show="leftTab === 'canvases'" class="flex-1 overflow-y-auto">
        <div class="p-2">
          <button
            class="w-full h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
            @click="handleNewCanvas()"
          >
            + 新建画布
          </button>
        </div>
        <div
          v-for="canvas in store.canvases"
          :key="canvas.id"
          class="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
          :class="{ 'bg-zinc-800/60': store.activeCanvasId === canvas.id }"
          @click="handleOpenCanvas(canvas.id)"
          @dblclick.stop="startRename(canvas.id)"
        >
          <div class="flex-1 min-w-0">
            <input
              v-if="renamingCanvasId === canvas.id"
              :value="canvas.name"
              class="w-full bg-zinc-800 text-sm text-zinc-200 px-1 py-0.5 rounded border border-zinc-600 outline-none"
              @keydown.enter="finishRename(canvas.id, $event)"
              @blur="finishRename(canvas.id, $event)"
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
          >
            ✕
          </button>
        </div>
        <div v-if="store.canvases.length === 0" class="px-3 py-6 text-center text-zinc-600 text-sm">
          暂无保存的画布
        </div>
      </div>
    </aside>

    <!-- 中间：画布 -->
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
      <div class="flex-1 relative outline-none" @dragover.prevent @drop="onDrop" @mouseup.right="onCanvasMouseUp" @click="closeContextMenu" @keydown="onKeyDown" tabindex="0">
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
          class="inspiration-flow"
          @node-drag-stop="onNodeDragStop"
          @pane-mouse-move="onPaneMouseMove"
          @pane-mouse-up="onPaneMouseUp"
          @node-context-menu="onNodeContextMenu"
          @edge-context-menu="onEdgeContextMenu"
          @pane-click="onPaneClick"
          @contextmenu.prevent
        >
          <!-- 右键连线时的临时线 -->
          <svg
            v-if="connecting.active"
            class="connecting-line"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;"
          >
            <path
              :d="`M${connecting.sourceX},${connecting.sourceY} L${connecting.cursorX},${connecting.cursorY}`"
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
              v-for="tool in drawingTools"
              :key="tool.type"
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-sm"
              :class="store.activeDrawingTool === tool.type ? 'bg-violet-600 text-white' : 'text-zinc-400'"
              @click.stop="switchDrawingTool(tool.type)"
              :title="tool.label"
            >
              {{ tool.icon }}
            </button>
            <div class="w-full h-px bg-zinc-800 my-1"></div>
            <input
              type="color"
              v-model="store.drawingConfig.color"
              class="w-8 h-8 rounded border-0 cursor-pointer"
              title="线条颜色"
            />
            <div class="w-full h-px bg-zinc-800 my-1"></div>
            <input
              type="range"
              v-model="store.drawingConfig.lineWidth"
              min="1"
              max="10"
              class="w-8 h-12 -rotate-90 origin-center"
              title="线条宽度"
            />
          </div>

          <!-- 绘图层Canvas -->
          <canvas
            ref="drawingCanvasRef"
            class="drawing-canvas"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"
          />

          <!-- 绘图工具激活时的透明交互层 -->
          <div
            v-if="store.activeDrawingTool"
            class="drawing-overlay"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; cursor: crosshair;"
            @mousedown="onDrawingOverlayDown"
          />

          <template #pane>
            <div v-if="store.cards.length === 0" class="absolute inset-0 flex items-center justify-center text-zinc-700 text-sm pointer-events-none">
              从左侧拖入素材到画布
            </div>
          </template>
        </VueFlow>
      </div>
    </main>

    <!-- 右侧：提炼笔记 -->
    <aside class="w-80 flex-shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col">

      <!-- 编辑视图 -->
      <template v-if="store.editingNoteId">
        <header class="h-10 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
          <button class="text-zinc-500 hover:text-white transition text-sm" @click="closeNoteEdit">← 返回</button>
          <button
            class="text-zinc-600 hover:text-red-400 transition text-xs"
            @click="store.deleteNote(store.editingNoteId!)"
          >删除</button>
        </header>
        <div class="flex-1 overflow-y-auto flex flex-col">
          <textarea
            class="flex-1 min-h-[120px] bg-transparent text-sm text-zinc-200 p-3 resize-none outline-none placeholder-zinc-600"
            :value="store.notes.find(n => n.id === store.editingNoteId)?.content ?? ''"
            @input="onNoteContentInput"
            placeholder="写下你的想法…"
          />
          <div class="border-t border-zinc-800 p-3">
            <div class="text-xs text-zinc-500 mb-2">关联来源</div>
            <div class="flex gap-2 mb-3">
              <button
                class="flex-1 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                @click="handleLinkCanvas"
              >关联画布</button>
              <button
                class="flex-1 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                @click="handleLinkSelected"
              >关联选中</button>
            </div>
            <div v-if="linkHint" class="text-xs text-amber-400 mb-2">{{ linkHint }}</div>
            <div
              v-for="(source, idx) in store.notes.find(n => n.id === store.editingNoteId)?.sources ?? []"
              :key="idx"
              class="flex items-center justify-between py-1.5 text-xs"
            >
              <span class="text-zinc-400">{{ sourceLabel(source) }}</span>
              <button
                class="text-zinc-600 hover:text-red-400 transition"
                @click="store.removeNoteSource(store.editingNoteId!, idx)"
              >✕</button>
            </div>
            <div
              v-if="(store.notes.find(n => n.id === store.editingNoteId)?.sources ?? []).length === 0"
              class="text-xs text-zinc-600"
            >暂无关联</div>
          </div>
        </div>
      </template>

      <!-- 列表视图 -->
      <template v-else>
        <!-- 上区：全部笔记 -->
        <div class="flex flex-col" :style="{ height: splitRatio + '%' }">
          <header class="h-10 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
            <span class="text-sm text-zinc-400 tracking-wide">全部笔记</span>
            <button class="text-zinc-500 hover:text-white transition text-lg leading-none" @click="handleCreateNote">+</button>
          </header>
          <div class="flex-1 overflow-y-auto">
            <div
              v-for="note in store.notes"
              :key="note.id"
              class="px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
              @click="openNoteEdit(note.id)"
              @mouseenter="onNoteHover(note.id)"
              @mouseleave="onNoteLeave"
            >
              <div class="text-sm text-zinc-300 truncate">{{ notePreview(note) }}</div>
              <div class="flex items-center gap-2 mt-1">
                <span v-if="note.sources.length > 0" class="text-xs text-violet-400/70">{{ note.sources.length }} 个来源</span>
                <span v-else class="text-xs text-zinc-600">未关联</span>
                <span class="text-xs text-zinc-600 ml-auto">{{ formatDateTime(note.updatedAt) }}</span>
              </div>
            </div>
            <div v-if="store.notes.length === 0" class="px-3 py-6 text-center text-zinc-600 text-sm">
              点击 + 创建第一条笔记
            </div>
          </div>
        </div>

        <!-- 分割线 -->
        <div
          class="h-1 bg-zinc-800 hover:bg-violet-500/50 cursor-row-resize flex-shrink-0 transition-colors"
          @mousedown="onSplitMouseDown"
        />

        <!-- 下区：当前画布笔记 -->
        <div class="flex flex-col" :style="{ height: (100 - splitRatio) + '%' }">
          <header class="h-10 flex items-center px-3 border-b border-zinc-800 flex-shrink-0">
            <span class="text-sm text-zinc-400 tracking-wide">本画布笔记</span>
          </header>
          <div class="flex-1 overflow-y-auto">
            <div
              v-for="note in canvasNotes"
              :key="note.id"
              class="px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
              @click="openNoteEdit(note.id)"
              @mouseenter="onNoteHover(note.id)"
              @mouseleave="onNoteLeave"
            >
              <div class="text-sm text-zinc-300 truncate">{{ notePreview(note) }}</div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-violet-400/70">{{ note.sources.length }} 个来源</span>
                <span class="text-xs text-zinc-600 ml-auto">{{ formatDateTime(note.updatedAt) }}</span>
              </div>
            </div>
            <div v-if="canvasNotes.length === 0" class="px-3 py-6 text-center text-zinc-600 text-sm">
              {{ store.activeCanvasId ? '当前画布暂无关联笔记' : '请先打开一个画布' }}
            </div>
          </div>
        </div>
      </template>

    </aside>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg py-1 shadow-xl min-w-28"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <button
        class="w-full px-4 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-800 transition-colors"
        @click="deleteContextTarget()"
      >
        删除
      </button>
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
          <button
            class="flex-1 h-8 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors"
            @click="store.confirmSave()"
          >
            保存
          </button>
          <button
            class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
            @click="store.confirmDiscard()"
          >
            不保存
          </button>
          <button
            class="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors"
            @click="store.confirmCancel()"
          >
            取消
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
