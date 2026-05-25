import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'
import { buildLineGrid } from '../line-grid/build-line-grid'
import { LINE_GRID_CONFIG } from '../line-grid/constants'
import { extractScreenplayBlocks } from '../line-grid/extract-blocks'

const pluginKey = new PluginKey('paginationDecoration')

function applyWidgetHeight(el: HTMLElement, heightPx: number): void {
  el.style.height = `${heightPx}px`
  el.style.lineHeight = `${heightPx}px`
}

function createPageBreakWidget(pageNumber: number, heightPx: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-break-line'
  el.dataset.page = String(pageNumber)
  applyWidgetHeight(el, heightPx)
  return el
}

function createMoreWidget(heightPx: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-more'
  el.textContent = '(MORE)'
  applyWidgetHeight(el, heightPx)
  return el
}

function createContdWidget(characterName: string, heightPx: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'page-contd'
  el.textContent = `${characterName} (CONT'D)`
  applyWidgetHeight(el, heightPx)
  return el
}

function buildDecorations(doc: PmNode): DecorationSet {
  const snapshot = buildLineGrid(extractScreenplayBlocks(doc), LINE_GRID_CONFIG)
  const decorations: Decoration[] = []

  for (let i = 0; i < snapshot.pageBreaks.length; i++) {
    const pageBreak = snapshot.pageBreaks[i]
    const block = snapshot.blocks[pageBreak.afterBlockIndex]
    if (!block) continue

    const pageNumber = Math.floor(pageBreak.lineIndex / LINE_GRID_CONFIG.pageLines) + 1
    const breakPos = block.pos + block.nodeSize

    if (pageBreak.moreContd) {
      decorations.push(
        Decoration.widget(breakPos, () => createMoreWidget(pageBreak.moreHeightPx), { side: 1 })
      )
    }

    decorations.push(
      Decoration.widget(
        breakPos,
        () => createPageBreakWidget(pageNumber, pageBreak.pageGapHeightPx),
        {
          side: 1
        }
      )
    )

    const characterName = pageBreak.moreContd?.characterName
    if (characterName) {
      decorations.push(
        Decoration.widget(
          breakPos,
          () => createContdWidget(characterName, pageBreak.contdHeightPx),
          {
            side: 1
          }
        )
      )
    }
  }

  return DecorationSet.create(doc, decorations)
}

export const PaginationDecoration = Extension.create({
  name: 'paginationDecoration',

  addProseMirrorPlugins() {
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
          }
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state) as DecorationSet
          }
        }
      })
    ]
  }
})
