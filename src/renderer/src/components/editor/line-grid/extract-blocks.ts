import type { Node as PmNode } from '@tiptap/pm/model'
import type { ScreenplayBlock } from './types'

export function extractScreenplayBlocks(doc: PmNode): ScreenplayBlock[] {
  const blocks: ScreenplayBlock[] = []

  doc.forEach((node, offset, index) => {
    blocks.push({
      blockIndex: index,
      type: node.type.name,
      text: node.textContent,
      attrs: { ...node.attrs },
      pos: offset,
      nodeSize: node.nodeSize,
    })
  })

  return blocks
}
