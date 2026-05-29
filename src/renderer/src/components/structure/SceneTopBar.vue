<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorBridge } from '../../stores/editor-bridge'
import { useLineGridStore } from '../../stores/line-grid'
import { useStructureStore, PROJECT_OWNER_ID, type StructureOwnerType } from '../../stores/structure'
import { resolveStructureAtLine } from '../editor/line-grid/structure-context'
import { useValueCurve, type CurveTarget, type CurveChartConfig } from '../../composables/useValueCurve'

type TopBarLevel = 'project' | 'act' | 'sequence'

const COMPACT_CHART: CurveChartConfig = {
  width: 720,
  left: 24,
  right: 24,
  top: 16,
  height: 56,
}

const bridge = useEditorBridge()
const lineGrid = useLineGridStore()
const store = useStructureStore()
const { snapshot } = storeToRefs(lineGrid)

const selectedLevel = ref<TopBarLevel>('project')
const currentActId = ref('')
const currentSeqId = ref('')

const currentAct = computed(() => store.acts.find((a) => a.id === currentActId.value))
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

watch(snapshot, () => updateCurrentPosition(), { immediate: true })

onBeforeUnmount(() => {
  if (bridge.scrollEl && scrollHandler) {
    bridge.scrollEl.removeEventListener('scroll', scrollHandler)
  }
})

interface ResolvedLevel {
  ownerType: StructureOwnerType
  ownerId: string
  label: string
}

const resolvedLevel = computed<ResolvedLevel>(() => {
  if (selectedLevel.value === 'project') {
    return { ownerType: 'project', ownerId: PROJECT_OWNER_ID, label: '项目' }
  }

  if (selectedLevel.value === 'act') {
    if (currentActId.value && currentAct.value) {
      return { ownerType: 'act', ownerId: currentActId.value, label: currentAct.value.label }
    }
    return { ownerType: 'project', ownerId: PROJECT_OWNER_ID, label: '项目' }
  }

  if (currentSeqId.value && currentSeq.value) {
    return { ownerType: 'sequence', ownerId: currentSeqId.value, label: currentSeq.value.label }
  }
  if (currentActId.value && currentAct.value) {
    return { ownerType: 'act', ownerId: currentActId.value, label: currentAct.value.label }
  }
  return { ownerType: 'project', ownerId: PROJECT_OWNER_ID, label: '项目' }
})

const resolvedOwnerType = computed(() => resolvedLevel.value.ownerType)
const resolvedOwnerId = computed(() => resolvedLevel.value.ownerId)

const effectiveTargets = computed<CurveTarget[]>(() => {
  const { ownerType, ownerId } = resolvedLevel.value

  if (ownerType === 'project') {
    return store.acts.map((act) => ({ id: act.id, type: 'act' as StructureOwnerType, label: act.label }))
  }

  if (ownerType === 'act') {
    const act = store.acts.find((a) => a.id === ownerId)
    return (act?.sequences ?? []).map((seq) => ({ id: seq.id, type: 'sequence' as StructureOwnerType, label: seq.label }))
  }

  const act = store.acts.find((a) => a.sequences.some((s) => s.id === ownerId))
  const seq = act?.sequences.find((s) => s.id === ownerId)
  return (seq?.scenes ?? []).map((scene) => ({ id: scene.id, type: 'scene' as StructureOwnerType, label: scene.label }))
})

const highlightTargetId = computed(() => {
  const { ownerType } = resolvedLevel.value
  if (ownerType === 'project') return currentActId.value
  if (ownerType === 'act') return currentSeqId.value
  return ''
})

const {
  displayedAxes,
  tickPositions,
  curveSeries,
  chartEmptyText,
} = useValueCurve(resolvedOwnerType, resolvedOwnerId, effectiveTargets, COMPACT_CHART)

const hasData = computed(() => effectiveTargets.value.length > 0 && displayedAxes.value.length > 0)

function setLevel(level: TopBarLevel) {
  selectedLevel.value = level
}

