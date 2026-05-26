<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CharacterDimensionWheel, { type CharacterDimensionSlot } from '../components/character/CharacterDimensionWheel.vue'
import { useCharacterStore } from '../stores/character'

const characterStore = useCharacterStore()
const selectedDimensionId = ref('')

const dimensionCharacters = computed(() => {
  return characterStore.characters.filter((character) =>
    ['主角', '第一圈人物'].includes(character.profile.layer),
  )
})

const activeCharacter = computed(() => {
  return characterStore.getCharacterById(characterStore.activeCharacterId) ?? dimensionCharacters.value[0]
})

const dimensions = computed(() => activeCharacter.value?.dimensions ?? [])

const slots = computed<CharacterDimensionSlot[]>(() => {
  return dimensions.value.map((dimension) => ({
    dimensionId: dimension.id,
    inverted: dimension.inverted,
  }))
})

const selectedDimension = computed(() => {
  return dimensions.value.find((dimension) => dimension.id === selectedDimensionId.value) ?? dimensions.value[0]
})

const selectedSlotIndex = computed(() => {
  return dimensions.value.findIndex((dimension) => dimension.id === selectedDimension.value?.id)
})

watch(
  dimensions,
  (nextDimensions) => {
    if (!nextDimensions.length) {
      selectedDimensionId.value = ''
      return
    }

    if (!nextDimensions.some((dimension) => dimension.id === selectedDimensionId.value)) {
      selectedDimensionId.value = nextDimensions[0].id
    }
  },
  { immediate: true },
)

function selectDimension(dimensionId: string) {
  selectedDimensionId.value = dimensionId
}

function setActiveCharacter(characterId: string) {
  characterStore.setActiveCharacter(characterId)
}

function addDimension() {
  if (!activeCharacter.value) return
  const dimension = characterStore.addDimension(activeCharacter.value.id)
  if (dimension) selectedDimensionId.value = dimension.id
}

function removeDimension(dimensionId: string) {
  if (!activeCharacter.value) return
  characterStore.removeDimension(activeCharacter.value.id, dimensionId)
}

function setCoreDimension(dimensionId: string) {
  if (!activeCharacter.value) return
  characterStore.setCoreDimension(activeCharacter.value.id, dimensionId)
}

function moveDimension(dimensionId: string, direction: -1 | 1) {
  if (!activeCharacter.value) return
  characterStore.moveDimension(activeCharacter.value.id, dimensionId, direction)
}

function invertDimension(dimensionId: string) {
  if (!activeCharacter.value) return
  characterStore.invertDimension(activeCharacter.value.id, dimensionId)
}
</script>

<template>
  <div class="character-dimension-page">
    <header class="dimension-header">
      <div>
        <p class="section-kicker">人物工作台 / 人物维度</p>
        <h1>把这个人的矛盾摆到桌面上</h1>
      </div>
      <div class="header-actions">
        <RouterLink class="back-button" to="/character">返回首页</RouterLink>
        <label class="character-select">
          <span>当前人物</span>
          <select :value="activeCharacter?.id" @change="setActiveCharacter(($event.target as HTMLSelectElement).value)">
            <option v-for="character in dimensionCharacters" :key="character.id" :value="character.id">
              {{ character.profile.name }} · {{ character.profile.layer }}
            </option>
          </select>
        </label>
        <RouterLink class="detail-button" to="/character/list">人物详情</RouterLink>
      </div>
    </header>

    <main class="dimension-stage">
      <section class="wheel-panel" aria-label="维度圈">
        <div class="wheel-meta">
          <span>{{ activeCharacter?.profile.name }}</span>
          <span>{{ activeCharacter?.profile.layer }}</span>
          <span>核心维度固定在竖向主轴</span>
        </div>
        <div class="wheel-frame">
          <CharacterDimensionWheel
            :dimensions="dimensions"
            :slots="slots"
            :selected-dimension-id="selectedDimension?.id"
            :size="560"
            @select="selectDimension"
          />
        </div>
      </section>

      <aside class="control-panel" aria-label="维度操控板">
        <section class="panel-section">
          <div class="panel-title-row">
            <div>
              <p class="section-kicker">Dimension Slots</p>
              <h2>维度组</h2>
            </div>
            <button class="add-button" type="button" @click="addDimension">添加</button>
          </div>

          <div class="dimension-list">
            <button
              v-for="(slot, index) in slots"
              :key="slot.dimensionId"
              class="dimension-item"
              :class="{ 'dimension-item-active': slot.dimensionId === selectedDimension?.id }"
              type="button"
              @click="selectDimension(slot.dimensionId)"
            >
              <span class="slot-mark">{{ index === 0 ? '核心' : `槽位 ${index + 1}` }}</span>
              <span class="dimension-name">
                {{ dimensions.find((dimension) => dimension.id === slot.dimensionId)?.positive }} /
                {{ dimensions.find((dimension) => dimension.id === slot.dimensionId)?.negative }}
              </span>
            </button>
          </div>
        </section>

        <section v-if="selectedDimension" class="panel-section editor-section">
          <div class="panel-title-row">
            <div>
              <p class="section-kicker">Selected</p>
              <h2>当前维度</h2>
            </div>
            <button
              class="ghost-button danger"
              type="button"
              :disabled="dimensions.length <= 1"
              @click="removeDimension(selectedDimension.id)"
            >
              删除
            </button>
          </div>

          <label class="field-block">
            <span>上端 / 正向关键词</span>
            <input v-model="selectedDimension.positive" @blur="characterStore.saveCharacters" />
          </label>

          <label class="field-block">
            <span>下端 / 反向关键词</span>
            <input v-model="selectedDimension.negative" @blur="characterStore.saveCharacters" />
          </label>

          <label class="field-block">
            <span>这组矛盾意味着</span>
            <textarea
              v-model="selectedDimension.note"
              rows="4"
              placeholder="写下这组矛盾如何影响人物行动。"
              @blur="characterStore.saveCharacters"
            />
          </label>

          <div class="action-grid">
            <button
              class="ghost-button"
              type="button"
              :disabled="selectedSlotIndex === 0"
              @click="setCoreDimension(selectedDimension.id)"
            >
              设为核心
            </button>
            <button class="ghost-button" type="button" @click="invertDimension(selectedDimension.id)">
              交换两端
            </button>
            <button
              class="ghost-button"
              type="button"
              :disabled="selectedSlotIndex <= 1"
              @click="moveDimension(selectedDimension.id, -1)"
            >
              上移槽位
            </button>
            <button
              class="ghost-button"
              type="button"
              :disabled="selectedSlotIndex <= 0 || selectedSlotIndex >= slots.length - 1"
              @click="moveDimension(selectedDimension.id, 1)"
            >
              下移槽位
            </button>
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.character-dimension-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 34% 42%, rgba(113, 113, 122, 0.18), transparent 34%),
    radial-gradient(circle at 78% 18%, rgba(63, 63, 70, 0.28), transparent 26%),
    #09090b;
  color: #f4f4f5;
}

