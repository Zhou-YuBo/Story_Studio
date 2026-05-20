import { defineStore } from 'pinia'
import { ref } from 'vue'

// ---- 类型定义 ----

export interface WorldCategory {
  id: string
  name: string
  color: string // 目录默认卡片颜色
}

export interface WorldObject {
  id: string
  categoryId: string
  name: string
  detailType: 'text' | 'image'
  detailContent: string // 文本内容或图片路径
  color?: string // 对象级颜色覆盖（可选）
}

export interface WorldCard {
  id: string
  objectId: string
  x: number
  y: number
  width: number
  height: number
  color?: string // 实例级颜色覆盖（可选）
}

export interface WorldEdge {
  id: string
  source: string
  target: string
}

export interface DrawingItem {
  id: string
  type: 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'brace' | 'pencil'
  color: string
  lineWidth: number
  points: Array<{ x: number; y: number }>
  data?: any
}

export interface ObjectDetailState {
  objectId: string
  x: number
  y: number
  zIndex: number
}

export interface WorldCanvas {
  id: string
  name: string
  cards: WorldCard[]
  edges: WorldEdge[]
  drawings: DrawingItem[]
  updatedAt: string
}

// ---- ID 计数器 ----
let nextCategoryId = 1
let nextObjectId = 1
let nextCardId = 1
let nextEdgeId = 1
let nextCanvasId = 1

// ---- 默认目录 ----
const DEFAULT_CATEGORIES: WorldCategory[] = [
  { id: 'wcat-1', name: '实体', color: '#ef4444' },
  { id: 'wcat-2', name: '观念', color: '#3b82f6' },
  { id: 'wcat-3', name: '规则', color: '#eab308' },
  { id: 'wcat-4', name: '事件', color: '#22c55e' },
  { id: 'wcat-5', name: '未分类', color: '#6b7280' },
]

// ---- localStorage ----
const CATEGORIES_KEY = 'story-studio-world-categories'
const OBJECTS_KEY = 'story-studio-world-objects'
const CANVASES_KEY = 'story-studio-world-canvases'

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveToStorage(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data))
}

function restoreIdCounters(categories: WorldCategory[], objects: WorldObject[], canvases: WorldCanvas[]) {
  for (const c of categories) {
    const n = parseInt(c.id.replace('wcat-', ''))
    if (!isNaN(n)) nextCategoryId = Math.max(nextCategoryId, n + 1)
  }
  for (const o of objects) {
    const n = parseInt(o.id.replace('wobj-', ''))
    if (!isNaN(n)) nextObjectId = Math.max(nextObjectId, n + 1)
  }
  for (const c of canvases) {
    for (const card of c.cards) {
      const n = parseInt(card.id.replace('wcard-', ''))
      if (!isNaN(n)) nextCardId = Math.max(nextCardId, n + 1)
    }
    for (const edge of c.edges) {
      const n = parseInt(edge.id.replace('wedge-', ''))
      if (!isNaN(n)) nextEdgeId = Math.max(nextEdgeId, n + 1)
    }
    const cn = parseInt(c.id.replace('wcanvas-', ''))
    if (!isNaN(cn)) nextCanvasId = Math.max(nextCanvasId, cn + 1)
  }
}

