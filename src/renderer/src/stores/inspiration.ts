import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useProjectStore } from './project'
import type { InspirationCard, CanvasEdge, DrawingItem } from '../types/canvas'
import { useCanvasCore } from '../composables/useCanvasCore'

export type { InspirationCard, CanvasEdge, DrawingItem }

export interface InspirationItem {
  id: string
  type: 'image' | 'text' | 'pdf' | 'audio'
  title: string
  filePath: string
  content?: string
  createdAt: string
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

let nextNoteId = 1
let nextItemId = 100

function cloneItems(items: InspirationItem[]): InspirationItem[] {
  return JSON.parse(JSON.stringify(items))
}

function normalizeItems(value: unknown): InspirationItem[] {
  if (!Array.isArray(value) || value.length === 0) return cloneItems(mockItems)
  return value.filter((item): item is InspirationItem => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as Partial<InspirationItem>
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.type === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.filePath === 'string' &&
      typeof candidate.createdAt === 'string'
    )
  })
}

function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return []
  return value.filter((note): note is Note => {
    if (!note || typeof note !== 'object') return false
    const candidate = note as Partial<Note>
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.content === 'string' &&
      Array.isArray(candidate.sources) &&
      typeof candidate.createdAt === 'string' &&
      typeof candidate.updatedAt === 'string'
    )
  })
}

function normalizeCanvases(value: unknown) {
  return Array.isArray(value) ? value : []
}

function resetCounters(): void {
  nextNoteId = 1
  nextItemId = 100
}

const mockItems: InspirationItem[] = [
  {
    id: 'src-1',
    type: 'image',
    title: '角色概念图',
    filePath: '/demo/concept.jpg',
    createdAt: '2026-05-15'
  },
  {
    id: 'src-2',
    type: 'text',
    title: '随手记：一个矛盾的开场',
    filePath: '',
    content:
      '主角醒来发现自己在陌生房间，窗外景色每三分钟变换一次。他必须在对面的门关闭前逃出——但每次开门，里面走出的都是不同版本的他。',
    createdAt: '2026-05-17'
  },
  {
    id: 'src-3',
    type: 'image',
    title: '场景参考：废弃教堂',
    filePath: '/demo/church.jpg',
    createdAt: '2026-05-14'
  },
  {
    id: 'src-4',
    type: 'pdf',
    title: '神话学研究笔记.pdf',
    filePath: '/demo/myth-study.pdf',
    content: 'Joseph Campbell 英雄旅程十二阶段摘要',
    createdAt: '2026-05-12'
  },
  {
    id: 'src-5',
    type: 'audio',
    title: '氛围参考：雨夜低语',
    filePath: '/demo/rain-night.mp3',
    content: '氛围音效 · 3:42',
    createdAt: '2026-05-18'
  }
]

export const useInspirationStore = defineStore('inspiration', () => {
  const core = useCanvasCore<InspirationCard>({
    idPrefix: { card: 'card-', edge: 'edge-', canvas: 'canvas-' },
    minCardSize: { width: 160, height: 80 },
    onPersist: () => useProjectStore().scheduleSave()
  })

  // ---- 灵感特有状态 ----
  const items = ref<InspirationItem[]>(cloneItems(mockItems))
  const notes = ref<Note[]>([])
  const editingNoteId = ref<string | null>(null)
  const highlightCardIds = ref<string[]>([])

  function restoreCounters(): void {
    for (const n of notes.value) {
      const num = parseInt(n.id.replace('note-', ''))
      if (!isNaN(num)) nextNoteId = Math.max(nextNoteId, num + 1)
    }
    for (const item of items.value) {
      const num = parseInt(item.id.replace('item-', ''))
      if (!isNaN(num)) nextItemId = Math.max(nextItemId, num + 1)
    }
  }

  function hydrateFromProject(data: unknown): void {
    const source =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {}
    resetCounters()
    items.value = normalizeItems(source.items)
    notes.value = normalizeNotes(source.notes)
    core.hydrateCanvases(normalizeCanvases(source.canvases))
    restoreCounters()
  }

  function toProjectData() {
    return {
      items: items.value,
      notes: notes.value,
      canvases: core.toProjectCanvases()
    }
  }

  restoreCounters()

  // ---- 灵感特有：卡片创建 ----
  function addCard(inspirationId: string, x: number, y: number): InspirationCard {
    const card: InspirationCard = {
      id: core.genCardId(),
      inspirationId,
      x,
      y,
      width: 260,
      height: inspirationId.startsWith('src-2') ? 120 : 160
    }
    core.pushCard(card)
    return card
  }

  // ---- 灵感特有：素材操作 ----
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
      createdAt: new Date().toISOString().slice(0, 10)
    }
    items.value.push(item)
    useProjectStore().scheduleSave()
    return item
  }

  function updateItemContent(id: string, content: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.content = content
      useProjectStore().scheduleSave()
    }
  }

  // ---- 灵感特有：笔记系统 ----
  function createNote(): Note {
    const note: Note = {
      id: `note-${nextNoteId++}`,
      content: '',
      sources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    notes.value.push(note)
    useProjectStore().scheduleSave()
    return note
  }

  function updateNoteContent(id: string, content: string) {
    const note = notes.value.find((n) => n.id === id)
    if (note) {
      note.content = content
      note.updatedAt = new Date().toISOString()
      useProjectStore().scheduleSave()
    }
  }

  function deleteNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
    useProjectStore().scheduleSave()
    if (editingNoteId.value === id) editingNoteId.value = null
  }

  function addNoteSource(noteId: string, canvasId: string, cardIds: string[]) {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note) return
    const exists = note.sources.find(
      (s) => s.canvasId === canvasId && JSON.stringify(s.cardIds) === JSON.stringify(cardIds)
    )
    if (exists) return
    note.sources.push({ canvasId, cardIds })
    note.updatedAt = new Date().toISOString()
    useProjectStore().scheduleSave()
  }

  function removeNoteSource(noteId: string, index: number) {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note) return
    note.sources.splice(index, 1)
    note.updatedAt = new Date().toISOString()
    useProjectStore().scheduleSave()
  }

  function getNotesForCanvas(canvasId: string): Note[] {
    return notes.value.filter((n) => n.sources.some((s) => s.canvasId === canvasId))
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
    hydrateFromProject,
    toProjectData,
    createCanvas: core.createCanvas,
    openCanvas: core.openCanvas,
    saveCurrentCanvas: core.saveCurrentCanvas,
    syncCanvasDraft: core.syncCanvasDraft,
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
    // 灵感特有
    items,
    notes,
    editingNoteId,
    highlightCardIds,
    addCard,
    getItemById,
    createTextItem,
    updateItemContent,
    createNote,
    updateNoteContent,
    deleteNote,
    addNoteSource,
    removeNoteSource,
    getNotesForCanvas
  }
})
