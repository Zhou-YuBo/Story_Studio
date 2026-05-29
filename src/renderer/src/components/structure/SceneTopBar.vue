<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useEditorBridge } from '../../stores/editor-bridge'
import { useLineGridStore } from '../../stores/line-grid'
import { useStructureStore, PROJECT_OWNER_ID, type StructureOwnerType } from '../../stores/structure'
import { resolveStructureAtLine } from '../editor/line-grid/structure-context'
import { useValueCurve, type CurveTarget, type CurveChartConfig } from '../../composables/useValueCurve'

type TopBarLevel = 'project' | 'act' | 'sequence'

const COMPACT_CHART: CurveChartConfig = {
  width: 720,
  left: 20,
  right: 20,
  top: 14,
  height: 56,
}

const bridge = useEditorBridge()
const lineGrid = useLineGridStore()
const store = useStructureStore()
const router = useRouter()
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
  axes,
  visibleAxisIds,
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

function findActIdForSeq(seqId: string): string {
  for (const act of store.acts) {
    if (act.sequences.some((s) => s.id === seqId)) return act.id
  }
  return ''
}

function goToStructure() {
  const { ownerType, ownerId } = resolvedLevel.value
  const query: Record<string, string> = { ownerType }

  if (ownerType !== 'project') {
    query.ownerId = ownerId
  }
  if (ownerType === 'sequence') {
    query.actId = findActIdForSeq(ownerId)
  }

  router.push({ path: '/structure', query })
}

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

interface LegendEntry {
  id: string
  color: string
  positiveLabel: string
  negativeLabel: string
  visible: boolean
}

const legendEntries = computed<LegendEntry[]>(() =>
  axes.value.map((axis) => ({
    id: axis.id,
    color: axis.color,
    positiveLabel: axis.positiveLabel,
    negativeLabel: axis.negativeLabel,
    visible: visibleAxisIds.value.includes(axis.id),
  })),
)

function toggleLegendAxis(entry: LegendEntry) {
  store.toggleValueAxisVisible(resolvedOwnerType.value, resolvedOwnerId.value, entry.id)
}

const highlightX = computed(() => {
  if (!highlightTargetId.value || tickPositions.value.length === 0) return null
  const tick = tickPositions.value.find((t) => t.id === highlightTargetId.value)
  return tick ? tick.x : null
})

const chartRightEdge = COMPACT_CHART.width - COMPACT_CHART.right
const chartBottom = COMPACT_CHART.top + COMPACT_CHART.height
const chartMid = COMPACT_CHART.top + COMPACT_CHART.height / 2
const tickLabelY = chartBottom + 24
const svgViewBoxH = COMPACT_CHART.top + COMPACT_CHART.height + 42
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
      <div class="topbar-spacer" />
      <button class="topbar-goto-btn" title="在结构工作台中编辑此价值曲线" @click="goToStructure">
        结构工作台
      </button>
    </div>

    <div class="topbar-body">
      <!-- 左侧：曲线图 -->
      <div class="curve-area">
        <svg
          v-if="hasData"
          class="curve-svg"
          :viewBox="`0 0 ${COMPACT_CHART.width} ${svgViewBoxH}`"
          role="img"
          aria-label="价值曲线"
        >
          <!-- Highlight band -->
          <rect
            v-if="highlightX !== null"
            :x="highlightX - 18"
            y="0"
            width="36"
            :height="chartBottom"
            class="highlight-band"
          />

          <!-- Grid -->
          <line :x1="COMPACT_CHART.left" :y1="chartBottom" :x2="chartRightEdge" :y2="chartBottom" class="axis-line" />
          <line :x1="COMPACT_CHART.left" :y1="chartMid" :x2="chartRightEdge" :y2="chartMid" class="center-line" />
          <line :x1="COMPACT_CHART.left" :y1="COMPACT_CHART.top" :x2="chartRightEdge" :y2="COMPACT_CHART.top" class="grid-line" />

          <!-- Tick lines and labels -->
          <g v-for="tick in tickPositions" :key="tick.id">
            <line :x1="tick.x" :y1="COMPACT_CHART.top" :x2="tick.x" :y2="chartBottom" class="tick-line" />
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
        </svg>

        <div v-else class="curve-empty">
          <span>{{ chartEmptyText }}</span>
        </div>
      </div>

      <!-- 右侧：价值轴多选图例 -->
      <div v-if="axes.length > 0" class="legend-panel" :class="{ empty: axes.length === 0 }">
        <div
          v-for="entry in legendEntries"
          :key="entry.id"
          class="legend-item"
          :class="{ dimmed: !entry.visible }"
          @click="toggleLegendAxis(entry)"
        >
          <span class="legend-checkbox" :class="{ checked: entry.visible }">
            <span v-if="entry.visible" class="legend-check-mark">&#x2713;</span>
          </span>
          <span class="legend-dot" :style="{ background: entry.visible ? entry.color : '#3f3f46' }" />
          <span class="legend-label">{{ entry.positiveLabel }}/{{ entry.negativeLabel }}</span>
        </div>
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
  flex-shrink: 0;
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

.topbar-spacer {
  flex: 1;
}

.topbar-goto-btn {
  border: 1px solid #3f3f46;
  border-radius: 5px;
  background: transparent;
  color: #a78bfa;
  cursor: pointer;
  padding: 3px 10px;
  font-size: 11px;
  flex-shrink: 0;
  transition: all 0.15s;
}

.topbar-goto-btn:hover {
  background: rgba(167, 139, 250, 0.12);
  border-color: rgba(167, 139, 250, 0.5);
  color: #d8b4fe;
}

/* 主体：曲线 + 图例 */
.topbar-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 左侧曲线区 */
.curve-area {
  flex: 1;
  min-width: 0;
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

.curve-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #52525b;
  font-size: 12px;
}

/* 右侧图例面板 */
.legend-panel {
  width: 170px;
  flex-shrink: 0;
  border-left: 1px solid #27272a;
  padding: 4px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(255, 255, 255, 0.015);
}

.legend-panel.empty {
  display: none;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 22px;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.legend-item.dimmed .legend-label {
  color: #52525b;
}

.legend-checkbox {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #52525b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  transition: all 0.15s;
}

.legend-checkbox.checked {
  background: rgba(167, 139, 250, 0.25);
  border-color: #a78bfa;
}

.legend-check-mark {
  color: #a78bfa;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.legend-label {
  color: #a1a1aa;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
