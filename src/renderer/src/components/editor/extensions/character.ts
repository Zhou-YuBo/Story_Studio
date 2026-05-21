import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    character: {
      setCharacter: () => ReturnType
      toggleCharacter: () => ReturnType
    }
  }
}

export const Character = Node.create({
  name: 'character',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-character' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-character' }, 0]
  },

  addCommands() {
    return {
      setCharacter:
        () =>
        ({ commands }) => {
          return commands.setNode('character')
        },
      toggleCharacter:
        () =>
        ({ commands }) => {
          return commands.toggleNode('character', 'paragraph')
        },
    }
  },
})
