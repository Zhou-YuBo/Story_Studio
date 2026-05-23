import { Extension } from '@tiptap/core'
import { useBeatStore } from '../../../stores/beat'

function resolveBlockBoundary(doc: import('@tiptap/pm/model').Node, pos: number): number {
  const $pos = doc.resolve(pos)
  if ($pos.depth === 0) return pos
  return $pos.before(1)
}

export const BeatShortcut = Extension.create({
  name: 'beatShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': ({ editor }) => {
        const store = useBeatStore()
        const { from } = editor.state.selection
        const blockStart = resolveBlockBoundary(editor.state.doc, from)
        store.splitCardAtBoundary(blockStart)
        return true
      },
    }
  },
})
