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

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.classList.add('screenplay-parenthetical')

      const open = document.createElement('span')
      open.textContent = '('
      open.contentEditable = 'false'

      const contentDOM = document.createElement('span')
      contentDOM.classList.add('parenthetical-content')

      const close = document.createElement('span')
      close.textContent = ')'
      close.contentEditable = 'false'

      dom.append(open, contentDOM, close)

      if (node.content.size === 0) dom.classList.add('is-empty')

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== 'parenthetical') return false
          dom.classList.toggle('is-empty', updatedNode.content.size === 0)
          return true
        },
      }
    }
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
