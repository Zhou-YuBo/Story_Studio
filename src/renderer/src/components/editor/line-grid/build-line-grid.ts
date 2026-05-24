import { countTextLines } from './line-counter'
import { elementLayoutConfig, LINE_GRID_CONFIG } from './constants'
import type {
  BlockLineRange,
  LineGridConfig,
  LineGridSnapshot,
  MarkerLineRange,
  PageBreakInfo,
  PageLineRange,
  ScreenplayBlock,
} from './types'

function marginTopLines(block: ScreenplayBlock, line: number, config: LineGridConfig): number {
  const elementConfig = elementLayoutConfig(block.type, config)
  if (line === 0 && elementConfig.isFirstNoMargin) return 0
  return elementConfig.marginTopLines
}

function findCharacterName(blocks: BlockLineRange[], dialogueBlockIndex: number): string {
  for (let i = dialogueBlockIndex - 1; i >= 0; i -= 1) {
    if (blocks[i].type === 'character') return blocks[i].text
    if (blocks[i].type !== 'parenthetical' && blocks[i].type !== 'dialogue') break
  }
  return ''
}

function stringAttr(attrs: Record<string, unknown>, key: string): string {
  const value = attrs[key]
  return typeof value === 'string' ? value : ''
}

function createMarker(block: BlockLineRange): MarkerLineRange | null {
  if (block.type !== 'newAct' && block.type !== 'endOfAct' && block.type !== 'sequence') return null

  return {
    type: block.type,
    actId: stringAttr(block.attrs, 'actId'),
    seqId: stringAttr(block.attrs, 'seqId'),
    blockIndex: block.blockIndex,
    lineIndex: block.contentStartLine,
    pos: block.pos,
    nodeSize: block.nodeSize,
  }
}

function createPages(totalLines: number, pageLines: number): PageLineRange[] {
  const totalPages = Math.max(1, Math.ceil(Math.max(totalLines, 1) / pageLines))
  return Array.from({ length: totalPages }, (_, pageIndex) => ({
    pageIndex,
    startLine: pageIndex * pageLines,
    endLine: (pageIndex + 1) * pageLines,
  }))
}

function createPageBreaks(blocks: BlockLineRange[], pageLines: number): PageBreakInfo[] {
  const pageBreaks: PageBreakInfo[] = []

  for (let i = 1; i < blocks.length; i += 1) {
    const previous = blocks[i - 1]
    const current = blocks[i]
    if (Math.floor(previous.endLine / pageLines) < Math.floor(current.endLine / pageLines)) {
      pageBreaks.push({
        afterBlockIndex: previous.blockIndex,
        linesUsed: previous.endLine % pageLines || pageLines,
        lineIndex: Math.ceil(previous.endLine / pageLines) * pageLines,
      })
    }
  }

  for (const block of blocks) {
    if (block.type !== 'dialogue') continue
    const pageStart = Math.floor(block.contentStartLine / pageLines) * pageLines
    const pageEnd = pageStart + pageLines
    if (block.endLine <= pageEnd) continue

    const splitAtLine = pageEnd - block.contentStartLine - 1
    if (splitAtLine < 1) continue

    const existing = pageBreaks.find((pageBreak) => pageBreak.afterBlockIndex === block.blockIndex)
    const moreContd = {
      characterName: findCharacterName(blocks, block.blockIndex),
      splitAtLine,
    }

    if (existing) {
      existing.moreContd = moreContd
      existing.linesUsed = pageLines
    } else {
      pageBreaks.push({
        afterBlockIndex: block.blockIndex,
        linesUsed: pageLines,
        lineIndex: pageEnd,
        moreContd,
      })
    }
  }

  return pageBreaks.sort((a, b) => a.lineIndex - b.lineIndex)
}

export function buildLineGrid(
  sourceBlocks: ScreenplayBlock[],
  config: LineGridConfig = LINE_GRID_CONFIG,
): LineGridSnapshot {
  const blocks: BlockLineRange[] = []
  const markers: MarkerLineRange[] = []
  let line = 0

  for (const block of sourceBlocks) {
    const elementConfig = elementLayoutConfig(block.type, config)
    const margin = marginTopLines(block, line, config)
    const startLine = line
    const contentStartLine = startLine + margin
    const contentLines = countTextLines(block.text, elementConfig.charsPerLine)
    const endLine = contentStartLine + contentLines
    const pageIndex = Math.floor(contentStartLine / config.pageLines)
    const lineInPage = contentStartLine % config.pageLines
    const range: BlockLineRange = {
      ...block,
      marginTopLines: margin,
      contentLines,
      startLine,
      contentStartLine,
      endLine,
      pageIndex,
      lineInPage,
    }

    blocks.push(range)
    const marker = createMarker(range)
    if (marker) markers.push(marker)
    line = endLine
  }

  const totalLines = Math.max(line, 1)
  const pages = createPages(totalLines, config.pageLines)
  const pageBreaks = createPageBreaks(blocks, config.pageLines)

  return {
    version: 1,
    totalLines,
    blocks,
    pages,
    markers,
    pageBreaks,
    totalPages: pages.length,
  }
}
