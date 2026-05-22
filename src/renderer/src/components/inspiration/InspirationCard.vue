<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, inject } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useInspirationStore, type InspirationItem } from '../../stores/inspiration'
import { canvasHistoryKey } from '../../composables/canvasHistoryKey'

const history = inject(canvasHistoryKey, null)

const props = defineProps<{
  id: string
  data: { inspirationId: string }
  selected?: boolean
}>()

const store = useInspirationStore()
const { getViewport } = useVueFlow()
const item = computed<InspirationItem | undefined>(() =>
  store.getItemById(props.data.inspirationId),
)

const card = computed(() => store.cards.find((c) => c.id === props.id))
const cardX = computed(() => card.value?.x ?? 0)
const cardY = computed(() => card.value?.y ?? 0)
const cardWidth = computed(() => card.value?.width ?? 260)
const cardHeight = computed(() => card.value?.height ?? 160)

const highlighted = computed(() => store.highlightCardIds.includes(props.id))

// ---- 8 方向缩放 ----
type Dir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const dirConfig: Record<Dir, { cursor: string; wSign: number; hSign: number; moveX: boolean; moveY: boolean }> = {
  n:  { cursor: 'ns-resize',  wSign: 0,  hSign: -1, moveX: false, moveY: true  },
  s:  { cursor: 'ns-resize',  wSign: 0,  hSign: 1,  moveX: false, moveY: false },
  e:  { cursor: 'ew-resize',  wSign: 1,  hSign: 0,  moveX: false, moveY: false },
  w:  { cursor: 'ew-resize',  wSign: -1, hSign: 0,  moveX: true,  moveY: false },
  nw: { cursor: 'nwse-resize', wSign: -1, hSign: -1, moveX: true,  moveY: true  },
  ne: { cursor: 'nesw-resize', wSign: 1,  hSign: -1, moveX: false, moveY: true  },
  sw: { cursor: 'nesw-resize', wSign: -1, hSign: 1,  moveX: true,  moveY: false },
  se: { cursor: 'nwse-resize', wSign: 1,  hSign: 1,  moveX: false, moveY: false },
}

function onResizeMouseDown(e: MouseEvent, dir: Dir) {
  e.preventDefault()
  e.stopPropagation()
  history?.beginBatch()
  const zoom = getViewport().zoom || 1
  const startX = e.clientX
  const startY = e.clientY
  const startW = cardWidth.value
  const startH = cardHeight.value
  const startCardX = cardX.value
  const startCardY = cardY.value
  const cfg = dirConfig[dir]

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / zoom
    const dy = (ev.clientY - startY) / zoom
    const newW = startW + cfg.wSign * dx
    const newH = startH + cfg.hSign * dy
    const newX = cfg.moveX ? startCardX + dx : startCardX
    const newY = cfg.moveY ? startCardY + dy : startCardY

    if (cfg.moveX || cfg.moveY) {
      store.updateCardRect(props.id, newX, newY, newW, newH)
    } else {
      store.updateCardSize(props.id, newW, newH)
    }
  }
  function onUp() {
    history?.endBatch()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
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
    :style="{ width: cardWidth + 'px', height: cardHeight + 'px' }"
    @mousedown.right.prevent
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

    <!-- 8 方向缩放手柄 -->
    <div class="rh rh-n" :style="{ cursor: dirConfig.n.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'n')"></div>
    <div class="rh rh-s" :style="{ cursor: dirConfig.s.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 's')"></div>
    <div class="rh rh-e" :style="{ cursor: dirConfig.e.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'e')"></div>
    <div class="rh rh-w" :style="{ cursor: dirConfig.w.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'w')"></div>
    <div class="rh rh-nw" :style="{ cursor: dirConfig.nw.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'nw')"></div>
    <div class="rh rh-ne" :style="{ cursor: dirConfig.ne.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'ne')"></div>
    <div class="rh rh-sw" :style="{ cursor: dirConfig.sw.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'sw')"></div>
    <div class="rh rh-se" :style="{ cursor: dirConfig.se.cursor }" @pointerdown.stop @mousedown.stop.prevent="onResizeMouseDown($event, 'se')"></div>

    <Handle type="source" :position="Position.Right" class="hidden-handle" />
    <Handle type="target" :position="Position.Left" class="hidden-handle" />
  </div>
</template>

<style scoped>
.inspiration-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  overflow: visible;
  font-size: 13px;
  cursor: grab;
  transition: border-color 0.15s;
  position: relative;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-image {
  width: 100%;
  flex: 1;
  min-height: 0;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.card-note {
  width: 100%;
  flex: 1;
  min-height: 0;
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

/* 8 方向缩放手柄 */
.rh {
  position: absolute;
  z-index: 5;
}
.rh-n  { top: -3px;    left: 8px;    right: 8px;   height: 6px; }
.rh-s  { bottom: -3px; left: 8px;    right: 8px;   height: 6px; }
.rh-e  { top: 8px;     right: -3px;  bottom: 8px;  width: 6px;  }
.rh-w  { top: 8px;     left: -3px;   bottom: 8px;  width: 6px;  }
.rh-nw { top: -3px;    left: -3px;   width: 10px;  height: 10px; }
.rh-ne { top: -3px;    right: -3px;  width: 10px;  height: 10px; }
.rh-sw { bottom: -3px; left: -3px;   width: 10px;  height: 10px; }
.rh-se { bottom: -3px; right: -3px;  width: 10px;  height: 10px; }

.rh-se::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 7px;
  height: 7px;
  border-right: 2px solid #52525b;
  border-bottom: 2px solid #52525b;
  transition: border-color 0.15s;
}

.rh-se:hover::after {
  border-color: #a78bfa;
}

.hidden-handle {
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
