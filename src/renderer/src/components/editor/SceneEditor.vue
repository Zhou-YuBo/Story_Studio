<script setup lang="ts">
import { useEditor, EditorContent, type Editor, type EditorEvents } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { storeToRefs } from 'pinia'
import { ref, onBeforeUnmount, onMounted, watch, nextTick, computed } from 'vue'
import { useEditorBridge } from '../../stores/editor-bridge'
import { useLineGridStore } from '../../stores/line-grid'
import { useProjectStore } from '../../stores/project'
import { useStructureSync } from '../../composables/useStructureSync'
import { General } from './extensions/general'
import { SceneHeading } from './extensions/scene-heading'
import { Action } from './extensions/action'
import { Character } from './extensions/character'
import { Dialogue } from './extensions/dialogue'
import { Parenthetical } from './extensions/parenthetical'
import { Transition } from './extensions/transition'
import { Shot } from './extensions/shot'
import { CastList } from './extensions/cast-list'
import { Summary } from './extensions/summary'
import { Note } from './extensions/note'
import { NewAct } from './extensions/new-act'
import { EndOfAct } from './extensions/end-of-act'
import { Sequence } from './extensions/sequence'
import { ScreenplayBehavior } from './extensions/screenplay-behavior'
import { PaginationDecoration } from './extensions/pagination-decoration'
import { SmartType } from './extensions/smart-type'
import { BeatShortcut } from './extensions/beat-shortcut'
import { createSmartTypeState } from './smarttype/state'
import SmartTypeDropdown from './SmartTypeDropdown.vue'
import { LINE_GRID_CONFIG } from './line-grid/constants'

const smartTypeState = createSmartTypeState()
const editorBridge = useEditorBridge()
const lineGridStore = useLineGridStore()
const projectStore = useProjectStore()
const { snapshot } = storeToRefs(lineGridStore)
const scrollRef = ref<HTMLElement | null>(null)

const pageContainerStyle = computed(() => {
  const pageBreakHeight = snapshot.value.pageBreaks.reduce(
    (sum, pageBreak) => sum + pageBreak.heightPx,
    0
  )
  const editorBodyMinHeight =
    snapshot.value.totalPages * LINE_GRID_CONFIG.pageLines * LINE_GRID_CONFIG.lineHeight +
    pageBreakHeight

  return {
    '--editor-body-min-height': `${editorBodyMinHeight}px`
  }
})

const screenplayElements = [
  General,
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  Shot,
  CastList,
  Summary,
  Note,
  NewAct,
  EndOfAct,
  Sequence
]

const defaultContent = { type: 'doc', content: [{ type: 'sceneHeading' }] }

function loadContent(): typeof defaultContent | Record<string, unknown> {
  return projectStore.sceneDoc ?? defaultContent
}

const editor = useEditor({
  content: loadContent(),
  extensions: [
    StarterKit.configure({
      paragraph: false,
      heading: false,
      codeBlock: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      code: false,
      strike: false,
      hardBreak: false
    }),
    ...screenplayElements,
    SmartType.configure({ state: smartTypeState }),
    BeatShortcut,
    ScreenplayBehavior,
    PaginationDecoration
  ],
  editorProps: {
    attributes: {
      class: 'editor-body'
    }
  }
})

useStructureSync(editor)

let saveTimer: ReturnType<typeof setTimeout> | null = null
let updateHandler: ((props: EditorEvents['update']) => void) | null = null
let registeredEditor: Editor | null = null
let isApplyingProjectDoc = false

function detachUpdateHandler(): void {
  if (registeredEditor && updateHandler) {
    registeredEditor.off('update', updateHandler)
  }
  registeredEditor = null
  updateHandler = null
}

