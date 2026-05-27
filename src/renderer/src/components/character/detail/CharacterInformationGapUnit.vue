<script setup lang="ts">
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterInformationGap } from './types'

defineProps<{
  informationGap: CharacterInformationGap
  compact?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const informationItems: Array<{ key: keyof CharacterInformationGap; label: string }> = [
  { key: 'knows', label: '他知道' },
  { key: 'hides', label: '他隐藏' },
  { key: 'misunderstands', label: '他误解' },
  { key: 'audienceKnows', label: '观众知道' },
]
</script>

<template>
  <CharacterDetailUnit title="信息差" kicker="Information Gap" :compact="compact">
    <div class="information-grid" :class="{ 'information-grid-compact': compact }">
      <label v-for="item in informationItems" :key="item.key" class="information-item">
        <span>{{ item.label }}</span>
        <textarea v-model="informationGap[item.key]" :rows="compact ? 2 : 3" @blur="emit('save')" />
      </label>
    </div>
  </CharacterDetailUnit>
</template>

<style scoped>
.information-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.information-grid-compact {
  grid-template-columns: 1fr;
  gap: 10px;
}

.information-item {
  display: grid;
  gap: 8px;
  min-height: 112px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 16px;
  background: rgba(9, 9, 11, 0.28);
  padding: 14px;
}

.information-grid-compact .information-item {
  min-height: 0;
  border-radius: 14px;
  padding: 12px;
}

.information-item span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.information-item textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e4e4e7;
  font: inherit;
  line-height: 1.8;
  outline: none;
  resize: vertical;
}

.information-grid-compact .information-item textarea {
  line-height: 1.65;
}
</style>
