import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CastUniverseRing = 'center' | 'first' | 'second' | 'third'

export interface CastUniverseCharacterConfig {
  characterId: string
  ring: CastUniverseRing
  keyword: string
  expanded: boolean
}

export interface CastUniverseBoard {
  id: string
  focusCharacterId: string
  characters: CastUniverseCharacterConfig[]
}

const CAST_UNIVERSE_KEY = 'story-studio-character-cast-universe-v2'

function createDefaultBoard(): CastUniverseBoard {
  return {
    id: 'default-cast-universe',
    focusCharacterId: '',
    characters: [],
  }
}

function getDefaultRing(index: number): CastUniverseRing {
  if (index === 0) return 'center'
  if (index <= 4) return 'first'
  if (index <= 9) return 'second'
  return 'third'
}

function normalizeBoard(board: CastUniverseBoard): CastUniverseBoard {
  return {
    id: board.id ?? 'default-cast-universe',
    focusCharacterId: board.focusCharacterId ?? '',
    characters: Array.isArray(board.characters)
      ? board.characters.map((character) => ({
          characterId: character.characterId,
          ring: character.ring ?? 'third',
          keyword: character.keyword ?? '',
          expanded: character.expanded ?? false,
        }))
      : [],
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

function saveBoardToStorage(board: CastUniverseBoard) {
  try {
    localStorage.setItem(CAST_UNIVERSE_KEY, JSON.stringify(board))
  } catch {}
}

export const useCharacterCastUniverseStore = defineStore('characterCastUniverse', () => {
  const board = ref<CastUniverseBoard>(loadBoardFromStorage())

  function saveBoard() {
    saveBoardToStorage(board.value)
  }

  function ensureCharacters(characterIds: string[]) {
    const availableIds = new Set(characterIds)
    board.value.characters = board.value.characters.filter((character) => availableIds.has(character.characterId))

    for (const characterId of characterIds) {
      if (board.value.characters.some((character) => character.characterId === characterId)) continue
      board.value.characters.push({
        characterId,
        ring: getDefaultRing(board.value.characters.length),
        keyword: '',
        expanded: false,
      })
    }

    if (!board.value.focusCharacterId || !availableIds.has(board.value.focusCharacterId)) {
      board.value.focusCharacterId = characterIds[0] ?? ''
    }

    for (const character of board.value.characters) {
      if (character.characterId === board.value.focusCharacterId) character.ring = 'center'
    }

    saveBoard()
  }

  function setFocusCharacter(characterId: string) {
    if (!board.value.characters.some((character) => character.characterId === characterId)) return
    board.value.focusCharacterId = characterId

    for (const character of board.value.characters) {
      if (character.characterId === characterId) {
        character.ring = 'center'
        character.expanded = true
      } else if (character.ring === 'center') {
        character.ring = 'first'
        character.expanded = false
      }
    }

    saveBoard()
  }

  function setCharacterRing(characterId: string, ring: CastUniverseRing) {
    const character = board.value.characters.find((item) => item.characterId === characterId)
    if (!character) return

    if (ring === 'center') {
      setFocusCharacter(characterId)
      return
    }

    character.ring = ring
    if (board.value.focusCharacterId === characterId) board.value.focusCharacterId = ''
    saveBoard()
  }

  function setCharacterKeyword(characterId: string, keyword: string) {
    const character = board.value.characters.find((item) => item.characterId === characterId)
    if (!character) return

    character.keyword = keyword
    saveBoard()
  }

  function toggleExpanded(characterId: string) {
    const character = board.value.characters.find((item) => item.characterId === characterId)
    if (!character) return

    character.expanded = !character.expanded
    saveBoard()
  }

  return {
    board,
    saveBoard,
    ensureCharacters,
    setFocusCharacter,
    setCharacterRing,
    setCharacterKeyword,
    toggleExpanded,
  }
})
