<script setup lang="ts">
import CharacterDimensionWheel from './CharacterDimensionWheel.vue'
import type { CharacterDetail } from './detail/types'

defineProps<{
  character: CharacterDetail
}>()
</script>

<template>
  <div class="cast-focus-node">
    <CharacterDimensionWheel
      :dimensions="character.dimensions"
      :size="250"
      :ring-radius="76"
      :arrow-start-radius="18"
      :arrow-end-radius="104"
      :label-radius="118"
    />
    <div class="focus-caption">
      <span>中心人物</span>
      <strong>{{ character.profile.name || '未命名人物' }}</strong>
    </div>
  </div>
</template>

<style scoped>
.cast-focus-node {
  position: relative;
  width: 290px;
  height: 290px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(39, 39, 42, 0.62), rgba(9, 9, 11, 0.18) 62%, transparent 70%);
}

.focus-caption {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  gap: 4px;
  color: #d4d4d8;
  pointer-events: none;
  text-align: center;
  transform: translate(-50%, -50%);
}

.focus-caption span {
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.18em;
}

.focus-caption strong {
  max-width: 118px;
  overflow: hidden;
  color: #fafafa;
  font-size: 16px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
