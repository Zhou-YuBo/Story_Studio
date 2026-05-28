<script setup lang="ts">
import BottomDock from './components/common/BottomDock.vue'
import ReminderFloatingLayer from './components/reminder/ReminderFloatingLayer.vue'
</script>

<template>
  <div class="bg-black h-screen text-white flex flex-col overflow-hidden">

    <!-- 中央工作区 -->
    <main class="flex-1 overflow-hidden flex">
      <RouterView />
    </main>

    <ReminderFloatingLayer />

    <!-- 底部工作台栏 -->
    <BottomDock />

  </div>
</template>