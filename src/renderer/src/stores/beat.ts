import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface BeatCard {
  id: string
  seqId: string
  startLine: number
  endLine: number
  sceneStart: boolean
  content: string
}

export interface SequenceRange {
  actId: string
  seqId: string
  startLine: number
  contentStartLine: number
  endLine: number
}

export interface BeatNumbering {
  sceneNum: number
  beatNum: number
  label: string
}

export type SplitBeatResult =
  | { ok: true; cardId: string }
  | { ok: false; reason: 'no-sequence' | 'no-card' | 'at-boundary' | 'too-small' }

export type AddBeatBoundaryMode = 'split' | 'append-tail'

export type AddBeatBoundaryFailureReason =
  | 'no-sequence'
  | 'no-card'
  | 'at-boundary'
  | 'too-small'
  | 'outside-sequence'

export type AddBeatBoundaryResult =
  | { ok: true; cardId: string; mode: AddBeatBoundaryMode }
  | { ok: false; reason: AddBeatBoundaryFailureReason }

interface StoredBeatState {
  version: 1
  cards: BeatCard[]
}

type BoundaryRef =
  | { type: 'start'; cardId: string }
  | { type: 'end'; cardId: string }
  | { type: 'between'; previousCardId: string; nextCardId: string }

export const DEFAULT_BEAT_CONTENT = '行为：\n反应：\n潜文本：'
export const DEFAULT_BEAT_LINES = 8
export const LINE_HEIGHT = 16
export const MIN_BEAT_LINES = 1
export const MIN_BEAT_HEIGHT_PX = LINE_HEIGHT * MIN_BEAT_LINES

const STORAGE_KEY = 'story-studio-beats-linegrid-v1'

let nextCardNum = 1

function createCardId(): string {
  return `beat-card-${nextCardNum++}`
}

export function createStartBoundaryId(cardId: string): string {
  return `beat-boundary:start:${cardId}`
}

export function createEndBoundaryId(cardId: string): string {
  return `beat-boundary:end:${cardId}`
}

export function createBetweenBoundaryId(previousCardId: string, nextCardId: string): string {
  return `beat-boundary:between:${previousCardId}:${nextCardId}`
}

function parseBoundaryId(boundaryId: string): BoundaryRef | null {
  const parts = boundaryId.split(':')
  if (parts[0] !== 'beat-boundary') return null
  if (parts[1] === 'start' && parts[2]) return { type: 'start', cardId: parts[2] }
  if (parts[1] === 'end' && parts[2]) return { type: 'end', cardId: parts[2] }
  if (parts[1] === 'between' && parts[2] && parts[3]) {
    return { type: 'between', previousCardId: parts[2], nextCardId: parts[3] }
  }
  return null
}

function isStoredCard(card: unknown): card is BeatCard {
  if (!card || typeof card !== 'object') return false
  const candidate = card as Partial<BeatCard>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.seqId === 'string' &&
    typeof candidate.startLine === 'number' &&
    typeof candidate.endLine === 'number' &&
    typeof candidate.sceneStart === 'boolean' &&
    typeof candidate.content === 'string'
  )
}

function loadFromStorage(): StoredBeatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, cards: [] }
    const parsed = JSON.parse(raw) as Partial<StoredBeatState>
    if (parsed.version !== 1 || !Array.isArray(parsed.cards)) {
      return { version: 1, cards: [] }
    }
    return { version: 1, cards: parsed.cards.filter(isStoredCard) }
  } catch {
    return { version: 1, cards: [] }
  }
}

function restoreIdCounters(cards: BeatCard[]): void {
  for (const card of cards) {
    const n = parseInt(card.id.replace('beat-card-', ''))
    if (!isNaN(n)) nextCardNum = Math.max(nextCardNum, n + 1)
  }
}

function clampLine(line: number, min: number, max: number): number {
  return Math.max(min, Math.min(line, max))
}

function sequenceBodyStart(range: SequenceRange): number {
  return range.contentStartLine + 1
}

