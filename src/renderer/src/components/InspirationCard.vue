<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useInspirationStore, type InspirationItem } from '../stores/inspiration'

const props = defineProps<{
  id: string
  data: { inspirationId: string; onRightMouseDown: (nodeId: string) => void }
  selected?: boolean
}>()

const store = useInspirationStore()
const item = computed<InspirationItem | undefined>(() =>
  store.getItemById(props.data.inspirationId),
)

const highlighted = computed(() => store.highlightCardIds.includes(props.id))

function onRightMouseDown(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  props.data.onRightMouseDown(props.id)
}

// ---- PDF 备注编辑 ----
const noteText = ref(item.value?.content ?? '')
watch(() => item.value?.content, (v) => { noteText.value = v ?? '' })

function onNoteInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  noteText.value = val
  store.updateItemContent(props.data.inspirationId, val)
}

// ---- 音频播放 ----
const audioEl = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const progress = ref(0)
const currentTimeStr = ref('0:00')
const durationStr = ref('0:00')
let rafId = 0

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function togglePlay() {
  const el = audioEl.value
  if (!el) return
  if (el.paused) {
    el.play()
    playing.value = true
    tick()
  } else {
    el.pause()
    playing.value = false
    cancelAnimationFrame(rafId)
  }
}

function tick() {
  const el = audioEl.value
  if (!el) return
  progress.value = el.duration ? (el.currentTime / el.duration) * 100 : 0
  currentTimeStr.value = fmtTime(el.currentTime)
  if (!el.paused) rafId = requestAnimationFrame(tick)
}

function onLoadedMetadata() {
  const el = audioEl.value
  if (el) durationStr.value = fmtTime(el.duration)
}

function onAudioEnded() {
  playing.value = false
  progress.value = 0
  currentTimeStr.value = '0:00'
}

function onSeek(e: MouseEvent) {
  const el = audioEl.value
  const bar = e.currentTarget as HTMLElement
  if (!el || !el.duration) return
  const rect = bar.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
  progress.value = ratio * 100
  currentTimeStr.value = fmtTime(el.currentTime)
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  audioEl.value?.pause()
})
</script>

<template>
  <div
    class="inspiration-card"
    :class="{ selected, highlighted }"
    @mousedown.right="onRightMouseDown"
  >
    <div class="card-header">
      <span class="card-title">{{ item?.title ?? '未知' }}</span>
      <span class="card-badge">{{ item?.type }}</span>
    </div>

    <div class="card-body">
      <template v-if="item?.type === 'image'">
        <img :src="item.filePath" class="card-image" />
      </template>
      <template v-else-if="item?.type === 'text'">
        <textarea
          :value="noteText"
          @input="onNoteInput"
          @mousedown.stop
          @pointerdown.stop
          placeholder="写点什么…"
          class="card-note"
        />
      </template>
      <template v-else-if="item?.type === 'pdf'">
        <textarea
          :value="noteText"
          @input="onNoteInput"
          @mousedown.stop
          @pointerdown.stop
          placeholder="备注这份 PDF 的要点…"
          class="card-note"
        />
      </template>
      <template v-else-if="item?.type === 'audio'">
        <audio
          ref="audioEl"
          :src="item.filePath"
          preload="metadata"
          @loadedmetadata="onLoadedMetadata"
          @ended="onAudioEnded"
        />
        <div class="audio-player">
          <button class="audio-btn" @click.stop="togglePlay" @mousedown.stop @pointerdown.stop>
            <span v-if="playing">⏸</span>
            <span v-else>▶</span>
          </button>
          <div class="audio-bar" @click.stop="onSeek" @mousedown.stop @pointerdown.stop>
            <div class="audio-bar-fill" :style="{ width: progress + '%' }" />
          </div>
          <span class="audio-time">{{ currentTimeStr }}/{{ durationStr }}</span>
        </div>
        <textarea
          :value="noteText"
          @input="onNoteInput"
          @mousedown.stop
          @pointerdown.stop
          placeholder="备注这段音频…"
          class="card-note"
        />
      </template>
    </div>

    <Handle type="source" :position="Position.Right" class="hidden-handle" />
    <Handle type="target" :position="Position.Left" class="hidden-handle" />
  </div>
</template>

<style scoped>
.inspiration-card {
  width: 260px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  cursor: grab;
  transition: border-color 0.15s;
}

.inspiration-card:active {
  cursor: grabbing;
}

.inspiration-card.selected {
  border-color: #a78bfa;
}

.inspiration-card.highlighted {
  border-color: #a78bfa;
  box-shadow: 0 0 12px 2px rgba(167, 139, 250, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: #09090b;
  border-bottom: 1px solid #27272a;
}

.card-title {
  color: #d4d4d8;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-badge {
  flex-shrink: 0;
  font-size: 10px;
  color: #71717a;
  text-transform: uppercase;
}

.card-body {
  padding: 8px 10px;
}

.card-image {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.card-text {
  color: #a1a1aa;
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.card-placeholder {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #27272a;
  border-radius: 4px;
  color: #71717a;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
}

.card-desc {
  color: #a1a1aa;
  font-size: 11px;
  margin: 6px 0 0;
}

.card-note {
  width: 100%;
  min-height: 60px;
  max-height: 120px;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 4px;
  color: #d4d4d8;
  font-size: 11px;
  line-height: 1.5;
  padding: 6px 8px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.card-note::placeholder {
  color: #52525b;
}

.card-note:focus {
  border-color: #a78bfa;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.audio-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #3f3f46;
  border: none;
  color: #d4d4d8;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.audio-btn:hover {
  background: #52525b;
}

.audio-bar {
  flex: 1;
  height: 4px;
  background: #3f3f46;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.audio-bar-fill {
  height: 100%;
  background: #a78bfa;
  border-radius: 2px;
  transition: width 0.05s linear;
}

.audio-time {
  flex-shrink: 0;
  font-size: 10px;
  color: #71717a;
}

.hidden-handle {
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
