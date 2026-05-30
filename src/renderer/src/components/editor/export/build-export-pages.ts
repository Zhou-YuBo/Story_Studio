import { ELEMENT_LAYOUT, PAGE_LINES } from '../page-layout/page-config'
import { buildLineGrid } from '../line-grid/build-line-grid'
import { LINE_GRID_CONFIG } from '../line-grid/constants'
import type { BlockLineRange, ScreenplayBlock } from '../line-grid/types'
import type { ExportBlockFragment, ExportPage, ExportPagination } from './export-types'
import { extractExportBlocks } from './extract-export-blocks'
import { wrapTextLines } from './wrap-text-lines'

function layoutFor(type: string): (typeof ELEMENT_LAYOUT)[string] {
  return ELEMENT_LAYOUT[type] ?? ELEMENT_LAYOUT.general
}

function blockByIndex(blocks: ScreenplayBlock[]): Map<number, ScreenplayBlock> {
  return new Map(blocks.map((block) => [block.blockIndex, block]))
}

function linesForBlock(block: ScreenplayBlock): string[] {
  return wrapTextLines(block.text, layoutFor(block.type).charsPerLine)
}

function buildFragment(
  block: BlockLineRange,
  sourceBlock: ScreenplayBlock,
  pageIndex: number,
  pageStart: number,
  intersectionStart: number,
  intersectionEnd: number
): ExportBlockFragment {
  const wrappedLines = linesForBlock(sourceBlock)
  const offset = intersectionStart - block.contentStartLine
  const count = intersectionEnd - intersectionStart

  return {
    blockIndex: block.blockIndex,
    type: block.type,
    attrs: block.attrs,
    pageIndex,
    lineInPage: intersectionStart - pageStart,
    lines: wrappedLines.slice(offset, offset + count).map((text, index) => ({
      text,
      lineIndexInBlock: offset + index
    })),
    continuedFromPreviousPage: intersectionStart > block.contentStartLine,
    continuesToNextPage: intersectionEnd < block.endLine
  }
}

export function buildExportPages(
  sceneDoc: Record<string, unknown> | null | undefined
): ExportPagination {
  const sourceBlocks = extractExportBlocks(sceneDoc)
  const snapshot = buildLineGrid(sourceBlocks, LINE_GRID_CONFIG)
  const sourceByIndex = blockByIndex(sourceBlocks)

  const pages: ExportPage[] = snapshot.pages.map((page) => {
    const pageStart = page.pageIndex * PAGE_LINES
    const pageEnd = pageStart + PAGE_LINES
    const fragments: ExportBlockFragment[] = []

    for (const block of snapshot.blocks) {
      const intersectionStart = Math.max(block.contentStartLine, pageStart)
      const intersectionEnd = Math.min(block.endLine, pageEnd)
      if (intersectionStart >= intersectionEnd) continue

      const sourceBlock = sourceByIndex.get(block.blockIndex)
      if (!sourceBlock) continue
      fragments.push(
        buildFragment(
          block,
          sourceBlock,
          page.pageIndex,
          pageStart,
          intersectionStart,
          intersectionEnd
        )
      )
    }

    return {
      pageIndex: page.pageIndex,
      pageNumber: page.pageIndex + 1,
      showPageNumber: page.pageIndex > 0,
      blocks: fragments
    }
  })

  for (const pageBreak of snapshot.pageBreaks) {
    if (!pageBreak.moreContd) continue
    const pageIndex = Math.max(0, Math.floor(pageBreak.lineIndex / PAGE_LINES) - 1)
    const nextPage = pageIndex + 1
    if (pages[pageIndex]) pages[pageIndex].more = '(MORE)'
    if (pages[nextPage]) pages[nextPage].contd = `${pageBreak.moreContd.characterName} (CONT'D)`
  }

  return {
    pages,
    totalPages: pages.length
  }
}
