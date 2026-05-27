import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CastUniverseRing = 1 | 2 | 3
export type CastUniverseSettleResult = 'snapped' | 'free' | 'duplicate'

export interface CastUniversePlacedNode {
  id: string
  characterId: string
  x: number
  y: number
  systemId?: string
  ring?: CastUniverseRing
  keyword: string
  expanded: boolean
}

export interface CastUniverseCircleSystem {
  id: string
  x: number
  y: number
  radius1: number
  radius2: number
  radius3: number
  centerNodeIds: string[]
}

export interface CastUniverseBoard {
  id: string
  activeSystemId: string
  placedNodes: CastUniversePlacedNode[]
  circleSystems: CastUniverseCircleSystem[]
}

interface AddPlacedNodeOptions {
  expanded?: boolean
}

export const CAST_UNIVERSE_CANVAS_SIZE = 1400
export const CAST_UNIVERSE_CENTER = CAST_UNIVERSE_CANVAS_SIZE / 2

const CAST_UNIVERSE_KEY = 'story-studio-character-cast-universe-v4'
const SNAP_THRESHOLD = 72
let nextNodeId = 1
let nextSystemId = 1

function createDefaultCircleSystem(): CastUniverseCircleSystem {
  return {
    id: `cast-system-${nextSystemId++}`,
    x: CAST_UNIVERSE_CENTER,
    y: CAST_UNIVERSE_CENTER,
    radius1: 330,
    radius2: 470,
    radius3: 620,
    centerNodeIds: []
  }
}

