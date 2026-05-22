import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'
import type { Block } from '../pagination/types'
import { paginate } from '../pagination/page-breaker'

const pluginKey = new PluginKey('paginationDecoration')

function extractBlocks(doc: PmNode): Block[] {
  const blocks: Block[] = []
  doc.forEach((node, offset) => {
    blocks.push({
      type: node.type.name,
      text: node.textContent,
      pos: offset,
      nodeSize: node.nodeSize,
    })
  })
  return blocks
}

function createPageBreakWidget(pageNumber: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-break-line'
  el.dataset.page = String(pageNumber)
  return el
}

function createMoreWidget(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-more'
  el.textContent = '(MORE)'
  return el
}

function createContdWidget(characterName: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-contd'
  el.textContent = `${characterName} (CONT'D)`
  return el
}

function buildDecorations(doc: PmNode): DecorationSet {
  const blocks = extractBlocks(doc)
  const result = paginate(blocks)
  const decorations: Decoration[] = []

  for (let i = 0; i < result.pageBreaks.length; i++) {
    const pb = result.pageBreaks[i]
    const pageNumber = i + 2

    if (pb.moreContd) {
      const block = blocks[pb.afterBlockIndex]
      if (block) {
        const breakPos = block.pos + block.nodeSize
        decorations.push(
          Decoration.widget(breakPos, () => createMoreWidget(), { side: 1 }),
        )
        decorations.push(
          Decoration.widget(breakPos, () => createPageBreakWidget(pageNumber), { side: 1 }),
        )
        if (pb.moreContd.characterName) {
          decorations.push(
            Decoration.widget(breakPos, () => createContdWidget(pb.moreContd!.characterName), { side: 1 }),
          )
        }
      }
    } else {
      const blockIndex = pb.afterBlockIndex
      if (blockIndex >= 0 && blockIndex < blocks.length) {
        const block = blocks[blockIndex]
        const breakPos = block.pos + block.nodeSize
        decorations.push(
          Decoration.widget(breakPos, () => createPageBreakWidget(pageNumber), { side: 1 }),
        )
      }
    }
  }

  return DecorationSet.create(doc, decorations)
}

export const PaginationDecoration = Extension.create({
  name: 'paginationDecoration',

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc)
          },
          apply(tr, oldDecoSet) {
            if (!tr.docChanged) return oldDecoSet.map(tr.mapping, tr.doc)
            return buildDecorations(tr.doc)
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})
