import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from './project'

export type ReminderStatus = 'draft' | 'enabled'

export type ReminderWorkbenchId = 'inspiration' | 'world' | 'character' | 'structure' | 'export'

export type ReminderTarget =
  | { type: 'workbench'; workbench: ReminderWorkbenchId }
  | { type: 'scene'; scope: 'act'; actId: string }
  | { type: 'scene'; scope: 'sequence'; actId: string; seqId: string }

export interface ReminderCategory {
  id: string
  name: string
  color: string
}

export interface ReminderVisualState {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  collapsed: boolean
}

export interface ReminderNote {
  id: string
  title: string
  content: string
  categoryId: string
  status: ReminderStatus
  targets: ReminderTarget[]
  visuals: Record<string, ReminderVisualState>
  createdAt: string
  updatedAt: string
}

interface StoredReminderState {
  version: 1
  categories: ReminderCategory[]
  notes: ReminderNote[]
}

export interface SceneReminderContext {
  actId: string
  seqId: string
}

const DEFAULT_CATEGORY_ID = 'category-character'
const UNCATEGORIZED_ID = 'category-uncategorized'

const DEFAULT_CATEGORIES: ReminderCategory[] = [
  { id: DEFAULT_CATEGORY_ID, name: '人物约束', color: '#f0a8c0' },
  { id: 'category-world', name: '世界规则', color: '#9fc5e8' },
  { id: 'category-structure', name: '结构意图', color: '#d9b382' },
  { id: 'category-scene', name: '场景写作', color: '#b7d7a8' },
  { id: 'category-theme', name: '主题/价值', color: '#c9b8e8' },
  { id: 'category-style', name: '风格语气', color: '#a7d7d2' },
  { id: 'category-taboo', name: '禁忌事项', color: '#e6a6a6' },
  { id: 'category-temporary', name: '临时提醒', color: '#e2d39a' },
  { id: UNCATEGORIZED_ID, name: '未分类', color: '#a1a1aa' }
]

let nextNoteNum = 1
let nextCategoryNum = 1
let nextZIndex = 900

function cloneCategories(categories: ReminderCategory[]): ReminderCategory[] {
  return categories.map((category) => ({ ...category }))
}

function targetKey(target: ReminderTarget): string {
  if (target.type === 'workbench') return `workbench:${target.workbench}`
  if (target.scope === 'act') return `scene:act:${target.actId}`
  return `scene:sequence:${target.seqId}`
}

function dedupeTargets(targets: ReminderTarget[]): ReminderTarget[] {
  const seen = new Set<string>()
  const result: ReminderTarget[] = []

  for (const target of targets) {
    const key = targetKey(target)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(target)
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTarget(value: unknown): value is ReminderTarget {
  if (!isRecord(value) || (value.type !== 'workbench' && value.type !== 'scene')) return false
  if (value.type === 'workbench') return typeof value.workbench === 'string'
  if (value.scope === 'act') return typeof value.actId === 'string'
  return (
    value.scope === 'sequence' && typeof value.actId === 'string' && typeof value.seqId === 'string'
  )
}

function normalizeCategory(value: unknown): ReminderCategory | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.color !== 'string'
  ) {
    return null
  }
  return { id: value.id, name: value.name, color: value.color }
}

function normalizeVisual(value: unknown): ReminderVisualState | null {
  if (!isRecord(value)) return null
  if (
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.zIndex !== 'number' ||
    typeof value.collapsed !== 'boolean'
  ) {
    return null
  }
  return {
    x: value.x,
    y: value.y,
    width: typeof value.width === 'number' ? value.width : 300,
    height: typeof value.height === 'number' ? value.height : 228,
    zIndex: value.zIndex,
    collapsed: value.collapsed
  }
}

function normalizeNote(value: unknown, categories: ReminderCategory[]): ReminderNote | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null

  const rawTargets = Array.isArray(value.targets) ? value.targets.filter(isTarget) : []
  const targets = dedupeTargets(rawTargets)
  const visuals: Record<string, ReminderVisualState> = {}
  const rawVisuals = isRecord(value.visuals) ? value.visuals : {}

  for (const [key, rawVisual] of Object.entries(rawVisuals)) {
    const visual = normalizeVisual(rawVisual)
    if (visual) visuals[key] = visual
  }

  const categoryId =
    typeof value.categoryId === 'string' &&
    categories.some((category) => category.id === value.categoryId)
      ? value.categoryId
      : UNCATEGORIZED_ID

  const status: ReminderStatus =
    value.status === 'enabled' && targets.length > 0 ? 'enabled' : 'draft'
  const now = new Date().toISOString()

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    content: typeof value.content === 'string' ? value.content : '',
    categoryId,
    status,
    targets,
    visuals,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now
  }
}

