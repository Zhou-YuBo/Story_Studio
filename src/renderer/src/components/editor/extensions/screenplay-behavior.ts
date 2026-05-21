import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const pluginKey = new PluginKey('screenplayBehavior')

// 'picker' = 弹出元素选择器 | 'block' = 吞掉按键 | null = 不拦截
// 'SAME' = 换行保持原类型 | 其他字符串 = 换行并切换到该类型
type Transition = 'picker' | 'block' | 'SAME' | null | string

const ENTER: Record<string, { empty: Transition; mid: Transition; end: Transition }> = {
  sceneHeading: { empty: 'picker', mid: 'block', end: 'action' },
  action: { empty: 'picker', mid: 'SAME', end: 'SAME' },
  character: { empty: 'picker', mid: 'block', end: 'dialogue' },
  dialogue: { empty: 'picker', mid: 'SAME', end: 'action' },
  parenthetical: { empty: 'picker', mid: 'block', end: 'dialogue' },
  note: { empty: 'picker', mid: 'SAME', end: 'block' }
}

const TAB: Record<string, { empty: Transition; content: Transition }> = {
  sceneHeading: { empty: 'action', content: null },
  action: { empty: 'character', content: 'SAME' },
  character: { empty: null, content: 'parenthetical' },
  dialogue: { empty: 'parenthetical', content: 'parenthetical' },
  parenthetical: { empty: 'dialogue', content: 'dialogue' },
  note: { empty: null, content: null },
  paragraph: { empty: 'action', content: null }
}

export const ScreenplayBehavior = Extension.create({
  name: 'screenplayBehavior',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleKeyDown(_view, event) {
            if (event.shiftKey || event.ctrlKey || event.metaKey) return false

            const $from = editor.state.selection.$from
            const type = $from.parent.type.name
            const empty = $from.parent.content.size === 0
            const atEnd = $from.parentOffset === $from.parent.content.size

            let transition: Transition = null

            if (event.key === 'Enter') {
              const rule = ENTER[type]
              if (!rule) return false
              transition = empty ? rule.empty : atEnd ? rule.end : rule.mid
            } else if (event.key === 'Tab') {
              event.preventDefault()
              const rule = TAB[type]
              if (!rule) return false
              transition = empty ? rule.empty : rule.content
            } else {
              return false
            }

            if (transition === 'picker') {
              // @ts-expect-error custom event
              editor.emit('empty-enter')
              return true
            }
            if (transition === 'block') return true
            if (transition === null) return false

            if (empty) {
              return editor
                .chain()
                .focus()
                .setNode(transition as string)
                .run()
            }
            if (transition === 'SAME') {
              return editor.chain().focus().splitBlock().run()
            }
            return editor.chain().focus().splitBlock().setNode(transition).run()
          }
        }
      })
    ]
  }
})
