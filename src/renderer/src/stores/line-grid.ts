import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Node as PmNode } from '@tiptap/pm/model'
import { buildLineGrid } from '../components/editor/line-grid/build-line-grid'
import { extractScreenplayBlocks } from '../components/editor/line-grid/extract-blocks'
import { LINE_GRID_CONFIG } from '../components/editor/line-grid/constants'
import {
  blockIndexToRange,
  docPosToLineIndex,
  docPosToVisualLineIndex,
  gapIndexToYInSnapshot,
  lineIndexToBlock,
  lineIndexToNearestDocPos,
  lineIndexToYInSnapshot,
  yToGapIndexInSnapshot,
  yToLineIndexInSnapshot
} from '../components/editor/line-grid/lookups'
import type { LineGridSnapshot } from '../components/editor/line-grid/types'

const EMPTY_SNAPSHOT: LineGridSnapshot = {
  version: 1,
  totalLines: 1,
  blocks: [],
  pages: [{ pageIndex: 0, startLine: 0, endLine: LINE_GRID_CONFIG.pageLines }],
  markers: [],
  pageBreaks: [],
  totalPages: 1
}

export const useLineGridStore = defineStore('lineGrid', () => {
  const snapshot = shallowRef<LineGridSnapshot>(EMPTY_SNAPSHOT)

  function rebuild(doc: PmNode): LineGridSnapshot {
    const next = buildLineGrid(extractScreenplayBlocks(doc), LINE_GRID_CONFIG)
    snapshot.value = next
    return next
  }

  function reset(): void {
    snapshot.value = EMPTY_SNAPSHOT
  }

  function gapIndexToY(gapIndex: number): number {
    return gapIndexToYInSnapshot(snapshot.value, gapIndex, LINE_GRID_CONFIG)
  }

  function lineIndexToY(lineIndex: number): number {
    return lineIndexToYInSnapshot(snapshot.value, lineIndex, LINE_GRID_CONFIG)
  }

  function yToGapIndex(y: number): number {
    return yToGapIndexInSnapshot(snapshot.value, y, LINE_GRID_CONFIG)
  }

  function yToLineIndex(y: number): number {
    return yToLineIndexInSnapshot(snapshot.value, y, LINE_GRID_CONFIG)
  }

  return {
    snapshot,
    rebuild,
    reset,
    blockIndexToRange,
    docPosToLineIndex,
    docPosToVisualLineIndex,
    gapIndexToY,
    lineIndexToBlock,
    lineIndexToNearestDocPos,
    lineIndexToY,
    yToGapIndex,
    yToLineIndex
  }
})
