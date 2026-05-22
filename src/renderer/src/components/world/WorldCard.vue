<script setup lang="ts">
import { computed, ref, watch, inject } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useWorldStore } from '../../stores/world'
import { canvasHistoryKey } from '../../composables/canvasHistoryKey'

const props = defineProps<{
  id: string
  data: { objectId: string }
  selected?: boolean
}>()

const history = inject(canvasHistoryKey, null)

const store = useWorldStore()
const { getViewport } = useVueFlow()
const obj = computed(() => store.getObjectById(props.data.objectId))
const cardColor = computed(() => store.resolveCardColor(props.id))
const card = computed(() => store.cards.find((c) => c.id === props.id))
const cardX = computed(() => card.value?.x ?? 0)
const cardY = computed(() => card.value?.y ?? 0)
const cardWidth = computed(() => card.value?.width ?? 220)
const cardHeight = computed(() => card.value?.height ?? 120)

function onHeaderDblClick() {
  if (obj.value) {
    store.openDetail(obj.value.id)
  }
}

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

// ---- 详情编辑 ----
const detailText = ref(obj.value?.detailContent ?? '')
watch(() => obj.value?.detailContent, (v) => { detailText.value = v ?? '' })

function onDetailInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  detailText.value = val
  if (obj.value) {
    store.updateObjectDetail(obj.value.id, 'text', val)
  }
}
</script>

<template>
  <div
    class="world-card"
    :class="{ selected }"
    :style="{ borderTopColor: cardColor, width: cardWidth + 'px', height: cardHeight + 'px' }"
  >
    <div
      class="card-header"
      :style="{ background: cardColor + '22' }"
      @dblclick="onHeaderDblClick"
    >
      <span class="card-color-bar" :style="{ background: cardColor }"></span>
      <span class="card-title">{{ obj?.name ?? '未知' }}</span>
    </div>

    <div class="card-body">
      <template v-if="obj?.detailType === 'image' && obj.detailContent">
        <img :src="obj.detailContent" class="card-image" />
      </template>
      <template v-else>
        <textarea
          :value="detailText"
          @input="onDetailInput"
          @mousedown.stop
          @pointerdown.stop
          placeholder="写点什么…"
          class="card-detail"
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
.world-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-top: 3px solid #6b7280;
  border-radius: 8px;
  overflow: visible;
  font-size: 13px;
  cursor: grab;
  transition: border-color 0.15s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.world-card:active {
  cursor: grabbing;
}

.world-card.selected {
  border-color: #a78bfa;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid #27272a;
  cursor: default;
}

.card-color-bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}

.card-title {
  color: #d4d4d8;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.card-detail {
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

.card-detail::placeholder {
  color: #52525b;
}

.card-detail:focus {
  border-color: #a78bfa;
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
