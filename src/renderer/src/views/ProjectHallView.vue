<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRecentStore } from '../stores/recent'
import { useProjectStore } from '../stores/project'

const emit = defineEmits<{
  'enter-workspace': []
  'open-settings': []
}>()

const recentStore = useRecentStore()
const projectStore = useProjectStore()

onMounted(() => {
  recentStore.fetch()
})

const projects = computed(() => recentStore.projects)

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(iso).toLocaleDateString()
}

async function openRecent(path: string): Promise<void> {
  const ok = await projectStore.openFromPath(path)
  if (ok) {
    await recentStore.add(path, projectStore.title)
    emit('enter-workspace')
  }
}

async function removeRecent(path: string): Promise<void> {
  await recentStore.remove(path)
}

async function newProject(): Promise<void> {
  await projectStore.hydrateNew()
  emit('enter-workspace')
}

async function openFile(): Promise<void> {
  const ok = await projectStore.importJson()
  if (ok) {
    if (projectStore.projectPath) {
      await recentStore.add(projectStore.projectPath, projectStore.title)
    }
    emit('enter-workspace')
  }
}
</script>

<template>
  <div class="hall-root">
    <div class="hall-container">
      <div class="hall-header">
        <button class="hall-settings" type="button" @click="emit('open-settings')">设置</button>
        <h1>Story Studio</h1>
        <p class="hall-subtitle">Where your stories take shape</p>
      </div>

      <div class="hall-body">
        <div class="hall-recent">
          <h2 class="hall-section-title">最近项目</h2>
          <div v-if="projects.length === 0" class="hall-empty">
            <p>还没有打开过的项目</p>
            <p class="hall-empty-hint">新建一个项目，或从文件打开</p>
          </div>
          <ul v-else class="hall-list">
            <li
              v-for="project in projects"
              :key="project.projectPath"
              class="hall-item"
              @click="openRecent(project.projectPath)"
            >
              <div class="hall-item-info">
                <span class="hall-item-title">{{ project.title }}</span>
                <span class="hall-item-path" :title="project.projectPath">{{
                  project.projectPath
                }}</span>
              </div>
              <div class="hall-item-meta">
                <span class="hall-item-time">{{ relativeTime(project.lastOpenedAt) }}</span>
                <button
                  class="hall-item-remove"
                  title="从列表移除"
                  @click.stop="removeRecent(project.projectPath)"
                >
                  &times;
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="hall-actions">
          <button class="hall-btn hall-btn-primary" @click="newProject">
            <span class="hall-btn-icon">+</span>
            <span>新建项目</span>
          </button>
          <button class="hall-btn hall-btn-secondary" @click="openFile">
            <span class="hall-btn-icon">&#128193;</span>
            <span>打开文件</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hall-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle at 70% 20%, rgba(107, 88, 50, 0.18), transparent 32%),
    radial-gradient(circle at 16% 80%, rgba(57, 88, 112, 0.16), transparent 30%), #07080a;
}

.hall-container {
  width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hall-header {
  position: relative;
  text-align: center;
}
.hall-settings {
  position: absolute;
  top: 4px;
  right: 0;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  cursor: pointer;
}
.hall-settings:hover {
  border-color: rgba(128, 235, 255, 0.28);
  background: rgba(16, 222, 255, 0.08);
  color: rgba(200, 248, 255, 0.88);
}
.hall-header h1 {
  margin: 0;
  font-family: 'Splash Agibot', sans-serif;
  font-size: 42px;
  font-weight: 700;
  color: #e8fbff;
  letter-spacing: 0.02em;
  text-shadow: 0 0 30px rgba(69, 225, 255, 0.18);
}
.hall-subtitle {
  margin: 8px 0 0;
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 13px;
  letter-spacing: 0.18em;
  color: rgba(155, 238, 255, 0.5);
  text-transform: uppercase;
}

.hall-body {
  display: flex;
  gap: 24px;
  min-height: 0;
}

.hall-recent {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.hall-section-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
}

.hall-empty {
  padding: 24px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}
.hall-empty-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
}

.hall-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  max-height: 360px;
  display: grid;
  gap: 2px;
}

.hall-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms;
}
.hall-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.hall-item-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hall-item-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hall-item-path {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hall-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.hall-item-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.28);
  white-space: nowrap;
}
.hall-item-remove {
  display: none;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
}
.hall-item:hover .hall-item-remove {
  display: flex;
  align-items: center;
  justify-content: center;
}
.hall-item-remove:hover {
  background: rgba(255, 80, 80, 0.15);
  color: #ff6b6b;
}

.hall-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 180px;
  flex-shrink: 0;
}

.hall-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 120ms;
}
.hall-btn-icon {
  font-size: 18px;
  line-height: 1;
}

.hall-btn-primary {
  background: rgba(16, 222, 255, 0.08);
  border-color: rgba(16, 222, 255, 0.2);
  color: rgba(200, 248, 255, 0.9);
}
.hall-btn-primary:hover {
  background: rgba(16, 222, 255, 0.14);
  border-color: rgba(16, 222, 255, 0.35);
}

.hall-btn-secondary {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.7);
}
.hall-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.18);
}
</style>
