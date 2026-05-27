import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface RelationshipSelf {
  presentedSelf: string
  craftedSelf: string
  hiddenSelf: string
  unconsciousSelf: string
  cherishesSelf: string
  selfDeathView: string
  preventsSelfDeath: string
  expectedDeathCondition: string
  actualDeathCondition: string
}

export interface RelationshipDefinitions {
  surface: string
  actual: string
  social: string
  symbolic: string
}

export interface RelationshipChangeNode {
  id: string
  structurePosition: string
  timelinePosition: number
  closeness: number
  turningPoint: string
}

export interface CharacterRelationship {
  id: string
  characterIds: [string, string]
  selves: Record<string, RelationshipSelf>
  definitions: RelationshipDefinitions
  changeNodes: RelationshipChangeNode[]
}

const RELATIONSHIPS_KEY = 'story-studio-character-relationships'
let nextNodeId = 1

function createDefaultRelationshipSelf(): RelationshipSelf {
  return {
    presentedSelf: '',
    craftedSelf: '',
    hiddenSelf: '',
    unconsciousSelf: '',
    cherishesSelf: '',
    selfDeathView: '',
    preventsSelfDeath: '',
    expectedDeathCondition: '',
    actualDeathCondition: '',
  }
}

function createDefaultDefinitions(): RelationshipDefinitions {
  return {
    surface: '',
    actual: '',
    social: '',
    symbolic: '',
  }
}

function createDefaultChangeNode(structurePosition: string, timelinePosition: number): RelationshipChangeNode {
  return {
    id: `relationship-node-${nextNodeId++}`,
    structurePosition,
    timelinePosition,
    closeness: 50,
    turningPoint: '',
  }
}

function createRelationshipId(characterAId: string, characterBId: string) {
  return [characterAId, characterBId].sort().join('__')
}

function getDefaultTimelinePosition(index: number, total: number) {
  return total <= 1 ? 50 : 8 + (index / (total - 1)) * 84
}

function normalizeRelationship(relationship: CharacterRelationship): CharacterRelationship {
  const characterIds = [...relationship.characterIds].sort() as [string, string]
  const selves: Record<string, RelationshipSelf> = {}

  for (const characterId of characterIds) {
    selves[characterId] = {
      ...createDefaultRelationshipSelf(),
      ...(relationship.selves?.[characterId] ?? {}),
    }
  }

  return {
    ...relationship,
    id: createRelationshipId(characterIds[0], characterIds[1]),
    characterIds,
    selves,
    definitions: {
      ...createDefaultDefinitions(),
      ...(relationship.definitions ?? {}),
    },
    changeNodes: Array.isArray(relationship.changeNodes)
      ? relationship.changeNodes
          .map((node, index) => ({
            id: node.id,
            structurePosition: node.structurePosition ?? '',
            timelinePosition:
              typeof node.timelinePosition === 'number'
                ? node.timelinePosition
                : getDefaultTimelinePosition(index, relationship.changeNodes.length),
            closeness: typeof node.closeness === 'number' ? node.closeness : 50,
            turningPoint: node.turningPoint ?? '',
          }))
          .sort((nodeA, nodeB) => nodeA.timelinePosition - nodeB.timelinePosition)
      : [],
  }
}

function loadRelationshipsFromStorage(): CharacterRelationship[] {
  try {
    const raw = localStorage.getItem(RELATIONSHIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeRelationship)
  } catch {
    return []
  }
}

function saveRelationshipsToStorage(relationships: CharacterRelationship[]) {
  try {
    localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(relationships))
  } catch {}
}

function restoreNodeCounter(relationships: CharacterRelationship[]) {
  for (const relationship of relationships) {
    for (const node of relationship.changeNodes) {
      const nodeNumber = parseInt(node.id.replace('relationship-node-', ''))
      if (!isNaN(nodeNumber)) nextNodeId = Math.max(nextNodeId, nodeNumber + 1)
    }
  }
}

export const useCharacterRelationshipStore = defineStore('characterRelationship', () => {
  const relationships = ref<CharacterRelationship[]>(loadRelationshipsFromStorage())

  restoreNodeCounter(relationships.value)

  function saveRelationships() {
    saveRelationshipsToStorage(relationships.value)
  }

  function getRelationship(characterAId: string, characterBId: string): CharacterRelationship | undefined {
    if (!characterAId || !characterBId || characterAId === characterBId) return undefined
    const relationshipId = createRelationshipId(characterAId, characterBId)
    return relationships.value.find((relationship) => relationship.id === relationshipId)
  }

  function ensureRelationship(characterAId: string, characterBId: string): CharacterRelationship | undefined {
    if (!characterAId || !characterBId || characterAId === characterBId) return undefined

    const existingRelationship = getRelationship(characterAId, characterBId)
    if (existingRelationship) return existingRelationship

    const characterIds = [...[characterAId, characterBId].sort()] as [string, string]
    const relationship: CharacterRelationship = {
      id: createRelationshipId(characterAId, characterBId),
      characterIds,
      selves: {
        [characterIds[0]]: createDefaultRelationshipSelf(),
        [characterIds[1]]: createDefaultRelationshipSelf(),
      },
      definitions: createDefaultDefinitions(),
      changeNodes: [createDefaultChangeNode('剧情开始', 8), createDefaultChangeNode('剧情结束', 92)],
    }

    relationships.value.push(relationship)
    saveRelationships()
    return relationship
  }

  function addChangeNode(relationshipId: string, afterNodeId?: string): RelationshipChangeNode | undefined {
    const relationship = relationships.value.find((item) => item.id === relationshipId)
    if (!relationship) return undefined

    const nodes = relationship.changeNodes
    const foundIndex = nodes.findIndex((node) => node.id === afterNodeId)
    const afterIndex = foundIndex >= 0 ? foundIndex : nodes.length - 1
    const previousNode = nodes[afterIndex] ?? nodes[nodes.length - 1]
    const nextNode = nodes[afterIndex + 1]
    const timelinePosition = nextNode
      ? (previousNode.timelinePosition + nextNode.timelinePosition) / 2
      : Math.min(96, previousNode.timelinePosition + 12)
    const node = createDefaultChangeNode('', timelinePosition)

    nodes.splice(afterIndex + 1, 0, node)
    relationship.changeNodes.sort((nodeA, nodeB) => nodeA.timelinePosition - nodeB.timelinePosition)
    saveRelationships()
    return node
  }

  function removeChangeNode(relationshipId: string, nodeId: string) {
    const relationship = relationships.value.find((item) => item.id === relationshipId)
    if (!relationship || relationship.changeNodes.length <= 2) return

    relationship.changeNodes = relationship.changeNodes.filter((node) => node.id !== nodeId)
    saveRelationships()
  }

  return {
    relationships,
    saveRelationships,
    getRelationship,
    ensureRelationship,
    addChangeNode,
    removeChangeNode,
  }
})
