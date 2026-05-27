<script setup lang="ts">
import CharacterDimensionWheel from './CharacterDimensionWheel.vue'
import type { CharacterDetail } from './detail/types'

defineProps<{
  character: CharacterDetail
  keyword: string
  active?: boolean
}>()
</script>

<template>
  <button class="cast-expanded-node" :class="{ 'cast-expanded-node-active': active }" type="button">
    <CharacterDimensionWheel
      :dimensions="character.dimensions"
      :size="180"
      :ring-radius="54"
      :arrow-start-radius="14"
      :arrow-end-radius="76"
      :label-radius="86"
    />
    <div class="expanded-caption">
      <strong>{{ character.profile.name || '未命名人物' }}</strong>
      <span>{{ keyword || character.profile.layer || '关键词' }}</span>
    </div>
  </button>
</template>

<style scoped>
.cast-expanded-node {
  position: relative;
  width: 224px;
  height: 224px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(113, 113, 122, 0.7);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(39, 39, 42, 0.72), rgba(9, 9, 11, 0.7) 66%);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.cast-expanded-node-active {
  border-color: rgba(244, 244, 245, 0.88);
  box-shadow: 0 0 0 1px rgba(244, 244, 245, 0.18);
}

.expanded-caption {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  max-width: 92px;
  gap: 4px;
  pointer-events: none;
  text-align: center;
  transform: translate(-50%, -50%);
}

.expanded-caption strong,
.expanded-caption span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expanded-caption strong {
  color: #fafafa;
  font-size: 13px;
  font-weight: 680;
}

.expanded-caption span {
  color: #a1a1aa;
  font-size: 11px;
}
</style>
