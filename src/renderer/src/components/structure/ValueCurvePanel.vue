<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import {
  type StructureOwnerType,
  type ValueAxis,
  useStructureStore,
} from '../../stores/structure'
import { useValueCurve, type CurveTarget, type CurveChartConfig } from '../../composables/useValueCurve'

const props = defineProps<{
  ownerType: StructureOwnerType
  ownerId: string
  title: string
  horizontalUnitLabel: string
  targets: CurveTarget[]
}>()

const AXIS_SLOT_COUNT = 14
const FULL_CHART: CurveChartConfig = {
  width: 720,
  left: 142,
  right: 32,
  top: 34,
  height: 168,
}
const CHART_BOTTOM = FULL_CHART.top + FULL_CHART.height
const CHART_MID = FULL_CHART.top + FULL_CHART.height / 2
const CHART_RIGHT_EDGE = FULL_CHART.width - FULL_CHART.right
const CHART_VIEW_H = CHART_BOTTOM + 58

const store = useStructureStore()
const drawerOpen = ref(false)
const activeAxisId = ref('')
const draggingPoint = ref<{ axisId: string; target: CurveTarget } | null>(null)

const ownerTypeRef = toRef(props, 'ownerType')
const ownerIdRef = toRef(props, 'ownerId')
const targetsRef = toRef(props, 'targets')

const {
  axes,
  visibleAxisIds,
  displayedAxes,
  yToValue,
  tickPositions,
  curveSeries,
} = useValueCurve(ownerTypeRef, ownerIdRef, targetsRef, FULL_CHART)

const externalAxes = computed(() => {
  const limit = axes.value.length > AXIS_SLOT_COUNT ? AXIS_SLOT_COUNT - 1 : AXIS_SLOT_COUNT
  return axes.value.slice(0, limit)
})
const drawerAxes = computed(() => axes.value.slice(externalAxes.value.length))
const activeAxis = computed(() => axes.value.find((axis) => axis.id === activeAxisId.value))

const legendSeries = computed(() => curveSeries.value.slice(0, 6))
const hiddenLegendCount = computed(() => Math.max(0, curveSeries.value.length - legendSeries.value.length))

const chartEmptyText = computed(() => {
  if (props.targets.length === 0) return `当前${props.horizontalUnitLabel}层尚未接入曲线横轴`
  if (axes.value.length === 0) return '添加价值轴后，这里将显示曲线'
  if (displayedAxes.value.length === 0) return '勾选价值轴后显示曲线'
  return ''
})

watch(
  () => [props.ownerType, props.ownerId],
  () => {
    drawerOpen.value = false
    activeAxisId.value = axes.value[0]?.id ?? ''
  },
  { immediate: true },
)

watch(axes, (items) => {
  if (items.length === 0) {
    activeAxisId.value = ''
    return
  }

  if (!items.some((axis) => axis.id === activeAxisId.value)) {
    activeAxisId.value = items[0].id
  }
})

function axisLabel(axis: { positiveLabel: string; negativeLabel: string }): string {
  return `${axis.positiveLabel} / ${axis.negativeLabel}`
}

function isAxisVisible(axisId: string): boolean {
  return visibleAxisIds.value.includes(axisId)
}

function toggleAxis(axis: ValueAxis) {
  activeAxisId.value = axis.id
  store.toggleValueAxisVisible(props.ownerType, props.ownerId, axis.id)
}

function selectAxis(axis: ValueAxis) {
  activeAxisId.value = axis.id
}

function addAxis() {
  const axis = store.addValueAxis(props.ownerType, props.ownerId)
  activeAxisId.value = axis.id
}

function updateAxisLabel(axis: ValueAxis, side: 'positive' | 'negative', event: Event) {
  const value = (event.target as HTMLInputElement).value
  store.updateValueAxis(
    axis.id,
    side === 'positive' ? { positiveLabel: value } : { negativeLabel: value },
  )
}

