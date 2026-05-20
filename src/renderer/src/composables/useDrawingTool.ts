import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { DrawingItem, DrawingConfig } from '../types/canvas'

export interface DrawingStorelike {
  activeDrawingTool: Ref<string | null>
  isDrawing: Ref<boolean>
  drawingPreview: Ref<DrawingItem | null>
  drawingConfig: Ref<DrawingConfig>
  drawings: Ref<DrawingItem[]>
  dirty: Ref<boolean>
}

export interface DrawingToolOptions {
  store: DrawingStorelike
  screenToFlowCoordinate: (pos: { x: number; y: number }) => { x: number; y: number }
  viewport: Ref<{ x: number; y: number; zoom: number }>
  vueFlowRef: Ref<{ $el: HTMLElement } | null | undefined>
  onViewportChange: (cb: () => void) => void
  pushSnapshot: () => void
}

export const DRAWING_TOOLS = [
  { type: 'line', label: '直线', icon: '─' },
  { type: 'arrow', label: '箭头', icon: '→' },
  { type: 'rect', label: '矩形', icon: '▢' },
  { type: 'circle', label: '圆形', icon: '○' },
  { type: 'triangle', label: '三角形', icon: '△' },
  { type: 'brace', label: '大括号', icon: '{' },
  { type: 'pencil', label: '手绘', icon: '✏' },
] as const

