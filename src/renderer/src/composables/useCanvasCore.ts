import { ref, type Ref } from 'vue'
import type { BaseCard, CanvasEdge, DrawingItem, Canvas } from '../types/canvas'

export interface CanvasCoreConfig {
  idPrefix: { card: string; edge: string; canvas: string }
  minCardSize: { width: number; height: number }
  onPersist?: () => void
}

export function useCanvasCore<TCard extends BaseCard>(config: CanvasCoreConfig) {
  let nextCardId = 1
  let nextEdgeId = 1
  let nextCanvasId = 1

  type TCanvas = Canvas<TCard>

  function persist() {
    config.onPersist?.()
  }

  function restoreIdCounters(list: TCanvas[]) {
    for (const c of list) {
      for (const card of c.cards) {
        const n = parseInt(card.id.replace(config.idPrefix.card, ''))
        if (!isNaN(n)) nextCardId = Math.max(nextCardId, n + 1)
      }
      for (const edge of c.edges) {
        const n = parseInt(edge.id.replace(config.idPrefix.edge, ''))
        if (!isNaN(n)) nextEdgeId = Math.max(nextEdgeId, n + 1)
      }
      const cn = parseInt(c.id.replace(config.idPrefix.canvas, ''))
      if (!isNaN(cn)) nextCanvasId = Math.max(nextCanvasId, cn + 1)
    }
  }

  // ---- 核心状态 ----
  const cards = ref<TCard[]>([]) as Ref<TCard[]>
  const edges = ref<CanvasEdge[]>([])
  const drawings = ref<DrawingItem[]>([])
  const canvases = ref<TCanvas[]>([]) as Ref<TCanvas[]>
  const activeCanvasId = ref<string | null>(null)

  // ---- 保存确认 ----
  const dirty = ref(false)
  const confirmDialog = ref(false)
  const pendingAction = ref<(() => void) | null>(null)

  // ---- 绘图工具 ----
  const activeDrawingTool = ref<string | null>(null)
  const isDrawing = ref(false)
  const drawingPreview = ref<DrawingItem | null>(null)
  const drawingConfig = ref({ color: '#a78bfa', lineWidth: 2 })

  function hydrateCanvases(list: TCanvas[]) {
    nextCardId = 1
    nextEdgeId = 1
    nextCanvasId = 1
    canvases.value = JSON.parse(JSON.stringify(list))
    restoreIdCounters(canvases.value)
    newCanvas()
  }

  function toProjectCanvases(): TCanvas[] {
    return JSON.parse(JSON.stringify(canvases.value))
  }

  restoreIdCounters(canvases.value)

  // ---- ID 生成 ----
  function genCardId(): string {
    return `${config.idPrefix.card}${nextCardId++}`
  }
  function genEdgeId(): string {
    return `${config.idPrefix.edge}${nextEdgeId++}`
  }

  // ---- 画布 CRUD ----
  function createCanvas(name: string): TCanvas {
    const canvas = {
      id: `${config.idPrefix.canvas}${nextCanvasId++}`,
      name,
      cards: [],
      edges: [],
      drawings: [],
      updatedAt: new Date().toISOString()
    } as TCanvas
    canvases.value.push(canvas)
    persist()
    return canvas
  }

  function openCanvas(id: string) {
    const canvas = canvases.value.find((c) => c.id === id)
    if (!canvas) return
    cards.value = JSON.parse(JSON.stringify(canvas.cards))
    edges.value = JSON.parse(JSON.stringify(canvas.edges))
    drawings.value = JSON.parse(JSON.stringify(canvas.drawings || []))
    activeCanvasId.value = id
    dirty.value = false
  }

  function saveCurrentCanvas() {
    if (!activeCanvasId.value) {
      const canvas = createCanvas('未命名画布')
      activeCanvasId.value = canvas.id
    }
    const canvas = canvases.value.find((c) => c.id === activeCanvasId.value)
    if (!canvas) return
    canvas.cards = JSON.parse(JSON.stringify(cards.value))
    canvas.edges = JSON.parse(JSON.stringify(edges.value))
    canvas.drawings = JSON.parse(JSON.stringify(drawings.value))
    canvas.updatedAt = new Date().toISOString()
    persist()
    dirty.value = false
  }

  function deleteCanvas(id: string) {
    canvases.value = canvases.value.filter((c) => c.id !== id)
    persist()
    if (activeCanvasId.value === id) {
      activeCanvasId.value = null
      cards.value = []
      edges.value = []
      drawings.value = []
    }
  }

  function renameCanvas(id: string, name: string) {
    const canvas = canvases.value.find((c) => c.id === id)
    if (canvas) {
      canvas.name = name
      canvas.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function newCanvas() {
    cards.value = []
    edges.value = []
    drawings.value = []
    activeCanvasId.value = null
    dirty.value = false
  }

  // ---- 卡片操作 ----
  function pushCard(card: TCard) {
    cards.value.push(card)
    dirty.value = true
  }

  function updateCardPosition(id: string, x: number, y: number) {
    const card = cards.value.find((c) => c.id === id)
    if (card) {
      card.x = x
      card.y = y
      dirty.value = true
    }
  }

  function updateCardSize(id: string, width: number, height: number) {
    const card = cards.value.find((c) => c.id === id)
    if (card) {
      card.width = Math.max(config.minCardSize.width, width)
      card.height = Math.max(config.minCardSize.height, height)
      dirty.value = true
    }
  }

  function updateCardRect(id: string, x: number, y: number, width: number, height: number) {
    const card = cards.value.find((c) => c.id === id)
    if (card) {
      card.x = x
      card.y = y
      card.width = Math.max(config.minCardSize.width, width)
      card.height = Math.max(config.minCardSize.height, height)
      dirty.value = true
    }
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter((c) => c.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    dirty.value = true
  }

  // ---- 边操作 ----
  function addEdge(source: string, target: string): CanvasEdge {
    const edge: CanvasEdge = { id: genEdgeId(), source, target }
    edges.value.push(edge)
    dirty.value = true
    return edge
  }

  function removeEdge(id: string) {
    edges.value = edges.value.filter((e) => e.id !== id)
    dirty.value = true
  }

  // ---- 保存确认 ----
  function requestAction(action: () => void) {
    if (dirty.value) {
      pendingAction.value = action
      confirmDialog.value = true
    } else {
      action()
    }
  }

  function confirmSave() {
    saveCurrentCanvas()
    confirmDialog.value = false
    if (pendingAction.value) {
      pendingAction.value()
      pendingAction.value = null
    }
  }

  function confirmDiscard() {
    dirty.value = false
    confirmDialog.value = false
    if (pendingAction.value) {
      pendingAction.value()
      pendingAction.value = null
    }
  }

  function confirmCancel() {
    confirmDialog.value = false
    pendingAction.value = null
  }

  return {
    cards,
    edges,
    drawings,
    canvases,
    activeCanvasId,
    dirty,
    confirmDialog,
    activeDrawingTool,
    isDrawing,
    drawingPreview,
    drawingConfig,
    genCardId,
    hydrateCanvases,
    toProjectCanvases,
    createCanvas,
    openCanvas,
    saveCurrentCanvas,
    deleteCanvas,
    renameCanvas,
    newCanvas,
    pushCard,
    updateCardPosition,
    updateCardSize,
    updateCardRect,
    removeCard,
    addEdge,
    removeEdge,
    requestAction,
    confirmSave,
    confirmDiscard,
    confirmCancel
  }
}
