<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ProjectProofWarning } from '../../../shared/project'
import ScreenplayPdfPreview from '../components/editor/export/ScreenplayPdfPreview.vue'
import {
  FONT_FAMILY,
  FONT_SIZE_PT,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN
} from '../components/editor/page-layout/page-config'
import { buildExportPages } from '../components/editor/export/build-export-pages'
import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const isExporting = ref(false)
const exportError = ref('')
const exportedPath = ref('')
const isExportingProof = ref(false)
const proofError = ref('')
const proofPath = ref('')
const proofProjectHash = ref('')
const proofWarnings = ref<ProjectProofWarning[]>([])

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

async function exportProof(): Promise<void> {
  if (isExportingProof.value) return
  proofError.value = ''
  proofPath.value = ''
  proofProjectHash.value = ''
  proofWarnings.value = []
  isExportingProof.value = true

  try {
    const result = await window.api.project.exportProof({
      document: projectStore.toProjectDocument()
    })
    if (!result.ok) {
      if (!result.canceled) proofError.value = result.error
      return
    }
    proofPath.value = result.filePath
    proofProjectHash.value = result.projectDocumentSha256
    proofWarnings.value = result.warnings
  } catch (error) {
    proofError.value = error instanceof Error ? error.message : '创作证明导出失败'
  } finally {
    isExportingProof.value = false
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

      <section class="export-section">
        <p class="section-title">剧本 PDF</p>
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
      </section>

      <section class="export-section proof-section">
        <p class="section-title">本地创作证明</p>
        <p class="export-help">
          导出当前项目快照与 SHA-256 指纹，用于本地留存创作记录。不会上传服务器，不等同于法律公证。
        </p>
        <dl class="export-meta compact">
          <div>
            <dt>包含</dt>
            <dd>剧本、结构、人物、灵感、世界、提醒</dd>
          </div>
          <div>
            <dt>素材</dt>
            <dd>受管理素材文件指纹</dd>
          </div>
          <div>
            <dt>格式</dt>
            <dd>.story-proof.json</dd>
          </div>
        </dl>

        <button class="export-button secondary" :disabled="isExportingProof" @click="exportProof">
          {{ isExportingProof ? '生成中...' : '导出创作证明' }}
        </button>

        <p v-if="proofPath" class="export-success">已导出：{{ proofPath }}</p>
        <p v-if="proofProjectHash" class="proof-hash">项目指纹：{{ proofProjectHash }}</p>
        <p v-if="proofWarnings.length" class="export-warning">
          {{ proofWarnings.length }} 项素材未能完整计算指纹，详情已写入证明文件。
        </p>
        <p v-if="proofError" class="export-error">{{ proofError }}</p>
      </section>
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

.export-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.proof-section {
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 700;
}

.export-help {
  margin: 0;
  color: #a1a1aa;
  font-size: 12px;
  line-height: 1.6;
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

.export-meta.compact {
  gap: 10px;
}

.export-meta.compact dd {
  font-size: 12px;
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

.export-button.secondary {
  color: #f4f4f5;
  background: #27272a;
}

.export-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.export-success,
.export-error,
.export-warning,
.proof-hash {
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

.export-warning {
  color: #fde68a;
}

.proof-hash {
  color: #a5b4fc;
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
