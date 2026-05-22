import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { SmartTypeState } from '../smarttype/types'
import { openSmartType, closeSmartType, moveSelection } from '../smarttype/state'
import { SCENE_HEADING_PREFIXES, TRANSITIONS_LIST, TIMES } from '../smarttype/constants'
import { scanCharacterNames, scanLocationNames } from '../smarttype/scanner'

const pluginKey = new PluginKey('smartType')

const ELIGIBLE_TYPES = new Set(['sceneHeading', 'character', 'transition'])

function getCursorPosition(view: EditorView): { top: number; left: number } {
  const { from } = view.state.selection
  const coords = view.coordsAtPos(from)
  return { top: coords.bottom + 4, left: coords.left }
}

function getItemsForElement(
  elementType: string,
  doc: import('@tiptap/pm/model').Node,
): string[] {
  switch (elementType) {
    case 'sceneHeading':
      return [...SCENE_HEADING_PREFIXES]
    case 'character':
      return scanCharacterNames(doc)
    case 'transition':
      return [...TRANSITIONS_LIST]
    default:
      return []
  }
}

export const SmartType = Extension.create<{ state: SmartTypeState }>({
  name: 'smartType',
  priority: 200,

  addOptions() {
    return {
      state: null as unknown as SmartTypeState,
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const state = this.options.state
    let skipNextUpdate = false

    return [
      new Plugin({
        key: pluginKey,

        props: {
          handleKeyDown(_view, event) {
            if (event.ctrlKey || event.metaKey) return false

            const $from = editor.state.selection.$from
            const nodeType = $from.parent.type.name
            const empty = $from.parent.content.size === 0
            const text = $from.parent.textContent
            const atEnd = $from.parentOffset === $from.parent.content.size

            // --- SmartType 打开时拦截 ---
            if (state.visible) {
              if (event.key === 'Escape') {
                closeSmartType(state)
                return true
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                moveSelection(state, 1)
                return true
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                moveSelection(state, -1)
                return true
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault()
                if (state.filtered.length > 0 && state.confirm) {
                  state.confirm()
                }
                return true
              }
              return false
            }

            // --- SmartType 关闭时：检查触发条件 ---

            // Space 空行触发
            if (event.key === ' ' && !event.shiftKey && empty && ELIGIBLE_TYPES.has(nodeType)) {
              const items = getItemsForElement(nodeType, editor.state.doc)
              if (items.length === 0) return false
              const pos = getCursorPosition(_view)
              openSmartType(state, items, pos, nodeType, 'space')
              bindConfirm(state, editor, skipNextUpdate, (skip) => {
                skipNextUpdate = skip
              })
              return true
            }

            // Tab 链触发：sceneHeading 行尾
            if (event.key === 'Tab' && !event.shiftKey && nodeType === 'sceneHeading' && !empty && atEnd) {
              const phase = parseSceneHeadingPhase(text)
              if (phase === 'no-prefix') return false

              event.preventDefault()

              if (phase === 'prefix-only') {
                // 确保有空格后显示地名列表
                if (!text.endsWith(' ')) {
                  editor.view.dispatch(editor.state.tr.insertText(' '))
                }
                const locations = scanLocationNames(editor.state.doc)
                if (locations.length === 0) return true
                openSmartType(state, locations, getCursorPosition(_view), 'sceneHeading', 'tab-chain', 'location')
                bindConfirm(state, editor, skipNextUpdate, (skip) => {
                  skipNextUpdate = skip
                })
                return true
              }

              if (phase === 'has-location') {
                // 追加 " - " 后显示时间列表
                editor.view.dispatch(editor.state.tr.insertText(' - '))
                openSmartType(state, [...TIMES], getCursorPosition(_view), 'sceneHeading', 'tab-chain', 'time')
                bindConfirm(state, editor, skipNextUpdate, (skip) => {
                  skipNextUpdate = skip
                })
                return true
              }

              if (phase === 'has-dash') {
                openSmartType(state, [...TIMES], getCursorPosition(_view), 'sceneHeading', 'tab-chain', 'time')
                bindConfirm(state, editor, skipNextUpdate, (skip) => {
                  skipNextUpdate = skip
                })
                return true
              }

              if (phase === 'complete') {
                editor.chain().focus().splitBlock().setNode('action').run()
                return true
              }

              return false
            }

            return false
          },
        },

        view() {
          return {
            update(view, prevState) {
              if (skipNextUpdate) {
                skipNextUpdate = false
                return
              }
              if (prevState.doc.eq(view.state.doc) && prevState.selection.eq(view.state.selection))
                return

              const $from = view.state.selection.$from
              const nodeType = $from.parent.type.name

              if (state.visible && nodeType !== state.elementType) {
                closeSmartType(state)
                return
              }

              if (!prevState.doc.eq(view.state.doc) && ELIGIBLE_TYPES.has(nodeType)) {
                const text = $from.parent.textContent
                const empty = $from.parent.content.size === 0

                if (state.visible && state.chainStep) {
                  // 多步链内过滤
                  const query = extractChainQuery(text, state.chainStep)
                  const q = query.trim().toUpperCase()
                  state.filtered = q
                    ? state.items.filter((item) => item.toUpperCase().startsWith(q))
                    : [...state.items]
                  state.selectedIndex = 0
                  state.position = getCursorPosition(view)
                  return
                }

                // 删除至空
                if (empty && (nodeType === 'character' || nodeType === 'transition')) {
                  const items = getItemsForElement(nodeType, view.state.doc)
                  if (items.length > 0) {
                    openSmartType(
                      state,
                      items,
                      getCursorPosition(view),
                      nodeType,
                      'delete-to-empty',
                    )
                    bindConfirm(state, editor, skipNextUpdate, (skip) => {
                      skipNextUpdate = skip
                    })
                  }
                  return
                }

                // 输入匹配
                if (!empty && !state.visible) {
                  const items = getItemsForElement(nodeType, view.state.doc)
                  const q = text.trim().toUpperCase()
                  const filtered = items.filter((item) => item.toUpperCase().startsWith(q))
                  if (filtered.length > 0) {
                    openSmartType(
                      state,
                      items,
                      getCursorPosition(view),
                      nodeType,
                      'input',
                    )
                    state.filtered = filtered
                    bindConfirm(state, editor, skipNextUpdate, (skip) => {
                      skipNextUpdate = skip
                    })
                  }
                } else if (!empty && state.visible && !state.chainStep) {
                  // 已打开，更新过滤
                  const q = text.trim().toUpperCase()
                  state.filtered = state.items.filter((item) => item.toUpperCase().startsWith(q))
                  state.selectedIndex = 0
                  state.position = getCursorPosition(view)
                  if (state.filtered.length === 0) {
                    closeSmartType(state)
                  }
                }
              }
            },
          }
        },
      }),
    ]
  },
})

function extractChainQuery(text: string, step: 'location' | 'time'): string {
  const prefixMatch = text.match(/^(?:INT\.|EXT\.|I\/E\.)\s*/i)
  if (!prefixMatch) return ''

  if (step === 'location') {
    return text.substring(prefixMatch[0].length)
  }
  if (step === 'time') {
    const dashIndex = text.indexOf(' - ', prefixMatch[0].length)
    if (dashIndex === -1) return ''
    return text.substring(dashIndex + 3)
  }
  return ''
}

type SceneHeadingPhase = 'no-prefix' | 'prefix-only' | 'has-location' | 'has-dash' | 'complete'

function parseSceneHeadingPhase(text: string): SceneHeadingPhase {
  const match = text.match(/^(INT\.|EXT\.|I\/E\.)\s*(.*)/i)
  if (!match) return 'no-prefix'
  const rest = match[2]
  if (!rest) return 'prefix-only'
  const dashIndex = rest.indexOf(' - ')
  if (dashIndex === -1) return 'has-location'
  const afterDash = rest.substring(dashIndex + 3).trim()
  if (!afterDash) return 'has-dash'
  return 'complete'
}

const ENTER_END_TRANSITIONS: Record<string, string> = {
  character: 'dialogue',
  transition: 'sceneHeading',
}

function bindConfirm(
  state: SmartTypeState,
  editor: import('@tiptap/core').Editor,
  _skipNextUpdate: boolean,
  setSkip: (v: boolean) => void,
) {
  state.confirm = () => {
    const selected = state.filtered[state.selectedIndex]
    if (!selected) return

    const elementType = state.elementType
    const chainStep = state.chainStep

    setSkip(true)

    // 替换当前节点内容
    const { $from } = editor.state.selection
    const nodeStart = $from.start()
    const nodeEnd = $from.end()

    if (chainStep === 'location') {
      // 链 location 步骤：填地名 + " - " → 切换到 time
      const prefixMatch = $from.parent.textContent.match(/^((?:INT\.|EXT\.|I\/E\.)\s*)/i)
      const prefix = prefixMatch ? prefixMatch[0] : ''
      const newText = prefix + selected + ' - '
      editor.view.dispatch(
        editor.state.tr.insertText(newText, nodeStart, nodeEnd),
      )
      // 切换到时间列表
      state.items = [...TIMES]
      state.filtered = [...TIMES]
      state.selectedIndex = 0
      state.chainStep = 'time'
      state.position = getCursorPosition(editor.view)
      return
    }

    if (chainStep === 'time') {
      // 链 time 步骤：填时间 → 换行到 action
      const prefixMatch = $from.parent.textContent.match(
        /^((?:INT\.|EXT\.|I\/E\.)\s+.+?\s+-\s*)/i,
      )
      const before = prefixMatch ? prefixMatch[0] : $from.parent.textContent
      const newText = before + selected
      editor.view.dispatch(
        editor.state.tr.insertText(newText, nodeStart, nodeEnd),
      )
      closeSmartType(state)
      setTimeout(() => {
        editor.chain().focus().splitBlock().setNode('action').run()
      }, 0)
      return
    }

    // 普通确认
    editor.view.dispatch(
      editor.state.tr.insertText(selected, nodeStart, nodeEnd),
    )

    const postTransition = ENTER_END_TRANSITIONS[elementType]
    if (postTransition) {
      closeSmartType(state)
      setTimeout(() => {
        editor.chain().focus().splitBlock().setNode(postTransition).run()
      }, 0)
    } else {
      closeSmartType(state)
    }
  }
}
