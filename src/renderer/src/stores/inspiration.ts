import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface InspirationItem {
  id: string
  type: 'image' | 'text' | 'pdf' | 'audio'
  title: string
  filePath: string
  content?: string
  createdAt: string
}

export interface CanvasCard {
  id: string
  inspirationId: string
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasEdge {
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

export interface Canvas {
  id: string
  name: string
  cards: CanvasCard[]
  edges: CanvasEdge[]
  drawings: DrawingItem[]
  updatedAt: string
}

export interface NoteSource {
  canvasId: string
  cardIds: string[]
}

export interface Note {
  id: string
  content: string
  sources: NoteSource[]
  createdAt: string
  updatedAt: string
}

let nextCardId = 1
let nextEdgeId = 1
let nextCanvasId = 1
let nextNoteId = 1
let nextItemId = 100

const mockItems: InspirationItem[] = [
  {
    id: 'src-1',
    type: 'image',
    title: '角色概念图',
    filePath: '/demo/concept.jpg',
    createdAt: '2026-05-15',
  },
  {
    id: 'src-2',
    type: 'text',
    title: '随手记：一个矛盾的开场',
    filePath: '',
    content:
      '主角醒来发现自己在陌生房间，窗外景色每三分钟变换一次。他必须在对面的门关闭前逃出——但每次开门，里面走出的都是不同版本的他。',
    createdAt: '2026-05-17',
  },
  {
    id: 'src-3',
    type: 'image',
    title: '场景参考：废弃教堂',
    filePath: '/demo/church.jpg',
    createdAt: '2026-05-14',
  },
  {
    id: 'src-4',
    type: 'pdf',
    title: '神话学研究笔记.pdf',
    filePath: '/demo/myth-study.pdf',
    content: 'Joseph Campbell 英雄旅程十二阶段摘要',
    createdAt: '2026-05-12',
  },
  {
    id: 'src-5',
    type: 'audio',
    title: '氛围参考：雨夜低语',
    filePath: '/demo/rain-night.mp3',
    content: '氛围音效 · 3:42',
    createdAt: '2026-05-18',
  },
]

const CANVASES_KEY = 'story-studio-canvases'
const NOTES_KEY = 'story-studio-notes'

function loadCanvasesFromStorage(): Canvas[] {
  try {
    const raw = localStorage.getItem(CANVASES_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveCanvasesToStorage(canvases: Canvas[]) {
  localStorage.setItem(CANVASES_KEY, JSON.stringify(canvases))
}

function loadNotesFromStorage(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveNotesToStorage(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

function restoreIdCounters(canvases: Canvas[]) {
  for (const c of canvases) {
    for (const card of c.cards) {
      const n = parseInt(card.id.replace('card-', ''))
      if (!isNaN(n)) nextCardId = Math.max(nextCardId, n + 1)
    }
    for (const edge of c.edges) {
      const n = parseInt(edge.id.replace('edge-', ''))
      if (!isNaN(n)) nextEdgeId = Math.max(nextEdgeId, n + 1)
    }
    const cn = parseInt(c.id.replace('canvas-', ''))
    if (!isNaN(cn)) nextCanvasId = Math.max(nextCanvasId, cn + 1)
  }
}

export const useInspirationStore = defineStore('inspiration', () => {
  const items = ref<InspirationItem[]>([...mockItems])
  const cards = ref<CanvasCard[]>([])
  const edges = ref<CanvasEdge[]>([])

  // ---- 多画布管理 ----
  const canvases = ref<Canvas[]>(loadCanvasesFromStorage())
  const activeCanvasId = ref<string | null>(null)
  const dirty = ref(false)
  const confirmDialog = ref(false)
  const pendingAction = ref<(() => void) | null>(null)

  restoreIdCounters(canvases.value)

  // ---- 笔记系统 ----
  const notes = ref<Note[]>(loadNotesFromStorage())
  const editingNoteId = ref<string | null>(null)
  const highlightCardIds = ref<string[]>([])

  // ---- 绘图工具 ----
  const activeDrawingTool = ref<string | null>(null)
  const isDrawing = ref(false)
  const drawingPreview = ref<DrawingItem | null>(null)
  const drawingConfig = ref({
    color: '#a78bfa',
    lineWidth: 2
  })
  const drawings = ref<DrawingItem[]>([])

  for (const n of notes.value) {
    const num = parseInt(n.id.replace('note-', ''))
    if (!isNaN(num)) nextNoteId = Math.max(nextNoteId, num + 1)
  }

  function createNote(): Note {
    const note: Note = {
      id: `note-${nextNoteId++}`,
      content: '',
      sources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    notes.value.push(note)
    saveNotesToStorage(notes.value)
    return note
  }

  function updateNoteContent(id: string, content: string) {
    const note = notes.value.find((n) => n.id === id)
    if (note) {
      note.content = content
      note.updatedAt = new Date().toISOString()
      saveNotesToStorage(notes.value)
    }
  }

  function deleteNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
    saveNotesToStorage(notes.value)
    if (editingNoteId.value === id) editingNoteId.value = null
  }

  function addNoteSource(noteId: string, canvasId: string, cardIds: string[]) {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note) return
    const exists = note.sources.find(
      (s) => s.canvasId === canvasId && JSON.stringify(s.cardIds) === JSON.stringify(cardIds),
    )
    if (exists) return
    note.sources.push({ canvasId, cardIds })
    note.updatedAt = new Date().toISOString()
    saveNotesToStorage(notes.value)
  }

  function removeNoteSource(noteId: string, index: number) {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note) return
    note.sources.splice(index, 1)
    note.updatedAt = new Date().toISOString()
    saveNotesToStorage(notes.value)
  }

  function getNotesForCanvas(canvasId: string): Note[] {
    return notes.value.filter((n) => n.sources.some((s) => s.canvasId === canvasId))
  }

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
  function createCanvas(name: string): Canvas {
    const canvas: Canvas = {
      id: `canvas-${nextCanvasId++}`,
      name,
      cards: [],
      edges: [],
      drawings: [],
      updatedAt: new Date().toISOString(),
    }
    canvases.value.push(canvas)
    saveCanvasesToStorage(canvases.value)
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
      // 当前是新建未保存的画布，自动创建
      const canvas = createCanvas('未命名画布')
      activeCanvasId.value = canvas.id
    }
    const canvas = canvases.value.find((c) => c.id === activeCanvasId.value)
    if (!canvas) return
    canvas.cards = JSON.parse(JSON.stringify(cards.value))
    canvas.edges = JSON.parse(JSON.stringify(edges.value))
    canvas.drawings = JSON.parse(JSON.stringify(drawings.value))
    canvas.updatedAt = new Date().toISOString()
    saveCanvasesToStorage(canvases.value)
    dirty.value = false
  }

  function deleteCanvas(id: string) {
    canvases.value = canvases.value.filter((c) => c.id !== id)
    saveCanvasesToStorage(canvases.value)
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
      saveCanvasesToStorage(canvases.value)
    }
  }

  function newCanvas() {
    cards.value = []
    edges.value = []
    activeCanvasId.value = null
    dirty.value = false
  }

  // ---- 卡片 / 边操作 ----
  function addCard(inspirationId: string, x: number, y: number): CanvasCard {
    const card: CanvasCard = {
      id: `card-${nextCardId++}`,
      inspirationId,
      x,
      y,
      width: 260,
      height: inspirationId.startsWith('src-2') ? 120 : 160,
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

  function removeCard(id: string) {
    cards.value = cards.value.filter((c) => c.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    dirty.value = true
  }

  function addEdge(source: string, target: string): CanvasEdge {
    const edge: CanvasEdge = {
      id: `edge-${nextEdgeId++}`,
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

  function getItemById(id: string): InspirationItem | undefined {
    return items.value.find((i) => i.id === id)
  }

  function createTextItem(content: string = ''): InspirationItem {
    const item: InspirationItem = {
      id: `item-${nextItemId++}`,
      type: 'text',
      title: '自由文本',
      filePath: '',
      content,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    items.value.push(item)
    return item
  }

  function updateItemContent(id: string, content: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) item.content = content
  }

  return {
    items, cards, edges,
    canvases, activeCanvasId, dirty, confirmDialog,
    notes, editingNoteId, highlightCardIds,
    createCanvas, openCanvas, saveCurrentCanvas, deleteCanvas, renameCanvas, newCanvas,
    requestAction, confirmSave, confirmDiscard, confirmCancel,
    addCard, updateCardPosition, removeCard,
    addEdge, removeEdge, getItemById, updateItemContent, createTextItem,
    createNote, updateNoteContent, deleteNote, addNoteSource, removeNoteSource, getNotesForCanvas,
    activeDrawingTool, isDrawing, drawingPreview, drawingConfig, drawings,
  }
})
