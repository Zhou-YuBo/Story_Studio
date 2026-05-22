import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    endOfAct: {
      setEndOfAct: () => ReturnType
      toggleEndOfAct: () => ReturnType
    }
  }
}

export const EndOfAct = Node.create({
  name: 'endOfAct',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-end-of-act' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-end-of-act' }, 0]
  },

  addCommands() {
    return {
      setEndOfAct:
        () =>
        ({ commands }) => {
          return commands.setNode('endOfAct')
        },
      toggleEndOfAct:
        () =>
        ({ commands }) => {
          return commands.toggleNode('endOfAct', 'general')
        },
    }
  },
})
