<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ReminderStickyCard from './ReminderStickyCard.vue'
import {
  useReminderStore,
  type ReminderCategory,
  type ReminderNote,
  type ReminderVisualState,
  type ReminderWorkbenchId,
} from '../../stores/reminder'
import { useCursorStructureContext } from '../../composables/useCursorStructureContext'

interface VisibleReminder {
  note: ReminderNote
  category: ReminderCategory
  visual: ReminderVisualState
  visualKey: string
}

const route = useRoute()
const reminderStore = useReminderStore()
const cursorContext = useCursorStructureContext()

const currentWorkbench = computed<ReminderWorkbenchId | null>(() => {
  const path = route.path
  if (path === '/') return 'inspiration'
  if (path.startsWith('/world')) return 'world'
  if (path.startsWith('/character')) return 'character'
  if (path.startsWith('/structure')) return 'structure'
  if (path.startsWith('/export')) return 'export'
  return null
})

const visibleReminders = computed<VisibleReminder[]>(() => {
  if (route.path.startsWith('/reminder')) return []

  let notes: ReminderNote[] = []
  const visualKeys = new Map<string, string>()

  if (route.path.startsWith('/scene')) {
    if (!cursorContext.active.value || !cursorContext.currentActId.value) return []
    const context = {
      actId: cursorContext.currentActId.value,
      seqId: cursorContext.currentSeqId.value,
    }
    notes = reminderStore.notesForSceneContext(context)
    for (const note of notes) {
      visualKeys.set(note.id, reminderStore.visualKeyForScene(note, context))
    }
  } else if (currentWorkbench.value) {
    notes = reminderStore.notesForWorkbench(currentWorkbench.value)
    for (const note of notes) {
      visualKeys.set(note.id, `workbench:${currentWorkbench.value}`)
    }
  }

  return notes.map((note, index) => {
    const visualKey = visualKeys.get(note.id) ?? 'workbench:inspiration'
    return {
      note,
      visualKey,
      category: reminderStore.getCategoryById(note.categoryId) ?? reminderStore.categories[0],
      visual: reminderStore.ensureVisual(note.id, visualKey, index),
    }
  })
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visibleReminders.length > 0" class="reminder-floating-layer">
      <ReminderStickyCard
        v-for="item in visibleReminders"
        :key="`${item.note.id}-${item.visualKey}`"
        :note="item.note"
        :category="item.category"
        :visual="item.visual"
        :visual-key="item.visualKey"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.reminder-floating-layer {
  position: fixed;
  inset: 0;
  z-index: 880;
  pointer-events: none;
}
</style>
