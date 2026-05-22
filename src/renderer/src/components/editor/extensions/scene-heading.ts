import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneHeading: {
      setSceneHeading: () => ReturnType
      toggleSceneHeading: () => ReturnType
    }
  }
}

export const SceneHeading = Node.create({
  name: 'sceneHeading',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div.screenplay-scene-heading' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-scene-heading' }, 0]
  },

  addCommands() {
    return {
      setSceneHeading:
        () =>
        ({ commands }) => {
          return commands.setNode('sceneHeading')
        },
      toggleSceneHeading:
        () =>
        ({ commands }) => {
          return commands.toggleNode('sceneHeading', 'general')
        },
    }
  },
})
