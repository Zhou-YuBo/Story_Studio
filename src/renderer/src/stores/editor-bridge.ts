import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export const useEditorBridge = defineStore('editorBridge', () => {
  const editor = shallowRef<Editor | null>(null)
  const scrollEl = shallowRef<HTMLElement | null>(null)

  function register(e: Editor, scroll: HTMLElement) {
    editor.value = e
    scrollEl.value = scroll
  }

  function unregister() {
    editor.value = null
    scrollEl.value = null
  }

  return { editor, scrollEl, register, unregister }
})