const isFallingBack = computed(() => {
  if (selectedLevel.value === 'project') return false
  if (selectedLevel.value === 'act') return resolvedLevel.value.ownerType === 'project'
  return resolvedLevel.value.ownerType !== 'sequence'
})

function scrollToTarget(target: CurveTarget) {
  const scrollEl = bridge.scrollEl
  if (!scrollEl) return

  const markers = snapshot.value.markers
  let markerLineIndex = -1

  if (target.type === 'act') {
    const marker = markers.find((m) => m.type === 'newAct' && m.actId === target.id)
    if (marker) markerLineIndex = marker.lineIndex
  } else if (target.type === 'sequence') {
    const marker = markers.find((m) => m.type === 'sequence' && m.seqId === target.id)
    if (marker) markerLineIndex = marker.lineIndex
  }

  if (markerLineIndex >= 0) {
    const y = lineGrid.lineIndexToY(markerLineIndex)
    scrollEl.scrollTo({ top: Math.max(0, y - 80), behavior: 'smooth' })
  }
}

const legendItems = computed(() => curveSeries.value.slice(0, 8))
const hiddenLegendCount = computed(() => Math.max(0, curveSeries.value.length - legendItems.value.length))

const highlightX = computed(() => {
  if (!highlightTargetId.value || tickPositions.value.length === 0) return null
  const tick = tickPositions.value.find((t) => t.id === highlightTargetId.value)
  return tick ? tick.x : null
})

const svgViewBox = computed(() => {
  const { width, top, height } = COMPACT_CHART
  const totalHeight = top + height + 42
  return `0 0 ${width} ${totalHeight}`
})

const svgBottom = computed(() => COMPACT_CHART.top + COMPACT_CHART.height)
const tickLabelY = computed(() => svgBottom.value + 24)
</script>