export function useDrawingTool(options: DrawingToolOptions) {
  const { store, screenToFlowCoordinate, viewport, vueFlowRef, onViewportChange, pushSnapshot } = options

  const drawingCanvasRef = ref<HTMLCanvasElement | null>(null)
  const canvasCtx = ref<CanvasRenderingContext2D | null>(null)

  function switchDrawingTool(toolType: string) {
    store.activeDrawingTool.value = store.activeDrawingTool.value === toolType ? null : toolType
  }

  function startDrawing(e: MouseEvent, toolType: string) {
    if (!store.activeDrawingTool.value) return
    e.preventDefault()
    const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
    store.isDrawing.value = true
    const points = toolType === 'pencil' ? [pos] : [pos, pos]
    store.drawingPreview.value = {
      id: `draw-${Date.now()}`,
      type: toolType as DrawingItem['type'],
      color: store.drawingConfig.value.color,
      lineWidth: store.drawingConfig.value.lineWidth,
      points,
    }
    window.addEventListener('mousemove', onDrawingMouseMove)
    window.addEventListener('mouseup', onDrawingMouseUp)
  }

  function onDrawingMouseMove(e: MouseEvent) {
    if (!store.isDrawing.value || !store.drawingPreview.value) return
    const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
    if (store.drawingPreview.value.type === 'pencil') {
      store.drawingPreview.value.points.push(pos)
    } else {
      store.drawingPreview.value.points[1] = pos
    }
  }

  function onDrawingMouseUp() {
    finishDrawing()
    window.removeEventListener('mousemove', onDrawingMouseMove)
    window.removeEventListener('mouseup', onDrawingMouseUp)
  }

  function finishDrawing() {
    if (store.isDrawing.value && store.drawingPreview.value) {
      pushSnapshot()
      store.drawings.value.push(store.drawingPreview.value)
      store.dirty.value = true
    }
    store.isDrawing.value = false
    store.drawingPreview.value = null
  }

  function onDrawingOverlayDown(e: MouseEvent) {
    if (store.activeDrawingTool.value) {
      startDrawing(e, store.activeDrawingTool.value)
    }
  }

  // ---- Canvas rendering ----

  function renderDrawings() {
    if (!canvasCtx.value || !drawingCanvasRef.value) return
    const { x, y, zoom } = viewport.value
    canvasCtx.value.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height)
    canvasCtx.value.save()
    canvasCtx.value.translate(x, y)
    canvasCtx.value.scale(zoom, zoom)
    for (const draw of store.drawings.value) {
      renderDrawingItem(draw)
    }
    if (store.drawingPreview.value) {
      renderDrawingItem(store.drawingPreview.value)
    }
    canvasCtx.value.restore()
  }

  function renderDrawingItem(item: DrawingItem) {
    if (!canvasCtx.value) return
    canvasCtx.value.strokeStyle = item.color
    canvasCtx.value.lineWidth = item.lineWidth
    canvasCtx.value.lineCap = 'round'
    canvasCtx.value.lineJoin = 'round'

    switch (item.type) {
      case 'line':
        canvasCtx.value.beginPath()
        canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
        canvasCtx.value.lineTo(item.points[1].x, item.points[1].y)
        canvasCtx.value.stroke()
        break

      case 'arrow':
        if (item.points.length >= 2) {
          const headLen = 16
          const angle = Math.atan2(
            item.points[1].y - item.points[0].y,
            item.points[1].x - item.points[0].x,
          )
          const lineEnd = {
            x: item.points[1].x - headLen * Math.cos(angle),
            y: item.points[1].y - headLen * Math.sin(angle),
          }
          canvasCtx.value.beginPath()
          canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
          canvasCtx.value.lineTo(lineEnd.x, lineEnd.y)
          canvasCtx.value.stroke()
          drawArrowHead(item.points[1], angle, headLen)
        }
        break

      case 'rect':
        if (item.points.length >= 2) {
          const x = Math.min(item.points[0].x, item.points[1].x)
          const y = Math.min(item.points[0].y, item.points[1].y)
          const width = Math.abs(item.points[1].x - item.points[0].x)
          const height = Math.abs(item.points[1].y - item.points[0].y)
          canvasCtx.value.strokeRect(x, y, width, height)
        }
        break

      case 'circle':
        if (item.points.length >= 2) {
          const cx = (item.points[0].x + item.points[1].x) / 2
          const cy = (item.points[0].y + item.points[1].y) / 2
          const rx = Math.abs(item.points[1].x - item.points[0].x) / 2
          const ry = Math.abs(item.points[1].y - item.points[0].y) / 2
          canvasCtx.value.beginPath()
          canvasCtx.value.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          canvasCtx.value.stroke()
        }
        break

      case 'triangle':
        if (item.points.length >= 2) {
          const dx = item.points[1].x - item.points[0].x
          const dy = item.points[1].y - item.points[0].y
          canvasCtx.value.beginPath()
          canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
          canvasCtx.value.lineTo(item.points[1].x, item.points[1].y)
          canvasCtx.value.lineTo(
            item.points[0].x + dx / 2 - dy * 0.433,
            item.points[0].y + dy / 2 + dx * 0.433,
          )
          canvasCtx.value.closePath()
          canvasCtx.value.stroke()
        }
        break

      case 'brace':
        if (item.points.length >= 2) {
          const x = Math.min(item.points[0].x, item.points[1].x)
          const y = Math.min(item.points[0].y, item.points[1].y)
          const w = Math.abs(item.points[1].x - item.points[0].x)
          const h = Math.abs(item.points[1].y - item.points[0].y)
          if (w > 10 && h > 10) {
            canvasCtx.value.font = `${h}px sans-serif`
            const metrics = canvasCtx.value.measureText('{')
            const glyphH =
              (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0)
            const glyphW = metrics.width
            const scale = Math.min(w / glyphW, h / glyphH)
            const fontSize = h * scale
            canvasCtx.value.font = `${fontSize}px sans-serif`
            canvasCtx.value.textBaseline = 'top'
            canvasCtx.value.textAlign = 'center'
            canvasCtx.value.fillStyle = item.color
            canvasCtx.value.fillText('{', x + w / 2, y + (h - fontSize) / 2)
          }
        }
        break

      case 'pencil':
        if (item.points.length >= 2) {
          canvasCtx.value.beginPath()
          canvasCtx.value.moveTo(item.points[0].x, item.points[0].y)
          for (let i = 1; i < item.points.length; i++) {
            canvasCtx.value.lineTo(item.points[i].x, item.points[i].y)
          }
          canvasCtx.value.stroke()
        }
        break
    }
  }

  function drawArrowHead(
    tip: { x: number; y: number },
    angle: number,
    headLength: number,
  ) {
    if (!canvasCtx.value) return
    const x1 = tip.x - headLength * Math.cos(angle - Math.PI / 4)
    const y1 = tip.y - headLength * Math.sin(angle - Math.PI / 4)
    const x2 = tip.x - headLength * Math.cos(angle + Math.PI / 4)
    const y2 = tip.y - headLength * Math.sin(angle + Math.PI / 4)
    canvasCtx.value.beginPath()
    canvasCtx.value.moveTo(x1, y1)
    canvasCtx.value.lineTo(tip.x, tip.y)
    canvasCtx.value.lineTo(x2, y2)
    canvasCtx.value.closePath()
    canvasCtx.value.fillStyle = canvasCtx.value.strokeStyle
    canvasCtx.value.fill()
  }

  // ---- Lifecycle setup ----

  function onResize() {
    if (drawingCanvasRef.value && vueFlowRef.value) {
      const container = vueFlowRef.value.$el as HTMLElement
      drawingCanvasRef.value.width = container.clientWidth
      drawingCanvasRef.value.height = container.clientHeight
      renderDrawings()
    }
  }

  onMounted(() => {
    if (drawingCanvasRef.value) {
      canvasCtx.value = drawingCanvasRef.value.getContext('2d')
      window.addEventListener('resize', onResize)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
    }
    onViewportChange(() => renderDrawings())
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onDrawingMouseMove)
    window.removeEventListener('mouseup', onDrawingMouseUp)
  })

  watch([() => store.drawings.value, () => store.drawingPreview.value], () => {
    renderDrawings()
  }, { deep: true })

  return {
    drawingCanvasRef,
    drawingTools: DRAWING_TOOLS,
    switchDrawingTool,
    onDrawingOverlayDown,
    renderDrawings,
  }
}
