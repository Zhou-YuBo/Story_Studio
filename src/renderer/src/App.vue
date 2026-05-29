<script setup lang="ts">
import { ref } from 'vue'
import BottomDock from './components/common/BottomDock.vue'
import ProjectStorageBar from './components/common/ProjectStorageBar.vue'
import ReminderFloatingLayer from './components/reminder/ReminderFloatingLayer.vue'
import SplashScreenView from './views/SplashScreenView.vue'
import ProjectHallView from './views/ProjectHallView.vue'

const phase = ref<'splash' | 'hall' | 'workspace'>('splash')
</script>

<template>
  <SplashScreenView v-if="phase === 'splash'" @done="phase = 'hall'" />
  <ProjectHallView
    v-else-if="phase === 'hall'"
    @enter-workspace="phase = 'workspace'"
  />
  <div v-else class="bg-black h-screen text-white flex flex-col overflow-hidden">
    <ProjectStorageBar />

    <!-- 中央工作区 -->
    <main class="flex-1 overflow-hidden flex">
      <RouterView />
    </main>

    <ReminderFloatingLayer />

    <!-- 底部工作台栏 -->
    <BottomDock />
  </div>
</template>
