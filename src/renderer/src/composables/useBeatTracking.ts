import { watch, onBeforeUnmount } from 'vue'
import type { Editor, EditorEvents } from '@tiptap/vue-3'
import type { Node as PmNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { useEditorBridge } from '../stores/editor-bridge'
import { buildLineGrid } from '../components/editor/line-grid/build-line-grid'
import { LINE_GRID_CONFIG } from '../components/editor/line-grid/constants'
import { extractScreenplayBlocks } from '../components/editor/line-grid/extract-blocks'
import { useLineGridStore } from '../stores/line-grid'
import {
  createBetweenBoundaryId,
  createEndBoundaryId,
  createStartBoundaryId,
  LINE_HEIGHT,
  useBeatStore,
  type BeatCard,
  type SequenceRange,
} from '../stores/beat'
import type { BeatBoardState, BoundaryLayout, CardLayout } from '../components/beat/beat-state'
import type { LineGridSnapshot } from '../components/editor/line-grid/types'

function buildSnapshot(doc: PmNode): LineGridSnapshot {
  return buildLineGrid(extractScreenplayBlocks(doc), LINE_GRID_CONFIG)
}

export function scanSequenceRanges(doc: PmNode, snapshot?: LineGridSnapshot): SequenceRange[] {
  const lineGridSnapshot = snapshot ?? buildSnapshot(doc)
  const markers = lineGridSnapshot.markers.filter((marker) => marker.type === 'sequence')

  return markers.map((marker, index) => {
    const block = lineGridSnapshot.blocks.find((range) => range.blockIndex === marker.blockIndex)
    const next = markers[index + 1]
    return {
      actId: marker.actId,
      seqId: marker.seqId || `seq-${marker.pos}`,
      startLine: block?.startLine ?? marker.lineIndex,
      contentStartLine: block?.contentStartLine ?? marker.lineIndex,
      endLine: next?.lineIndex ?? lineGridSnapshot.totalLines,
    }
  })
}

function findSequenceForLine(ranges: SequenceRange[], lineIndex: number): SequenceRange | undefined {
  return ranges.find((range) => range.startLine <= lineIndex && lineIndex < range.endLine)
}

function sequenceLineDelta(
  oldRanges: SequenceRange[],
  newRanges: SequenceRange[],
  seqId: string,
): number {
  const oldRange = oldRanges.find((range) => range.seqId === seqId)
  const newRange = newRanges.find((range) => range.seqId === seqId)
  if (!oldRange || !newRange) return 0
  return newRange.endLine - oldRange.endLine
}

function editorBodyOffset(bridge: ReturnType<typeof useEditorBridge>, state: BeatBoardState): number {
  const scrollEl = bridge.scrollEl
  if (!scrollEl) return state.contentOffsetY

  const editorBody = scrollEl.querySelector('.editor-body') as HTMLElement | null
  const boardEl = document.querySelector('.beat-board') as HTMLElement | null
  if (!editorBody || !boardEl) return state.contentOffsetY

  return editorBody.getBoundingClientRect().top - boardEl.getBoundingClientRect().top + scrollEl.scrollTop
}

function createBoundaryLayouts(
  sequenceCards: BeatCard[],
  offsetY: number,
  lineGridStore: ReturnType<typeof useLineGridStore>,
): BoundaryLayout[] {
  const boundaries: BoundaryLayout[] = []

  for (let index = 0; index < sequenceCards.length; index += 1) {
    const card = sequenceCards[index]
    const previous = sequenceCards[index - 1]
    const next = sequenceCards[index + 1]
    const startBoundaryId = previous
      ? createBetweenBoundaryId(previous.id, card.id)
      : createStartBoundaryId(card.id)
    const endBoundaryId = next
      ? createBetweenBoundaryId(card.id, next.id)
      : createEndBoundaryId(card.id)

    if (index === 0) {
      boundaries.push({
        boundaryId: startBoundaryId,
        seqId: card.seqId,
        lineIndex: card.startLine,
        y: lineGridStore.gapIndexToY(card.startLine) + offsetY,
        locked: false,
        visible: true,
      })
    }

    boundaries.push({
      boundaryId: endBoundaryId,
      seqId: card.seqId,
      lineIndex: card.endLine,
      y: lineGridStore.gapIndexToY(card.endLine) + offsetY,
      locked: false,
      visible: true,
    })
  }

  return boundaries
}

export function useBeatTracking(state: BeatBoardState): void {
  const bridge = useEditorBridge()
  const lineGridStore = useLineGridStore()
  const store = useBeatStore()

  let transactionHandler: ((props: EditorEvents['transaction']) => void) | null = null
  let updateHandler: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null
  let measureRaf: number | null = null
  let measureDebounce: ReturnType<typeof setTimeout> | null = null
  let currentEditor: Editor | null = null
  let previousSnapshot: LineGridSnapshot | null = null
  let previousRanges: SequenceRange[] = []
  let previousSelectionFrom = 0

  function syncSequences(editor: Editor, snapshot: LineGridSnapshot): SequenceRange[] {
    const ranges = scanSequenceRanges(editor.state.doc, snapshot)
    store.setSequenceRanges(ranges)
    store.ensureDefaultBeatsForSequences()
    return ranges
  }

  function measureLayouts(): void {
    const editor = currentEditor
    if (!editor || !bridge.scrollEl || state.isDragging) return

    const snapshot = lineGridStore.rebuild(editor.state.doc) ?? buildSnapshot(editor.state.doc)
    const ranges = syncSequences(editor, snapshot)
    const offsetY = editorBodyOffset(bridge, state)
    state.contentOffsetY = offsetY

    const boundaries: BoundaryLayout[] = []
    const cards: CardLayout[] = []
    const numbering = store.numbering

    for (const range of ranges) {
      const sequenceCards = store.cardsForSequence(range.seqId)
      boundaries.push(...createBoundaryLayouts(sequenceCards, offsetY, lineGridStore))

      for (let index = 0; index < sequenceCards.length; index += 1) {
        const card = sequenceCards[index]
        const previous = sequenceCards[index - 1]
        const next = sequenceCards[index + 1]
        const topY = lineGridStore.gapIndexToY(card.startLine) + offsetY
        const bottomY = lineGridStore.gapIndexToY(card.endLine) + offsetY
        const num = numbering.get(card.id)

        cards.push({
          cardId: card.id,
          seqId: card.seqId,
          label: num?.label ?? 'S?#?',
          content: card.content,
          sceneStart: card.sceneStart,
          startLine: card.startLine,
          endLine: card.endLine,
          topY,
          bottomY,
          height: Math.max(bottomY - topY, LINE_HEIGHT),
          startBoundaryId: previous
            ? createBetweenBoundaryId(previous.id, card.id)
            : createStartBoundaryId(card.id),
          endBoundaryId: next
            ? createBetweenBoundaryId(card.id, next.id)
            : createEndBoundaryId(card.id),
        })
      }
    }

    const editorBody = bridge.scrollEl.querySelector('.editor-body') as HTMLElement | null
    const maxBoundaryY = boundaries.reduce((max, boundary) => Math.max(max, boundary.y), 0)
    const maxCardBottomY = cards.reduce((max, card) => Math.max(max, card.bottomY), 0)
    const editorHeight = editorBody ? editorBody.scrollHeight + offsetY : 0

    state.totalHeight = Math.max(editorHeight, maxBoundaryY, maxCardBottomY) + LINE_HEIGHT
    state.boundaries = boundaries
    state.cards = cards
    previousSnapshot = snapshot
    previousRanges = ranges
  }

  function scheduleMeasure(): void {
    if (measureDebounce) clearTimeout(measureDebounce)
    measureDebounce = setTimeout(() => {
      if (measureRaf) cancelAnimationFrame(measureRaf)
      measureRaf = requestAnimationFrame(measureLayouts)
    }, 100)
  }

  function syncPreviousTransactionState(
    snapshot: LineGridSnapshot,
    ranges: SequenceRange[],
    selectionFrom: number
  ): void {
    previousSnapshot = snapshot
    previousRanges = ranges
    previousSelectionFrom = selectionFrom
  }

  function applyTransactionLineDelta(transaction: Transaction): void {
    const editor = currentEditor
    if (!editor || !previousSnapshot) return

    if (!transaction.docChanged) {
      previousSelectionFrom = transaction.selection.from
      return
    }

    const oldSnapshot = previousSnapshot
    const oldRanges = previousRanges
    const newSnapshot = lineGridStore.rebuild(transaction.doc)
    const newRanges = scanSequenceRanges(transaction.doc, newSnapshot)
    const oldLine = lineGridStore.docPosToVisualLineIndex(oldSnapshot, previousSelectionFrom)
    const oldSequence = findSequenceForLine(oldRanges, oldLine)

    if (!oldSequence) {
      store.setSequenceRanges(newRanges)
      syncPreviousTransactionState(newSnapshot, newRanges, transaction.selection.from)
      return
    }

    const deltaLines = sequenceLineDelta(oldRanges, newRanges, oldSequence.seqId)
    store.setSequenceRanges(newRanges, { normalize: deltaLines === 0 })

    if (deltaLines !== 0) {
      store.applyLineDelta(oldSequence.seqId, oldLine, deltaLines)
    }

    syncPreviousTransactionState(newSnapshot, newRanges, transaction.selection.from)
  }

  function setupEditor(editor: Editor): void {
    currentEditor = editor

    const snapshot = lineGridStore.rebuild(editor.state.doc)
    previousSnapshot = snapshot
    previousRanges = syncSequences(editor, snapshot)
    previousSelectionFrom = editor.state.selection.from

    transactionHandler = ({ transaction }) => {
      applyTransactionLineDelta(transaction)
      scheduleMeasure()
    }
    editor.on('transaction', transactionHandler)

    updateHandler = scheduleMeasure
    editor.on('update', updateHandler)

    const scrollEl = bridge.scrollEl
    if (scrollEl) {
      const editorBody = scrollEl.querySelector('.editor-body')
      if (editorBody) {
        resizeObserver = new ResizeObserver(scheduleMeasure)
        resizeObserver.observe(editorBody)
      }
    }

    scheduleMeasure()
  }

  function teardownEditor(): void {
    if (currentEditor && transactionHandler) {
      currentEditor.off('transaction', transactionHandler)
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
    previousSnapshot = null
    previousRanges = []
    previousSelectionFrom = 0
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
    () => [store.cards, store.sequenceRanges, state.contentOffsetY],
    scheduleMeasure,
    { deep: true },
  )

  onBeforeUnmount(teardownEditor)
}
