<script setup lang="ts">
import { computed } from 'vue'

export interface CharacterDimensionPair {
  id: string
  positive: string
  negative: string
}

export interface CharacterDimensionSlot {
  dimensionId: string
  inverted?: boolean
}

interface WheelArrow {
  id: string
  dimensionId: string
  label: string
  angle: number
}

const props = withDefaults(
  defineProps<{
    dimensions: CharacterDimensionPair[]
    slots?: CharacterDimensionSlot[]
    selectedDimensionId?: string
    size?: number
    ringRadius?: number
    arrowStartRadius?: number
    arrowEndRadius?: number
    labelRadius?: number
  }>(),
  {
    size: 520,
  },
)

const emit = defineEmits<{
  select: [dimensionId: string]
}>()

const wheelCenter = computed(() => props.size / 2)
const computedRingRadius = computed(() => props.ringRadius ?? props.size * 0.288)
const computedArrowStartRadius = computed(() => props.arrowStartRadius ?? props.size * 0.065)
const computedArrowEndRadius = computed(() => props.arrowEndRadius ?? props.size * 0.408)
const computedLabelRadius = computed(() => props.labelRadius ?? props.size * 0.458)

const orderedDimensions = computed(() => {
  const dimensionsById = new Map(props.dimensions.map((dimension) => [dimension.id, dimension]))
  const usedDimensionIds = new Set<string>()
  const ordered: Array<{ dimension: CharacterDimensionPair; inverted: boolean }> = []

  for (const slot of props.slots ?? []) {
    const dimension = dimensionsById.get(slot.dimensionId)
    if (!dimension || usedDimensionIds.has(dimension.id)) continue
    ordered.push({ dimension, inverted: slot.inverted ?? false })
    usedDimensionIds.add(dimension.id)
  }

  for (const dimension of props.dimensions) {
    if (usedDimensionIds.has(dimension.id)) continue
    ordered.push({ dimension, inverted: false })
  }

  return ordered
})

const wheelArrows = computed<WheelArrow[]>(() => {
  const count = orderedDimensions.value.length
  if (count === 0) return []

  const step = 180 / count
  return orderedDimensions.value.flatMap(({ dimension, inverted }, index) => {
    const angle = -90 + index * step
    const positiveAngle = inverted ? angle + 180 : angle
    const negativeAngle = inverted ? angle : angle + 180

    return [
      {
        id: `${dimension.id}-positive`,
        dimensionId: dimension.id,
        label: dimension.positive,
        angle: positiveAngle,
      },
      {
        id: `${dimension.id}-negative`,
        dimensionId: dimension.id,
        label: dimension.negative,
        angle: negativeAngle,
      },
    ]
  })
})

function toRadians(angle: number) {
  return (angle * Math.PI) / 180
}

function pointX(angle: number, radius: number) {
  return wheelCenter.value + Math.cos(toRadians(angle)) * radius
}

function pointY(angle: number, radius: number) {
  return wheelCenter.value + Math.sin(toRadians(angle)) * radius
}

function textAnchor(angle: number) {
  const horizontal = Math.cos(toRadians(angle))
  if (horizontal > 0.22) return 'start'
  if (horizontal < -0.22) return 'end'
  return 'middle'
}

function labelDx(angle: number) {
  const horizontal = Math.cos(toRadians(angle))
  if (Math.abs(horizontal) < 0.22) return 0
  return horizontal > 0 ? 10 : -10
}

function labelDy(angle: number) {
  const vertical = Math.sin(toRadians(angle))
  if (vertical > 0.78) return 16
  if (vertical < -0.78) return -10
  return 0
}
</script>

<template>
  <svg class="character-dimension-wheel" :viewBox="`0 0 ${size} ${size}`" role="img">
    <defs>
      <marker
        id="dimension-arrowhead"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" class="dimension-arrowhead" />
      </marker>
    </defs>

    <circle
      class="dimension-ring"
      :cx="wheelCenter"
      :cy="wheelCenter"
      :r="computedRingRadius"
    />

    <line
      v-for="arrow in wheelArrows"
      :key="`${arrow.id}-line`"
      class="dimension-arrow"
      :class="{ 'dimension-arrow-selected': arrow.dimensionId === selectedDimensionId }"
      :x1="pointX(arrow.angle, computedArrowStartRadius)"
      :y1="pointY(arrow.angle, computedArrowStartRadius)"
      :x2="pointX(arrow.angle, computedArrowEndRadius)"
      :y2="pointY(arrow.angle, computedArrowEndRadius)"
      marker-end="url(#dimension-arrowhead)"
      @click="emit('select', arrow.dimensionId)"
    />

    <text
      v-for="arrow in wheelArrows"
      :key="`${arrow.id}-label`"
      class="dimension-keyword"
      :class="{ 'dimension-keyword-selected': arrow.dimensionId === selectedDimensionId }"
      :x="pointX(arrow.angle, computedLabelRadius)"
      :y="pointY(arrow.angle, computedLabelRadius)"
      :dx="labelDx(arrow.angle)"
      :dy="labelDy(arrow.angle)"
      :text-anchor="textAnchor(arrow.angle)"
      dominant-baseline="middle"
      @click="emit('select', arrow.dimensionId)"
    >
      {{ arrow.label }}
    </text>
  </svg>
</template>

<style scoped>
.character-dimension-wheel {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.dimension-ring {
  fill: rgba(9, 9, 11, 0.22);
  stroke: rgba(244, 244, 245, 0.78);
  stroke-width: 2;
}

.dimension-arrow {
  cursor: pointer;
  stroke: rgba(244, 244, 245, 0.78);
  stroke-width: 2.3;
  stroke-linecap: round;
  transition:
    stroke 0.16s ease,
    stroke-width 0.16s ease;
}

.dimension-arrow-selected {
  stroke: #fafafa;
  stroke-width: 3.5;
}

.dimension-arrowhead {
  fill: rgba(244, 244, 245, 0.86);
}

.dimension-keyword {
  cursor: pointer;
  fill: #d4d4d8;
  font-size: 17px;
  letter-spacing: 0.08em;
  transition: fill 0.16s ease;
}

.dimension-keyword-selected {
  fill: #fafafa;
  font-weight: 600;
}
</style>
