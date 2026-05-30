<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import ScreenplayPdfPreview from '../components/editor/export/ScreenplayPdfPreview.vue'
import { FONT_FAMILY, FONT_SIZE_PT, PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from '../components/editor/page-layout/page-config'
import { buildExportPages } from '../components/editor/export/build-export-pages'
import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const isExporting = ref(false)
const exportError = ref('')
const exportedPath = ref('')

const sceneDoc = computed(() => projectStore.sceneDoc)
const pagination = computed(() => buildExportPages(sceneDoc.value))

async function exportPdf(): Promise<void> {
  if (isExporting.value) return
  exportError.value = ''
  exportedPath.value = ''
  isExporting.value = true

  try {
    projectStore.syncSceneDocFromEditor()
    await nextTick()
    await document.fonts.ready
    document.body.classList.add('pdf-export-printing')
    await nextTick()
    const result = await window.api.project.exportPdf({ title: projectStore.title })
    if (!result.ok) {
      if (!result.canceled) exportError.value = result.error
      return
    }
    exportedPath.value = result.filePath
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'PDF 导出失败'
  } finally {
    document.body.classList.remove('pdf-export-printing')
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-view">
    <aside class="export-panel">
      <div>
        <p class="export-kicker">导出工作台</p>
        <h1>{{ projectStore.title }}</h1>
      </div>

      <dl class="export-meta">
        <div>
          <dt>页面</dt>
          <dd>US Letter {{ PAGE_WIDTH_IN }}×{{ PAGE_HEIGHT_IN }} in</dd>
        </div>
        <div>
          <dt>字体</dt>
          <dd>{{ FONT_FAMILY }} / {{ FONT_SIZE_PT }}pt</dd>
        </div>
        <div>
          <dt>页数</dt>
          <dd>{{ pagination.totalPages }}</dd>
        </div>
      </dl>

      <button class="export-button" :disabled="isExporting" @click="exportPdf">
        {{ isExporting ? '导出中...' : '导出 PDF' }}
      </button>

      <p v-if="exportedPath" class="export-success">已导出：{{ exportedPath }}</p>
      <p v-if="exportError" class="export-error">{{ exportError }}</p>
    </aside>

    <main class="export-preview scrollbar-editor">
      <ScreenplayPdfPreview :scene-doc="sceneDoc" />
    </main>
  </div>
</template>

<style scoped>
.export-view {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #171717;
  color: #e5e5e5;
}

.export-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #111;
}

.export-kicker {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.16em;
}

h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.export-meta {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}

.export-meta div {
  display: grid;
  gap: 4px;
}

.export-meta dt {
  color: #71717a;
  font-size: 12px;
}

.export-meta dd {
  margin: 0;
  color: #d4d4d8;
  font-size: 13px;
  line-height: 1.4;
}

.export-button {
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  color: #111;
  background: #f5f5f5;
  font-weight: 700;
  cursor: pointer;
}

.export-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.export-success,
.export-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.export-success {
  color: #86efac;
}

.export-error {
  color: #fca5a5;
}

.export-preview {
  min-width: 0;
  overflow: auto;
  padding: 32px;
  background: #242424;
}

:global(.pdf-export-printing) .export-panel {
  display: none;
}

:global(.pdf-export-printing) .export-view {
  display: block;
  background: #fff;
}

:global(.pdf-export-printing) .export-preview {
  overflow: visible;
  padding: 0;
  background: #fff;
}
</style>