<template>
  <div class="scene-topbar">
    <div class="topbar-level-bar">
      <span class="topbar-section-label">价值曲线</span>
      <div class="level-pills">
        <button
          class="level-pill"
          :class="{ active: selectedLevel === 'project' }"
          @click="setLevel('project')"
        >
          项目
        </button>
        <button
          class="level-pill"
          :class="{ active: selectedLevel === 'act' }"
          @click="setLevel('act')"
        >
          幕
        </button>
        <button
          class="level-pill"
          :class="{ active: selectedLevel === 'sequence' }"
          @click="setLevel('sequence')"
        >
          序列
        </button>
      </div>
      <span class="topbar-owner-label">{{ resolvedLevel.label }}</span>
      <span v-if="isFallingBack" class="topbar-fallback-hint">（回退）</span>
    </div>

    <div class="topbar-curve-area">
      <svg
        v-if="hasData"
        class="curve-svg"
        :viewBox="svgViewBox"
        role="img"
        aria-label="价值曲线"
      >
        <!-- Highlight band -->
        <rect
          v-if="highlightX !== null"
          :x="highlightX - 18"
          y="0"
          width="36"
          :height="svgBottom"
          class="highlight-band"
        />

        <!-- Grid -->
        <line :x1="COMPACT_CHART.left" :y1="svgBottom" :x2="COMPACT_CHART.width - COMPACT_CHART.right" :y2="svgBottom" class="axis-line" />
        <line :x1="COMPACT_CHART.left" :y1="COMPACT_CHART.top + COMPACT_CHART.height / 2" :x2="COMPACT_CHART.width - COMPACT_CHART.right" :y2="COMPACT_CHART.top + COMPACT_CHART.height / 2" class="center-line" />
        <line :x1="COMPACT_CHART.left" :y1="COMPACT_CHART.top" :x2="COMPACT_CHART.width - COMPACT_CHART.right" :y2="COMPACT_CHART.top" class="grid-line" />

        <!-- Tick lines and labels -->
        <g v-for="tick in tickPositions" :key="tick.id">
          <line :x1="tick.x" :y1="COMPACT_CHART.top" :x2="tick.x" :y2="svgBottom" class="tick-line" />
          <text
            :x="tick.x"
            :y="tickLabelY"
            text-anchor="middle"
            class="tick-label"
            :class="{ highlighted: tick.id === highlightTargetId }"
            @click="scrollToTarget(tick)"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- Curves -->
        <g v-for="series in curveSeries" :key="series.axis.id">
          <path :d="series.path" :stroke="series.axis.color" class="curve-path" />
          <circle
            v-for="point in series.points"
            :key="point.target.id"
            :cx="point.x"
            :cy="point.y"
            r="4"
            :fill="series.axis.color"
            class="curve-point"
            :class="{ highlighted: point.target.id === highlightTargetId }"
          />
        </g>

        <!-- Legend -->
        <g class="compact-legend">
          <g v-for="(item, index) in legendItems" :key="item.axis.id">
            <circle
              :cx="COMPACT_CHART.left + index * 136"
              :cy="svgBottom + 36"
              r="3"
              :fill="item.axis.color"
            />
            <text
              :x="COMPACT_CHART.left + 8 + index * 136"
              :y="svgBottom + 37"
              class="legend-text"
            >
              {{ item.axis.positiveLabel }}/{{ item.axis.negativeLabel }}
            </text>
          </g>
          <text
            v-if="hiddenLegendCount > 0"
            :x="COMPACT_CHART.left + legendItems.length * 136"
            :y="svgBottom + 37"
            class="legend-more"
          >
            +{{ hiddenLegendCount }}
          </text>
        </g>
      </svg>

      <div v-else class="curve-empty">
        <span>{{ chartEmptyText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-topbar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 140px;
  background: #09090b;
  border-bottom: 1px solid #27272a;
  user-select: none;
}

.topbar-level-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.topbar-section-label {
  color: #71717a;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.level-pills {
  display: flex;
  gap: 3px;
  background: #18181b;
  border-radius: 6px;
  padding: 2px;
}

.level-pill {
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  padding: 2px 10px;
  font-size: 11px;
  transition: all 0.15s;
}

.level-pill:hover {
  color: #d4d4d8;
}

.level-pill.active {
  background: #3f3f46;
  color: #f4f4f5;
}

.topbar-owner-label {
  color: #a1a1aa;
  font-size: 11px;
  flex-shrink: 0;
}

.topbar-fallback-hint {
  color: #52525b;
  font-size: 10px;
}

.topbar-curve-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 40%, rgba(167, 139, 250, 0.06), transparent 40%),
    #0a0a0d;
}

.curve-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.highlight-band {
  fill: rgba(167, 139, 250, 0.08);
  pointer-events: none;
}

.axis-line,
.center-line,
.grid-line,
.tick-line {
  fill: none;
  vector-effect: non-scaling-stroke;
}

.axis-line {
  stroke: #3f3f46;
  stroke-width: 1;
}

.center-line {
  stroke: #52525b;
  stroke-dasharray: 4 6;
  stroke-width: 0.8;
}

.grid-line {
  stroke: rgba(113, 113, 122, 0.18);
  stroke-width: 0.8;
}

.tick-line {
  stroke: rgba(113, 113, 122, 0.14);
  stroke-width: 0.8;
}

.tick-label {
  fill: #a1a1aa;
  font-size: 10px;
  cursor: pointer;
  transition: fill 0.15s;
}

.tick-label:hover {
  fill: #f4f4f5;
}

.tick-label.highlighted {
  fill: #c084fc;
  font-weight: 600;
}

.curve-path {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.12));
}

.curve-point {
  cursor: default;
  stroke: #101013;
  stroke-width: 1.5;
  transition: r 0.15s;
}

.curve-point.highlighted {
  r: 6;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3));
}

.compact-legend {
  pointer-events: none;
}

.legend-text {
  fill: #71717a;
  font-size: 9px;
}

.legend-more {
  fill: #52525b;
  font-size: 9px;
}

.curve-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #52525b;
  font-size: 12px;
}
</style>