function updateAxisColor(axis: ValueAxis, event: Event) {
  store.updateValueAxis(axis.id, { color: (event.target as HTMLInputElement).value })
}

function setPointFromClientY(axisId: string, target: CurveTarget, clientY: number) {
  const svg = document.querySelector('.curve-svg') as SVGSVGElement | null
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const y = ((clientY - rect.top) / rect.height) * CHART_VIEW_H
  store.setValuePoint(axisId, target.type, target.id, yToValue(y))
}

function startPointDrag(axisId: string, target: CurveTarget, event: PointerEvent) {
  event.preventDefault()
  activeAxisId.value = axisId
  draggingPoint.value = { axisId, target }
  setPointFromClientY(axisId, target, event.clientY)
  window.addEventListener('pointermove', onPointDrag)
  window.addEventListener('pointerup', stopPointDrag)
}

function onPointDrag(event: PointerEvent) {
  if (!draggingPoint.value) return
  setPointFromClientY(draggingPoint.value.axisId, draggingPoint.value.target, event.clientY)
}

function stopPointDrag() {
  draggingPoint.value = null
  window.removeEventListener('pointermove', onPointDrag)
  window.removeEventListener('pointerup', stopPointDrag)
}

onBeforeUnmount(stopPointDrag)
</script>

<template>
  <section class="value-curve-panel">
    <div class="panel-header">
      <div>
        <div class="eyebrow">价值曲线</div>
        <h2>{{ title }}</h2>
      </div>
      <div class="scope-pill">横轴：{{ horizontalUnitLabel }}</div>
    </div>

    <div class="axis-shelf">
      <div class="axis-shelf-head">
        <span>价值轴 {{ visibleAxisIds.length }}/{{ axes.length }}</span>
        <button class="add-axis-btn" type="button" @click="addAxis">+ 价值轴</button>
      </div>

      <div class="axis-chip-grid">
        <div
          v-for="axis in externalAxes"
          :key="axis.id"
          class="axis-chip"
          :class="{ active: activeAxisId === axis.id, visible: isAxisVisible(axis.id) }"
        >
          <button class="axis-toggle" type="button" @click.stop="toggleAxis(axis)">
            {{ isAxisVisible(axis.id) ? '✓' : '' }}
          </button>
          <button class="axis-select" type="button" @click="selectAxis(axis)">
            <span class="axis-color" :style="{ background: axis.color }" />
            <span class="axis-chip-label">{{ axisLabel(axis) }}</span>
          </button>
        </div>

        <button
          v-if="drawerAxes.length > 0"
          class="axis-chip more-chip"
          type="button"
          @click="drawerOpen = !drawerOpen"
        >
          更多 {{ drawerAxes.length }}
        </button>
      </div>

      <div v-if="drawerOpen" class="axis-drawer">
        <div class="axis-chip-grid drawer-chip-grid">
          <div v-for="axis in drawerAxes" :key="axis.id" class="drawer-chip-wrap">
            <div
              class="axis-chip drawer-axis-chip"
              :class="{ active: activeAxisId === axis.id, visible: isAxisVisible(axis.id) }"
            >
              <button class="axis-toggle" type="button" @click.stop="toggleAxis(axis)">
                {{ isAxisVisible(axis.id) ? '✓' : '' }}
              </button>
              <button class="axis-select" type="button" @click="selectAxis(axis)">
                <span class="axis-color" :style="{ background: axis.color }" />
                <span class="axis-chip-label">{{ axisLabel(axis) }}</span>
              </button>
            </div>
            <div class="drawer-order-actions">
              <button class="order-btn" type="button" @click="store.moveValueAxis(axis.id, 'up')">↑</button>
              <button class="order-btn" type="button" @click="store.moveValueAxis(axis.id, 'down')">↓</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="curve-stage">
      <svg
        v-if="targets.length > 0 && displayedAxes.length > 0"
        class="curve-svg"
        :viewBox="`0 0 720 ${CHART_VIEW_H}`"
        role="img"
        aria-label="价值曲线"
      >
        <g class="chart-legend">
          <g v-for="(series, index) in legendSeries" :key="series.axis.id">
            <line
              x1="18"
              :y1="FULL_CHART.top + 16 + index * 18"
              x2="38"
              :y2="FULL_CHART.top + 16 + index * 18"
              :stroke="series.axis.color"
              class="legend-line"
            />
            <text x="46" :y="FULL_CHART.top + 20 + index * 18" class="legend-text">
              {{ axisLabel(series.axis) }}
            </text>
          </g>
          <text v-if="hiddenLegendCount > 0" x="46" :y="FULL_CHART.top + 20 + legendSeries.length * 18" class="legend-more">
            +{{ hiddenLegendCount }}
          </text>
        </g>

        <line :x1="FULL_CHART.left" :y1="FULL_CHART.top" :x2="FULL_CHART.left" :y2="CHART_BOTTOM" class="axis-line" />
        <line :x1="FULL_CHART.left" :y1="CHART_BOTTOM" :x2="CHART_RIGHT_EDGE" :y2="CHART_BOTTOM" class="axis-line" />
        <line :x1="FULL_CHART.left" :y1="CHART_MID" :x2="CHART_RIGHT_EDGE" :y2="CHART_MID" class="center-line" />
        <line :x1="FULL_CHART.left" :y1="FULL_CHART.top + FULL_CHART.height * 1/6" :x2="CHART_RIGHT_EDGE" :y2="FULL_CHART.top + FULL_CHART.height * 1/6" class="grid-line" />
        <line :x1="FULL_CHART.left" :y1="FULL_CHART.top + FULL_CHART.height * 5/6" :x2="CHART_RIGHT_EDGE" :y2="FULL_CHART.top + FULL_CHART.height * 5/6" class="grid-line" />

        <g v-for="tick in tickPositions" :key="tick.id">
          <line :x1="tick.x" :y1="FULL_CHART.top" :x2="tick.x" :y2="CHART_BOTTOM" class="tick-line" />
          <text :x="tick.x" :y="CHART_BOTTOM + 28" text-anchor="middle" class="tick-label">
            {{ tick.label }}
          </text>
        </g>

        <g v-for="series in curveSeries" :key="series.axis.id">
          <path :d="series.path" :stroke="series.axis.color" class="curve-path" />
          <circle
            v-for="point in series.points"
            :key="point.target.id"
            :cx="point.x"
            :cy="point.y"
            r="6"
            :fill="series.axis.color"
            class="curve-point"
            @pointerdown="startPointDrag(series.axis.id, point.target, $event)"
          />
        </g>
      </svg>

      <div v-else class="curve-empty">
        <span>{{ chartEmptyText }}</span>
      </div>
    </div>

    <div v-if="activeAxis" class="compact-axis-editor">
      <span>当前轴</span>
      <input
        type="color"
        :value="activeAxis.color"
        class="axis-color-input"
        @input="updateAxisColor(activeAxis, $event)"
      />
      <input
        type="text"
        :value="activeAxis.positiveLabel"
        class="axis-name-input"
        @blur="updateAxisLabel(activeAxis, 'positive', $event)"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span>/</span>
      <input
        type="text"
        :value="activeAxis.negativeLabel"
        class="axis-name-input"
        @blur="updateAxisLabel(activeAxis, 'negative', $event)"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span class="drag-hint">拖动曲线点调整数值</span>
    </div>
  </section>
