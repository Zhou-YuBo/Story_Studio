import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface BeatBoundary {
  id: string
  docPos: number
  locked?: boolean
  virtual?: boolean
  anchorBoundaryId?: string
  lineOffset?: number
}

export interface BeatCard {
  id: string
  startBoundaryId: string
  endBoundaryId: string
  sceneStart: boolean
  content: string
}

export interface SequenceRange {
  actId: string
  seqId: string
  startPos: number
  endPos: number
}

export interface BeatNumbering {
  sceneNum: number
  beatNum: number
  label: string
}

export interface BoundaryPlacement {
  docPos: number
  virtual?: boolean
  anchorBoundaryId?: string
  lineOffset?: number
}

export interface DefaultBeatSeed {
  start: BoundaryPlacement
  end: BoundaryPlacement
}

interface StoredBeatState {
  version: 2
  boundaries: BeatBoundary[]
  cards: BeatCard[]
}

interface BoundaryUsage {
  previous?: BeatCard
  next?: BeatCard
}

export const DEFAULT_BEAT_CONTENT = '行为：\n反应：\n潜文本：'
export const DEFAULT_BEAT_LINES = 8
export const LINE_HEIGHT = 16
export const MIN_BEAT_LINES = 1
export const MIN_BEAT_HEIGHT_PX = LINE_HEIGHT * MIN_BEAT_LINES

const STORAGE_KEY = 'story-studio-beats-v2'

let nextBoundaryNum = 1
let nextCardNum = 1

function createBoundaryId(): string {
  return `beat-boundary-${nextBoundaryNum++}`
}

function createCardId(): string {
  return `beat-card-${nextCardNum++}`
}

function loadFromStorage(): StoredBeatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 2, boundaries: [], cards: [] }
    const parsed = JSON.parse(raw) as Partial<StoredBeatState>
    if (parsed.version !== 2 || !Array.isArray(parsed.boundaries) || !Array.isArray(parsed.cards)) {
      return { version: 2, boundaries: [], cards: [] }
    }
    return { version: 2, boundaries: parsed.boundaries, cards: parsed.cards }
  } catch {
    return { version: 2, boundaries: [], cards: [] }
  }
}

function restoreIdCounters(boundaries: BeatBoundary[], cards: BeatCard[]): void {
  for (const b of boundaries) {
    const n = parseInt(b.id.replace('beat-boundary-', ''))
    if (!isNaN(n)) nextBoundaryNum = Math.max(nextBoundaryNum, n + 1)
  }
  for (const c of cards) {
    const n = parseInt(c.id.replace('beat-card-', ''))
    if (!isNaN(n)) nextCardNum = Math.max(nextCardNum, n + 1)
  }
}

function createBoundary(placement: BoundaryPlacement, locked = false): BeatBoundary {
  const boundary: BeatBoundary = {
    id: createBoundaryId(),
    docPos: placement.docPos,
    locked,
  }

  if (placement.virtual && placement.anchorBoundaryId) {
    boundary.virtual = true
    boundary.anchorBoundaryId = placement.anchorBoundaryId
    boundary.lineOffset = placement.lineOffset ?? DEFAULT_BEAT_LINES
  }

  return boundary
}

