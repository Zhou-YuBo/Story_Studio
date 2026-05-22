import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    castList: {
      setCastList: () => ReturnType
      toggleCastList: () => ReturnType
    }
  }
}

export const CastList = Node.create({
  name: 'castList',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-cast-list' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-cast-list' }, 0]
  },

  addCommands() {
    return {
      setCastList:
        () =>
        ({ commands }) => {
          return commands.setNode('castList')
        },
      toggleCastList:
        () =>
        ({ commands }) => {
          return commands.toggleNode('castList', 'general')
        },
    }
  },
})
