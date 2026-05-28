import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { StructureAct, StructureSequence } from '../stores/structure'
import { useEditorBridge } from '../stores/editor-bridge'
import { useLineGridStore } from '../stores/line-grid'
import { useStructureStore } from '../stores/structure'
import { resolveStructureAtLine } from '../components/editor/line-grid/structure-context'

export interface CursorStructureContext {
  active: Ref<boolean>
  currentActId: Ref<string>
  currentSeqId: Ref<string>
  currentLineIndex: Ref<number>
  currentAct: ComputedRef<StructureAct | undefined>
  currentSeq: ComputedRef<StructureSequence | undefined>
}

export function useCursorStructureContext(): CursorStructureContext {
  const bridge = useEditorBridge()
  const lineGrid = useLineGridStore()
  const structureStore = useStructureStore()
  const { snapshot } = storeToRefs(lineGrid)

  const active = ref(false)
  const currentActId = ref('')
  const currentSeqId = ref('')
  const currentLineIndex = ref(-1)

  let cleanupEditorListener: (() => void) | null = null
  let cursorActivated = false

  const currentAct = computed(() =>
    structureStore.acts.find((act) => act.id === currentActId.value),
  )
  const currentSeq = computed(() =>
    currentAct.value?.sequences.find((seq) => seq.id === currentSeqId.value),
  )

  function resetContext(): void {
    cursorActivated = false
    active.value = false
    currentActId.value = ''
    currentSeqId.value = ''
    currentLineIndex.value = -1
  }

  function updateFromEditor(editor: Editor | null): void {
    if (!editor) {
      resetContext()
      return
    }

    const lineIndex = lineGrid.docPosToVisualLineIndex(snapshot.value, editor.state.selection.from)
    const context = resolveStructureAtLine(snapshot.value, lineIndex)

    active.value = true
    currentLineIndex.value = lineIndex
    currentActId.value = context.actId
    currentSeqId.value = context.seqId
  }

  function attachEditor(editor: Editor | null): void {
    if (cleanupEditorListener) {
      cleanupEditorListener()
      cleanupEditorListener = null
    }

    if (!editor) {
      resetContext()
      return
    }

    cursorActivated = false
    const update = () => {
      if (!cursorActivated) return
      updateFromEditor(editor)
    }
    const activateAndUpdate = () => {
      cursorActivated = true
      updateFromEditor(editor)
    }

    const editorDom = editor.view.dom
    editor.on('transaction', update)
    editorDom.addEventListener('pointerdown', activateAndUpdate)
    editorDom.addEventListener('keyup', activateAndUpdate)
    cleanupEditorListener = () => {
      editor.off('transaction', update)
      editorDom.removeEventListener('pointerdown', activateAndUpdate)
      editorDom.removeEventListener('keyup', activateAndUpdate)
    }
    resetContext()
  }

  watch(
    () => bridge.editor,
    (editor) => attachEditor(editor),
    { immediate: true },
  )

  watch(snapshot, () => {
    if (!cursorActivated) return
    updateFromEditor(bridge.editor)
  })

  onBeforeUnmount(() => {
    if (cleanupEditorListener) cleanupEditorListener()
  })

  return {
    active,
    currentActId,
    currentSeqId,
    currentLineIndex,
    currentAct,
    currentSeq,
  }
}
