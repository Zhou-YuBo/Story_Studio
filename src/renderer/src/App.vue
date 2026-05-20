<script setup lang="ts">
import BottomDock from './components/BottomDock.vue'
</script>

<template>
  <div class="bg-black h-screen text-white flex flex-col overflow-hidden">

    <!-- 中央工作区 -->
    <main class="flex-1 overflow-hidden flex">
      <RouterView />
    </main>

    <!-- 底部工作台栏 -->
    <BottomDock />

  </div>
</template>