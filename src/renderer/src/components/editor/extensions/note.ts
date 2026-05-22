import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    note: {
      setNote: () => ReturnType
      toggleNote: () => ReturnType
    }
  }
}

export const Note = Node.create({
  name: 'note',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-note' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-note' }, 0]
  },

  addCommands() {
    return {
      setNote:
        () =>
        ({ commands }) => {
          return commands.setNode('note')
        },
      toggleNote:
        () =>
        ({ commands }) => {
          return commands.toggleNode('note', 'general')
        },
    }
  },
})
