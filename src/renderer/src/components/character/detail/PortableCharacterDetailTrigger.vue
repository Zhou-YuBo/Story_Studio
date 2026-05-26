<script setup lang="ts">
defineProps<{
  characterName?: string
}>()

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <button class="portable-detail-trigger" type="button" @click="emit('open')">
    <span class="trigger-kicker">速记</span>
    <span class="trigger-title">人物详情</span>
    <span v-if="characterName" class="trigger-name">{{ characterName }}</span>
  </button>
</template>

<style scoped>
.portable-detail-trigger {
  position: absolute;
  z-index: 12;
  top: 142px;
  right: 0;
  width: 118px;
  display: grid;
  gap: 4px;
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-right: 0;
  border-radius: 16px 0 0 16px;
  background:
    linear-gradient(135deg, rgba(39, 39, 42, 0.96), rgba(9, 9, 11, 0.92)),
    radial-gradient(circle at 12% 16%, rgba(228, 228, 231, 0.16), transparent 34%);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  padding: 12px 13px 12px 14px;
  text-align: left;
  transform: translateX(76px);
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.18s ease;
}

.portable-detail-trigger:hover,
.portable-detail-trigger:focus-visible {
  border-color: rgba(228, 228, 231, 0.86);
  transform: translateX(0);
}

.trigger-kicker {
  color: #a1a1aa;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.trigger-title {
  color: #fafafa;
  font-size: 14px;
  font-weight: 620;
  letter-spacing: 0.06em;
}

.trigger-name {
  overflow: hidden;
  color: #d4d4d8;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
