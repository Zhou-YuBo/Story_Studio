import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    shot: {
      setShot: () => ReturnType
      toggleShot: () => ReturnType
    }
  }
}

export const Shot = Node.create({
  name: 'shot',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-shot' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-shot' }, 0]
  },

  addCommands() {
    return {
      setShot:
        () =>
        ({ commands }) => {
          return commands.setNode('shot')
        },
      toggleShot:
        () =>
        ({ commands }) => {
          return commands.toggleNode('shot', 'general')
        },
    }
  },
})
