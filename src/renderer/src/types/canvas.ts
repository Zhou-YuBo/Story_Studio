export interface BaseCard {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface InspirationCard extends BaseCard {
  inspirationId: string
}

export interface WorldCard extends BaseCard {
  objectId: string
  color?: string
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
}

export interface DrawingItem {
  id: string
  type: 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'brace' | 'pencil'
  color: string
  lineWidth: number
  points: Array<{ x: number; y: number }>
  data?: any
}

export interface DrawingConfig {
  color: string
  lineWidth: number
}

export interface Canvas<TCard extends BaseCard = BaseCard> {
  id: string
  name: string
  cards: TCard[]
  edges: CanvasEdge[]
  drawings: DrawingItem[]
  updatedAt: string
}
