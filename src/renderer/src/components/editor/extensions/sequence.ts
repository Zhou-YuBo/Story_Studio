import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sequence: {
      setSequence: () => ReturnType
      toggleSequence: () => ReturnType
    }
  }
}

export const Sequence = Node.create({
  name: 'sequence',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      actId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-act-id') || '',
        renderHTML: (attrs) => (attrs.actId ? { 'data-act-id': attrs.actId } : {}),
      },
      seqId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-seq-id') || '',
        renderHTML: (attrs) => (attrs.seqId ? { 'data-seq-id': attrs.seqId } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.screenplay-sequence' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'screenplay-sequence' }, 0]
  },

  addCommands() {
    return {
      setSequence:
        () =>
        ({ commands }) => {
          return commands.setNode('sequence')
        },
      toggleSequence:
        () =>
        ({ commands }) => {
          return commands.toggleNode('sequence', 'general')
        },
    }
  },
})
