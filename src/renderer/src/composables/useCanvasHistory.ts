import { ref, computed, type Ref } from 'vue'

interface CanvasSnapshot {
  cards: unknown[]
  edges: unknown[]
  drawings: unknown[]
}

interface CanvasStoreLike {
  cards: Ref<unknown[]>
  edges: Ref<unknown[]>
  drawings: Ref<unknown[]>
  dirty: Ref<boolean>
}

const MAX_STACK_SIZE = 50

export function useCanvasHistory(store: CanvasStoreLike) {
  const undoStack = ref<CanvasSnapshot[]>([])
  let batchSnapshot: CanvasSnapshot | null = null

  function cloneCurrentState(): CanvasSnapshot {
    return {
      cards: JSON.parse(JSON.stringify(store.cards.value)),
      edges: JSON.parse(JSON.stringify(store.edges.value)),
      drawings: JSON.parse(JSON.stringify(store.drawings.value)),
    }
  }

  // 离散操作前调用
  function pushSnapshot() {
    undoStack.value.push(cloneCurrentState())
    if (undoStack.value.length > MAX_STACK_SIZE) {
      undoStack.value.shift()
    }
  }

  // 连续操作开始时调用（如缩放 mousedown）
  function beginBatch() {
    if (!batchSnapshot) {
      batchSnapshot = cloneCurrentState()
    }
  }

  // 连续操作结束时调用（如缩放 mouseup）
  function endBatch() {
    if (batchSnapshot) {
      undoStack.value.push(batchSnapshot)
      batchSnapshot = null
      if (undoStack.value.length > MAX_STACK_SIZE) {
        undoStack.value.shift()
      }
    }
  }

  function undo() {
    const snapshot = undoStack.value.pop()
    if (!snapshot) return
    store.cards.value.splice(0, store.cards.value.length, ...snapshot.cards as any[])
    store.edges.value.splice(0, store.edges.value.length, ...snapshot.edges as any[])
    store.drawings.value.splice(0, store.drawings.value.length, ...snapshot.drawings as any[])
    store.dirty.value = true
  }

  const canUndo = computed(() => undoStack.value.length > 0)

  function clear() {
    undoStack.value = []
    batchSnapshot = null
  }

  return { pushSnapshot, beginBatch, endBatch, undo, canUndo, clear }
}
