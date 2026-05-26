<script setup lang="ts">
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterDrive } from './types'

defineProps<{
  drive: CharacterDrive
  compact?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const driveItems: Array<{ key: keyof CharacterDrive; label: string }> = [
  { key: 'desire', label: '欲望' },
  { key: 'fear', label: '恐惧' },
  { key: 'belief', label: '相信' },
  { key: 'doubt', label: '怀疑' },
]
</script>

<template>
  <CharacterDetailUnit title="驱动力" kicker="Drive" :compact="compact">
    <div class="drive-grid" :class="{ 'drive-grid-compact': compact }">
      <label v-for="item in driveItems" :key="item.key" class="drive-item">
        <span>{{ item.label }}</span>
        <textarea v-model="drive[item.key]" :rows="compact ? 2 : 3" @blur="emit('save')" />
      </label>
    </div>
  </CharacterDetailUnit>
</template>

<style scoped>
.drive-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.drive-grid-compact {
  grid-template-columns: 1fr;
  gap: 10px;
}

.drive-item {
  display: grid;
  gap: 8px;
  min-height: 112px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 16px;
  background: rgba(9, 9, 11, 0.28);
  padding: 14px;
}

.drive-grid-compact .drive-item {
  min-height: 0;
  border-radius: 14px;
  padding: 12px;
}

.drive-item span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.drive-item textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e4e4e7;
  font: inherit;
  line-height: 1.8;
  outline: none;
  resize: vertical;
}

.drive-grid-compact .drive-item textarea {
  line-height: 1.65;
}
</style>
