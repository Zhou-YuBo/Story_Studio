<script setup lang="ts">
import { computed } from 'vue'
import CharacterDimensionSummaryUnit from '../components/character/detail/CharacterDimensionSummaryUnit.vue'
import CharacterDriveUnit from '../components/character/detail/CharacterDriveUnit.vue'
import CharacterIdentityUnit from '../components/character/detail/CharacterIdentityUnit.vue'
import CharacterInformationGapUnit from '../components/character/detail/CharacterInformationGapUnit.vue'
import CharacterQuickNotesUnit from '../components/character/detail/CharacterQuickNotesUnit.vue'
import CharacterTruthUnit from '../components/character/detail/CharacterTruthUnit.vue'
import CharacterVoiceBehaviorUnit from '../components/character/detail/CharacterVoiceBehaviorUnit.vue'
import { useCharacterStore } from '../stores/character'

const characterStore = useCharacterStore()

const selectedCharacter = computed(() => {
  return characterStore.getCharacterById(characterStore.activeCharacterId) ?? characterStore.characters[0]
})

const layerCounts = computed(() => {
  return characterStore.characters.reduce<Record<string, number>>((counts, character) => {
    counts[character.profile.layer] = (counts[character.profile.layer] ?? 0) + 1
    return counts
  }, {})
})

function createCharacter() {
  characterStore.createCharacter()
}
</script>

<template>
  <div class="character-list-page">
    <aside class="character-index">
      <header class="index-header">
        <RouterLink class="back-link" to="/character">返回首页</RouterLink>
        <div>
          <p>Character Index</p>
          <h1>人物列表</h1>
        </div>
        <button class="new-character-button" type="button" @click="createCharacter">新增人物</button>
      </header>

      <div class="layer-summary">
        <span v-for="(count, layer) in layerCounts" :key="layer">{{ layer }} {{ count }}</span>
      </div>

      <div class="character-list">
        <button
          v-for="character in characterStore.characters"
          :key="character.id"
          class="character-list-item"
          :class="{ 'character-list-item-active': character.id === selectedCharacter.id }"
          type="button"
          @click="characterStore.setActiveCharacter(character.id)"
        >
          <strong>{{ character.profile.name || '未命名人物' }}</strong>
          <span>{{ character.profile.layer }}</span>
        </button>
      </div>
    </aside>

    <main v-if="selectedCharacter" class="character-detail">
      <CharacterIdentityUnit
        class="grid-span-12"
        :profile="selectedCharacter.profile"
        @save="characterStore.saveCharacters"
      />
      <CharacterTruthUnit
        class="grid-span-12"
        :truth="selectedCharacter.truth"
        @save="characterStore.saveCharacters"
      />
      <CharacterDriveUnit
        class="grid-span-6"
        :drive="selectedCharacter.drive"
        @save="characterStore.saveCharacters"
      />
      <CharacterInformationGapUnit
        class="grid-span-6"
        :information-gap="selectedCharacter.informationGap"
        @save="characterStore.saveCharacters"
      />
      <CharacterDimensionSummaryUnit class="grid-span-6" :dimensions="selectedCharacter.dimensions" />
      <CharacterVoiceBehaviorUnit
        class="grid-span-6"
        :voice="selectedCharacter.voice"
        @save="characterStore.saveCharacters"
      />
      <CharacterQuickNotesUnit
        class="grid-span-6"
        :notes="selectedCharacter.notes"
        @add-note="(content) => characterStore.addQuickNote(selectedCharacter.id, content)"
      />
    </main>
  </div>
</template>

<style scoped>
.character-list-page {
  width: 100%;
  height: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
  background:
    radial-gradient(circle at 75% 20%, rgba(63, 63, 70, 0.24), transparent 28%),
    radial-gradient(circle at 22% 84%, rgba(82, 82, 91, 0.16), transparent 30%), #09090b;
  color: #f4f4f5;
}

.character-index {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(63, 63, 70, 0.86);
  background: rgba(9, 9, 11, 0.5);
  padding: 22px;
}

.index-header {
  display: grid;
  gap: 14px;
}

.index-header p {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.index-header h1 {
  margin: 0;
  color: #fafafa;
  font-size: 28px;
  font-weight: 620;
  letter-spacing: 0.08em;
}

.back-link,
.new-character-button {
  width: fit-content;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  padding: 9px 12px;
}

.new-character-button {
  cursor: pointer;
}

.layer-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0;
}

.layer-summary span {
  padding: 5px 8px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 999px;
  color: #a1a1aa;
  font-size: 12px;
}

.character-list {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow: auto;
}

.character-list-item {
  display: grid;
  gap: 7px;
  width: 100%;
  border: 1px solid rgba(63, 63, 70, 0.86);
  border-radius: 16px;
  background: rgba(24, 24, 27, 0.66);
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 14px;
  cursor: pointer;
}

.character-list-item-active {
  border-color: rgba(244, 244, 245, 0.7);
  background: rgba(63, 63, 70, 0.54);
}

.character-list-item strong {
  color: #fafafa;
  font-size: 16px;
  font-weight: 560;
}

.character-list-item span {
  color: #a1a1aa;
  font-size: 12px;
}

.character-detail {
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-content: start;
  gap: 18px;
  overflow: auto;
  padding: 28px;
}

.grid-span-12 {
  grid-column: span 12;
}

.grid-span-6 {
  grid-column: span 6;
}

@media (max-width: 1180px) {
  .character-list-page {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .grid-span-6 {
    grid-column: span 12;
  }
}
</style>
