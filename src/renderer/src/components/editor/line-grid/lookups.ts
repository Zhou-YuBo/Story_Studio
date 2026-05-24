import { elementLayoutConfig, LINE_GRID_CONFIG } from './constants'
import type { BlockLineRange, LineGridConfig, LineGridSnapshot } from './types'

export function lineIndexToY(lineIndex: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return lineIndex * config.lineHeight
}

export function yToLineIndex(y: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return Math.max(0, Math.round(y / config.lineHeight))
}

export function gapIndexToY(gapIndex: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return gapIndex * config.lineHeight
}

export function yToGapIndex(y: number, config: LineGridConfig = LINE_GRID_CONFIG): number {
  return Math.max(0, Math.round(y / config.lineHeight))
}

export function lineIndexToBlock(snapshot: LineGridSnapshot, lineIndex: number): BlockLineRange | undefined {
  return snapshot.blocks.find((block) => block.startLine <= lineIndex && lineIndex < block.endLine)
}

export function blockIndexToRange(snapshot: LineGridSnapshot, blockIndex: number): BlockLineRange | undefined {
  return snapshot.blocks.find((block) => block.blockIndex === blockIndex)
}

export function docPosToLineIndex(snapshot: LineGridSnapshot, pos: number): number {
  if (snapshot.blocks.length === 0) return 0

  const containing = snapshot.blocks.find((block) => block.pos <= pos && pos <= block.pos + block.nodeSize)
  if (containing) return containing.contentStartLine

  const next = snapshot.blocks.find((block) => block.pos > pos)
  if (next) return next.contentStartLine

  return snapshot.blocks[snapshot.blocks.length - 1].endLine
}

function textLineOffset(text: string, charsPerLine: number): number {
  let lines = 0
  let lineWidth = 0

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    const width =
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
        ? 2
        : 1
    lineWidth += width
    if (lineWidth > charsPerLine) {
      lines += 1
      lineWidth = width
    }
  }

  return lines
}

export function docPosToVisualLineIndex(snapshot: LineGridSnapshot, pos: number): number {
  if (snapshot.blocks.length === 0) return 0

  const containing = snapshot.blocks.find((block) => block.pos <= pos && pos <= block.pos + block.nodeSize)
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
