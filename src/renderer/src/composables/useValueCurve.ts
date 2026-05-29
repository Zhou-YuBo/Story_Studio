import { computed, type ComputedRef, type Ref } from 'vue'
import { type StructureOwnerType, useStructureStore } from '../stores/structure'

export interface CurveTarget {
  id: string
  type: StructureOwnerType
  label: string
}

export interface CurveChartConfig {
  width: number
  left: number
  right: number
  top: number
  height: number
}

export interface TickPosition {
  id: string
  type: StructureOwnerType
  label: string
  x: number
}

export interface CurvePoint {
  target: TickPosition
  x: number
  y: number
  value: number
}

export interface CurveSeries {
  axis: { id: string; color: string; positiveLabel: string; negativeLabel: string }
  path: string
  points: CurvePoint[]
}

export function useValueCurve(
  ownerType: Ref<StructureOwnerType> | ComputedRef<StructureOwnerType>,
  ownerId: Ref<string> | ComputedRef<string>,
  targets: Ref<CurveTarget[]> | ComputedRef<CurveTarget[]>,
  chartConfig: CurveChartConfig = { width: 720, left: 142, right: 32, top: 34, height: 168 },
) {
  const store = useStructureStore()
  const { width, left, right, top, height } = chartConfig

  const axes = computed(() => store.getValueAxesForOwner(ownerType.value, ownerId.value))
  const visibleAxisIds = computed(() => store.getVisibleAxisIds(ownerType.value, ownerId.value))

  const displayedAxes = computed(() =>
    axes.value.filter((axis) => visibleAxisIds.value.includes(axis.id)),
  )

  function valueToY(value: number): number {
    return top + height / 2 - (value / 100) * (height / 2)
  }

  function yToValue(y: number): number {
    const raw = ((top + height / 2 - y) / (height / 2)) * 100
    return Math.max(-100, Math.min(100, Math.round(raw)))
  }

  const tickPositions = computed<TickPosition[]>(() => {
    const chartWidth = width - left - right
    const list = targets.value

    return list.map((target, index) => ({
      ...target,
      x:
        list.length === 1
          ? left + chartWidth / 2
          : left + (chartWidth * index) / (list.length - 1),
    }))
  })

  const curveSeries = computed<CurveSeries[]>(() =>
    displayedAxes.value.map((axis) => {
      const points: CurvePoint[] = tickPositions.value.map((tick) => ({
        target: tick,
        x: tick.x,
        y: valueToY(store.getValuePoint(axis.id, tick.id)),
        value: store.getValuePoint(axis.id, tick.id),
      }))
      const path = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' ')

      return { axis, path, points }
    }),
  )

  const chartEmptyText = computed(() => {
    if (targets.value.length === 0) return '暂无横轴目标'
    if (axes.value.length === 0) return '添加价值轴后，这里将显示曲线'
    if (displayedAxes.value.length === 0) return '勾选价值轴后显示曲线'
    return ''
  })

  function getValuePoint(axisId: string, targetId: string): number {
    return store.getValuePoint(axisId, targetId)
  }

  return {
    axes,
    visibleAxisIds,
    displayedAxes,
    valueToY,
    yToValue,
    tickPositions,
    curveSeries,
    chartEmptyText,
    getValuePoint,
  }
}
