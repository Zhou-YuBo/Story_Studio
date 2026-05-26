<script setup lang="ts">
import CharacterDetailUnit from './CharacterDetailUnit.vue'
import type { CharacterDimensionSummaryItem } from './types'

defineProps<{
  dimensions: CharacterDimensionSummaryItem[]
}>()
</script>

<template>
  <CharacterDetailUnit title="人物维度" kicker="Dimensions">
    <template #actions>
      <RouterLink class="unit-link" to="/character/dimensions">进入维度</RouterLink>
    </template>

    <div v-if="dimensions.length" class="dimension-summary-list">
      <div
        v-for="dimension in dimensions"
        :key="dimension.id"
        class="dimension-row"
        :class="{ 'dimension-row-core': dimension.core }"
      >
        <span>{{ dimension.core ? '核心' : '维度' }}</span>
        <strong>{{ dimension.positive }} / {{ dimension.negative }}</strong>
      </div>
    </div>
    <p v-else class="empty-copy">这个人物不设计完整维度。</p>
  </CharacterDetailUnit>
</template>

<style scoped>
.unit-link {
  display: inline-flex;
  padding: 8px 10px;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 10px;
  color: #f4f4f5;
  font-size: 12px;
  text-decoration: none;
}

.dimension-summary-list {
  display: grid;
  gap: 10px;
}

.dimension-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.26);
  padding: 12px 13px;
}

.dimension-row-core {
  border-color: rgba(244, 244, 245, 0.58);
}

.dimension-row span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.12em;
}

.dimension-row strong {
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
  text-align: right;
}

.empty-copy {
  margin: 0;
  color: #a1a1aa;
}
</style>
