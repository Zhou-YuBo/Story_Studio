<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditorBridge } from '../../stores/editor-bridge'
import { useStructureStore } from '../../stores/structure'

const bridge = useEditorBridge()
const store = useStructureStore()

const currentActId = ref('')
const currentSeqId = ref('')

const currentAct = computed(() =>
  store.acts.find((a) => a.id === currentActId.value),
)
const currentSeq = computed(() =>
  currentAct.value?.sequences.find((s) => s.id === currentSeqId.value),
)

function updateCurrentPosition(): void {
  const editor = bridge.editor
  const scrollEl = bridge.scrollEl
  if (!editor || !scrollEl) return

  const rect = scrollEl.getBoundingClientRect()
  const centerY = rect.top + rect.height / 2
  const centerX = rect.left + rect.width / 2

  const posInfo = editor.view.posAtCoords({ left: centerX, top: centerY })
  if (!posInfo) return

  const doc = editor.state.doc
  let foundActId = ''
  let foundSeqId = ''

  doc.forEach((node, offset) => {
    if (offset > posInfo.pos) return
    const t = node.type.name
    if (t === 'newAct') {
      foundActId = node.attrs.actId || ''
      foundSeqId = ''
    } else if (t === 'sequence') {
      foundSeqId = node.attrs.seqId || ''
      if (node.attrs.actId) foundActId = node.attrs.actId
    }
  })

  currentActId.value = foundActId
  currentSeqId.value = foundSeqId
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
  () => bridge.editor,
  (editor) => {
    if (editor) {
      editor.on('update', updateCurrentPosition)
      updateCurrentPosition()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (bridge.scrollEl && scrollHandler) {
    bridge.scrollEl.removeEventListener('scroll', scrollHandler)
  }
  bridge.editor?.off('update', updateCurrentPosition)
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
