<script setup lang="ts">
defineProps<{
  active?: boolean
  expanded?: boolean
}>()
</script>

<template>
  <div
    class="cast-drag-handle"
    :class="{ 'cast-drag-handle-active': active, 'cast-drag-handle-expanded': expanded }"
  >
    <slot />
  </div>
</template>

<style scoped>
.cast-drag-handle {
  cursor: grab;
}

.cast-drag-handle:active,
.cast-drag-handle-active {
  cursor: grabbing;
}

.cast-drag-handle-expanded {
  cursor: grab;
}
</style>
