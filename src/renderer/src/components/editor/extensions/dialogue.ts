import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dialogue: {
      setDialogue: () => ReturnType
      toggleDialogue: () => ReturnType
    }
  }
}

export const Dialogue = Node.create({
  name: 'dialogue',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-dialogue' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-dialogue' }, 0]
  },

  addCommands() {
    return {
      setDialogue:
        () =>
        ({ commands }) => {
          return commands.setNode('dialogue')
        },
      toggleDialogue:
        () =>
        ({ commands }) => {
          return commands.toggleNode('dialogue', 'general')
        },
    }
  },
})
