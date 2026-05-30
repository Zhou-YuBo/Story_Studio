<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ProjectProofWarning, ProjectVerifyProofResult } from '../../../shared/project'
import ScreenplayPdfPreview from '../components/editor/export/ScreenplayPdfPreview.vue'
import {
  FONT_FAMILY,
  FONT_SIZE_PT,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN
} from '../components/editor/page-layout/page-config'
import { buildExportPages } from '../components/editor/export/build-export-pages'
import { useProjectStore } from '../stores/project'

type ExportMode = 'home' | 'pdf' | 'proof' | 'verify'
type ProofVerificationSuccess = Extract<ProjectVerifyProofResult, { ok: true }>

const projectStore = useProjectStore()
const mode = ref<ExportMode>('home')
const isExporting = ref(false)
const exportError = ref('')
const exportedPath = ref('')
const isExportingProof = ref(false)
const proofError = ref('')
const proofPath = ref('')
const proofProjectHash = ref('')
const proofWarnings = ref<ProjectProofWarning[]>([])
const isVerifyingProof = ref(false)
const verifyError = ref('')
const verification = ref<ProofVerificationSuccess | null>(null)

const sceneDoc = computed(() => projectStore.sceneDoc)
const pagination = computed(() => buildExportPages(sceneDoc.value))

function openMode(nextMode: ExportMode): void {
  mode.value = nextMode
}

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

async function verifyProof(): Promise<void> {
  if (isVerifyingProof.value) return
  verifyError.value = ''
  verification.value = null
  isVerifyingProof.value = true

  try {
    const result = await window.api.project.verifyProof()
    if (!result.ok) {
      if (!result.canceled) verifyError.value = result.error
      return
    }
    verification.value = result
  } catch (error) {
    verifyError.value = error instanceof Error ? error.message : '创作证明验证失败'
  } finally {
    isVerifyingProof.value = false
  }
}
</script>

<template>
  <div v-if="mode === 'home'" class="export-home scrollbar-editor">
    <section class="home-hero">
      <p class="export-kicker">导出工作台</p>
      <h1>{{ projectStore.title }}</h1>
      <p>把作品交付出去，或为当前创作状态留下可复核的本地记录。</p>
    </section>

    <section class="entry-grid">
      <button class="entry-card primary" type="button" @click="openMode('pdf')">
        <span class="entry-kicker">剧本输出</span>
        <strong>剧本 PDF 导出</strong>
        <span>预览 Letter 剧本页面，并导出当前场景正文 PDF。</span>
        <em>{{ pagination.totalPages }} 页 · {{ FONT_FAMILY }}</em>
      </button>

      <button class="entry-card" type="button" @click="openMode('proof')">
        <span class="entry-kicker">创作存证</span>
        <strong>本地创作证明</strong>
        <span>导出项目快照、SHA-256 指纹和受管理素材指纹。</span>
        <em>.story-proof.json · 不上传服务器</em>
      </button>

      <button class="entry-card" type="button" @click="openMode('verify')">
        <span class="entry-kicker">自洽检查</span>
        <strong>验证证明文件</strong>
        <span>导入 .story-proof.json，检查文件里的快照和指纹是否对得上。</span>
        <em>只验证文件自身是否自洽</em>
      </button>

      <article class="entry-card disabled-card">
        <span class="entry-kicker">后续预留</span>
        <strong>阶段快照列表</strong>
        <span>未来用于管理阶段性快照与证明记录。</span>
        <em>尚未开放</em>
      </article>
    </section>
  </div>

  <div v-else-if="mode === 'pdf'" class="export-view">
    <aside class="export-panel">
      <button class="back-button" type="button" @click="openMode('home')">← 导出首页</button>
      <div>
        <p class="export-kicker">剧本 PDF</p>
        <h1>{{ projectStore.title }}</h1>
      </div>

      <section class="export-section">
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
    </aside>

    <main class="export-preview scrollbar-editor">
      <ScreenplayPdfPreview :scene-doc="sceneDoc" />
    </main>
  </div>

  <div v-else-if="mode === 'proof'" class="proof-workspace scrollbar-editor">
    <section class="proof-card">
      <button class="back-button" type="button" @click="openMode('home')">← 导出首页</button>
      <div>
        <p class="export-kicker">本地创作证明</p>
        <h1>{{ projectStore.title }}</h1>
        <p class="export-help">
          导出当前项目快照与 SHA-256 指纹，用于本地留存创作记录。不会上传服务器，不等同于法律公证。
        </p>
      </div>

      <dl class="export-meta proof-meta">
        <div>
          <dt>包含</dt>
          <dd>剧本、结构、人物、灵感、世界、提醒</dd>
        </div>
        <div>
          <dt>素材</dt>
          <dd>受管理素材文件指纹，不复制素材原文件</dd>
        </div>
        <div>
          <dt>格式</dt>
          <dd>.story-proof.json</dd>
        </div>
        <div>
          <dt>边界</dt>
          <dd>本地证明文件，不包含服务器时间戳、第三方存证或版权登记</dd>
        </div>
      </dl>

      <button class="export-button proof-action" :disabled="isExportingProof" @click="exportProof">
        {{ isExportingProof ? '生成中...' : '导出创作证明' }}
      </button>

      <div
        v-if="proofPath || proofProjectHash || proofWarnings.length || proofError"
        class="proof-result"
      >
        <p v-if="proofPath" class="export-success">已导出：{{ proofPath }}</p>
        <p v-if="proofProjectHash" class="proof-hash">项目指纹：{{ proofProjectHash }}</p>
        <p v-if="proofWarnings.length" class="export-warning">
          {{ proofWarnings.length }} 项素材未能完整计算指纹，详情已写入证明文件。
        </p>
        <p v-if="proofError" class="export-error">{{ proofError }}</p>
      </div>
    </section>
  </div>

  <div v-else class="proof-workspace scrollbar-editor">
    <section class="proof-card">
      <button class="back-button" type="button" @click="openMode('home')">← 导出首页</button>
      <div>
        <p class="export-kicker">验证证明文件</p>
        <h1>检查快照是否自洽</h1>
        <p class="export-help">
          这个验证只做一件事：检查证明文件里的快照，和文件里记录的指纹是否对得上。它能发现文件内部是否被改乱，但不能证明外部时间、法律效力，也不能证明作品一定原创。
        </p>
      </div>

      <div class="plain-explain">
        <strong>通俗理解</strong>
        <span
          >如果快照和指纹对得上，说明这份证明文件内部是自洽的；如果对不上，说明文件内容或指纹至少有一处不一致。</span
        >
      </div>

      <button class="export-button proof-action" :disabled="isVerifyingProof" @click="verifyProof">
        {{ isVerifyingProof ? '验证中...' : '选择证明文件验证' }}
      </button>

      <div v-if="verification || verifyError" class="proof-result">
        <template v-if="verification">
          <p :class="verification.valid ? 'export-success' : 'export-error'">
            {{
              verification.valid
                ? '验证通过：这个证明文件自身是自洽的。'
                : '验证未通过：这个证明文件内部不一致。'
            }}
          </p>
          <dl class="export-meta proof-meta">
            <div>
              <dt>项目</dt>
              <dd>{{ verification.projectTitle }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ verification.createdAt }}</dd>
            </div>
            <div>
              <dt>记录的项目指纹</dt>
              <dd>{{ verification.recordedProjectDocumentSha256 }}</dd>
            </div>
            <div>
              <dt>重新计算的项目指纹</dt>
              <dd>{{ verification.actualProjectDocumentSha256 }}</dd>
            </div>
          </dl>
          <ul v-if="verification.issues.length" class="issue-list">
            <li v-for="issue in verification.issues" :key="issue.code">{{ issue.message }}</li>
          </ul>
        </template>
        <p v-if="verifyError" class="export-error">{{ verifyError }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.export-home,
.proof-workspace {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  background:
    radial-gradient(circle at 24% 18%, rgba(139, 92, 246, 0.16), transparent 30%), #171717;
  color: #e5e5e5;
}

.export-home {
  padding: 56px 64px;
}

.home-hero {
  max-width: 680px;
  margin-bottom: 32px;
}

.home-hero h1,
.proof-card h1,
.export-panel h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}

