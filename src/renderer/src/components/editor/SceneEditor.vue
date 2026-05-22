<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { ref, onBeforeUnmount, onMounted, watchEffect, nextTick } from 'vue'
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

const STORAGE_KEY = 'story-studio-scene-doc'

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
  Sequence,
]

const defaultContent = { type: 'doc', content: [{ type: 'sceneHeading' }] }

function loadContent() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultContent
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return defaultContent
  }
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
      hardBreak: false,
    }),
    ...screenplayElements,
    ScreenplayBehavior,
    PaginationDecoration
  ],
  editorProps: {
    attributes: {
      class: 'editor-body',
    },
  },
})

let saveTimer: ReturnType<typeof setTimeout> | null = null

watchEffect(() => {
  if (!editor.value) return
  editor.value.on('update', ({ editor: e }) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(e.getJSON()))
    }, 200)
  })
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
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
  { label: '批注', type: 'note', shortcut: '4' },
]

function toggleElement(type: string) {
  if (!editor.value) return
  const cmd = `toggle${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof editor.value.commands
  if (typeof editor.value.commands[cmd] === 'function') {
    ;(editor.value.commands[cmd] as () => boolean)()
    editor.value.commands.focus()
  }
  elementPickerVisible.value = false
}

// 元素选择框（空行 Enter 触发）
const elementPickerVisible = ref(false)
const pickerRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (!editor.value) return
  editor.value.on('empty-enter' as any, () => {
    elementPickerVisible.value = true
    nextTick(() => {
      pickerRef.value?.focus()
    })
  })
})

function selectElementFromPicker(type: string) {
  if (!editor.value) return
  editor.value.chain().focus().setNode(type).run()
  elementPickerVisible.value = false
}

function onPickerKeydown(e: KeyboardEvent) {
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
    '4': 'note',
  }
  const target = keyMap[e.key.toLowerCase()]
  if (target) {
    e.preventDefault()
    selectElementFromPicker(target)
  } else if (e.key === 'Escape') {
    elementPickerVisible.value = false
    editor.value?.commands.focus()
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
    <div class="editor-scroll">
      <div class="page-container">
        <EditorContent :editor="editor" />
      </div>
      <!-- 元素选择框 -->
      <Teleport to="body">
        <div
          v-if="elementPickerVisible"
          class="element-picker-overlay"
          @click="elementPickerVisible = false"
        >
          <div class="element-picker" @click.stop @keydown="onPickerKeydown" tabindex="0" ref="pickerRef">
            <div class="picker-title">Elements</div>
            <button
              v-for="btn in elementButtons"
              :key="btn.type"
              class="picker-item"
              @click="selectElementFromPicker(btn.type)"
            >
              <span class="picker-shortcut">{{ btn.shortcut }}</span>
              <span class="picker-label">{{ btn.label }}</span>
            </button>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Courier Prime';
  src: url('@/assets/fonts/CourierPrime-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Courier Prime';
  src: url('@/assets/fonts/CourierPrime-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Courier Prime';
  src: url('@/assets/fonts/CourierPrime-Italic.ttf') format('truetype');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'Courier Prime';
  src: url('@/assets/fonts/CourierPrime-BoldItalic.ttf') format('truetype');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}

.scene-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid #333;
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

/* 编辑区域：暗色背景滚动容器 */
.editor-scroll {
  flex: 1;
  overflow-y: auto;
  background: #2a2a2a;
  padding: 40px 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* 白色页面容器 */
.page-container {
  width: 8.5in;
  min-height: 11in;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  padding: 1in 1in 1in 1.5in;
  flex-shrink: 0;
}

/* 编辑器主体 */
.page-container :deep(.editor-body) {
  outline: none;
  min-height: 9in;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 12pt;
  line-height: 16px;
  color: #000;
  caret-color: #1a1a1a;
}

.page-container :deep(.editor-body p) {
  margin: 0;
  line-height: 16px;
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
  margin: 32px 0 0;
  text-transform: uppercase;
  font-weight: 700;
  line-height: 16px;
}
.page-container :deep(.screenplay-scene-heading:first-child) {
  margin-top: 0;
}

.page-container :deep(.screenplay-action) {
  margin: 16px 0 0;
  line-height: 16px;
}

.page-container :deep(.screenplay-character) {
  margin: 16px 0 0;
  padding-left: 211px;
  text-transform: uppercase;
  line-height: 16px;
}

.page-container :deep(.screenplay-dialogue) {
  margin: 0;
  padding-left: 96px;
  padding-right: 144px;
  line-height: 16px;
}

.page-container :deep(.screenplay-parenthetical) {
  margin: 0;
  padding-left: 154px;
  padding-right: 182px;
  font-style: italic;
  line-height: 16px;
}

.page-container :deep(.screenplay-transition) {
  margin: 16px 0 0;
  text-align: right;
  text-transform: uppercase;
  line-height: 16px;
}

.page-container :deep(.screenplay-general) {
  margin: 0;
  line-height: 16px;
}

.page-container :deep(.screenplay-shot) {
  margin: 16px 0 0;
  text-transform: uppercase;
  font-weight: 700;
  line-height: 16px;
}

.page-container :deep(.screenplay-cast-list) {
  margin: 16px 0 0;
  line-height: 16px;
}

.page-container :deep(.screenplay-summary) {
  margin: 16px 0 0;
  padding-left: 96px;
  padding-right: 48px;
  line-height: 16px;
}

.page-container :deep(.screenplay-note) {
  margin: 0;
  padding-left: 96px;
  padding-right: 48px;
  font-style: italic;
  line-height: 16px;
}

.page-container :deep(.screenplay-new-act),
.page-container :deep(.screenplay-end-of-act),
.page-container :deep(.screenplay-sequence) {
  margin: 16px 0 0;
  text-align: center;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: underline;
  line-height: 16px;
}

/* 分页标记 */
.page-container :deep(.page-break-line) {
  height: 0;
  border-top: 1px dashed #ccc;
  margin: 24px -1in 24px -1.5in;
  position: relative;
}
.page-container :deep(.page-break-line)::after {
  content: attr(data-page) '.';
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 10pt;
  color: #999;
  font-family: 'Courier Prime', 'Courier New', monospace;
}

.page-container :deep(.page-more) {
  text-align: center;
  color: #999;
  line-height: 16px;
  padding-left: 96px;
  padding-right: 144px;
}

.page-container :deep(.page-contd) {
  text-align: left;
  color: #999;
  line-height: 16px;
  padding-left: 211px;
  text-transform: uppercase;
}

/* 元素选择框 */
.element-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.element-picker {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  outline: none;
}

.picker-title {
  font-size: 14px;
  font-weight: 700;
  color: #888;
  margin-bottom: 8px;
  text-align: center;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #ddd;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.picker-item:hover {
  background: #333;
}

.picker-shortcut {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #555;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #7aa2f7;
  flex-shrink: 0;
}

.picker-label {
  flex: 1;
  text-align: left;
}
</style>
