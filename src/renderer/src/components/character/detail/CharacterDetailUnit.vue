<script setup lang="ts">
defineProps<{
  title: string
  kicker?: string
  description?: string
  compact?: boolean
}>()
</script>

<template>
  <section class="detail-unit" :class="{ 'detail-unit-compact': compact }">
    <header class="unit-header">
      <div>
        <p v-if="kicker" class="unit-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
        <p v-if="description" class="unit-description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="unit-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="unit-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.detail-unit {
  min-width: 0;
  border: 1px solid rgba(63, 63, 70, 0.88);
  border-radius: 22px;
  background: rgba(24, 24, 27, 0.72);
  padding: 20px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
}

.detail-unit-compact {
  border-radius: 18px;
  padding: 16px;
}

.unit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-unit-compact .unit-header {
  gap: 12px;
  margin-bottom: 12px;
}

.unit-kicker {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.detail-unit-compact .unit-kicker {
  margin-bottom: 5px;
  font-size: 10px;
  letter-spacing: 0.18em;
}

.unit-header h2 {
  margin: 0;
  color: #fafafa;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.detail-unit-compact .unit-header h2 {
  font-size: 17px;
}

.unit-description {
  margin: 8px 0 0;
  color: #a1a1aa;
  font-size: 13px;
  line-height: 1.7;
}

.detail-unit-compact .unit-description {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.55;
}

.unit-actions {
  flex-shrink: 0;
}

.unit-body {
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.8;
}

.detail-unit-compact .unit-body {
  font-size: 13px;
  line-height: 1.65;
}
</style>
