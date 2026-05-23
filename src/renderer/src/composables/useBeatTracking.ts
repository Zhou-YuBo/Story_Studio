import { watch, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Node as PmNode } from '@tiptap/pm/model'
import { useEditorBridge } from '../stores/editor-bridge'
import {
  DEFAULT_BEAT_LINES,
  LINE_HEIGHT,
  useBeatStore,
  type BeatBoundary,
  type BoundaryPlacement,
  type SequenceRange,
} from '../stores/beat'
import type { BeatBoardState } from '../components/beat/beat-state'

export function snapToBlockBoundary(doc: PmNode, rawPos: number): number {
  const clamped = Math.max(0, Math.min(rawPos, doc.content.size))
  if (clamped === 0 || clamped === doc.content.size) return clamped

  const $pos = doc.resolve(clamped)
  if ($pos.depth === 0) return clamped

  const before = $pos.before(1)
  const after = $pos.after(1)
  return clamped - before <= after - clamped ? before : after
}

export function scanSequenceRanges(doc: PmNode): SequenceRange[] {
  const markers: Array<{ actId: string; seqId: string; startPos: number }> = []
  let fallbackActId = ''

  doc.forEach((node, offset) => {
    if (node.type.name === 'newAct') {
      fallbackActId = node.attrs.actId || ''
    }
    if (node.type.name === 'sequence') {
      markers.push({
        actId: node.attrs.actId || fallbackActId,
        seqId: node.attrs.seqId || `seq-${offset}`,
        startPos: offset,
      })
    }
  })

  if (markers.length === 0) {
    return [{ actId: '', seqId: 'fallback', startPos: 0, endPos: doc.content.size }]
  }

  return markers.map((marker, index) => ({
    ...marker,
    endPos: markers[index + 1]?.startPos ?? doc.content.size,
  }))
}

function resolveBoundaryY(
  boundary: BeatBoundary,
  boundaries: BeatBoundary[],
  view: Editor['view'],
  containerTop: number,
  offsetY: number,
  seen = new Set<string>(),
): number {
  if (boundary.virtual && boundary.anchorBoundaryId && !seen.has(boundary.id)) {
    seen.add(boundary.id)
    const anchor = boundaries.find((b) => b.id === boundary.anchorBoundaryId)
    if (anchor) {
      return resolveBoundaryY(anchor, boundaries, view, containerTop, offsetY, seen) + (boundary.lineOffset ?? DEFAULT_BEAT_LINES) * LINE_HEIGHT
    }
  }

  try {
    const coords = view.coordsAtPos(boundary.docPos)
    return coords.top - containerTop + offsetY
  } catch {
    return offsetY
  }
}

export function createDefaultEndPlacement(editor: Editor, startPos: number, anchorBoundaryId?: string, anchorVirtual = false): BoundaryPlacement {
  if (anchorVirtual && anchorBoundaryId) {
    return {
      docPos: startPos,
      virtual: true,
      anchorBoundaryId,
      lineOffset: DEFAULT_BEAT_LINES,
    }
  }

  const view = editor.view
  try {
    const startCoords = view.coordsAtPos(startPos)
    const targetY = startCoords.top + DEFAULT_BEAT_LINES * LINE_HEIGHT
    const target = view.posAtCoords({ left: startCoords.left, top: targetY })
    if (target) {
      const snapped = snapToBlockBoundary(editor.state.doc, target.pos)
      if (snapped > startPos) return { docPos: snapped }
    }
  } catch {
    // fall through to virtual boundary
  }

  return {
    docPos: startPos,
    virtual: true,
    anchorBoundaryId,
    lineOffset: DEFAULT_BEAT_LINES,
  }
}