</template>

<style scoped>
.value-curve-panel {
  min-height: 360px;
  flex: 3;
  display: flex;
  flex-direction: column;
  border: 1px solid #27272a;
  border-radius: 12px;
  background: #18181b;
  padding: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  color: #71717a;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 4px 0 0;
  color: #e4e4e7;
  font-size: 20px;
  font-weight: 600;
}

.scope-pill {
  border: 1px solid #3f3f46;
  border-radius: 999px;
  padding: 5px 12px;
  color: #a1a1aa;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.axis-shelf {
  position: relative;
  margin-top: 14px;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.025);
}

.axis-shelf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #71717a;
  font-size: 12px;
  margin-bottom: 8px;
}

.add-axis-btn,
.order-btn {
  border: 1px solid #3f3f46;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
}

.add-axis-btn {
  padding: 3px 9px;
  font-size: 12px;
}

.axis-chip-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.axis-chip {
  min-width: 0;
  height: 28px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #3f3f46;
  border-radius: 999px;
  background: #111114;
  color: #71717a;
  overflow: hidden;
  font-size: 12px;
  transition: all 0.15s;
}

.axis-chip.visible {
  color: #d4d4d8;
  background: rgba(255, 255, 255, 0.045);
}

.axis-chip.active {
  border-color: rgba(167, 139, 250, 0.65);
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.15);
}

