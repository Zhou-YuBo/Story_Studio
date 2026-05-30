import type { ScreenplayBlock } from '../line-grid/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textFromNode(node: Record<string, unknown>): string {
  const text = node.text
  if (typeof text === 'string') return text

  const content = node.content
  if (!Array.isArray(content)) return ''
  return content.map((child) => (isRecord(child) ? textFromNode(child) : '')).join('')
}

export function extractExportBlocks(sceneDoc: Record<string, unknown> | null | undefined): ScreenplayBlock[] {
  const content = Array.isArray(sceneDoc?.content) ? sceneDoc.content : []
  let pos = 0

  return content.filter(isRecord).map((node, blockIndex) => {
    const text = textFromNode(node)
    const attrs = isRecord(node.attrs) ? node.attrs : {}
    const nodeSize = Math.max(1, text.length + 2)
    const block: ScreenplayBlock = {
      blockIndex,
      type: typeof node.type === 'string' ? node.type : 'general',
      text,
      attrs,
      pos,
      nodeSize
    }
    pos += nodeSize
    return block
  })
}
