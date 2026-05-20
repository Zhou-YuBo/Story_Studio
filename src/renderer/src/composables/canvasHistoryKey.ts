import type { InjectionKey } from 'vue'

export interface CanvasHistoryHandle {
  beginBatch: () => void
  endBatch: () => void
}

export const canvasHistoryKey: InjectionKey<CanvasHistoryHandle> = Symbol('canvasHistory')
