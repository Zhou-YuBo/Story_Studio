export interface SmartTypeState {
  visible: boolean
  items: string[]
  filtered: string[]
  selectedIndex: number
  position: { top: number; left: number }
  elementType: string
  trigger: 'space' | 'input' | 'delete-to-empty' | 'tab-chain'
  chainStep: null | 'location' | 'time'
  confirm: (() => void) | null
}

export type SceneHeadingPhase =
  | 'no-prefix'
  | 'prefix-only'
  | 'has-location'
  | 'has-dash'
  | 'complete'
