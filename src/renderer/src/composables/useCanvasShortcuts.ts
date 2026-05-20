import type { ComputedRef } from 'vue'

export interface CanvasShortcutsOptions {
  getSelectedNodes: ComputedRef<Array<{ id: string }>>
  getSelectedEdges: ComputedRef<Array<{ id: string }>>
  removeCard: (id: string) => void
  removeEdge: (id: string) => void
  undo: () => void
  pushSnapshot: () => void
  onF2?: () => void
}

export function useCanvasShortcuts(options: CanvasShortcutsOptions) {
  const { getSelectedNodes, getSelectedEdges, removeCard, removeEdge, undo, pushSnapshot, onF2 } =
    options

  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const nodes = getSelectedNodes.value
      const edges = getSelectedEdges.value

      if (nodes.length > 0) {
        pushSnapshot()
        for (const n of nodes) removeCard(n.id)
        e.preventDefault()
      } else if (edges.length > 0) {
        pushSnapshot()
        for (const ed of edges) removeEdge(ed.id)
        e.preventDefault()
      }
    }

    if (e.key === 'F2' && onF2) {
      e.preventDefault()
      onF2()
    }
  }

  return { onKeyDown }
}
