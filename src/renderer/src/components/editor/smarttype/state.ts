import { reactive } from 'vue'
import type { SmartTypeState } from './types'

export function createSmartTypeState(): SmartTypeState {
  return reactive<SmartTypeState>({
    visible: false,
    items: [],
    filtered: [],
    selectedIndex: 0,
    position: { top: 0, left: 0 },
    elementType: '',
    trigger: 'space',
    chainStep: null,
    confirm: null,
  })
}

export function openSmartType(
  state: SmartTypeState,
  items: string[],
  position: { top: number; left: number },
  elementType: string,
  trigger: SmartTypeState['trigger'],
  chainStep: SmartTypeState['chainStep'] = null,
) {
  state.items = items
  state.filtered = [...items]
  state.selectedIndex = 0
  state.position = position
  state.elementType = elementType
  state.trigger = trigger
  state.chainStep = chainStep
  state.visible = true
}

export function closeSmartType(state: SmartTypeState) {
  state.visible = false
  state.items = []
  state.filtered = []
  state.selectedIndex = 0
  state.chainStep = null
  state.confirm = null
}

export function updateFiltered(state: SmartTypeState, query: string) {
  const q = query.trim().toUpperCase()
  if (!q) {
    state.filtered = [...state.items]
  } else {
    state.filtered = state.items.filter((item) => item.toUpperCase().startsWith(q))
  }
  state.selectedIndex = 0
}

export function moveSelection(state: SmartTypeState, direction: 1 | -1) {
  if (state.filtered.length === 0) return
  state.selectedIndex =
    (state.selectedIndex + direction + state.filtered.length) % state.filtered.length
}
