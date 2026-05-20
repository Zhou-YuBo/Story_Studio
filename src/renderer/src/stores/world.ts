import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorldCard, CanvasEdge, DrawingItem } from '../types/canvas'
import { useCanvasCore } from '../composables/useCanvasCore'

export type { WorldCard, CanvasEdge, DrawingItem }

// ---- 类型定义 ----

export interface WorldCategory {
  id: string
  name: string
  color: string
}

export interface WorldObject {
  id: string
  categoryId: string
  name: string
  detailType: 'text' | 'image'
  detailContent: string
  color?: string
}

export interface ObjectDetailState {
  objectId: string
  x: number
  y: number
  zIndex: number
}

// ---- ID 计数器（世界特有） ----
let nextCategoryId = 1
let nextObjectId = 1

// ---- 默认目录 ----
const UNCATEGORIZED_ID = 'wcat-5'

const DEFAULT_CATEGORIES: WorldCategory[] = [
  { id: 'wcat-1', name: '实体', color: '#ef4444' },
  { id: 'wcat-2', name: '观念', color: '#3b82f6' },
  { id: 'wcat-3', name: '规则', color: '#eab308' },
  { id: 'wcat-4', name: '事件', color: '#22c55e' },
  { id: UNCATEGORIZED_ID, name: '未分类', color: '#6b7280' },
]

// ---- localStorage（世界特有数据）----
const CATEGORIES_KEY = 'story-studio-world-categories'
const OBJECTS_KEY = 'story-studio-world-objects'

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

function restoreWorldIdCounters(categories: WorldCategory[], objects: WorldObject[]) {
  for (const c of categories) {
    const n = parseInt(c.id.replace('wcat-', ''))
    if (!isNaN(n)) nextCategoryId = Math.max(nextCategoryId, n + 1)
  }
  for (const o of objects) {
    const n = parseInt(o.id.replace('wobj-', ''))
    if (!isNaN(n)) nextObjectId = Math.max(nextObjectId, n + 1)
  }
}

export const useWorldStore = defineStore('world', () => {
  const core = useCanvasCore<WorldCard>({
    idPrefix: { card: 'wcard-', edge: 'wedge-', canvas: 'wcanvas-' },
    storageKey: 'story-studio-world-canvases',
    minCardSize: { width: 140, height: 70 },
  })

  // ---- 世界特有状态 ----
  const categories = ref<WorldCategory[]>(loadFromStorage<WorldCategory>(CATEGORIES_KEY))
  const objects = ref<WorldObject[]>(loadFromStorage<WorldObject>(OBJECTS_KEY))
  const openDetails = ref<ObjectDetailState[]>([])
  const detailZCounter = ref(100)

  if (categories.value.length === 0) {
    categories.value = [...DEFAULT_CATEGORIES]
    saveToStorage(CATEGORIES_KEY, categories.value)
  }

  restoreWorldIdCounters(categories.value, objects.value)

  function saveCategories() { saveToStorage(CATEGORIES_KEY, categories.value) }
  function saveObjects() { saveToStorage(OBJECTS_KEY, objects.value) }

  // ---- 颜色解析：三级优先级 ----
  function resolveCardColor(cardId: string): string {
    const card = core.cards.value.find((c) => c.id === cardId)
    if (!card) return '#6b7280'
    if (card.color) return card.color
    const obj = objects.value.find((o) => o.id === card.objectId)
    if (obj?.color) return obj.color
    const cat = categories.value.find((c) => c.id === obj?.categoryId)
    return cat?.color ?? '#6b7280'
  }

  // ---- 世界特有：卡片创建 ----
  function addCard(objectId: string, x: number, y: number): WorldCard {
    const card: WorldCard = {
      id: core.genCardId(),
      objectId,
      x,
      y,
      width: 220,
      height: 120,
    }
    core.pushCard(card)
    return card
  }

  function updateCardColor(id: string, color: string | undefined) {
    const card = core.cards.value.find((c) => c.id === id)
    if (card) {
      card.color = color
      core.dirty.value = true
    }
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
    const uncatId = categories.value.find((c) => c.id === UNCATEGORIZED_ID)
      ? UNCATEGORIZED_ID
      : categories.value.find((c) => c.name === '未分类')?.id
    if (uncatId) {
      for (const obj of objects.value) {
        if (obj.categoryId === id) obj.categoryId = uncatId
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
    core.cards.value = core.cards.value.filter((c) => c.objectId !== id)
    core.dirty.value = true
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

  return {
    // 来自 useCanvasCore 的共享能力
    cards: core.cards,
    edges: core.edges,
    drawings: core.drawings,
    canvases: core.canvases,
    activeCanvasId: core.activeCanvasId,
    dirty: core.dirty,
    confirmDialog: core.confirmDialog,
    activeDrawingTool: core.activeDrawingTool,
    isDrawing: core.isDrawing,
    drawingPreview: core.drawingPreview,
    drawingConfig: core.drawingConfig,
    createCanvas: core.createCanvas,
    openCanvas: core.openCanvas,
    saveCurrentCanvas: core.saveCurrentCanvas,
    deleteCanvas: core.deleteCanvas,
    renameCanvas: core.renameCanvas,
    newCanvas: core.newCanvas,
    updateCardPosition: core.updateCardPosition,
    updateCardSize: core.updateCardSize,
    updateCardRect: core.updateCardRect,
    removeCard: core.removeCard,
    addEdge: core.addEdge,
    removeEdge: core.removeEdge,
    requestAction: core.requestAction,
    confirmSave: core.confirmSave,
    confirmDiscard: core.confirmDiscard,
    confirmCancel: core.confirmCancel,
    // 世界特有
    categories, objects, openDetails,
    addCard, updateCardColor, resolveCardColor,
    addCategory, renameCategory, deleteCategory, updateCategoryColor,
    createObject, renameObject, deleteObject, updateObjectDetail, updateObjectColor,
    getObjectsByCategory, getObjectById,
    openDetail, closeDetail, moveDetail, bringDetailToFront,
  }
})