.dimension-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 34px 22px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
}

.section-kicker {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.dimension-header h1 {
  margin: 0;
  color: #fafafa;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.character-select {
  display: grid;
  gap: 7px;
  color: #a1a1aa;
  font-size: 12px;
}

.character-select select,
.field-block input,
.field-block textarea {
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 12px;
  background: rgba(24, 24, 27, 0.86);
  color: #f4f4f5;
  outline: none;
}

.character-select select {
  min-width: 220px;
  padding: 10px 12px;
}

.back-button,
.detail-button,
.add-button,
.ghost-button {
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease;
}

.back-button,
.detail-button,
.add-button {
  padding: 10px 14px;
}

.back-button:hover,
.detail-button:hover,
.add-button:hover,
.ghost-button:hover:not(:disabled) {
  border-color: rgba(228, 228, 231, 0.86);
  background: rgba(63, 63, 70, 0.86);
}

.dimension-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
}

.wheel-panel {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38px 52px;
}

.wheel-meta {
  position: absolute;
  top: 26px;
  left: 34px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.wheel-meta span {
  padding: 6px 10px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.66);
  color: #d4d4d8;
  font-size: 12px;
}

.wheel-frame {
  width: min(68vh, 600px);
  height: min(68vh, 600px);
  min-width: 430px;
  min-height: 430px;
}

.control-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-left: 1px solid rgba(63, 63, 70, 0.82);
  background: rgba(9, 9, 11, 0.48);
  overflow: auto;
}

.panel-section {
  border: 1px solid rgba(63, 63, 70, 0.88);
  border-radius: 22px;
  background: rgba(24, 24, 27, 0.68);
  padding: 18px;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.panel-title-row h2 {
  margin: 0;
  color: #fafafa;
  font-size: 19px;
  font-weight: 600;
}

.dimension-list {
  display: grid;
  gap: 10px;
}

.dimension-item {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid rgba(63, 63, 70, 0.88);
  border-radius: 16px;
  background: rgba(9, 9, 11, 0.42);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.dimension-item-active {
  border-color: rgba(244, 244, 245, 0.72);
  background: rgba(63, 63, 70, 0.52);
}

.slot-mark {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.12em;
}

.dimension-name {
  color: #f4f4f5;
  font-size: 15px;
  line-height: 1.5;
}

.editor-section {
  display: grid;
  gap: 14px;
}

.field-block {
  display: grid;
  gap: 8px;
  color: #a1a1aa;
  font-size: 12px;
}

.field-block input,
.field-block textarea {
  width: 100%;
  padding: 11px 12px;
  font: inherit;
  line-height: 1.6;
  resize: vertical;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 2px;
}

.ghost-button {
  padding: 10px 12px;
}

.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.ghost-button.danger:not(:disabled) {
  color: #fca5a5;
}

@media (max-width: 1080px) {
  .dimension-stage {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .wheel-panel {
    min-height: 560px;
  }

  .control-panel {
    border-left: 0;
    border-top: 1px solid rgba(63, 63, 70, 0.82);
  }
}
</style>
