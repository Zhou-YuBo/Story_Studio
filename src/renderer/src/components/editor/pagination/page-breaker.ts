import type { Block, PageBreakInfo, PaginationResult } from './types'
import { PAGE_LINES, ELEMENT_CONFIG } from './constants'
import { countTextLines } from './line-counter'

function getBlockLines(block: Block): number {
  const config = ELEMENT_CONFIG[block.type] || ELEMENT_CONFIG.general
  return countTextLines(block.text, config.charsPerLine)
}

function getMarginTop(block: Block, isFirstOnPage: boolean): number {
  const config = ELEMENT_CONFIG[block.type] || ELEMENT_CONFIG.general
  if (isFirstOnPage && config.isFirstNoMargin) return 0
  if (isFirstOnPage) return 0
  return config.marginTopLines
}

function findCharacterName(blocks: Block[], dialogueIndex: number): string {
  for (let i = dialogueIndex - 1; i >= 0; i--) {
    if (blocks[i].type === 'character') return blocks[i].text
    if (blocks[i].type !== 'parenthetical' && blocks[i].type !== 'dialogue') break
  }
  return ''
}

export function paginate(blocks: Block[]): PaginationResult {
  if (blocks.length === 0) return { pageBreaks: [], totalPages: 1 }

  const pageBreaks: PageBreakInfo[] = []
  let currentLine = 0
  let isFirstOnPage = true

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const marginTop = getMarginTop(block, isFirstOnPage)
    const contentLines = getBlockLines(block)
    const totalNeeded = marginTop + contentLines

    if (currentLine + totalNeeded <= PAGE_LINES) {
      currentLine += totalNeeded
      isFirstOnPage = false
      continue
    }

    // --- 需要断页 ---
    const remaining = PAGE_LINES - currentLine

    // 规则 1: Scene Heading 不做孤行
    if (block.type === 'sceneHeading') {
      pageBreaks.push({ afterBlockIndex: i - 1, linesUsed: currentLine })
      currentLine = contentLines
      isFirstOnPage = false
      continue
    }

    // 规则 2: Character 不落页底（至少能放 character + 1 行 dialogue）
    if (block.type === 'character') {
      const minNeeded = marginTop + contentLines + 1
      if (remaining < minNeeded) {
        pageBreaks.push({ afterBlockIndex: i - 1, linesUsed: currentLine })
        currentLine = contentLines
        isFirstOnPage = false
        continue
      }
    }

    // 规则 3: Dialogue 跨页续接
    if (block.type === 'dialogue' && contentLines > 1) {
      const availForDialogue = remaining - marginTop - 1
      if (availForDialogue >= 1) {
        const characterName = findCharacterName(blocks, i)
        pageBreaks.push({
          afterBlockIndex: i,
          linesUsed: PAGE_LINES,
          moreContd: {
            characterName,
            splitAtLine: availForDialogue,
          },
        })
        const remainingDialogueLines = contentLines - availForDialogue
        currentLine = 1 + remainingDialogueLines
        isFirstOnPage = false
        continue
      }
    }

    // 默认：在上一个 block 之后断页
    pageBreaks.push({ afterBlockIndex: i - 1, linesUsed: currentLine })
    currentLine = totalNeeded
    isFirstOnPage = false
  }

  return {
    pageBreaks,
    totalPages: pageBreaks.length + 1,
  }
}
