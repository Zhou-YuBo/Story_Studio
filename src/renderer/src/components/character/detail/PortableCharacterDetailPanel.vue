<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CharacterDriveUnit from './CharacterDriveUnit.vue'
import CharacterIdentityUnit from './CharacterIdentityUnit.vue'
import CharacterInformationGapUnit from './CharacterInformationGapUnit.vue'
import CharacterQuickNotesUnit from './CharacterQuickNotesUnit.vue'
import CharacterTruthUnit from './CharacterTruthUnit.vue'
import CharacterVoiceBehaviorUnit from './CharacterVoiceBehaviorUnit.vue'
import type { CharacterDetail } from './types'

let lastSelectedCharacterId = ''

const props = defineProps<{
  characters: CharacterDetail[]
  open: boolean
  initialCharacterId?: string
  selectInitialOnOpen?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
  addNote: [characterId: string, content: string]
  selectCharacter: [characterId: string]
}>()

const selectedCharacterId = ref('')

const selectedCharacter = computed(() => {
  return props.characters.find((character) => character.id === selectedCharacterId.value) ?? props.characters[0]
})

watch(
  () => props.characters,
  (characters) => {
    if (!characters.length) {
      selectedCharacterId.value = ''
      lastSelectedCharacterId = ''
      return
    }

    if (characters.some((character) => character.id === lastSelectedCharacterId)) {
      selectedCharacterId.value = lastSelectedCharacterId
      return
    }

    if (!characters.some((character) => character.id === selectedCharacterId.value)) {
      selectedCharacterId.value = characters[0].id
    }
  },
  { immediate: true },
)

watch(selectedCharacterId, (characterId) => {
  lastSelectedCharacterId = characterId
  emit('selectCharacter', characterId)
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (
      props.selectInitialOnOpen &&
      props.initialCharacterId &&
      props.characters.some((character) => character.id === props.initialCharacterId)
    ) {
      selectedCharacterId.value = props.initialCharacterId
    }
  },
)
</script>

<template>
  <div v-if="open" class="portable-detail-shell">
    <button class="portable-detail-backdrop" type="button" aria-label="关闭人物详情" @click="emit('close')" />

    <aside v-if="selectedCharacter" class="portable-detail-panel" aria-label="便携人物详情">
      <header class="portable-detail-header">
        <div>
          <p>Portable Detail</p>
          <h2>{{ selectedCharacter.profile.name || '未命名人物' }}</h2>
        </div>
        <button class="close-button" type="button" @click="emit('close')">关闭</button>
      </header>

      <label class="portable-character-select">
        <span>记录到人物</span>
        <select v-model="selectedCharacterId">
          <option v-for="character in characters" :key="character.id" :value="character.id">
            {{ character.profile.name || '未命名人物' }} · {{ character.profile.layer }}
          </option>
        </select>
      </label>

      <div class="portable-detail-body">
        <CharacterIdentityUnit compact :profile="selectedCharacter.profile" @save="emit('save')" />
        <CharacterTruthUnit compact :truth="selectedCharacter.truth" @save="emit('save')" />
        <CharacterDriveUnit compact :drive="selectedCharacter.drive" @save="emit('save')" />
        <CharacterInformationGapUnit compact :information-gap="selectedCharacter.informationGap" @save="emit('save')" />
        <CharacterVoiceBehaviorUnit compact :voice="selectedCharacter.voice" @save="emit('save')" />
        <CharacterQuickNotesUnit
          compact
          :notes="selectedCharacter.notes"
          @add-note="(content) => emit('addNote', selectedCharacter.id, content)"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.portable-detail-shell {
  position: absolute;
  z-index: 20;
  inset: 0;
  pointer-events: none;
}

.portable-detail-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.38);
  cursor: default;
  pointer-events: auto;
}

.portable-detail-panel {
  position: absolute;
  top: 22px;
  right: 22px;
  bottom: 22px;
  width: min(460px, calc(100vw - 44px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 26px;
  background:
    radial-gradient(circle at 18% 0%, rgba(82, 82, 91, 0.24), transparent 32%),
    rgba(9, 9, 11, 0.96);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.42);
  color: #f4f4f5;
  pointer-events: auto;
}

.portable-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.86);
  background: rgba(24, 24, 27, 0.72);
  padding: 18px 20px 14px;
}

.portable-detail-header p {
  margin: 0 0 7px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.portable-detail-header h2 {
  margin: 0;
  color: #fafafa;
  font-size: 21px;
  font-weight: 620;
  letter-spacing: 0.06em;
}

.close-button {
  flex-shrink: 0;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 8px 11px;
}

.portable-character-select {
  display: grid;
  gap: 7px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.86);
  background: rgba(9, 9, 11, 0.42);
  color: #a1a1aa;
  font-size: 12px;
  padding: 12px 20px 14px;
}

.portable-character-select select {
  width: 100%;
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 12px;
  background: rgba(24, 24, 27, 0.86);
  color: #f4f4f5;
  font: inherit;
  outline: none;
  padding: 10px 12px;
}

.portable-detail-body {
  min-height: 0;
  flex: 1;
  display: grid;
  align-content: start;
  gap: 14px;
  overflow: auto;
  padding: 16px;
}

@media (max-width: 720px) {
  .portable-detail-panel {
    top: 12px;
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    border-radius: 20px;
  }
}
</style>
