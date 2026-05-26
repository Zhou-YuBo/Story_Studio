<script setup lang="ts">
import type { CharacterLayer, CharacterProfile } from './types'

defineProps<{
  profile: CharacterProfile
  compact?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const layers: CharacterLayer[] = ['主角', '第一圈人物', '第二圈人物', '第三圈人物']
</script>

<template>
  <section class="identity-unit" :class="{ 'identity-unit-compact': compact }">
    <div class="identity-meta">
      <select v-model="profile.layer" @change="emit('save')">
        <option v-for="layer in layers" :key="layer" :value="layer">{{ layer }}</option>
      </select>
      <input v-model="profile.brief" placeholder="简短身份" @blur="emit('save')" />
    </div>
    <input v-model="profile.name" class="name-input" placeholder="人物姓名" @blur="emit('save')" />
    <textarea
      v-model="profile.logline"
      class="logline-input"
      :rows="compact ? 3 : 2"
      placeholder="一句话定义这个人物的核心矛盾"
      @blur="emit('save')"
    />
  </section>
</template>

<style scoped>
.identity-unit {
  border: 1px solid rgba(82, 82, 91, 0.9);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(39, 39, 42, 0.86), rgba(24, 24, 27, 0.78)),
    radial-gradient(circle at 18% 24%, rgba(161, 161, 170, 0.18), transparent 32%);
  padding: 28px;
}

.identity-unit-compact {
  border-radius: 20px;
  padding: 18px;
}

.identity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.identity-unit-compact .identity-meta {
  display: grid;
  margin-bottom: 12px;
}

.identity-meta select,
.identity-meta input,
.name-input,
.logline-input {
  border: 1px solid rgba(113, 113, 122, 0.78);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.3);
  color: #f4f4f5;
  font: inherit;
  outline: none;
}

.identity-meta select,
.identity-meta input {
  padding: 8px 10px;
  color: #d4d4d8;
  font-size: 12px;
}

.identity-meta input {
  min-width: 360px;
}

.identity-unit-compact .identity-meta input {
  min-width: 0;
  width: 100%;
}

.name-input {
  display: block;
  width: 100%;
  max-width: 520px;
  padding: 8px 0;
  border-color: transparent;
  background: transparent;
  color: #fafafa;
  font-size: 38px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.identity-unit-compact .name-input {
  max-width: none;
  font-size: 26px;
}

.logline-input {
  width: 100%;
  max-width: 900px;
  margin-top: 18px;
  padding: 12px 14px;
  color: #f4f4f5;
  font-size: 22px;
  line-height: 1.75;
  resize: vertical;
}

.identity-unit-compact .logline-input {
  max-width: none;
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.7;
}
</style>
