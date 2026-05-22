<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { SmartTypeState } from './smarttype/types'

const props = defineProps<{
  state: SmartTypeState
}>()

const dropdownRef = ref<HTMLDivElement | null>(null)

watch(
  () => props.state.selectedIndex,
  () => {
    nextTick(() => {
      const el = dropdownRef.value?.querySelector('.smarttype-item.selected') as HTMLElement | null
      el?.scrollIntoView({ block: 'nearest' })
    })
  },
)

function onClickItem(index: number) {
  props.state.selectedIndex = index
  if (props.state.confirm) {
    props.state.confirm()
  }
}

const positionStyle = () => {
  const { top, left } = props.state.position
  const maxLeft = Math.max(0, Math.min(left, window.innerWidth - 240))
  const maxTop = Math.max(0, Math.min(top, window.innerHeight - 300))
  return {
    position: 'fixed' as const,
    top: `${maxTop}px`,
    left: `${maxLeft}px`,
    zIndex: 1100,
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible && state.filtered.length > 0"
      class="smarttype-dropdown"
      :style="positionStyle()"
      ref="dropdownRef"
      @mousedown.prevent
    >
      <div
        v-for="(item, i) in state.filtered"
        :key="item"
        :class="['smarttype-item', { selected: i === state.selectedIndex }]"
        @mouseenter="state.selectedIndex = i"
        @click="onClickItem(i)"
      >
        {{ item }}
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.smarttype-dropdown {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 2px 0;
  min-width: 120px;
  max-width: 220px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 11px;
}

.smarttype-item {
  padding: 3px 8px;
  color: #ddd;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.smarttype-item.selected {
  background: #333;
  color: #fff;
}

.smarttype-item:hover {
  background: #2a2a3e;
}
</style>