.axis-toggle,
.axis-select {
  height: 100%;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.axis-toggle {
  width: 30px;
  flex-shrink: 0;
  color: #a78bfa;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.axis-select {
  min-width: 0;
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px 0 7px;
}

.axis-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.axis-color {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.more-chip {
  justify-content: center;
  color: #a78bfa;
}

.axis-drawer {
  margin-top: 6px;
  border-top: 1px solid rgba(167, 139, 250, 0.22);
  padding-top: 6px;
}

.drawer-chip-grid {
  grid-auto-rows: 28px;
}

.drawer-chip-wrap {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
}

.drawer-axis-chip {
  width: 100%;
}

.drawer-order-actions {
  display: flex;
  gap: 2px;
}

.order-btn {
  width: 22px;
  height: 28px;
  border: 1px solid #3f3f46;
  border-radius: 999px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  font-size: 11px;
}

.order-btn:hover {
  color: #d4d4d8;
  border-color: #52525b;
}

.curve-stage {
  min-height: 0;
  flex: 1;
  margin-top: 12px;
  border: 1px solid #27272a;
  border-radius: 10px;
  background:
    radial-gradient(circle at 50% 10%, rgba(167, 139, 250, 0.08), transparent 34%),
    #101013;
  overflow: hidden;
}

.curve-svg {
  width: 100%;
  height: 100%;
  min-height: 230px;
  display: block;
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
  stroke-width: 1.2;
}

.center-line {
  stroke: #52525b;
  stroke-dasharray: 5 7;
  stroke-width: 1;
}

.grid-line,
.tick-line {
  stroke: rgba(113, 113, 122, 0.22);
  stroke-width: 1;
}

.tick-label {
  fill: #a1a1aa;
  font-size: 12px;
}

.curve-path {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.16));
}

.legend-line {
  stroke-width: 3;
  stroke-linecap: round;
}

.legend-text,
.legend-more {
  fill: #a1a1aa;
  font-size: 11px;
}

.legend-more {
  fill: #71717a;
}

.curve-point {
  cursor: ns-resize;
  stroke: #101013;
  stroke-width: 2;
}

.curve-point:hover {
  r: 8px;
}

.curve-empty {
  width: 100%;
  height: 100%;
  min-height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717a;
  font-size: 14px;
}

.compact-axis-editor {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  color: #71717a;
  font-size: 12px;
}

.axis-color-input {
  width: 24px;
  height: 24px;
  border: 1px solid #3f3f46;
  border-radius: 5px;
  background: transparent;
  padding: 1px;
}

.axis-name-input {
  width: 84px;
  border: 1px solid #3f3f46;
  border-radius: 5px;
  background: #111114;
  color: #d4d4d8;
  padding: 4px 6px;
  outline: none;
  font-size: 12px;
}

.drag-hint {
  color: #52525b;
}
</style>
