<script setup lang="ts">
defineProps<{
  name: string
  layer: string
  keyword: string
  active?: boolean
  expanded?: boolean
}>()
</script>

<template>
  <button
    class="cast-person-node"
    :class="{ 'cast-person-node-active': active, 'cast-person-node-expanded': expanded }"
    type="button"
  >
    <strong>{{ name || '未命名人物' }}</strong>
    <span>{{ keyword || layer || '关键词' }}</span>
  </button>
</template>

<style scoped>
.cast-person-node {
  display: grid;
  min-width: 116px;
  max-width: 156px;
  gap: 3px;
  border: 1px solid rgba(113, 113, 122, 0.7);
  border-radius: 999px;
  background: rgba(9, 9, 11, 0.82);
  color: #f4f4f5;
  cursor: inherit;
  font: inherit;
  padding: 9px 14px;
  text-align: center;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.cast-person-node:hover,
.cast-person-node-active {
  border-color: rgba(244, 244, 245, 0.88);
  background: rgba(39, 39, 42, 0.9);
  transform: translateY(-1px);
}

.cast-person-node-expanded {
  min-width: 148px;
  border-radius: 18px;
}

.cast-person-node strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cast-person-node span {
  overflow: hidden;
  color: #a1a1aa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