.home-hero p {
  margin: 12px 0 0;
  color: #a1a1aa;
  font-size: 14px;
  line-height: 1.7;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(240px, 420px));
  gap: 18px;
}

.entry-card {
  display: flex;
  min-height: 188px;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  color: inherit;
  background: rgba(24, 24, 27, 0.82);
  text-align: left;
}

button.entry-card {
  cursor: pointer;
}

button.entry-card:hover {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(39, 39, 42, 0.92);
}

.entry-card.primary {
  border-color: rgba(245, 245, 245, 0.18);
  background: linear-gradient(135deg, rgba(245, 245, 245, 0.12), rgba(39, 39, 42, 0.86));
}

.entry-kicker {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.entry-card strong {
  color: #f4f4f5;
  font-size: 20px;
}

.entry-card span:not(.entry-kicker) {
  color: #c4c4cc;
  font-size: 13px;
  line-height: 1.6;
}

.entry-card em {
  margin-top: auto;
  color: #a5b4fc;
  font-size: 12px;
  font-style: normal;
}

.disabled-card {
  opacity: 0.5;
}

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

.back-button {
  width: fit-content;
  border: 0;
  color: #a1a1aa;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.back-button:hover {
  color: #f4f4f5;
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.export-help {
  margin: 12px 0 0;
  color: #a1a1aa;
  font-size: 13px;
  line-height: 1.7;
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
  min-width: 0;
  margin: 0;
  color: #d4d4d8;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
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

.proof-workspace {
  display: grid;
  place-items: center;
  padding: 48px;
}

.proof-card {
  display: flex;
  width: min(720px, 100%);
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: rgba(17, 17, 17, 0.92);
}

.proof-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.proof-result .proof-meta div:has(dd:nth-child(2)) {
  min-width: 0;
}

.proof-result .proof-meta div:nth-child(n + 3) {
  grid-column: 1 / -1;
}

.proof-action {
  width: 220px;
}

.proof-result {
  display: grid;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.plain-explain {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 14px;
  background: rgba(49, 46, 129, 0.2);
}

.plain-explain strong {
  color: #e0e7ff;
  font-size: 13px;
}

.plain-explain span {
  color: #c7d2fe;
  font-size: 13px;
  line-height: 1.6;
}

.issue-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: #fca5a5;
  font-size: 12px;
  line-height: 1.5;
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