function normalizeStoredState(value: unknown): StoredReminderState {
  if (!isRecord(value) || value.version !== 1) {
    return { version: 1, categories: cloneCategories(DEFAULT_CATEGORIES), notes: [] }
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map(normalizeCategory)
        .filter((category): category is ReminderCategory => Boolean(category))
    : []

  const categoryIds = new Set(categories.map((category) => category.id))
  for (const category of DEFAULT_CATEGORIES) {
    if (!categoryIds.has(category.id)) {
      categories.push({ ...category })
      categoryIds.add(category.id)
    }
  }

  const notes = Array.isArray(value.notes)
    ? value.notes
        .map((note) => normalizeNote(note, categories))
        .filter((note): note is ReminderNote => Boolean(note))
    : []

  return { version: 1, categories, notes }
}

function createDefaultReminderState(): StoredReminderState {
  return { version: 1, categories: cloneCategories(DEFAULT_CATEGORIES), notes: [] }
}

function resetCounters(): void {
  nextNoteNum = 1
  nextCategoryNum = 1
  nextZIndex = 900
}

function restoreCounters(state: StoredReminderState): void {
  for (const note of state.notes) {
    const noteNum = parseInt(note.id.replace('reminder-', ''))
    if (!isNaN(noteNum)) nextNoteNum = Math.max(nextNoteNum, noteNum + 1)
    for (const visual of Object.values(note.visuals)) {
      nextZIndex = Math.max(nextZIndex, visual.zIndex + 1)
    }
  }

  for (const category of state.categories) {
    const categoryNum = parseInt(category.id.replace('category-custom-', ''))
    if (!isNaN(categoryNum)) nextCategoryNum = Math.max(nextCategoryNum, categoryNum + 1)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useReminderStore = defineStore('reminder', () => {
  const stored = createDefaultReminderState()
  restoreCounters(stored)

  const categories = ref<ReminderCategory[]>(stored.categories)
  const notes = ref<ReminderNote[]>(stored.notes)

  function hydrateFromProject(data: unknown): void {
    const state = normalizeStoredState(data)
    resetCounters()
    restoreCounters(state)
    categories.value = state.categories
    notes.value = state.notes
  }

  function toProjectData(): StoredReminderState {
    return { version: 1, categories: categories.value, notes: notes.value }
  }

  function save(): void {
    useProjectStore().scheduleSave()
  }

  function getCategoryById(id: string): ReminderCategory | undefined {
    return categories.value.find((category) => category.id === id)
  }

  function createNote(): ReminderNote {
    const timestamp = nowIso()
    const note: ReminderNote = {
      id: `reminder-${nextNoteNum++}`,
      title: '',
      content: '',
      categoryId: DEFAULT_CATEGORY_ID,
      status: 'draft',
      targets: [],
      visuals: {},
      createdAt: timestamp,
      updatedAt: timestamp
    }
    notes.value.unshift(note)
    save()
    return note
  }

  function updateNote(
    id: string,
    patch: Partial<Pick<ReminderNote, 'title' | 'content' | 'categoryId'>>
  ): void {
    const note = notes.value.find((candidate) => candidate.id === id)
    if (!note) return
    if (patch.title !== undefined) note.title = patch.title
    if (patch.content !== undefined) note.content = patch.content
    if (patch.categoryId !== undefined) {
      note.categoryId = getCategoryById(patch.categoryId) ? patch.categoryId : UNCATEGORIZED_ID
    }
    note.updatedAt = nowIso()
    save()
  }

  function deleteNote(id: string): void {
    notes.value = notes.value.filter((note) => note.id !== id)
    save()
  }

  function setNoteTargets(id: string, targets: ReminderTarget[]): void {
    const note = notes.value.find((candidate) => candidate.id === id)
    if (!note) return
    note.targets = dedupeTargets(targets)
    if (note.targets.length === 0) note.status = 'draft'
    note.updatedAt = nowIso()
    save()
  }

  function enableNote(id: string): boolean {
    const note = notes.value.find((candidate) => candidate.id === id)
    if (!note || note.targets.length === 0) return false
    note.status = 'enabled'
    note.updatedAt = nowIso()
    save()
    return true
  }

  function saveAsDraft(id: string): void {
    const note = notes.value.find((candidate) => candidate.id === id)
    if (!note) return
    note.status = 'draft'
    note.updatedAt = nowIso()
    save()
  }

  function addCategory(name: string, color: string): ReminderCategory {
    const category: ReminderCategory = {
      id: `category-custom-${nextCategoryNum++}`,
      name: name.trim() || '自定义分类',
      color
    }
    categories.value.push(category)
    save()
    return category
  }

  function renameCategory(id: string, name: string): void {
    const category = getCategoryById(id)
    if (!category) return
    category.name = name.trim() || category.name
    save()
  }

  function updateCategoryColor(id: string, color: string): void {
    const category = getCategoryById(id)
    if (!category) return
    category.color = color
    save()
  }

  function deleteCategory(id: string): void {
    if (id === UNCATEGORIZED_ID) return
    categories.value = categories.value.filter((category) => category.id !== id)
    for (const note of notes.value) {
      if (note.categoryId === id) note.categoryId = UNCATEGORIZED_ID
    }
    save()
  }

  function notesForWorkbench(workbench: ReminderWorkbenchId): ReminderNote[] {
    return notes.value.filter(
      (note) =>
        note.status === 'enabled' &&
        note.targets.some((target) => target.type === 'workbench' && target.workbench === workbench)
    )
  }

  function notesForSceneContext(context: SceneReminderContext): ReminderNote[] {
    const result: ReminderNote[] = []
    const seen = new Set<string>()

    for (const note of notes.value) {
      if (note.status !== 'enabled') continue
      const hit = note.targets.some((target) => {
        if (target.type !== 'scene') return false
        if (target.scope === 'sequence') {
          return Boolean(context.seqId) && target.seqId === context.seqId
        }
        return Boolean(context.actId) && target.actId === context.actId
      })

      if (hit && !seen.has(note.id)) {
        seen.add(note.id)
        result.push(note)
      }
    }

    return result
  }

  function visualKeyForScene(note: ReminderNote, context: SceneReminderContext): string {
    const sequenceTarget = note.targets.find(
      (target) =>
        target.type === 'scene' &&
        target.scope === 'sequence' &&
        Boolean(context.seqId) &&
        target.seqId === context.seqId
    )
    if (sequenceTarget?.type === 'scene' && sequenceTarget.scope === 'sequence') {
      return `scene:sequence:${sequenceTarget.seqId}`
    }
    return `scene:act:${context.actId}`
  }

  function ensureVisual(noteId: string, visualKey: string, index: number): ReminderVisualState {
    const note = notes.value.find((candidate) => candidate.id === noteId)
    if (!note) {
      return { x: 32, y: 32, width: 300, height: 228, zIndex: nextZIndex++, collapsed: false }
    }

    if (!note.visuals[visualKey]) {
      note.visuals[visualKey] = {
        x: 32 + (index % 3) * 300,
        y: 32 + Math.floor(index / 3) * 180,
        width: 300,
        height: 228,
        zIndex: nextZIndex++,
        collapsed: false
      }
      save()
    }

    return note.visuals[visualKey]
  }

  function moveVisual(noteId: string, visualKey: string, x: number, y: number): void {
    const note = notes.value.find((candidate) => candidate.id === noteId)
    const visual = note?.visuals[visualKey]
    if (!visual) return
    visual.x = x
    visual.y = y
    save()
  }

  function resizeVisual(
    noteId: string,
    visualKey: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const note = notes.value.find((candidate) => candidate.id === noteId)
    const visual = note?.visuals[visualKey]
    if (!visual) return
    visual.x = x
    visual.y = y
    visual.width = width
    visual.height = height
    save()
  }

  function toggleCollapsed(noteId: string, visualKey: string): void {
    const note = notes.value.find((candidate) => candidate.id === noteId)
    const visual = note?.visuals[visualKey]
    if (!visual) return
    visual.collapsed = !visual.collapsed
    save()
  }

  function bringToFront(noteId: string, visualKey: string): void {
    const note = notes.value.find((candidate) => candidate.id === noteId)
    const visual = note?.visuals[visualKey]
    if (!visual) return
    visual.zIndex = nextZIndex++
    save()
  }

  const enabledNotes = computed(() => notes.value.filter((note) => note.status === 'enabled'))
  const draftNotes = computed(() => notes.value.filter((note) => note.status === 'draft'))

  return {
    categories,
    notes,
    enabledNotes,
    draftNotes,
    hydrateFromProject,
    toProjectData,
    getCategoryById,
    createNote,
    updateNote,
    deleteNote,
    setNoteTargets,
    enableNote,
    saveAsDraft,
    addCategory,
    renameCategory,
    updateCategoryColor,
    deleteCategory,
    notesForWorkbench,
    notesForSceneContext,
    visualKeyForScene,
    ensureVisual,
    moveVisual,
    resizeVisual,
    toggleCollapsed,
    bringToFront
  }
})
