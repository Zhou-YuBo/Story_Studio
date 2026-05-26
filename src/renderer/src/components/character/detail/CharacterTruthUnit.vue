<script setup lang="ts">
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterTruth } from './types'

defineProps<{
  truth: CharacterTruth
  compact?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const truthItems: Array<{ key: keyof CharacterTruth; label: string }> = [
  { key: 'coreSelf', label: '核心自我' },
  { key: 'socialSelf', label: '社会自我' },
  { key: 'personalSelf', label: '个人自我' },
  { key: 'hiddenSelf', label: '隐藏自我' },
]
</script>

<template>
  <CharacterDetailUnit title="人物真相" kicker="Truth" :compact="compact">
    <div class="truth-grid" :class="{ 'truth-grid-compact': compact }">
      <label v-for="item in truthItems" :key="item.key" class="truth-item">
        <span>{{ item.label }}</span>
        <textarea v-model="truth[item.key]" :rows="compact ? 2 : 3" @blur="emit('save')" />
      </label>
    </div>
  </CharacterDetailUnit>
</template>

<style scoped>
.truth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.truth-grid-compact {
  grid-template-columns: 1fr;
  gap: 10px;
}

.truth-item {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 16px;
  background: rgba(9, 9, 11, 0.28);
  padding: 14px;
}

.truth-grid-compact .truth-item {
  border-radius: 14px;
  padding: 12px;
}

.truth-item span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.truth-item textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e4e4e7;
  font: inherit;
  line-height: 1.8;
  outline: none;
  resize: vertical;
}

.truth-grid-compact .truth-item textarea {
  line-height: 1.65;
}
</style>
