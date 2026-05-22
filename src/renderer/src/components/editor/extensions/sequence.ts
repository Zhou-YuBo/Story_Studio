import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sequence: {
      setSequence: () => ReturnType
      toggleSequence: () => ReturnType
    }
  }
}

export const Sequence = Node.create({
  name: 'sequence',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-sequence' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-sequence' }, 0]
  },

  addCommands() {
    return {
      setSequence:
        () =>
        ({ commands }) => {
          return commands.setNode('sequence')
        },
      toggleSequence:
        () =>
        ({ commands }) => {
          return commands.toggleNode('sequence', 'general')
        },
    }
  },
})
