<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from './components/common/BottomDock.vue'
import ProjectStorageBar from './components/common/ProjectStorageBar.vue'
import ReminderFloatingLayer from './components/reminder/ReminderFloatingLayer.vue'
import SettingsDialog from './components/settings/SettingsDialog.vue'
import { usePreferencesStore } from './stores/preferences'
import SplashScreenView from './views/SplashScreenView.vue'
import ProjectHallView from './views/ProjectHallView.vue'

const router = useRouter()
const preferences = usePreferencesStore()
const phase = ref<'splash' | 'hall' | 'workspace'>('splash')
const settingsOpen = ref(false)

async function enterWorkspace(): Promise<void> {
  await router.replace(preferences.entryWorkbenchPath)
  phase.value = 'workspace'
}

watch(
  () => router.currentRoute.value.path,
  (path) => {
    if (phase.value === 'workspace') preferences.recordWorkbenchFromPath(path)
  }
)
</script>

<template>
  <SplashScreenView
    v-if="phase === 'splash'"
    :variant="preferences.splashVariant"
    @done="phase = 'hall'"
  />
  <ProjectHallView
    v-else-if="phase === 'hall'"
    @enter-workspace="enterWorkspace"
    @open-settings="settingsOpen = true"
  />
  <div v-else class="bg-black h-screen text-white flex flex-col overflow-hidden">
    <ProjectStorageBar @open-settings="settingsOpen = true" />

    <!-- 中央工作区 -->
    <main class="flex-1 overflow-hidden flex">
      <RouterView />
    </main>

    <ReminderFloatingLayer />

    <!-- 底部工作台栏 -->
    <BottomDock />
  </div>

  <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
</template>
