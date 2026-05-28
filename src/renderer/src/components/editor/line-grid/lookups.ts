import { textLineOffset } from '../text-metrics'
import { elementLayoutConfig, LINE_GRID_CONFIG } from './constants'
import type { BlockLineRange, LineGridConfig, LineGridSnapshot } from './types'

function pageGapHeightBeforeLine(snapshot: LineGridSnapshot, lineIndex: number): number {
  let height = 0
  for (const pageBreak of snapshot.pageBreaks) {
    if (pageBreak.lineIndex <= lineIndex) height += pageBreak.heightPx
    else break
  }
  return height
}

export function lineIndexToY(lineIndex: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return lineIndex * config.lineHeight
}

export function lineIndexToYInSnapshot(
  snapshot: LineGridSnapshot,
  lineIndex: number,
  config: LineGridConfig = LINE_GRID_CONFIG
): number {
  return lineIndex * config.lineHeight + pageGapHeightBeforeLine(snapshot, lineIndex)
}

export function yToLineIndex(y: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return Math.max(0, Math.round(y / config.lineHeight))
}

export function yToLineIndexInSnapshot(
  snapshot: LineGridSnapshot,
  y: number,
  config: LineGridConfig = LINE_GRID_CONFIG
): number {
  let accumulatedGapHeight = 0
  for (const pageBreak of snapshot.pageBreaks) {
    const gapStartY = pageBreak.lineIndex * config.lineHeight + accumulatedGapHeight
    const gapEndY = gapStartY + pageBreak.heightPx
    if (y < gapStartY) break
    if (y < gapEndY) return pageBreak.lineIndex
    accumulatedGapHeight += pageBreak.heightPx
  }
  return Math.max(0, Math.round((y - accumulatedGapHeight) / config.lineHeight))
}

export function gapIndexToY(gapIndex: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return gapIndex * config.lineHeight
}

export function gapIndexToYInSnapshot(
  snapshot: LineGridSnapshot,
  gapIndex: number,
  config: LineGridConfig = LINE_GRID_CONFIG
): number {
  return lineIndexToYInSnapshot(snapshot, gapIndex, config)
}

export function yToGapIndex(y: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return Math.max(0, Math.round(y / config.lineHeight))
}

export function yToGapIndexInSnapshot(
  snapshot: LineGridSnapshot,
  y: number,
  config: LineGridConfig = LINE_GRID_CONFIG
): number {
  return yToLineIndexInSnapshot(snapshot, y, config)
}

export function lineIndexToBlock(
  snapshot: LineGridSnapshot,
  lineIndex: number
): BlockLineRange | undefined {
  return snapshot.blocks.find((block) => block.startLine <= lineIndex && lineIndex < block.endLine)
}

export function blockIndexToRange(
  snapshot: LineGridSnapshot,
  blockIndex: number
): BlockLineRange | undefined {
  return snapshot.blocks.find((block) => block.blockIndex === blockIndex)
}

export function docPosToLineIndex(snapshot: LineGridSnapshot, pos: number): number {
  if (snapshot.blocks.length === 0) return 0

  const containing = snapshot.blocks.find(
    (block) => block.pos <= pos && pos <= block.pos + block.nodeSize
  )
  if (containing) return containing.contentStartLine

  const next = snapshot.blocks.find((block) => block.pos > pos)
  if (next) return next.contentStartLine

  return snapshot.blocks[snapshot.blocks.length - 1].endLine
}

export function docPosToVisualLineIndex(snapshot: LineGridSnapshot, pos: number): number {
  if (snapshot.blocks.length === 0) return 0

  const containing = snapshot.blocks.find(
    (block) => block.pos <= pos && pos <= block.pos + block.nodeSize
  )
  if (!containing) return docPosToLineIndex(snapshot, pos)

  const textOffset = Math.max(0, Math.min(pos - containing.pos - 1, containing.text.length))
  const textBefore = containing.text.slice(0, textOffset)
  const config = elementLayoutConfig(containing.type)
  const lineOffset = Math.min(
    containing.contentLines - 1,
    textLineOffset(textBefore, config.charsPerLine)
  )
  return containing.contentStartLine + lineOffset
}

export function lineIndexToNearestDocPos(snapshot: LineGridSnapshot, lineIndex: number): number {
  const block = lineIndexToBlock(snapshot, lineIndex)
  if (block) return block.pos

  const next = snapshot.blocks.find((candidate) => candidate.startLine > lineIndex)
  if (next) return next.pos

  return snapshot.blocks[snapshot.blocks.length - 1]?.pos ?? 0
}
