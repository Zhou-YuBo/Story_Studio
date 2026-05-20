import { reactive, computed, onUnmounted, type Ref } from 'vue'
import type { BaseCard } from '../types/canvas'

export interface RightClickConnectOptions {
  cards: Ref<BaseCard[]>
  findNode: (id: string) => any
  screenToFlowCoordinate: (pos: { x: number; y: number }) => { x: number; y: number }
  onConnect: (sourceId: string, targetId: string) => void
  onContextMenu: (targetId: string, type: 'node' | 'edge', x: number, y: number) => void
  defaultCardSize?: { width: number; height: number }
  dragThreshold?: number
}

export function useRightClickConnect(options: RightClickConnectOptions) {
  const {
    cards,
    findNode,
    screenToFlowCoordinate,
    onConnect,
    onContextMenu,
    defaultCardSize = { width: 220, height: 120 },
    dragThreshold = 5,
  } = options

  const connectLine = reactive({
    active: false,
    sourceX: 0,
    sourceY: 0,
    cursorX: 0,
    cursorY: 0,
  })

  let state: 'idle' | 'pending' | 'connecting' = 'idle'
  let sourceId = ''
  let startX = 0
  let startY = 0

  const isConnecting = computed(() => connectLine.active)

  function hitTestNode(clientX: number, clientY: number): string {
    const pos = screenToFlowCoordinate({ x: clientX, y: clientY })
    for (const card of cards.value) {
      const node = findNode(card.id)
      if (!node) continue
      const w = node.dimensions?.width ?? defaultCardSize.width
      const h = node.dimensions?.height ?? defaultCardSize.height
      if (
        pos.x >= node.position.x &&
        pos.x <= node.position.x + w &&
        pos.y >= node.position.y &&
        pos.y <= node.position.y + h
      ) {
        return card.id
      }
    }
    return ''
  }

  function onCanvasRightDown(e: MouseEvent) {
    const hitId = hitTestNode(e.clientX, e.clientY)
    if (!hitId) return

    e.preventDefault()
    const src = findNode(hitId)
    if (!src) return

    state = 'pending'
    sourceId = hitId
    startX = e.clientX
    startY = e.clientY

    const cx = src.position.x + (src.dimensions?.width ?? defaultCardSize.width) / 2
    const cy = src.position.y + (src.dimensions?.height ?? defaultCardSize.height) / 2
    connectLine.sourceX = cx
    connectLine.sourceY = cy
    connectLine.cursorX = cx
    connectLine.cursorY = cy
    connectLine.active = false

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (state === 'pending') {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
        state = 'connecting'
        connectLine.active = true
      }
    }
    if (state === 'connecting') {
      const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
      connectLine.cursorX = pos.x
      connectLine.cursorY = pos.y
    }
  }

  function onMouseUp(e: MouseEvent) {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    if (state === 'connecting') {
      const targetId = hitTestNode(e.clientX, e.clientY)
      if (targetId && targetId !== sourceId) {
        onConnect(sourceId, targetId)
      }
    } else if (state === 'pending') {
      onContextMenu(sourceId, 'node', startX, startY)
    }

    state = 'idle'
    connectLine.active = false
  }

  function handleEdgeContextMenu({ event, edge }: { event: any; edge: { id: string } }) {
    event.preventDefault()
    onContextMenu(edge.id, 'edge', event.clientX, event.clientY)
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  })

  return {
    connectLine,
    isConnecting,
    onCanvasRightDown,
    handleEdgeContextMenu,
  }
}
