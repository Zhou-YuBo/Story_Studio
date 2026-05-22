import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    general: {
      setGeneral: () => ReturnType
      toggleGeneral: () => ReturnType
    }
  }
}

export const General = Node.create({
  name: 'general',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-general' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-general' }, 0]
  },

  addCommands() {
    return {
      setGeneral:
        () =>
        ({ commands }) => {
          return commands.setNode('general')
        },
      toggleGeneral:
        () =>
        ({ commands }) => {
          return commands.toggleNode('general', 'sceneHeading')
        },
    }
  },
})
