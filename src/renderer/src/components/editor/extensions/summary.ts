import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    summary: {
      setSummary: () => ReturnType
      toggleSummary: () => ReturnType
    }
  }
}

export const Summary = Node.create({
  name: 'summary',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-summary' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-summary' }, 0]
  },

  addCommands() {
    return {
      setSummary:
        () =>
        ({ commands }) => {
          return commands.setNode('summary')
        },
      toggleSummary:
        () =>
        ({ commands }) => {
          return commands.toggleNode('summary', 'general')
        },
    }
  },
})
