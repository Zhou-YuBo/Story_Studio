import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useProjectStore } from './project'
import { mockCharacters } from '../components/character/detail/mockCharacters'
import type {
  CharacterDetail,
  CharacterDimensionSummaryItem,
  CharacterInformationGap,
  CharacterLayer
} from '../components/character/detail/types'

let nextCharacterId = 1
let nextDimensionId = 1
let nextNoteId = 1

function createDefaultInformationGap(): CharacterInformationGap {
  return {
    knows: '',
    hides: '',
    misunderstands: '',
    audienceKnows: ''
  }
}

function cloneCharacters(characters: CharacterDetail[]): CharacterDetail[] {
  return JSON.parse(JSON.stringify(characters))
}

function normalizeCharacters(characters: CharacterDetail[]): CharacterDetail[] {
  return characters.map((character) => ({
    ...character,
    informationGap: {
      ...createDefaultInformationGap(),
      ...(character.informationGap ?? {})
    },
    dimensions: character.dimensions.map((dimension, index) => ({
      ...dimension,
      note: dimension.note ?? '',
      core: dimension.core ?? index === 0,
      inverted: dimension.inverted ?? false
    }))
  }))
}

function normalizeCharacterProjectData(data: unknown): CharacterDetail[] {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return cloneCharacters(mockCharacters)
  const characters = (data as { characters?: unknown }).characters
  if (!Array.isArray(characters) || characters.length === 0) return cloneCharacters(mockCharacters)
  return normalizeCharacters(characters as CharacterDetail[])
}

function resetCounters(): void {
  nextCharacterId = 1
  nextDimensionId = 1
  nextNoteId = 1
}

function restoreCounters(characters: CharacterDetail[]) {
  for (const character of characters) {
    const characterNumber = parseInt(character.id.replace('character-', ''))
    if (!isNaN(characterNumber)) nextCharacterId = Math.max(nextCharacterId, characterNumber + 1)

    for (const dimension of character.dimensions) {
      const dimensionNumber = parseInt(dimension.id.replace('dimension-', ''))
      if (!isNaN(dimensionNumber)) nextDimensionId = Math.max(nextDimensionId, dimensionNumber + 1)
    }

    for (const note of character.notes) {
      const noteNumber = parseInt(note.id.replace('note-', ''))
      if (!isNaN(noteNumber)) nextNoteId = Math.max(nextNoteId, noteNumber + 1)
    }
  }
}

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<CharacterDetail[]>(cloneCharacters(mockCharacters))
  const activeCharacterId = ref(characters.value[0]?.id ?? '')

  resetCounters()
  restoreCounters(characters.value)

  function hydrateFromProject(data: unknown): void {
    const nextCharacters = normalizeCharacterProjectData(data)
    resetCounters()
    restoreCounters(nextCharacters)
    characters.value = nextCharacters
    activeCharacterId.value = characters.value[0]?.id ?? ''
  }

  function toProjectData() {
    return {
      characters: characters.value
    }
  }

  function saveCharacters() {
    useProjectStore().scheduleSave()
  }

  function getCharacterById(id: string): CharacterDetail | undefined {
    return characters.value.find((character) => character.id === id)
  }

  function setActiveCharacter(id: string) {
    if (getCharacterById(id)) activeCharacterId.value = id
  }

  function createCharacter(
    name: string = '新人物',
    layer: CharacterLayer = '第三圈人物'
  ): CharacterDetail {
    const character: CharacterDetail = {
      id: `character-${nextCharacterId++}`,
      profile: {
        name,
        layer,
        brief: '',
        logline: ''
      },
      truth: {
        coreSelf: '',
        socialSelf: '',
        personalSelf: '',
        hiddenSelf: ''
      },
      drive: {
        desire: '',
        fear: '',
        belief: '',
        doubt: ''
      },
      informationGap: createDefaultInformationGap(),
      dimensions: [],
      voice: {
        speakingStyle: '',
        sentenceLength: '',
        vocabulary: '',
        gestures: '',
        possessions: ''
      },
      notes: []
    }

    characters.value.push(character)
    activeCharacterId.value = character.id
    saveCharacters()
    return character
  }

  function addDimension(characterId: string): CharacterDimensionSummaryItem | undefined {
    const character = getCharacterById(characterId)
    if (!character) return undefined

    const nextIndex = character.dimensions.length + 1
    const dimension: CharacterDimensionSummaryItem = {
      id: `dimension-${nextDimensionId++}`,
      positive: `价值 ${nextIndex}`,
      negative: `反价值 ${nextIndex}`,
      note: '',
      core: character.dimensions.length === 0
    }

    character.dimensions.push(dimension)
    saveCharacters()
    return dimension
  }

  function removeDimension(characterId: string, dimensionId: string) {
    const character = getCharacterById(characterId)
    if (!character || character.dimensions.length <= 1) return

    const removed = character.dimensions.find((dimension) => dimension.id === dimensionId)
    character.dimensions = character.dimensions.filter((dimension) => dimension.id !== dimensionId)

    if (removed?.core && character.dimensions[0]) {
      character.dimensions[0].core = true
    }

    saveCharacters()
  }

  function setCoreDimension(characterId: string, dimensionId: string) {
    const character = getCharacterById(characterId)
    if (!character) return

    for (const dimension of character.dimensions) {
      dimension.core = dimension.id === dimensionId
    }

    const dimensionIndex = character.dimensions.findIndex(
      (dimension) => dimension.id === dimensionId
    )
    if (dimensionIndex > 0) {
      const [dimension] = character.dimensions.splice(dimensionIndex, 1)
      character.dimensions.unshift(dimension)
    }

    saveCharacters()
  }

  function moveDimension(characterId: string, dimensionId: string, direction: -1 | 1) {
    const character = getCharacterById(characterId)
    if (!character) return

    const dimensionIndex = character.dimensions.findIndex(
      (dimension) => dimension.id === dimensionId
    )
    const targetIndex = dimensionIndex + direction
    if (dimensionIndex <= 0 || targetIndex <= 0 || targetIndex >= character.dimensions.length)
      return

    const [dimension] = character.dimensions.splice(dimensionIndex, 1)
    character.dimensions.splice(targetIndex, 0, dimension)
    saveCharacters()
  }

  function invertDimension(characterId: string, dimensionId: string) {
    const character = getCharacterById(characterId)
    const dimension = character?.dimensions.find((item) => item.id === dimensionId)
    if (!dimension) return

    dimension.inverted = !dimension.inverted
    saveCharacters()
  }

  function addQuickNote(characterId: string, content: string) {
    const character = getCharacterById(characterId)
    if (!character || !content.trim()) return

    character.notes.unshift({ id: `note-${nextNoteId++}`, content: content.trim() })
    saveCharacters()
  }

  return {
    characters,
    activeCharacterId,
    saveCharacters,
    hydrateFromProject,
    toProjectData,
    getCharacterById,
    setActiveCharacter,
    createCharacter,
    addDimension,
    removeDimension,
    setCoreDimension,
    moveDimension,
    invertDimension,
    addQuickNote
  }
})
