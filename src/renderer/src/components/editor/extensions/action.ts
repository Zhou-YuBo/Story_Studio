import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    action: {
      setAction: () => ReturnType
      toggleAction: () => ReturnType
    }
  }
}

export const Action = Node.create({
  name: 'action',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-action' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-action' }, 0]
  },

  addCommands() {
    return {
      setAction:
        () =>
        ({ commands }) => {
          return commands.setNode('action')
        },
      toggleAction:
        () =>
        ({ commands }) => {
          return commands.toggleNode('action', 'paragraph')
        },
    }
  },
})