export const useBeatStore = defineStore('beat', () => {
  const stored = loadFromStorage()
  restoreIdCounters(stored.boundaries, stored.cards)

  const boundaries = ref<BeatBoundary[]>(stored.boundaries)
  const cards = ref<BeatCard[]>(stored.cards)
  const sequenceRanges = ref<SequenceRange[]>([])

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function save(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const state: StoredBeatState = {
        version: 2,
        boundaries: boundaries.value,
        cards: cards.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, 500)
  }

  function boundaryById(id: string): BeatBoundary | undefined {
    return boundaries.value.find((b) => b.id === id)
  }

  function cardById(id: string): BeatCard | undefined {
    return cards.value.find((c) => c.id === id)
  }

  function boundaryOrderValue(boundary: BeatBoundary, seen = new Set<string>()): number {
    if (!boundary.virtual) return boundary.docPos
    if (seen.has(boundary.id)) return boundary.docPos
    seen.add(boundary.id)

    const anchor = boundary.anchorBoundaryId ? boundaryById(boundary.anchorBoundaryId) : undefined
    return (anchor ? boundaryOrderValue(anchor, seen) : boundary.docPos) + (boundary.lineOffset ?? DEFAULT_BEAT_LINES)
  }

  function resolvedBoundaryDocPos(boundary: BeatBoundary, seen = new Set<string>()): number {
    if (!boundary.virtual) return boundary.docPos
    if (seen.has(boundary.id)) return boundary.docPos
    seen.add(boundary.id)

    const anchor = boundary.anchorBoundaryId ? boundaryById(boundary.anchorBoundaryId) : undefined
    return anchor ? resolvedBoundaryDocPos(anchor, seen) : boundary.docPos
  }

  function fallbackSortedCards(): BeatCard[] {
    return [...cards.value].sort((a, b) => {
      const aStart = boundaryById(a.startBoundaryId)
      const bStart = boundaryById(b.startBoundaryId)
      return (aStart ? boundaryOrderValue(aStart) : 0) - (bStart ? boundaryOrderValue(bStart) : 0)
    })
  }

  function orderedCards(): BeatCard[] {
    const sorted = fallbackSortedCards()
    if (sorted.length <= 1) return sorted

    const byStart = new Map<string, BeatCard[]>()
    const endBoundaryIds = new Set<string>()

    for (const card of sorted) {
      const list = byStart.get(card.startBoundaryId) ?? []
      list.push(card)
      byStart.set(card.startBoundaryId, list)
      endBoundaryIds.add(card.endBoundaryId)
    }

    const candidates = sorted.filter((card) => !endBoundaryIds.has(card.startBoundaryId))
    const lockedStart = candidates.find((card) => Boolean(boundaryById(card.startBoundaryId)?.locked))
    let current = lockedStart ?? candidates[0] ?? sorted[0]
    const ordered: BeatCard[] = []
    const visited = new Set<string>()

    while (current && !visited.has(current.id)) {
      ordered.push(current)
      visited.add(current.id)

      const next = byStart.get(current.endBoundaryId)?.find((card) => !visited.has(card.id))
      if (!next) break
      current = next
    }

    for (const card of sorted) {
      if (!visited.has(card.id)) ordered.push(card)
    }

    return ordered
  }

  function findSuccessor(card: BeatCard): BeatCard | undefined {
    return orderedCards().find((candidate) => candidate.id !== card.id && candidate.startBoundaryId === card.endBoundaryId)
  }

  function findPredecessor(card: BeatCard): BeatCard | undefined {
    return orderedCards().find((candidate) => candidate.id !== card.id && candidate.endBoundaryId === card.startBoundaryId)
  }

  function findBoundaryUsage(boundaryId: string): BoundaryUsage {
    const ordered = orderedCards()
    return {
      previous: ordered.find((card) => card.endBoundaryId === boundaryId),
      next: ordered.find((card) => card.startBoundaryId === boundaryId),
    }
  }

  function sortCards(): void {
    cards.value = orderedCards()
  }

  function setSequenceRanges(ranges: SequenceRange[]): void {
    sequenceRanges.value = [...ranges].sort((a, b) => a.startPos - b.startPos)
  }

  function ensureDefaultBeat(seed: DefaultBeatSeed): void {
    if (cards.value.length > 0) return

    const startBoundary = createBoundary(seed.start, true)
    const endPlacement: BoundaryPlacement = seed.end.virtual
      ? {
          ...seed.end,
          anchorBoundaryId: seed.end.anchorBoundaryId ?? startBoundary.id,
          lineOffset: seed.end.lineOffset ?? DEFAULT_BEAT_LINES,
        }
      : seed.end
    const endBoundary = createBoundary(endPlacement)
    const card: BeatCard = {
      id: createCardId(),
      startBoundaryId: startBoundary.id,
      endBoundaryId: endBoundary.id,
      sceneStart: false,
      content: DEFAULT_BEAT_CONTENT,
    }

    boundaries.value = [startBoundary, endBoundary]
    cards.value = [card]
    save()
  }

  function normalizeGraph(): void {
    const boundaryIds = new Set(boundaries.value.map((boundary) => boundary.id))
    const validCards = fallbackSortedCards().filter((card) => (
      card.startBoundaryId !== card.endBoundaryId
      && boundaryIds.has(card.startBoundaryId)
      && boundaryIds.has(card.endBoundaryId)
    ))

    cards.value = validCards

    for (const boundary of boundaries.value) {
      if (!boundary.virtual || boundary.anchorBoundaryId) continue

      const owningCard = cards.value.find((card) => card.endBoundaryId === boundary.id)
      const followingCard = cards.value.find((card) => card.startBoundaryId === boundary.id)
      const anchorId = owningCard?.startBoundaryId ?? followingCard?.startBoundaryId

      if (anchorId && anchorId !== boundary.id && boundaryIds.has(anchorId)) {
        boundary.anchorBoundaryId = anchorId
        boundary.lineOffset = boundary.lineOffset ?? DEFAULT_BEAT_LINES
      } else {
        boundary.virtual = false
        boundary.anchorBoundaryId = undefined
        boundary.lineOffset = undefined
      }
    }

    const ordered = orderedCards()
    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1]
      const current = ordered[i]
      if (current.startBoundaryId !== previous.endBoundaryId) {
        current.startBoundaryId = previous.endBoundaryId
      }
    }

    cards.value = ordered.filter((card) => card.startBoundaryId !== card.endBoundaryId)

    const usedBoundaryIds = new Set<string>()
    for (const card of cards.value) {
      usedBoundaryIds.add(card.startBoundaryId)
      usedBoundaryIds.add(card.endBoundaryId)
    }
    boundaries.value = boundaries.value.filter((boundary) => usedBoundaryIds.has(boundary.id))
    sortCards()
    save()
  }

  function insertCardAfter(cardId: string, placement: BoundaryPlacement, sceneStart: boolean): string | null {
    const current = cardById(cardId)
    if (!current) return null

    const startBoundaryId = current.endBoundaryId
    const successor = findSuccessor(current)
    const endBoundary = createBoundary({
      ...placement,
      anchorBoundaryId: placement.virtual ? (placement.anchorBoundaryId ?? startBoundaryId) : placement.anchorBoundaryId,
      lineOffset: placement.virtual ? (placement.lineOffset ?? DEFAULT_BEAT_LINES) : placement.lineOffset,
    })
    const newCard: BeatCard = {
      id: createCardId(),
      startBoundaryId,
      endBoundaryId: endBoundary.id,
      sceneStart,
      content: DEFAULT_BEAT_CONTENT,
    }

    if (successor) {
      successor.startBoundaryId = endBoundary.id
    }

    boundaries.value.push(endBoundary)
    cards.value.push(newCard)
    sortCards()
    save()
    return newCard.id
  }

  function insertBeatAfter(cardId: string, placement: BoundaryPlacement): string | null {
    return insertCardAfter(cardId, placement, false)
  }

  function insertSceneAfter(cardId: string, placement: BoundaryPlacement): string | null {
    return insertCardAfter(cardId, placement, true)
  }

  function splitCardAtBoundary(pos: number): string | null {
    const target = orderedCards().find((card) => {
      const start = boundaryById(card.startBoundaryId)
      const end = boundaryById(card.endBoundaryId)
      if (!start || !end) return false
      const startPos = resolvedBoundaryDocPos(start)
      const endPos = resolvedBoundaryDocPos(end)
      return startPos < pos && pos < endPos
    })
    if (!target) return null

    const splitBoundary = createBoundary({ docPos: pos })
    const newCard: BeatCard = {
      id: createCardId(),
      startBoundaryId: splitBoundary.id,
      endBoundaryId: target.endBoundaryId,
      sceneStart: false,
      content: DEFAULT_BEAT_CONTENT,
    }

    target.endBoundaryId = splitBoundary.id
    boundaries.value.push(splitBoundary)
    cards.value.push(newCard)
    sortCards()
    save()
    return newCard.id
  }

  function canMoveBoundary(boundaryId: string, newDocPos: number): boolean {
    const boundary = boundaryById(boundaryId)
    if (!boundary || boundary.locked) return false

    const usage = findBoundaryUsage(boundaryId)
    if (!usage.previous && !usage.next) return false

    if (usage.previous) {
      const lowerBoundary = boundaryById(usage.previous.startBoundaryId)
      if (lowerBoundary && !(lowerBoundary.virtual && lowerBoundary.anchorBoundaryId === boundaryId)) {
        if (newDocPos <= resolvedBoundaryDocPos(lowerBoundary)) return false
      }
    }

    if (usage.next) {
      const upperBoundary = boundaryById(usage.next.endBoundaryId)
      if (upperBoundary && !(upperBoundary.virtual && upperBoundary.anchorBoundaryId === boundaryId)) {
        if (newDocPos >= resolvedBoundaryDocPos(upperBoundary)) return false
      }
    }

    return true
  }

  function moveBoundary(boundaryId: string, newDocPos: number): void {
    if (!canMoveBoundary(boundaryId, newDocPos)) return
    const boundary = boundaryById(boundaryId)
    if (!boundary) return

    boundary.docPos = newDocPos
    boundary.virtual = false
    boundary.anchorBoundaryId = undefined
    boundary.lineOffset = undefined
    save()
  }

  function batchMoveBoundaries(updates: Map<string, number>): void {
    let changed = false
    for (const [id, pos] of updates) {
      const boundary = boundaryById(id)
      if (boundary && !boundary.virtual && boundary.docPos !== pos) {
        boundary.docPos = pos
        changed = true
      }
    }
    if (changed) normalizeGraph()
  }

  function updateCardContent(cardId: string, content: string): void {
    const card = cardById(cardId)
    if (!card) return
    card.content = content
    save()
  }

  function removeCard(cardId: string): void {
    if (cards.value.length <= 1) return
    const card = cardById(cardId)
    if (!card) return

    const predecessor = findPredecessor(card)
    const successor = findSuccessor(card)

    if (card.sceneStart && successor) {
      successor.sceneStart = true
    }

    if (predecessor) {
      predecessor.endBoundaryId = card.endBoundaryId
    } else if (successor) {
      successor.startBoundaryId = card.startBoundaryId
    }

    cards.value = cards.value.filter((c) => c.id !== cardId)
    normalizeGraph()
  }

  function sequenceForPos(pos: number): SequenceRange | undefined {
    return sequenceRanges.value.find((range) => range.startPos <= pos && pos < range.endPos)
  }

  const numbering = computed<Map<string, BeatNumbering>>(() => {
    const result = new Map<string, BeatNumbering>()
    const counters = new Map<string, { sceneNum: number; beatNum: number; hasCard: boolean }>()

    for (const card of orderedCards()) {
      const start = boundaryById(card.startBoundaryId)
      if (!start) continue

      const seq = sequenceForPos(resolvedBoundaryDocPos(start))
      const seqKey = seq ? `${seq.actId}:${seq.seqId}:${seq.startPos}` : 'fallback'
      const counter = counters.get(seqKey) ?? { sceneNum: 0, beatNum: 0, hasCard: false }

      if (!counter.hasCard || card.sceneStart) {
        counter.sceneNum += 1
        counter.beatNum = 1
        counter.hasCard = true
      } else {
        counter.beatNum += 1
      }

      result.set(card.id, {
        sceneNum: counter.sceneNum,
        beatNum: counter.beatNum,
        label: `S${counter.sceneNum}#${counter.beatNum}`,
      })
      counters.set(seqKey, counter)
    }

    return result
  })

  return {
    boundaries,
    cards,
    sequenceRanges,
    numbering,
    boundaryById,
    cardById,
    setSequenceRanges,
    ensureDefaultBeat,
    normalizeGraph,
    insertBeatAfter,
    insertSceneAfter,
    splitCardAtBoundary,
    canMoveBoundary,
    moveBoundary,
    batchMoveBoundaries,
    updateCardContent,
    removeCard,
  }
})
