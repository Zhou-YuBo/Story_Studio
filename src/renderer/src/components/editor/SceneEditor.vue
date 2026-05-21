<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { ref, onBeforeUnmount, onMounted, watchEffect, nextTick } from 'vue'
import { SceneHeading } from './extensions/scene-heading'
import { Action } from './extensions/action'
import { Character } from './extensions/character'
import { Dialogue } from './extensions/dialogue'
import { Parenthetical } from './extensions/parenthetical'
import { Note } from './extensions/note'
import { ScreenplayBehavior } from './extensions/screenplay-behavior'

const STORAGE_KEY = 'story-studio-scene-doc'

const savedContent = localStorage.getItem(STORAGE_KEY)

const screenplayElements = [
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Note,
]

const editor = useEditor({
  content: savedContent ? JSON.parse(savedContent) : undefined,
  extensions: [StarterKit, ...screenplayElements, ScreenplayBehavior],
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
  { label: '场景', type: 'sceneHeading', shortcut: 'S' },
  { label: '动作', type: 'action', shortcut: 'A' },
  { label: '角色', type: 'character', shortcut: 'C' },
  { label: '对白', type: 'dialogue', shortcut: 'D' },
  { label: '提示', type: 'parenthetical', shortcut: 'P' },
  { label: '注释', type: 'note', shortcut: '4' },
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
    s: 'sceneHeading',
    a: 'action',
    c: 'character',
    d: 'dialogue',
    p: 'parenthetical',
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
    <div class="editor-content">
      <EditorContent :editor="editor" />
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
.scene-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 48px;
  position: relative;
}

.editor-content :deep(.editor-body) {
  outline: none;
  min-height: 100%;
  color: #e0e0e0;
  font-size: 16px;
  line-height: 1.75;
  caret-color: #7aa2f7;
}

.editor-content :deep(.editor-body p) {
  margin: 0 0 0.5em;
}

.editor-content :deep(.editor-body p.is-editor-empty:first-child::before) {
  content: '开始写作...';
  color: #555;
  float: left;
  pointer-events: none;
  height: 0;
}

/* 临时视觉区分 — Step 4 替换为正式剧本排版 */
.editor-content :deep(.screenplay-scene-heading) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
  border-left: 3px solid #7aa2f7;
  color: #7aa2f7;
  font-weight: 700;
  text-transform: uppercase;
}

.editor-content :deep(.screenplay-action) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
}

.editor-content :deep(.screenplay-character) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
  padding-left: 25%;
  color: #e0e0e0;
  font-weight: 700;
  text-transform: uppercase;
}

.editor-content :deep(.screenplay-dialogue) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
  padding-left: 15%;
  padding-right: 25%;
}

.editor-content :deep(.screenplay-parenthetical) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
  padding-left: 20%;
  padding-right: 30%;
  color: #aaa;
  font-style: italic;
}

.editor-content :deep(.screenplay-note) {
  margin: 0 0 0.5em;
  padding: 4px 8px;
  border-left: 3px solid #f0c674;
  color: #f0c674;
  font-style: italic;
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
