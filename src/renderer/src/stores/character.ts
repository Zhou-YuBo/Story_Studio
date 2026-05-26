import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockCharacters } from '../components/character/detail/mockCharacters'
import type { CharacterDetail, CharacterDimensionSummaryItem, CharacterLayer } from '../components/character/detail/types'

const CHARACTERS_KEY = 'story-studio-characters'
let nextCharacterId = 1
let nextDimensionId = 1
let nextNoteId = 1

function cloneCharacters(characters: CharacterDetail[]): CharacterDetail[] {
  return JSON.parse(JSON.stringify(characters))
}

function normalizeCharacters(characters: CharacterDetail[]): CharacterDetail[] {
  return characters.map((character) => ({
    ...character,
    dimensions: character.dimensions.map((dimension, index) => ({
      ...dimension,
      note: dimension.note ?? '',
      core: dimension.core ?? index === 0,
      inverted: dimension.inverted ?? false,
    })),
  }))
}

function loadCharactersFromStorage(): CharacterDetail[] {
  try {
    const raw = localStorage.getItem(CHARACTERS_KEY)
    if (!raw) return cloneCharacters(mockCharacters)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return cloneCharacters(mockCharacters)
    return normalizeCharacters(parsed)
  } catch {
    return cloneCharacters(mockCharacters)
  }
}

function saveCharactersToStorage(characters: CharacterDetail[]) {
  try {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters))
  } catch {}
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
  const characters = ref<CharacterDetail[]>(loadCharactersFromStorage())
  const activeCharacterId = ref(characters.value[0]?.id ?? '')

  restoreCounters(characters.value)

  function saveCharacters() {
    saveCharactersToStorage(characters.value)
  }

  function getCharacterById(id: string): CharacterDetail | undefined {
    return characters.value.find((character) => character.id === id)
  }

  function setActiveCharacter(id: string) {
    if (getCharacterById(id)) activeCharacterId.value = id
  }

  function createCharacter(name: string = '新人物', layer: CharacterLayer = '第三圈人物'): CharacterDetail {
    const character: CharacterDetail = {
      id: `character-${nextCharacterId++}`,
      profile: {
        name,
        layer,
        brief: '',
        logline: '',
      },
      truth: {
        coreSelf: '',
        socialSelf: '',
        personalSelf: '',
        hiddenSelf: '',
      },
      drive: {
        desire: '',
        fear: '',
        belief: '',
        doubt: '',
      },
      dimensions: [],
      voice: {
        speakingStyle: '',
        sentenceLength: '',
        vocabulary: '',
        gestures: '',
        possessions: '',
      },
      notes: [],
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
      core: character.dimensions.length === 0,
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

    const dimensionIndex = character.dimensions.findIndex((dimension) => dimension.id === dimensionId)
    if (dimensionIndex > 0) {
      const [dimension] = character.dimensions.splice(dimensionIndex, 1)
      character.dimensions.unshift(dimension)
    }

    saveCharacters()
  }

  function moveDimension(characterId: string, dimensionId: string, direction: -1 | 1) {
    const character = getCharacterById(characterId)
    if (!character) return

    const dimensionIndex = character.dimensions.findIndex((dimension) => dimension.id === dimensionId)
    const targetIndex = dimensionIndex + direction
    if (dimensionIndex <= 0 || targetIndex <= 0 || targetIndex >= character.dimensions.length) return

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
    getCharacterById,
    setActiveCharacter,
    createCharacter,
    addDimension,
    removeDimension,
    setCoreDimension,
    moveDimension,
    invertDimension,
    addQuickNote,
  }
})