export const useBeatStore = defineStore('beat', () => {
  const stored = loadFromStorage()
  restoreIdCounters(stored.cards)

  const cards = ref<BeatCard[]>(stored.cards)
  const sequenceRanges = ref<SequenceRange[]>([])

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function save(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const state: StoredBeatState = {
        version: 1,
        cards: cards.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, 500)
  }

  function cardById(id: string): BeatCard | undefined {
    return cards.value.find((card) => card.id === id)
  }

  function sequenceById(seqId: string): SequenceRange | undefined {
    return sequenceRanges.value.find((range) => range.seqId === seqId)
  }

  function cardsForSequence(seqId: string): BeatCard[] {
    return cards.value
      .filter((card) => card.seqId === seqId)
      .sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine)
  }

  function sequenceForLine(lineIndex: number): SequenceRange | undefined {
    return sequenceRanges.value.find(
      (range) => range.startLine <= lineIndex && lineIndex < range.endLine,
    )
  }

  function sequenceForGap(gapIndex: number): SequenceRange | undefined {
    return sequenceRanges.value.find(
      (range) => sequenceBodyStart(range) <= gapIndex && gapIndex <= range.endLine,
    )
  }

  function normalizeSequence(seqId: string): void {
    const range = sequenceById(seqId)
    if (!range) {
      cards.value = cards.value.filter((card) => card.seqId !== seqId)
      return
    }

    const sorted = cardsForSequence(seqId)
    if (sorted.length === 0) return

    const normalized: BeatCard[] = []
    const firstStartMin = sequenceBodyStart(range)
    let cursor = firstStartMin

    for (let i = 0; i < sorted.length; i += 1) {
      const card = sorted[i]
      const clampedStart = clampLine(card.startLine, firstStartMin, range.endLine - MIN_BEAT_LINES)
      const start = i === 0 ? clampedStart : Math.max(clampedStart, cursor)
      const end = Math.min(Math.max(card.endLine, start + MIN_BEAT_LINES), range.endLine)
      if (end - start < MIN_BEAT_LINES) break

      card.startLine = start
      card.endLine = end
      normalized.push(card)
      cursor = end
    }

    const normalizedIds = new Set(normalized.map((card) => card.id))
    cards.value = cards.value.filter((card) => card.seqId !== seqId || normalizedIds.has(card.id))
  }

  function normalizeAllSequences(): void {
    const validSeqIds = new Set(sequenceRanges.value.map((range) => range.seqId))
    cards.value = cards.value.filter((card) => validSeqIds.has(card.seqId))
    for (const range of sequenceRanges.value) {
      normalizeSequence(range.seqId)
    }
    cards.value = [...cards.value].sort((a, b) => {
      const aSeq = sequenceById(a.seqId)?.startLine ?? 0
      const bSeq = sequenceById(b.seqId)?.startLine ?? 0
      return aSeq - bSeq || a.startLine - b.startLine
    })
  }

  function rangesEqual(a: SequenceRange[], b: SequenceRange[]): boolean {
    if (a.length !== b.length) return false
    return a.every((range, index) => {
      const other = b[index]
      return (
        other &&
        range.actId === other.actId &&
        range.seqId === other.seqId &&
        range.startLine === other.startLine &&
        range.contentStartLine === other.contentStartLine &&
        range.endLine === other.endLine
      )
    })
  }

  function setSequenceRanges(
    ranges: SequenceRange[],
    options: { normalize?: boolean } = {},
  ): void {
    const previousRanges = sequenceRanges.value
    const sorted = [...ranges].sort((a, b) => a.startLine - b.startLine)
    if (rangesEqual(previousRanges, sorted)) return

    const previous = new Map(previousRanges.map((range) => [range.seqId, range]))
    sequenceRanges.value = sorted

    for (const card of cards.value) {
      const oldRange = previous.get(card.seqId)
      const newRange = sequenceById(card.seqId)
      if (!oldRange || !newRange) continue
      const deltaStart = newRange.startLine - oldRange.startLine
      if (deltaStart === 0) continue
      card.startLine += deltaStart
      card.endLine += deltaStart
    }

    const validSeqIds = new Set(sequenceRanges.value.map((range) => range.seqId))
    cards.value = cards.value.filter((card) => validSeqIds.has(card.seqId))

    if (options.normalize !== false) normalizeAllSequences()
    save()
  }

  function ensureDefaultBeatsForSequences(): void {
    let changed = false

    for (const sequence of sequenceRanges.value) {
      if (cards.value.some((card) => card.seqId === sequence.seqId)) continue

      const startLine = sequenceBodyStart(sequence)
      const endLine = Math.min(startLine + DEFAULT_BEAT_LINES, sequence.endLine)
      if (endLine - startLine < MIN_BEAT_LINES) continue

      cards.value.push({
        id: createCardId(),
        seqId: sequence.seqId,
        startLine,
        endLine,
        sceneStart: false,
        content: DEFAULT_BEAT_CONTENT,
      })
      changed = true
    }

    if (changed) {
      normalizeAllSequences()
      save()
    }
  }

  function ensureDefaultBeatForFirstSequence(): void {
    ensureDefaultBeatsForSequences()
  }

  function insertCardAfter(cardId: string, sceneStart: boolean): string | null {
    const current = cardById(cardId)
    if (!current) return null
    const range = sequenceById(current.seqId)
    if (!range) return null

    const sequenceCards = cardsForSequence(current.seqId)
    const currentIndex = sequenceCards.findIndex((card) => card.id === cardId)
    if (currentIndex === -1) return null

    const next = sequenceCards[currentIndex + 1]
    if (next) {
      const splitLine = Math.floor((current.startLine + current.endLine) / 2)
      const result = splitBeatAtLineGap(current.seqId, splitLine, sceneStart)
      return result.ok ? result.cardId : null
    }

    const startLine = current.endLine
    const maxHeight = range.endLine - startLine
    if (maxHeight < MIN_BEAT_LINES) return null

    const height = Math.min(DEFAULT_BEAT_LINES, maxHeight)
    const newCard: BeatCard = {
      id: createCardId(),
      seqId: current.seqId,
      startLine,
      endLine: startLine + height,
      sceneStart,
      content: DEFAULT_BEAT_CONTENT,
    }

    cards.value.push(newCard)
    normalizeSequence(current.seqId)
    save()
    return newCard.id
  }

  function insertBeatAfter(cardId: string): string | null {
    return insertCardAfter(cardId, false)
  }

  function insertSceneAfter(cardId: string): string | null {
    return insertCardAfter(cardId, true)
  }

  function removeCard(cardId: string): void {
    if (cards.value.length <= 1) return
    const card = cardById(cardId)
    if (!card) return

    const height = card.endLine - card.startLine
    const sequenceCards = cardsForSequence(card.seqId)
    const removedIndex = sequenceCards.findIndex((candidate) => candidate.id === cardId)
    const successor = sequenceCards[removedIndex + 1]

    if (card.sceneStart && successor) {
      successor.sceneStart = true
    }

    cards.value = cards.value.filter((candidate) => candidate.id !== cardId)

    for (const candidate of cards.value) {
      if (candidate.seqId === card.seqId && candidate.startLine >= card.endLine) {
        candidate.startLine -= height
        candidate.endLine -= height
      }
    }

    normalizeSequence(card.seqId)
    save()
  }

  function canMoveBoundaryToLine(boundaryId: string, lineIndex: number): boolean {
    const boundary = parseBoundaryId(boundaryId)
    if (!boundary) return false

    if (boundary.type === 'start') {
      const card = cardById(boundary.cardId)
      const range = card ? sequenceById(card.seqId) : undefined
      if (!card || !range) return false
      return lineIndex >= sequenceBodyStart(range) && lineIndex <= card.endLine - MIN_BEAT_LINES
    }

    if (boundary.type === 'end') {
      const card = cardById(boundary.cardId)
      const range = card ? sequenceById(card.seqId) : undefined
      if (!card || !range) return false
      return lineIndex >= card.startLine + MIN_BEAT_LINES && lineIndex <= range.endLine
    }

    const previous = cardById(boundary.previousCardId)
    const next = cardById(boundary.nextCardId)
    if (!previous || !next || previous.seqId !== next.seqId) return false
    return (
      lineIndex >= previous.startLine + MIN_BEAT_LINES &&
      lineIndex <= next.endLine - MIN_BEAT_LINES
    )
  }

  function moveBoundary(boundaryId: string, lineIndex: number): void {
    if (!canMoveBoundaryToLine(boundaryId, lineIndex)) return
    const boundary = parseBoundaryId(boundaryId)
    if (!boundary) return

    if (boundary.type === 'start') {
      const card = cardById(boundary.cardId)
      if (!card) return
      card.startLine = lineIndex
      normalizeSequence(card.seqId)
      save()
      return
    }

    if (boundary.type === 'end') {
      const card = cardById(boundary.cardId)
      if (!card) return
      card.endLine = lineIndex
      normalizeSequence(card.seqId)
      save()
      return
    }

    const previous = cardById(boundary.previousCardId)
    const next = cardById(boundary.nextCardId)
    if (!previous || !next || previous.seqId !== next.seqId) return
    previous.endLine = lineIndex
    next.startLine = lineIndex
    normalizeSequence(previous.seqId)
    save()
  }

  function splitBeatAtLineGap(
    seqId: string,
    gapIndex: number,
    sceneStart = false,
  ): SplitBeatResult {
    if (!sequenceById(seqId)) return { ok: false, reason: 'no-sequence' }

    const sequenceCards = cardsForSequence(seqId)
    const boundaryCard = sequenceCards.find(
      (card) => gapIndex === card.startLine || gapIndex === card.endLine,
    )
    if (boundaryCard) return { ok: false, reason: 'at-boundary' }

    const target = sequenceCards.find(
      (card) => card.startLine < gapIndex && gapIndex < card.endLine,
    )
    if (!target) return { ok: false, reason: 'no-card' }

    if (
      gapIndex - target.startLine < MIN_BEAT_LINES ||
      target.endLine - gapIndex < MIN_BEAT_LINES
    ) {
      return { ok: false, reason: 'too-small' }
    }

    const newCard: BeatCard = {
      id: createCardId(),
      seqId,
      startLine: gapIndex,
      endLine: target.endLine,
      sceneStart,
      content: DEFAULT_BEAT_CONTENT,
    }

    target.endLine = gapIndex
    cards.value.push(newCard)
    normalizeSequence(seqId)
    save()
    return { ok: true, cardId: newCard.id }
  }

  function splitCardAtLine(seqId: string, lineIndex: number, sceneStart = false): string | null {
    const result = splitBeatAtLineGap(seqId, lineIndex, sceneStart)
    return result.ok ? result.cardId : null
  }

  function resolveAddBeatBoundaryAtLineGap(
    seqId: string,
    gapIndex: number,
  ): AddBeatBoundaryResult {
    const range = sequenceById(seqId)
    if (!range) return { ok: false, reason: 'no-sequence' }
    if (gapIndex < sequenceBodyStart(range) || gapIndex > range.endLine) {
      return { ok: false, reason: 'outside-sequence' }
    }

    const sequenceCards = cardsForSequence(seqId)
    if (sequenceCards.length === 0) return { ok: false, reason: 'no-card' }

    const boundaryCard = sequenceCards.find(
      (card) => gapIndex === card.startLine || gapIndex === card.endLine,
    )
    if (boundaryCard) return { ok: false, reason: 'at-boundary' }

    const target = sequenceCards.find(
      (card) => card.startLine < gapIndex && gapIndex < card.endLine,
    )
    if (target) {
      if (
        gapIndex - target.startLine < MIN_BEAT_LINES ||
        target.endLine - gapIndex < MIN_BEAT_LINES
      ) {
        return { ok: false, reason: 'too-small' }
      }
      return { ok: true, cardId: target.id, mode: 'split' }
    }

    const lastCard = sequenceCards[sequenceCards.length - 1]
    if (lastCard.endLine < gapIndex && gapIndex <= range.endLine) {
      if (gapIndex - lastCard.endLine < MIN_BEAT_LINES) {
        return { ok: false, reason: 'too-small' }
      }
      return { ok: true, cardId: lastCard.id, mode: 'append-tail' }
    }

    return { ok: false, reason: 'no-card' }
  }

  function addBeatBoundaryAtLineGap(
    seqId: string,
    gapIndex: number,
    sceneStart = false,
  ): AddBeatBoundaryResult {
    const resolved = resolveAddBeatBoundaryAtLineGap(seqId, gapIndex)
    if (!resolved.ok) return resolved

    if (resolved.mode === 'split') {
      const result = splitBeatAtLineGap(seqId, gapIndex, sceneStart)
      return result.ok
        ? { ok: true, cardId: result.cardId, mode: 'split' }
        : { ok: false, reason: result.reason }
    }

    const lastCard = cardById(resolved.cardId)
    if (!lastCard) return { ok: false, reason: 'no-card' }

    const newCard: BeatCard = {
      id: createCardId(),
      seqId,
      startLine: lastCard.endLine,
      endLine: gapIndex,
      sceneStart,
      content: DEFAULT_BEAT_CONTENT,
    }

    cards.value.push(newCard)
    normalizeSequence(seqId)
    save()
    return { ok: true, cardId: newCard.id, mode: 'append-tail' }
  }

  function applyLineDelta(seqId: string, editLine: number, deltaLines: number): void {
    if (deltaLines === 0) return
    const sequenceCards = cardsForSequence(seqId)
    const target = sequenceCards.find(
      (card) => card.startLine <= editLine && editLine < card.endLine,
    )
    if (!target) return

    const oldEndLine = target.endLine
    target.endLine = Math.max(target.startLine + MIN_BEAT_LINES, target.endLine + deltaLines)
    const actualDelta = target.endLine - oldEndLine
    if (actualDelta === 0) return

    for (const card of sequenceCards) {
      if (card.startLine >= oldEndLine && card.id !== target.id) {
        card.startLine += actualDelta
        card.endLine += actualDelta
      }
    }

    normalizeSequence(seqId)
    save()
  }

  function updateCardContent(cardId: string, content: string): void {
    const card = cardById(cardId)
    if (!card) return
    card.content = content
    save()
  }

  const numbering = computed<Map<string, BeatNumbering>>(() => {
    const result = new Map<string, BeatNumbering>()

    for (const range of sequenceRanges.value) {
      let sceneNum = 0
      let beatNum = 0
      let hasCard = false

      for (const card of cardsForSequence(range.seqId)) {
        if (!hasCard || card.sceneStart) {
          sceneNum += 1
          beatNum = 1
          hasCard = true
        } else {
          beatNum += 1
        }

        result.set(card.id, {
          sceneNum,
          beatNum,
          label: `S${sceneNum}#${beatNum}`,
        })
      }
    }

    return result
  })

  return {
    cards,
    sequenceRanges,
    numbering,
    cardById,
    cardsForSequence,
    sequenceById,
    sequenceForLine,
    sequenceForGap,
    setSequenceRanges,
    ensureDefaultBeatsForSequences,
    ensureDefaultBeatForFirstSequence,
    insertBeatAfter,
    insertSceneAfter,
    removeCard,
    canMoveBoundaryToLine,
    moveBoundary,
    splitBeatAtLineGap,
    splitCardAtLine,
    resolveAddBeatBoundaryAtLineGap,
    addBeatBoundaryAtLineGap,
    applyLineDelta,
    updateCardContent,
  }
})
