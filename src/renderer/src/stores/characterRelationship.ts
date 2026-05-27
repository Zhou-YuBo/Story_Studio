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

function createDefaultChangeNode(structurePosition: string): RelationshipChangeNode {
  return {
    id: `relationship-node-${nextNodeId++}`,
    structurePosition,
    closeness: 50,
    turningPoint: '',
  }
}

function createRelationshipId(characterAId: string, characterBId: string) {
  return [characterAId, characterBId].sort().join('__')
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
      ? relationship.changeNodes.map((node) => ({
          id: node.id,
          structurePosition: node.structurePosition ?? '',
          closeness: typeof node.closeness === 'number' ? node.closeness : 50,
          turningPoint: node.turningPoint ?? '',
        }))
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
      changeNodes: [createDefaultChangeNode('剧情开始'), createDefaultChangeNode('剧情结束')],
    }

    relationships.value.push(relationship)
    saveRelationships()
    return relationship
  }

  function addChangeNode(relationshipId: string) {
    const relationship = relationships.value.find((item) => item.id === relationshipId)
    if (!relationship) return

    relationship.changeNodes.push(createDefaultChangeNode(''))
    saveRelationships()
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