function createDefaultBoard(): CastUniverseBoard {
  const system = createDefaultCircleSystem()
  return {
    id: 'default-cast-universe',
    activeSystemId: system.id,
    placedNodes: [],
    circleSystems: [system]
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeRing(ring: unknown): CastUniverseRing | undefined {
  return ring === 1 || ring === 2 || ring === 3 ? ring : undefined
}

function normalizePlacedNode(node: CastUniversePlacedNode): CastUniversePlacedNode {
  return {
    id: node.id,
    characterId: node.characterId,
    x: isFiniteNumber(node.x) ? node.x : CAST_UNIVERSE_CENTER,
    y: isFiniteNumber(node.y) ? node.y : CAST_UNIVERSE_CENTER,
    systemId: node.systemId,
    ring: normalizeRing(node.ring),
    keyword: node.keyword ?? '',
    expanded: node.expanded ?? false
  }
}

function normalizeCircleSystem(system: CastUniverseCircleSystem): CastUniverseCircleSystem {
  return {
    id: system.id,
    x: isFiniteNumber(system.x) ? system.x : CAST_UNIVERSE_CENTER,
    y: isFiniteNumber(system.y) ? system.y : CAST_UNIVERSE_CENTER,
    radius1: isFiniteNumber(system.radius1) ? system.radius1 : 330,
    radius2: isFiniteNumber(system.radius2) ? system.radius2 : 470,
    radius3: isFiniteNumber(system.radius3) ? system.radius3 : 620,
    centerNodeIds: Array.isArray(system.centerNodeIds) ? system.centerNodeIds.slice(0, 3) : []
  }
}

function normalizeBoard(board: CastUniverseBoard): CastUniverseBoard {
  const circleSystems =
    Array.isArray(board.circleSystems) && board.circleSystems.length
      ? board.circleSystems.map(normalizeCircleSystem)
      : [createDefaultCircleSystem()]
  const availableSystemIds = new Set(circleSystems.map((system) => system.id))
  const placedNodes = Array.isArray(board.placedNodes)
    ? board.placedNodes.map(normalizePlacedNode).map((node) => ({
        ...node,
        systemId: node.systemId && availableSystemIds.has(node.systemId) ? node.systemId : undefined
      }))
    : []
  const seenSystemCharacters = new Set<string>()

  for (const node of placedNodes) {
    if (!node.systemId) continue

    const systemCharacterKey = `${node.systemId}:${node.characterId}`
    if (seenSystemCharacters.has(systemCharacterKey)) {
      node.systemId = undefined
      node.ring = undefined
      continue
    }

    seenSystemCharacters.add(systemCharacterKey)
  }

  const availableNodeIds = new Set(placedNodes.map((node) => node.id))
  const nodeSystemIds = new Map(placedNodes.map((node) => [node.id, node.systemId]))

  for (const system of circleSystems) {
    system.centerNodeIds = system.centerNodeIds
      .filter((nodeId) => availableNodeIds.has(nodeId) && nodeSystemIds.get(nodeId) === system.id)
      .slice(0, 3)
  }

  return {
    id: board.id ?? 'default-cast-universe',
    activeSystemId: availableSystemIds.has(board.activeSystemId)
      ? board.activeSystemId
      : circleSystems[0].id,
    placedNodes,
    circleSystems
  }
}

function loadBoardFromStorage(): CastUniverseBoard {
  try {
    const raw = localStorage.getItem(CAST_UNIVERSE_KEY)
    if (!raw) return createDefaultBoard()
    return normalizeBoard(JSON.parse(raw))
  } catch {
    return createDefaultBoard()
  }
}

function saveBoardToStorage(board: CastUniverseBoard): void {
  try {
    localStorage.setItem(CAST_UNIVERSE_KEY, JSON.stringify(board))
  } catch {
    return
  }
}

function restoreCounters(board: CastUniverseBoard): void {
  for (const node of board.placedNodes) {
    const nodeNumber = parseInt(node.id.replace('cast-node-', ''))
    if (!isNaN(nodeNumber)) nextNodeId = Math.max(nextNodeId, nodeNumber + 1)
  }

  for (const system of board.circleSystems) {
    const systemNumber = parseInt(system.id.replace('cast-system-', ''))
    if (!isNaN(systemNumber)) nextSystemId = Math.max(nextSystemId, systemNumber + 1)
  }
}

function getRingRadius(system: CastUniverseCircleSystem, ring: CastUniverseRing): number {
  if (ring === 1) return system.radius1
  if (ring === 2) return system.radius2
  return system.radius3
}

export const useCharacterCastUniverseStore = defineStore('characterCastUniverse', () => {
  const board = ref<CastUniverseBoard>(loadBoardFromStorage())

  restoreCounters(board.value)

  function saveBoard(): void {
    saveBoardToStorage(board.value)
  }

  function getNodeById(nodeId: string): CastUniversePlacedNode | undefined {
    return board.value.placedNodes.find((node) => node.id === nodeId)
  }

  function getSystemById(systemId: string): CastUniverseCircleSystem | undefined {
    return board.value.circleSystems.find((system) => system.id === systemId)
  }

  function syncAvailableCharacters(characterIds: string[]): void {
    const availableIds = new Set(characterIds)
    board.value.placedNodes = board.value.placedNodes.filter((node) =>
      availableIds.has(node.characterId)
    )
    const availableNodeIds = new Set(board.value.placedNodes.map((node) => node.id))

    for (const system of board.value.circleSystems) {
      system.centerNodeIds = system.centerNodeIds.filter((nodeId) => availableNodeIds.has(nodeId))
    }

    saveBoard()
  }

  function addPlacedNode(
    characterId: string,
    x: number,
    y: number,
    options: AddPlacedNodeOptions = {}
  ): CastUniversePlacedNode {
    const node: CastUniversePlacedNode = {
      id: `cast-node-${nextNodeId++}`,
      characterId,
      x,
      y,
      keyword: '',
      expanded: options.expanded ?? false
    }

    board.value.placedNodes.push(node)
    saveBoard()
    return node
  }

  function updatePlacedNodePosition(nodeId: string, x: number, y: number): void {
    const node = getNodeById(nodeId)
    if (!node) return

    node.x = x
    node.y = y
  }

  function hasCharacterInSystem(
    characterId: string,
    systemId: string,
    exceptNodeId: string
  ): boolean {
    return board.value.placedNodes.some((node) => {
      return (
        node.id !== exceptNodeId && node.characterId === characterId && node.systemId === systemId
      )
    })
  }

  function detachNode(nodeId: string): void {
    const node = getNodeById(nodeId)
    if (!node) return

    if (node.systemId) {
      const system = getSystemById(node.systemId)
      if (system) system.centerNodeIds = system.centerNodeIds.filter((id) => id !== nodeId)
    }

    node.systemId = undefined
    node.ring = undefined
    saveBoard()
  }

  function removePlacedNode(nodeId: string): void {
    board.value.placedNodes = board.value.placedNodes.filter((node) => node.id !== nodeId)

    for (const system of board.value.circleSystems) {
      system.centerNodeIds = system.centerNodeIds.filter((id) => id !== nodeId)
    }

    saveBoard()
  }

  function restoreBoard(snapshot: CastUniverseBoard): void {
    board.value = normalizeBoard(snapshot)
    restoreCounters(board.value)
    saveBoard()
  }

  function setNodeAsCenter(nodeId: string, systemId: string = board.value.activeSystemId): boolean {
    const node = getNodeById(nodeId)
    const system = getSystemById(systemId)
    if (!node || !system) return false
    if (hasCharacterInSystem(node.characterId, system.id, node.id)) return false
    if (!system.centerNodeIds.includes(node.id) && system.centerNodeIds.length >= 3) return false

    for (const currentSystem of board.value.circleSystems) {
      currentSystem.centerNodeIds = currentSystem.centerNodeIds.filter((id) => id !== node.id)
    }

    if (!system.centerNodeIds.includes(node.id)) system.centerNodeIds.push(node.id)
    node.systemId = system.id
    node.ring = undefined
    node.x = system.x
    node.y = system.y
    board.value.activeSystemId = system.id
    saveBoard()
    return true
  }

  function settlePlacedNode(nodeId: string): CastUniverseSettleResult {
    const node = getNodeById(nodeId)
    if (!node) return 'free'

    let nearestSystem: CastUniverseCircleSystem | undefined
    let nearestRing: CastUniverseRing | undefined
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const system of board.value.circleSystems) {
      const distance = Math.hypot(node.x - system.x, node.y - system.y)
      const ringCandidates: CastUniverseRing[] = [1, 2, 3]

      for (const ring of ringCandidates) {
        const ringDistance = Math.abs(distance - getRingRadius(system, ring))
        if (ringDistance < nearestDistance) {
          nearestDistance = ringDistance
          nearestSystem = system
          nearestRing = ring
        }
      }
    }

    if (!nearestSystem || !nearestRing || nearestDistance > SNAP_THRESHOLD) {
      detachNode(node.id)
      return 'free'
    }

    if (hasCharacterInSystem(node.characterId, nearestSystem.id, node.id)) {
      detachNode(node.id)
      return 'duplicate'
    }

    for (const system of board.value.circleSystems) {
      system.centerNodeIds = system.centerNodeIds.filter((id) => id !== node.id)
    }

    const radius = getRingRadius(nearestSystem, nearestRing)
    const angle = Math.atan2(node.y - nearestSystem.y, node.x - nearestSystem.x)
    node.x = nearestSystem.x + Math.cos(angle) * radius
    node.y = nearestSystem.y + Math.sin(angle) * radius
    node.systemId = nearestSystem.id
    node.ring = nearestRing
    if (nearestRing !== 1) node.expanded = false
    board.value.activeSystemId = nearestSystem.id
    saveBoard()
    return 'snapped'
  }

  function setNodeRing(nodeId: string, systemId: string, ring: CastUniverseRing): boolean {
    const node = getNodeById(nodeId)
    const system = getSystemById(systemId)
    if (!node || !system) return false
    if (hasCharacterInSystem(node.characterId, system.id, node.id)) return false

    for (const currentSystem of board.value.circleSystems) {
      currentSystem.centerNodeIds = currentSystem.centerNodeIds.filter((id) => id !== node.id)
    }

    const radius = getRingRadius(system, ring)
    const angle = Math.atan2(node.y - system.y, node.x - system.x)
    const safeAngle = Number.isFinite(angle) ? angle : -Math.PI / 2
    node.x = system.x + Math.cos(safeAngle) * radius
    node.y = system.y + Math.sin(safeAngle) * radius
    node.systemId = system.id
    node.ring = ring
    if (ring !== 1) node.expanded = false
    board.value.activeSystemId = system.id
    saveBoard()
    return true
  }

  function setNodeKeyword(nodeId: string, keyword: string): void {
    const node = getNodeById(nodeId)
    if (!node) return

    node.keyword = keyword
    saveBoard()
  }

  function toggleNodeExpanded(nodeId: string): void {
    const node = getNodeById(nodeId)
    if (!node) return

    node.expanded = !node.expanded
    saveBoard()
  }

  return {
    board,
    saveBoard,
    syncAvailableCharacters,
    addPlacedNode,
    updatePlacedNodePosition,
    settlePlacedNode,
    setNodeRing,
    setNodeAsCenter,
    detachNode,
    removePlacedNode,
    restoreBoard,
    setNodeKeyword,
    toggleNodeExpanded
  }
})