export function useBeatTracking(state: BeatBoardState): void {
  const bridge = useEditorBridge()
  const store = useBeatStore()

  let transactionHandler: ((props: { transaction: any }) => void) | null = null
  let updateHandler: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null
  let measureRaf: number | null = null
  let measureDebounce: ReturnType<typeof setTimeout> | null = null
  let currentEditor: Editor | null = null

  function ensureDefaultBeat(editor: Editor): void {
    if (store.cards.length > 0) return

    const ranges = scanSequenceRanges(editor.state.doc)
    store.setSequenceRanges(ranges)

    const startPos = snapToBlockBoundary(editor.state.doc, ranges[0]?.startPos ?? 0)
    const end = createDefaultEndPlacement(editor, startPos)
    store.ensureDefaultBeat({
      start: { docPos: startPos },
      end,
    })
  }

  function remapBoundaries(transaction: any): void {
    if (!transaction.docChanged) return

    const updates = new Map<string, number>()
    for (const boundary of store.boundaries) {
      if (boundary.virtual) continue
      const mapped = transaction.mapping.map(boundary.docPos)
      const snapped = snapToBlockBoundary(transaction.doc, mapped)
      if (snapped !== boundary.docPos) {
        updates.set(boundary.id, snapped)
      }
    }

    if (updates.size > 0) {
      store.batchMoveBoundaries(updates)
    }

    const ranges = scanSequenceRanges(transaction.doc)
    store.setSequenceRanges(ranges)
    store.normalizeGraph()
  }

  function measureLayouts(): void {
    const editor = currentEditor
    if (!editor || !bridge.scrollEl || state.isDragging) return

    ensureDefaultBeat(editor)

    const pageContainer = bridge.scrollEl.querySelector('.page-container') as HTMLElement | null
    if (!pageContainer) return

    const containerRect = pageContainer.getBoundingClientRect()

    const boundaries = store.boundaries.map((boundary) => ({
      boundaryId: boundary.id,
      y: resolveBoundaryY(boundary, store.boundaries, editor.view, containerRect.top, state.contentOffsetY),
      docPos: boundary.docPos,
      locked: Boolean(boundary.locked),
      visible: true,
    }))

    const numbering = store.numbering
    const cards = store.cards.map((card) => {
      const start = boundaries.find((b) => b.boundaryId === card.startBoundaryId)
      const end = boundaries.find((b) => b.boundaryId === card.endBoundaryId)
      const topY = start?.y ?? state.contentOffsetY
      const bottomY = Math.max(end?.y ?? topY + DEFAULT_BEAT_LINES * LINE_HEIGHT, topY + LINE_HEIGHT)
      const num = numbering.get(card.id)

      return {
        cardId: card.id,
        label: num?.label ?? 'S?#?',
        content: card.content,
        sceneStart: card.sceneStart,
        topY,
        bottomY,
        height: bottomY - topY,
        startBoundaryId: card.startBoundaryId,
        endBoundaryId: card.endBoundaryId,
      }
    })

    const maxBoundaryY = boundaries.reduce((max, boundary) => Math.max(max, boundary.y), 0)
    const maxCardBottomY = cards.reduce((max, card) => Math.max(max, card.bottomY), 0)
    state.totalHeight = Math.max(
      state.contentOffsetY + pageContainer.scrollHeight,
      maxBoundaryY,
      maxCardBottomY,
    ) + LINE_HEIGHT

    state.boundaries = boundaries
    state.cards = cards
  }

  function scheduleMeasure(): void {
    if (measureDebounce) clearTimeout(measureDebounce)
    measureDebounce = setTimeout(() => {
      if (measureRaf) cancelAnimationFrame(measureRaf)
      measureRaf = requestAnimationFrame(measureLayouts)
    }, 100)
  }

  function setupEditor(editor: Editor): void {
    currentEditor = editor

    const ranges = scanSequenceRanges(editor.state.doc)
    store.setSequenceRanges(ranges)
    ensureDefaultBeat(editor)

    transactionHandler = ({ transaction }) => {
      remapBoundaries(transaction)
      scheduleMeasure()
    }
    editor.on('transaction', transactionHandler as any)

    updateHandler = scheduleMeasure
    editor.on('update', updateHandler)

    const scrollEl = bridge.scrollEl
    if (scrollEl) {
      const pageContainer = scrollEl.querySelector('.page-container')
      if (pageContainer) {
        resizeObserver = new ResizeObserver(scheduleMeasure)
        resizeObserver.observe(pageContainer)
      }
    }

    scheduleMeasure()
  }

  function teardownEditor(): void {
    if (currentEditor && transactionHandler) {
      currentEditor.off('transaction', transactionHandler as any)
    }
    if (currentEditor && updateHandler) {
      currentEditor.off('update', updateHandler)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (measureRaf) {
      cancelAnimationFrame(measureRaf)
      measureRaf = null
    }
    if (measureDebounce) {
      clearTimeout(measureDebounce)
      measureDebounce = null
    }
    transactionHandler = null
    updateHandler = null
    currentEditor = null
  }

  watch(
    () => bridge.editor,
    (editor, oldEditor) => {
      if (oldEditor) teardownEditor()
      if (editor) setupEditor(editor)
    },
    { immediate: true },
  )

  watch(
    () => [store.boundaries, store.cards, state.contentOffsetY],
    scheduleMeasure,
    { deep: true },
  )

  onBeforeUnmount(teardownEditor)
}
