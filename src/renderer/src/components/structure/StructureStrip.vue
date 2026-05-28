<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditorBridge } from '../../stores/editor-bridge'
import { useLineGridStore } from '../../stores/line-grid'
import { useStructureStore } from '../../stores/structure'
import { resolveStructureAtLine } from '../editor/line-grid/structure-context'

const bridge = useEditorBridge()
const lineGrid = useLineGridStore()
const store = useStructureStore()
const { snapshot } = storeToRefs(lineGrid)

const currentActId = ref('')
const currentSeqId = ref('')

const currentAct = computed(() =>
  store.acts.find((a) => a.id === currentActId.value),
)
const currentSeq = computed(() =>
  currentAct.value?.sequences.find((s) => s.id === currentSeqId.value),
)

function updateCurrentPosition(): void {
  const scrollEl = bridge.scrollEl
  if (!scrollEl) return

  const centerLine = lineGrid.yToLineIndex(scrollEl.scrollTop + scrollEl.clientHeight / 2)
  const context = resolveStructureAtLine(snapshot.value, centerLine)

  currentActId.value = context.actId
  currentSeqId.value = context.seqId
}

let scrollHandler: (() => void) | null = null

watch(
  () => bridge.scrollEl,
  (el, oldEl) => {
    if (oldEl && scrollHandler) {
      oldEl.removeEventListener('scroll', scrollHandler)
    }
    if (el) {
      scrollHandler = updateCurrentPosition
      el.addEventListener('scroll', scrollHandler, { passive: true })
      updateCurrentPosition()
    }
  },
  { immediate: true },
)

watch(
  snapshot,
  () => {
    updateCurrentPosition()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (bridge.scrollEl && scrollHandler) {
    bridge.scrollEl.removeEventListener('scroll', scrollHandler)
  }
})
</script>

<template>
  <div v-if="store.acts.length > 0 && currentAct" class="structure-panel">
    <div class="current-act" :style="{ borderLeftColor: currentAct.color }">
      <div class="section-label">幕</div>
      <div class="section-name">{{ currentAct.label }}</div>
      <div class="section-prompt">最高任务：</div>
    </div>
    <div
      v-if="currentSeq"
      class="current-seq"
      :style="{ borderLeftColor: currentSeq.color }"
    >
      <div class="section-label">序列</div>
      <div class="section-name">{{ currentSeq.label }}</div>
      <div class="section-prompt">价值负转正</div>
    </div>
  </div>
  <div v-else class="strip-empty">
    <span>无结构</span>
  </div>
</template>

<style scoped>
.structure-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 12px;
}

.current-act,
.current-seq {
  border-left: 3px solid #52525b;
  padding: 8px 10px;
  border-radius: 0 4px 4px 0;
  background: rgba(255, 255, 255, 0.03);
}

.section-label {
  font-size: 10px;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.section-name {
  font-size: 14px;
  font-weight: 600;
  color: #d4d4d8;
  margin-bottom: 8px;
}

.section-prompt {
  font-size: 12px;
  color: #52525b;
  font-style: italic;
}

.strip-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.strip-empty span {
  color: #3f3f46;
  font-size: 12px;
}
</style>
