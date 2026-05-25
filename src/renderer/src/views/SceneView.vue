<script setup lang="ts">
import SceneEditor from '../components/editor/SceneEditor.vue'
import StructureStrip from '../components/structure/StructureStrip.vue'
import BeatBoard from '../components/beat/BeatBoard.vue'
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div id="scene-topbar" class="scene-topbar" />
    <div class="flex flex-1 overflow-hidden">
      <aside class="scene-left-panel">
        <StructureStrip />
      </aside>
      <main class="scene-center-panel">
        <SceneEditor />
      </main>
      <aside class="scene-right-panel">
        <BeatBoard />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.scene-topbar {
  height: 140px;
  flex-shrink: 0;
  border-bottom: 1px solid #27272a;
  background: #09090b;
}

.scene-left-panel {
  flex: 1;
  background: #18181b;
  border-right: 1px solid #27272a;
}

.scene-right-panel {
  flex: 1;
  background: #18181b;
  border-left: 1px solid #27272a;
}

.scene-center-panel {
  width: var(--page-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
