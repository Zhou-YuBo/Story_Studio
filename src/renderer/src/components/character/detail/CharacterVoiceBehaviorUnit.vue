<script setup lang="ts">
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterVoiceBehavior } from './types'

defineProps<{
  voice: CharacterVoiceBehavior
}>()

const emit = defineEmits<{
  save: []
}>()

const voiceItems: Array<{ key: keyof CharacterVoiceBehavior; label: string }> = [
  { key: 'speakingStyle', label: '说话方式' },
  { key: 'sentenceLength', label: '句子长度' },
  { key: 'vocabulary', label: '词汇范围' },
  { key: 'gestures', label: '小动作' },
  { key: 'possessions', label: '延伸自我' },
]
</script>

<template>
  <CharacterDetailUnit title="语言与行为" kicker="Voice">
    <div class="voice-list">
      <label v-for="item in voiceItems" :key="item.key" class="voice-row">
        <span>{{ item.label }}</span>
        <textarea v-model="voice[item.key]" rows="2" @blur="emit('save')" />
      </label>
    </div>
  </CharacterDetailUnit>
</template>

<style scoped>
.voice-list {
  display: grid;
  gap: 11px;
}

.voice-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 12px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.7);
  padding-bottom: 11px;
}

.voice-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.voice-row span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.1em;
}

.voice-row textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e4e4e7;
  font: inherit;
  line-height: 1.8;
  outline: none;
  resize: vertical;
}
</style>