watch(
  editor,
  (editorInstance, previousEditor) => {
    if (previousEditor) detachUpdateHandler()
    if (!editorInstance) return

    lineGridStore.rebuild(editorInstance.state.doc)
    updateHandler = ({ editor: e }) => {
      lineGridStore.rebuild(e.state.doc)
      if (isApplyingProjectDoc) return
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        projectStore.setSceneDoc(e.getJSON())
      }, 200)
    }
    editorInstance.on('update', updateHandler)
    registeredEditor = editorInstance
  },
  { immediate: true }
)

watch(
  () => projectStore.sceneDoc,
  (doc) => {
    const editorInstance = editor.value
    if (!editorInstance || !doc || isApplyingProjectDoc) return
    if (JSON.stringify(editorInstance.getJSON()) === JSON.stringify(doc)) return

    isApplyingProjectDoc = true
    try {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      editorInstance.commands.setContent(doc)
      lineGridStore.rebuild(editorInstance.state.doc)
    } finally {
      isApplyingProjectDoc = false
    }
  }
)

onBeforeUnmount(() => {
  detachUpdateHandler()
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (editor.value) {
    projectStore.setSceneDoc(editor.value.getJSON())
    void projectStore.flushSave()
  }
  lineGridStore.reset()
  editorBridge.unregister()
  editor.value?.destroy()
})

const elementButtons = [
  { label: '通用', type: 'general', shortcut: 'G' },
  { label: '场景', type: 'sceneHeading', shortcut: 'S' },
  { label: '动作', type: 'action', shortcut: 'A' },
  { label: '角色', type: 'character', shortcut: 'C' },
  { label: '提示', type: 'parenthetical', shortcut: 'P' },
  { label: '对白', type: 'dialogue', shortcut: 'D' },
  { label: '转场', type: 'transition', shortcut: 'T' },
  { label: '镜头', type: 'shot', shortcut: 'H' },
  { label: '演员表', type: 'castList', shortcut: 'L' },
  { label: '梗概', type: 'summary', shortcut: '0' },
  { label: '批注', type: 'note', shortcut: '4' }
]

