import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    parenthetical: {
      setParenthetical: () => ReturnType
      toggleParenthetical: () => ReturnType
    }
  }
}

export const Parenthetical = Node.create({
  name: 'parenthetical',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-parenthetical' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-parenthetical' }, 0]
  },

  addCommands() {
    return {
      setParenthetical:
        () =>
        ({ commands }) => {
          return commands.setNode('parenthetical')
        },
      toggleParenthetical:
        () =>
        ({ commands }) => {
          return commands.toggleNode('parenthetical', 'general')
        },
    }
  },
})