export const useWorldStore = defineStore('world', () => {
  // ---- 状态 ----
  const categories = ref<WorldCategory[]>(loadFromStorage<WorldCategory>(CATEGORIES_KEY))
  const objects = ref<WorldObject[]>(loadFromStorage<WorldObject>(OBJECTS_KEY))
  const cards = ref<WorldCard[]>([])
  const edges = ref<WorldEdge[]>([])
  const drawings = ref<DrawingItem[]>([])
  const canvases = ref<WorldCanvas[]>(loadFromStorage<WorldCanvas>(CANVASES_KEY))
  const activeCanvasId = ref<string | null>(null)
  const openDetails = ref<ObjectDetailState[]>([])
  const detailZCounter = ref(100)
  const dirty = ref(false)
  const confirmDialog = ref(false)
  const pendingAction = ref<(() => void) | null>(null)

  // 如果没有目录数据，初始化默认目录
  if (categories.value.length === 0) {
    categories.value = [...DEFAULT_CATEGORIES]
    saveToStorage(CATEGORIES_KEY, categories.value)
  }

  restoreIdCounters(categories.value, objects.value, canvases.value)

  // ---- 辅助：批量保存 ----
  function saveCategories() { saveToStorage(CATEGORIES_KEY, categories.value) }
  function saveObjects() { saveToStorage(OBJECTS_KEY, objects.value) }
  function saveCanvases() { saveToStorage(CANVASES_KEY, canvases.value) }

  // ---- 颜色解析：三级优先级 ----
  function resolveCardColor(cardId: string): string {
    const card = cards.value.find((c) => c.id === cardId)
    if (!card) return '#6b7280'
    // 1. 卡片实例级
    if (card.color) return card.color
    // 2. 对象级
    const obj = objects.value.find((o) => o.id === card.objectId)
    if (obj?.color) return obj.color
    // 3. 目录级
    const cat = categories.value.find((c) => c.id === obj?.categoryId)
    return cat?.color ?? '#6b7280'
  }

  // ---- 目录 CRUD ----
  function addCategory(name: string, color: string = '#6b7280'): WorldCategory {
    const cat: WorldCategory = { id: `wcat-${nextCategoryId++}`, name, color }
    categories.value.push(cat)
    saveCategories()
    return cat
  }

  function renameCategory(id: string, name: string) {
    const cat = categories.value.find((c) => c.id === id)
    if (cat) {
      cat.name = name
      saveCategories()
    }
  }

  function deleteCategory(id: string) {
    // 将该目录下的对象移入"未分类"
    const uncat = categories.value.find((c) => c.name === '未分类')
    if (uncat) {
      for (const obj of objects.value) {
        if (obj.categoryId === id) obj.categoryId = uncat.id
      }
      saveObjects()
    }
    categories.value = categories.value.filter((c) => c.id !== id)
    saveCategories()
  }

  function updateCategoryColor(id: string, color: string) {
    const cat = categories.value.find((c) => c.id === id)
    if (cat) {
      cat.color = color
      saveCategories()
    }
  }

  // ---- 对象 CRUD ----
  function createObject(categoryId: string, name: string = ''): WorldObject {
    const obj: WorldObject = {
      id: `wobj-${nextObjectId++}`,
      categoryId,
      name: name || '新对象',
      detailType: 'text',
      detailContent: '',
    }
    objects.value.push(obj)
    saveObjects()
    return obj
  }

  function renameObject(id: string, name: string) {
    const obj = objects.value.find((o) => o.id === id)
    if (obj) {
      obj.name = name
      saveObjects()
    }
  }

  function deleteObject(id: string) {
    objects.value = objects.value.filter((o) => o.id !== id)
    // 同时删除画布上引用该对象的卡片
    cards.value = cards.value.filter((c) => c.objectId !== id)
    dirty.value = true
    saveObjects()
  }

  function updateObjectDetail(id: string, detailType: 'text' | 'image', detailContent: string) {
    const obj = objects.value.find((o) => o.id === id)
    if (obj) {
      obj.detailType = detailType
      obj.detailContent = detailContent
      saveObjects()
    }
  }

  function updateObjectColor(id: string, color: string | undefined) {
    const obj = objects.value.find((o) => o.id === id)
    if (obj) {
      obj.color = color
      saveObjects()
    }
  }

  function getObjectsByCategory(categoryId: string): WorldObject[] {
    return objects.value.filter((o) => o.categoryId === categoryId)
  }

  function getObjectById(id: string): WorldObject | undefined {
    return objects.value.find((o) => o.id === id)
  }

  // ---- 对象详情弹窗 ----
  function openDetail(objectId: string) {
    const existing = openDetails.value.find((d) => d.objectId === objectId)
    if (existing) {
      bringDetailToFront(objectId)
      return
    }
    const offset = openDetails.value.length * 30
    openDetails.value.push({
      objectId,
      x: 300 + offset,
      y: 100 + offset,
      zIndex: ++detailZCounter.value,
    })
  }

  function closeDetail(objectId: string) {
    openDetails.value = openDetails.value.filter((d) => d.objectId !== objectId)
  }

  function moveDetail(objectId: string, x: number, y: number) {
    const detail = openDetails.value.find((d) => d.objectId === objectId)
    if (detail) {
      detail.x = x
      detail.y = y
    }
  }

  function bringDetailToFront(objectId: string) {
    const detail = openDetails.value.find((d) => d.objectId === objectId)
    if (detail) {
      detail.zIndex = ++detailZCounter.value
    }
  }

  // ---- 确认弹窗 ----
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

  // ---- 画布 CRUD ----
  function createCanvas(name: string): WorldCanvas {
    const canvas: WorldCanvas = {
      id: `wcanvas-${nextCanvasId++}`,
      name,
      cards: [],
      edges: [],
      drawings: [],
      updatedAt: new Date().toISOString(),
    }
    canvases.value.push(canvas)
    saveCanvases()
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
    saveCanvases()
    dirty.value = false
  }

  function deleteCanvas(id: string) {
    canvases.value = canvases.value.filter((c) => c.id !== id)
    saveCanvases()
    if (activeCanvasId.value === id) {
      activeCanvasId.value = null
      cards.value = []
      edges.value = []
    }
  }

  function renameCanvas(id: string, name: string) {
    const canvas = canvases.value.find((c) => c.id === id)
    if (canvas) {
      canvas.name = name
      canvas.updatedAt = new Date().toISOString()
      saveCanvases()
    }
  }

  function newCanvas() {
    cards.value = []
    edges.value = []
    drawings.value = []
    activeCanvasId.value = null
    dirty.value = false
  }

  // ---- 卡片 / 边操作 ----
  function addCard(objectId: string, x: number, y: number): WorldCard {
    const obj = getObjectById(objectId)
    const card: WorldCard = {
      id: `wcard-${nextCardId++}`,
      objectId,
      x,
      y,
      width: 220,
      height: 120,
    }
    cards.value.push(card)
    dirty.value = true
    return card
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
      card.width = Math.max(140, width)
      card.height = Math.max(70, height)
      dirty.value = true
    }
  }

  function updateCardRect(id: string, x: number, y: number, width: number, height: number) {
    const card = cards.value.find((c) => c.id === id)
    if (card) {
      card.x = x
      card.y = y
      card.width = Math.max(140, width)
      card.height = Math.max(70, height)
      dirty.value = true
    }
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter((c) => c.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    dirty.value = true
  }

  function updateCardColor(id: string, color: string | undefined) {
    const card = cards.value.find((c) => c.id === id)
    if (card) {
      card.color = color
      dirty.value = true
    }
  }

  function addEdge(source: string, target: string): WorldEdge {
    const edge: WorldEdge = {
      id: `wedge-${nextEdgeId++}`,
      source,
      target,
    }
    edges.value.push(edge)
    dirty.value = true
    return edge
  }

  function removeEdge(id: string) {
    edges.value = edges.value.filter((e) => e.id !== id)
    dirty.value = true
  }

  // ---- 绘图工具 ----
  const activeDrawingTool = ref<string | null>(null)
  const isDrawing = ref(false)
  const drawingPreview = ref<DrawingItem | null>(null)
  const drawingConfig = ref({
    color: '#a78bfa',
    lineWidth: 2,
  })

  return {
    categories, objects, cards, edges, drawings,
    canvases, activeCanvasId, dirty, confirmDialog, openDetails,
    addCategory, renameCategory, deleteCategory, updateCategoryColor,
    createObject, renameObject, deleteObject, updateObjectDetail, updateObjectColor,
    getObjectsByCategory, getObjectById,
    openDetail, closeDetail, moveDetail, bringDetailToFront,
    resolveCardColor, updateCardColor,
    addCategory, renameCategory, deleteCategory, updateCategoryColor,
    createObject, renameObject, deleteObject, updateObjectDetail, updateObjectColor,
    getObjectsByCategory, getObjectById,
    resolveCardColor, updateCardColor,
    requestAction, confirmSave, confirmDiscard, confirmCancel,
    createCanvas, openCanvas, saveCurrentCanvas, deleteCanvas, renameCanvas, newCanvas,
    addCard, updateCardPosition, updateCardSize, updateCardRect, removeCard,
    addEdge, removeEdge,
    activeDrawingTool, isDrawing, drawingPreview, drawingConfig,
  }
})
