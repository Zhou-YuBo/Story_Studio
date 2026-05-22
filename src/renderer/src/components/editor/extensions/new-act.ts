import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    newAct: {
      setNewAct: () => ReturnType
      toggleNewAct: () => ReturnType
    }
  }
}

export const NewAct = Node.create({
  name: 'newAct',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-new-act' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-new-act' }, 0]
  },

  addCommands() {
    return {
      setNewAct:
        () =>
        ({ commands }) => {
          return commands.setNode('newAct')
        },
      toggleNewAct:
        () =>
        ({ commands }) => {
          return commands.toggleNode('newAct', 'general')
        },
    }
  },
})
