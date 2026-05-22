import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    transition: {
      setTransition: () => ReturnType
      toggleTransition: () => ReturnType
    }
  }
}

export const Transition = Node.create({
  name: 'transition',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-transition' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-transition' }, 0]
  },

  addCommands() {
    return {
      setTransition:
        () =>
        ({ commands }) => {
          return commands.setNode('transition')
        },
      toggleTransition:
        () =>
        ({ commands }) => {
          return commands.toggleNode('transition', 'general')
        },
    }
  },
})
