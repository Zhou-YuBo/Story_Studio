import { Extension } from '@tiptap/core'
import { useBeatStore } from '../../../stores/beat'
import { useLineGridStore } from '../../../stores/line-grid'

export const BeatShortcut = Extension.create({
  name: 'beatShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': ({ editor }) => {
        const store = useBeatStore()
        const lineGrid = useLineGridStore()
        const { from } = editor.state.selection
        const snapshot = lineGrid.rebuild(editor.state.doc)
        const lineIndex = lineGrid.docPosToVisualLineIndex(snapshot, from)
        const sequence = store.sequenceForGap(lineIndex)
        if (!sequence) return true

        store.addBeatBoundaryAtLineGap(sequence.seqId, lineIndex)
        return true
      },
    }
  },
})
