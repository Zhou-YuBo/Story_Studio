import { reactive } from 'vue'

export interface BoundaryLayout {
  boundaryId: string
  seqId: string
  lineIndex: number
  y: number
  locked: boolean
  visible: boolean
}

export interface CardLayout {
  cardId: string
  seqId: string
  label: string
  content: string
  sceneStart: boolean
  startLine: number
  endLine: number
  topY: number
  bottomY: number
  height: number
  startBoundaryId: string
  endBoundaryId: string
}

export interface BeatBoardState {
  boundaries: BoundaryLayout[]
  cards: CardLayout[]
  totalHeight: number
  scrollTop: number
  isDragging: boolean
  contentOffsetY: number
}

export function createBeatState(): BeatBoardState {
  return reactive<BeatBoardState>({
    boundaries: [],
    cards: [],
    totalHeight: 0,
    scrollTop: 0,
    isDragging: false,
    contentOffsetY: 0,
  })
}
