<script setup lang="ts">
import { ref } from 'vue'
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterQuickNote } from './types'

defineProps<{
  notes: CharacterQuickNote[]
  compact?: boolean
}>()

const emit = defineEmits<{
  addNote: [content: string]
}>()

const draft = ref('')

function addNote() {
  const content = draft.value.trim()
  if (!content) return
  emit('addNote', content)
  draft.value = ''
}
</script>

<template>
  <CharacterDetailUnit title="快速记录" kicker="Notes" :compact="compact">
    <textarea
      v-model="draft"
      class="quick-note-input"
      placeholder="快速记一笔……"
      :rows="compact ? 2 : 3"
      @keydown.ctrl.enter.prevent="addNote"
    />
    <button class="add-note-button" type="button" @click="addNote">保存记录</button>
    <div class="note-list" :class="{ 'note-list-compact': compact }">
      <p v-for="note in notes" :key="note.id">{{ note.content }}</p>
    </div>
  </CharacterDetailUnit>
</template>

<style scoped>
.quick-note-input {
  width: 100%;
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.34);
  color: #f4f4f5;
  font: inherit;
  line-height: 1.7;
  outline: none;
  padding: 12px;
  resize: vertical;
}

.add-note-button {
  margin-top: 10px;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  padding: 9px 12px;
}

.note-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.note-list-compact {
  gap: 8px;
  margin-top: 12px;
}

.note-list p {
  margin: 0;
  border-left: 1px solid rgba(212, 212, 216, 0.46);
  color: #d4d4d8;
  padding-left: 12px;
}

.note-list-compact p {
  padding-left: 10px;
}
</style>
