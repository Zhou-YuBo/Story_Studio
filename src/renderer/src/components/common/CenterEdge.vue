<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow, type GraphNode } from '@vue-flow/core'

const props = defineProps<{
  id: string
  source: string
  target: string
  selected?: boolean
  style: any
  data: any
}>()

const { findNode } = useVueFlow()

const path = computed(() => {
  const src = findNode(props.source) as GraphNode | undefined
  const tgt = findNode(props.target) as GraphNode | undefined
  if (!src || !tgt) return ''

  const sx = src.position.x + (src.dimensions?.width ?? 260) / 2
  const sy = src.position.y + (src.dimensions?.height ?? 160) / 2
  const tx = tgt.position.x + (tgt.dimensions?.width ?? 260) / 2
  const ty = tgt.position.y + (tgt.dimensions?.height ?? 160) / 2

  return `M${sx},${sy} L${tx},${ty}`
})
</script>

<template>
  <!-- 透明宽路径：扩大命中区域 -->
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    stroke-width="20"
    class="vue-flow__edge-interaction"
  />
  <!-- 可见路径 -->
  <path
    :id="id"
    :d="path"
    fill="none"
    :stroke="selected ? '#a78bfa' : '#52525b'"
    stroke-width="2"
    :style="style"
    class="vue-flow__edge-path"
  />
</template>