function toggleElement(type: string): void {
  if (!editor.value) return
  const cmd =
    `toggle${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof editor.value.commands
  if (typeof editor.value.commands[cmd] === 'function') {
    ;(editor.value.commands[cmd] as () => boolean)()
    editor.value.commands.focus()
  }
  elementPickerVisible.value = false
}

// 元素选择框（空行 Enter 触发）
const elementPickerVisible = ref(false)
const pickerRef = ref<HTMLDivElement | null>(null)
const pickerPosition = ref({ top: 0, left: 0 })
const pickerSelectedIndex = ref(0)

type EditorWithEmptyEnter = Editor & {
  on(event: 'empty-enter', callback: () => void): void
}

function onEmptyEnter(editorInstance: Editor): void {
  const { from } = editorInstance.state.selection
  const coords = editorInstance.view.coordsAtPos(from)
  pickerPosition.value = { top: coords.bottom + 4, left: coords.left }
  pickerSelectedIndex.value = 0
  elementPickerVisible.value = true
  nextTick(() => pickerRef.value?.focus())
}

onMounted(() => {
  if (!editor.value) return
  if (scrollRef.value) {
    editorBridge.register(editor.value, scrollRef.value)
  }
  ;(editor.value as EditorWithEmptyEnter).on('empty-enter', () => onEmptyEnter(editor.value!))
})

function selectElementFromPicker(type: string): void {
  if (!editor.value) return
  editor.value.chain().focus().setNode(type).run()
  elementPickerVisible.value = false
}

function pickerStyle(): { position: 'fixed'; top: string; left: string; zIndex: number } {
  const { top, left } = pickerPosition.value
  return {
    position: 'fixed' as const,
    top: `${Math.max(0, Math.min(top, window.innerHeight - 400))}px`,
    left: `${Math.max(0, Math.min(left, window.innerWidth - 220))}px`,
    zIndex: 1000
  }
}

function onPickerKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    pickerSelectedIndex.value = (pickerSelectedIndex.value + 1) % elementButtons.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    pickerSelectedIndex.value =
      (pickerSelectedIndex.value - 1 + elementButtons.length) % elementButtons.length
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    selectElementFromPicker(elementButtons[pickerSelectedIndex.value].type)
    return
  }
  if (e.key === 'Escape') {
    elementPickerVisible.value = false
    editor.value?.commands.focus()
    return
  }
  const keyMap: Record<string, string> = {
    g: 'general',
    s: 'sceneHeading',
    a: 'action',
    c: 'character',
    p: 'parenthetical',
    d: 'dialogue',
    t: 'transition',
    h: 'shot',
    l: 'castList',
    '0': 'summary',
    '4': 'note'
  }
  const target = keyMap[e.key.toLowerCase()]
  if (target) {
    e.preventDefault()
    selectElementFromPicker(target)
  }
}
</script>

<template>
  <div class="scene-editor">
    <div v-if="editor" class="toolbar">
      <div class="toolbar-group">
        <button
          v-for="btn in elementButtons"
          :key="btn.type"
          :class="{ active: editor.isActive(btn.type) }"
          @click="toggleElement(btn.type)"
          :title="btn.label"
          class="element-btn"
        >
          {{ btn.label }}
        </button>
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <button
          :class="{ active: editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
          title="加粗"
        >
          B
        </button>
        <button
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
          title="斜体"
        >
          I
        </button>
      </div>
    </div>
    <div class="editor-scroll scrollbar-editor" ref="scrollRef">
      <div class="page-container" :style="pageContainerStyle">
        <EditorContent :editor="editor" />
      </div>
      <!-- 元素选择框 -->
      <Teleport to="body">
        <div
          v-if="elementPickerVisible"
          class="element-picker scrollbar-floating"
          :style="pickerStyle()"
          @click.stop
          @mousedown.prevent
          @keydown="onPickerKeydown"
          tabindex="0"
          ref="pickerRef"
        >
          <div
            v-for="(btn, i) in elementButtons"
            :key="btn.type"
            :class="['picker-item', { selected: i === pickerSelectedIndex }]"
            @mouseenter="pickerSelectedIndex = i"
            @click="selectElementFromPicker(btn.type)"
          >
            <span class="picker-shortcut">{{ btn.shortcut }}</span>
            <span class="picker-label">{{ btn.label }}</span>
          </div>
        </div>
      </Teleport>
    </div>
    <SmartTypeDropdown :state="smartTypeState" />
  </div>
</template>

<style scoped>
.scene-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #1a1a1a;
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #444;
  margin: 0 6px;
}

.toolbar button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #444;
  border-radius: 4px;
  background: transparent;
  color: #ccc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  white-space: nowrap;
}

.toolbar button:hover {
  background: #333;
  color: #fff;
}

.toolbar button.active {
  background: #4a5568;
  color: #fff;
  border-color: #666;
}

/* 编辑区域：滚动容器 */
.editor-scroll {
  flex: 1;
  overflow: auto;
  background: #2a2a2a;
  padding: 20px 0;
}

/* 白色页面容器 */
.page-container {
  box-sizing: border-box;
  width: var(--page-width);
  min-height: var(--page-height);
  background: var(--page-background);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  padding: var(--page-padding-top) var(--page-padding-right) var(--page-padding-bottom)
    var(--page-padding-left);
}

/* 编辑器主体 */
.page-container :deep(.editor-body) {
  outline: none;
  min-height: var(--editor-body-min-height);
  font-family: var(--font-family-screenplay);
  font-size: var(--font-size-screenplay);
  line-height: var(--line-height);
  color: #000;
  caret-color: #1a1a1a;
}

.page-container :deep(.editor-body p) {
  margin: 0;
  line-height: var(--line-height);
}

.page-container :deep(.editor-body .screenplay-scene-heading.is-editor-empty:first-child::before) {
  content: 'INT. / EXT. ...';
  color: #999;
  float: left;
  pointer-events: none;
  height: 0;
  text-transform: uppercase;
}

/* ===== 剧本元素真实排版 ===== */

.page-container :deep(.screenplay-scene-heading) {
  margin: var(--margin-sceneHeading) 0 0;
  text-transform: uppercase;
  font-weight: 700;
  line-height: var(--line-height);
}
.page-container :deep(.screenplay-scene-heading:first-child),
.page-container :deep(.screenplay-new-act:first-child),
.page-container :deep(.screenplay-sequence:first-child) {
  margin-top: 0;
}

.page-container :deep(.screenplay-action) {
  margin: var(--margin-action) 0 0;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-character) {
  margin: var(--margin-character) 0 0;
  padding-left: var(--pad-left-character);
  text-transform: uppercase;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-dialogue) {
  margin: 0;
  padding-left: var(--pad-left-dialogue);
  padding-right: var(--pad-right-dialogue);
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-parenthetical) {
  margin: 0;
  padding-left: var(--pad-left-parenthetical);
  padding-right: var(--pad-right-parenthetical);
  font-style: italic;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-parenthetical.is-empty) {
  display: flex;
  align-items: baseline;
}

.page-container :deep(.screenplay-parenthetical.is-empty .parenthetical-content) {
  flex: 0;
  min-width: 1px;
}

.page-container :deep(.screenplay-transition) {
  margin: var(--margin-transition) 0 0;
  text-align: right;
  text-transform: uppercase;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-general) {
  margin: 0;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-shot) {
  margin: var(--margin-shot) 0 0;
  text-transform: uppercase;
  font-weight: 700;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-cast-list) {
  margin: var(--margin-castList) 0 0;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-summary) {
  margin: var(--margin-summary) 0 0;
  padding-left: var(--pad-left-summary);
  padding-right: var(--pad-right-summary);
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-note) {
  margin: 0;
  padding-left: var(--pad-left-note);
  padding-right: var(--pad-right-note);
  font-style: italic;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-new-act) {
  margin: var(--margin-newAct) 0 0;
  text-align: center;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: underline;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-end-of-act) {
  margin: var(--margin-endOfAct) 0 0;
  text-align: center;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: underline;
  line-height: var(--line-height);
}

.page-container :deep(.screenplay-sequence) {
  margin: var(--margin-sequence) 0 0;
  text-align: center;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: underline;
  line-height: var(--line-height);
}

/* 分页标记 */
.page-container :deep(.page-break-widget) {
  margin: 0 calc(-1 * var(--page-padding-right)) 0 calc(-1 * var(--page-padding-left));
}

.page-container :deep(.page-break-space) {
  background: var(--page-background);
}

.page-container :deep(.page-break-line) {
  border-top: 0;
  position: relative;
  background: var(--page-gap-bg);
}
.page-container :deep(.page-break-line)::after {
  content: attr(data-page) '.';
  position: absolute;
  right: 0;
  top: -18px;
  font-size: var(--page-number-font-size);
  color: #999;
  font-family: var(--font-family-screenplay);
}

.page-container :deep(.page-more) {
  text-align: center;
  color: #999;
  padding-left: var(--pad-left-dialogue);
  padding-right: var(--pad-right-dialogue);
}

.page-container :deep(.page-contd) {
  text-align: left;
  color: #999;
  padding-left: var(--pad-left-character);
  text-transform: uppercase;
}

/* 元素选择框 */
.element-picker {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 2px 0;
  min-width: 140px;
  overflow-y: auto;
  outline: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 3px 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #ddd;
  font-size: 11px;
  cursor: pointer;
}

.picker-item.selected {
  background: #333;
  color: #fff;
}

.picker-item:hover {
  background: #2a2a3e;
}

.picker-shortcut {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #555;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #7aa2f7;
  flex-shrink: 0;
}

.picker-label {
  flex: 1;
  text-align: left;
}
</style>
