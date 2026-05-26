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
  padding: 16px;
  border-radius: 18px;
}

.unit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.unit-kicker {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.unit-header h2 {
  margin: 0;
  color: #fafafa;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.unit-description {
  margin: 8px 0 0;
  color: #a1a1aa;
  font-size: 13px;
  line-height: 1.7;
}

.unit-actions {
  flex-shrink: 0;
}

.unit-body {
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.8;
}
</style>
