<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStructureStore } from '../stores/structure'

const PROJECT_TITLE = '未命名项目'

const CHART_WIDTH = 720
const CHART_LEFT = 56
const CHART_RIGHT = 32
const CHART_TOP = 36
const CHART_HEIGHT = 178

type SelectedNode =
  | { type: 'project' }
  | { type: 'act'; actId: string }
  | { type: 'sequence'; actId: string; seqId: string }

const store = useStructureStore()
const selectedNode = ref<SelectedNode>({ type: 'project' })

const selectedAct = computed(() => {
  const node = selectedNode.value
  if (node.type === 'project') return undefined
  return store.acts.find((act) => act.id === node.actId)
})

const selectedSequence = computed(() => {
  const node = selectedNode.value
  if (node.type !== 'sequence') return undefined
  return selectedAct.value?.sequences.find((seq) => seq.id === node.seqId)
})

const selectedTitle = computed(() => {
  if (selectedNode.value.type === 'project') return PROJECT_TITLE
  if (selectedNode.value.type === 'act') return selectedAct.value?.label ?? '未选择幕'
  return selectedSequence.value?.label ?? '未选择序列'
})

const selectedKindLabel = computed(() => {
  if (selectedNode.value.type === 'project') return '项目'
  if (selectedNode.value.type === 'act') return '幕'
  return '序列'
})

const horizontalUnitLabel = computed(() => {
  if (selectedNode.value.type === 'project') return '幕'
  if (selectedNode.value.type === 'act') return '序列'
  return '场景'
})

const curveUnitLabels = computed(() => {
  if (selectedNode.value.type === 'project') {
    return store.acts.map((act) => act.label)
  }

  if (selectedNode.value.type === 'act') {
    return selectedAct.value?.sequences.map((seq) => seq.label) ?? []
  }

  return []
})

const tickPositions = computed(() => {
  const labels = curveUnitLabels.value
  const chartWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT

  return labels.map((label, index) => ({
    label,
    x: labels.length === 1 ? CHART_LEFT + chartWidth / 2 : CHART_LEFT + (chartWidth * index) / (labels.length - 1),
  }))
})

const curveSeries = computed(() => {
  const labels = curveUnitLabels.value
  if (labels.length === 0) return []

  const presets = [
    { label: '安全 / 危险', color: '#a78bfa', values: [0.68, 0.55, 0.34, 0.22, 0.4, 0.28] },
    { label: '信任 / 怀疑', color: '#60a5fa', values: [0.42, 0.5, 0.62, 0.48, 0.35, 0.28] },
  ]

  return presets.map((series) => {
    const points = labels.map((_, index) => {
      const x = tickPositions.value[index].x
      const value = series.values[index % series.values.length]
      const y = CHART_TOP + (1 - value) * CHART_HEIGHT
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })

    return {
      label: series.label,
      color: series.color,
      path: points.join(' '),
    }
  })
})

function isProjectSelected() {
  return selectedNode.value.type === 'project'
}

function isActSelected(actId: string) {
  return selectedNode.value.type === 'act' && selectedNode.value.actId === actId
}

function isSequenceSelected(seqId: string) {
  return selectedNode.value.type === 'sequence' && selectedNode.value.seqId === seqId
}

function selectProject() {
  selectedNode.value = { type: 'project' }
}

function selectAct(actId: string) {
  selectedNode.value = { type: 'act', actId }
}

function selectSequence(actId: string, seqId: string) {
  selectedNode.value = { type: 'sequence', actId, seqId }
}

function addActAndSelect() {
  store.addAct()
  const act = store.acts[store.acts.length - 1]
  if (act) selectAct(act.id)
}

function addSequenceAndSelect(actId: string) {
  store.addSequence(actId)
  const act = store.acts.find((item) => item.id === actId)
  const seq = act?.sequences[act.sequences.length - 1]
  if (seq) selectSequence(actId, seq.id)
}

function removeActAndRepairSelection(actId: string) {
  store.removeAct(actId)

  if (selectedNode.value.type !== 'project' && selectedNode.value.actId === actId) {
    selectProject()
  }
}

function removeSequenceAndRepairSelection(actId: string, seqId: string) {
  store.removeSequence(actId, seqId)

  if (selectedNode.value.type === 'sequence' && selectedNode.value.seqId === seqId) {
    selectAct(actId)
  }
}

function onActColorChange(actId: string, e: Event) {
  store.updateActColor(actId, (e.target as HTMLInputElement).value)
}

function onActLabelBlur(actId: string, e: Event) {
  store.updateActLabel(actId, (e.target as HTMLInputElement).value)
}

function onSeqColorChange(actId: string, seqId: string, e: Event) {
  store.updateSequenceColor(actId, seqId, (e.target as HTMLInputElement).value)
}

function onSeqLabelBlur(actId: string, seqId: string, e: Event) {
  store.updateSequenceLabel(actId, seqId, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="structure-workbench">
    <aside class="structure-sidebar scrollbar-panel">
      <div class="sidebar-header">
        <div>
          <div class="eyebrow">结构目录</div>
          <h1>结构工作台</h1>
        </div>
        <button class="primary-add-btn" @click="addActAndSelect">+ 幕</button>
      </div>

      <div class="structure-tree">
        <button
          class="tree-row project-row"
          :class="{ selected: isProjectSelected() }"
          type="button"
          @click="selectProject"
        >
          <span class="project-mark" />
          <span class="tree-label project-title">{{ PROJECT_TITLE }}</span>
        </button>

        <div v-if="store.acts.length === 0" class="empty-hint">
          暂无结构，点击右上「+ 幕」开始建立目录
        </div>

        <div v-for="act in store.acts" :key="act.id" class="act-branch">
          <div
            class="tree-row act-row"
            :class="{ selected: isActSelected(act.id) }"
            @click="selectAct(act.id)"
          >
            <input
              type="color"
              :value="act.color"
              class="color-picker"
              @click.stop
              @input="onActColorChange(act.id, $event)"
            />
            <input
              type="text"
              :value="act.label"
              class="label-input act-label-input"
              @click.stop
              @focus="selectAct(act.id)"
              @blur="onActLabelBlur(act.id, $event)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            <button
              class="remove-btn"
              type="button"
              title="删除幕"
              @click.stop="removeActAndRepairSelection(act.id)"
            >
              ×
            </button>
          </div>

          <div class="sequence-list">
            <div
              v-for="seq in act.sequences"
              :key="seq.id"
              class="tree-row sequence-row"
              :class="{ selected: isSequenceSelected(seq.id) }"
              @click="selectSequence(act.id, seq.id)"
            >
              <input
                type="color"
                :value="seq.color"
                class="color-picker color-picker-sm"
                @click.stop
                @input="onSeqColorChange(act.id, seq.id, $event)"
              />
              <input
                type="text"
                :value="seq.label"
                class="label-input seq-label-input"
                @click.stop
                @focus="selectSequence(act.id, seq.id)"
                @blur="onSeqLabelBlur(act.id, seq.id, $event)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
              <button
                class="remove-btn remove-btn-sm"
                type="button"
                title="删除序列"
                @click.stop="removeSequenceAndRepairSelection(act.id, seq.id)"
              >
                ×
              </button>
            </div>

            <button class="add-seq-btn" type="button" @click="addSequenceAndSelect(act.id)">
              + 序列
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main class="structure-main">
      <section class="value-curve-panel">
        <div class="panel-header">
          <div>
            <div class="eyebrow">价值曲线</div>
            <h2>{{ selectedTitle }}</h2>
          </div>
          <div class="scope-pill">横轴：{{ horizontalUnitLabel }}</div>
        </div>

        <div class="curve-stage">
          <svg
            v-if="curveUnitLabels.length > 0"
            class="curve-svg"
            viewBox="0 0 720 280"
            role="img"
            aria-label="价值曲线占位图"
          >
            <line x1="56" y1="36" x2="56" y2="214" class="axis-line" />
            <line x1="56" y1="214" x2="688" y2="214" class="axis-line" />
            <line x1="56" y1="125" x2="688" y2="125" class="center-line" />

            <line x1="56" y1="66" x2="688" y2="66" class="grid-line" />
            <line x1="56" y1="184" x2="688" y2="184" class="grid-line" />

            <g v-for="tick in tickPositions" :key="tick.label">
              <line :x1="tick.x" y1="36" :x2="tick.x" y2="214" class="tick-line" />
              <text :x="tick.x" y="242" text-anchor="middle" class="tick-label">
                {{ tick.label }}
              </text>
            </g>

            <path
              v-for="series in curveSeries"
              :key="series.label"
              :d="series.path"
              :stroke="series.color"
              class="curve-path"
            />
          </svg>

          <div v-else class="curve-empty">
            <span>当前{{ selectedKindLabel }}暂无可展示的{{ horizontalUnitLabel }}</span>
            <small>左侧添加{{ horizontalUnitLabel }}后，这里将形成价值曲线横轴。</small>
          </div>
        </div>

        <div class="curve-footer">
          <div class="legend-list">
            <span v-for="series in curveSeries" :key="series.label" class="legend-item">
              <span class="legend-dot" :style="{ background: series.color }" />
              {{ series.label }}
            </span>
          </div>
          <span class="curve-note">曲线为占位示意，价值轴与数值后续接入。</span>
        </div>
      </section>

      <section class="structure-lower-panel">
        <div class="lower-placeholder">
          <div class="eyebrow">预留区域</div>
          <p>当前{{ selectedKindLabel }}：{{ selectedTitle }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.structure-workbench {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  background: #111114;
  color: #d4d4d8;
}

.structure-sidebar {
  width: 300px;
  min-width: 300px;
  height: 100%;
  border-right: 1px solid #27272a;
  background: #09090b;
  overflow-y: auto;
  padding: 18px 14px;
}

.sidebar-header,
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.sidebar-header {
  margin-bottom: 18px;
}

.eyebrow {
  color: #71717a;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 4px 0 0;
  color: #e4e4e7;
  font-weight: 600;
}

h1 {
  font-size: 18px;
}

h2 {
  font-size: 20px;
}

.primary-add-btn,
.add-seq-btn {
  border: 1px solid #3f3f46;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.15s;
}

.primary-add-btn {
  padding: 6px 12px;
  font-size: 13px;
}

.primary-add-btn:hover,
.add-seq-btn:hover {
  background: #27272a;
  color: #e4e4e7;
  border-color: #52525b;
}

.structure-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-row {
  width: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  text-align: left;
  transition: all 0.15s;
}

button.tree-row {
  cursor: pointer;
}

.tree-row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #d4d4d8;
}

.tree-row.selected {
  border-color: rgba(167, 139, 250, 0.42);
  background: rgba(167, 139, 250, 0.12);
  color: #f4f4f5;
}

.project-row {
  padding: 7px 9px;
}

.project-mark {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #a78bfa;
  box-shadow: 0 0 14px rgba(167, 139, 250, 0.5);
  flex-shrink: 0;
}

.project-title {
  font-weight: 600;
}

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  padding: 28px 8px;
  color: #52525b;
  font-size: 13px;
  line-height: 1.6;
}

.act-branch {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.act-row,
.sequence-row {
  padding: 2px 4px;
  cursor: pointer;
}

.sequence-list {
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-picker {
  width: 22px;
  height: 22px;
  border: 1px solid #3f3f46;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  padding: 1px;
  flex-shrink: 0;
}

.color-picker-sm {
  width: 18px;
  height: 18px;
}

.label-input {
  min-width: 0;
  flex: 1;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.label-input:hover,
.label-input:focus {
  border-color: #3f3f46;
}

.act-label-input {
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 600;
}

.seq-label-input {
  padding: 3px 6px;
  font-size: 13px;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #52525b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
  transition: all 0.15s;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.remove-btn-sm {
  width: 22px;
  height: 22px;
  font-size: 13px;
}

.add-seq-btn {
  align-self: flex-start;
  margin: 2px 0 4px;
  padding: 3px 10px;
  color: #71717a;
  font-size: 12px;
  border-style: dashed;
}

.structure-main {
  min-width: 0;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px;
  gap: 14px;
  overflow: hidden;
}

.value-curve-panel,
.structure-lower-panel {
  border: 1px solid #27272a;
  border-radius: 12px;
  background: #18181b;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.value-curve-panel {
  min-height: 360px;
  flex: 3;
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.structure-lower-panel {
  flex: 2;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scope-pill {
  border: 1px solid #3f3f46;
  border-radius: 999px;
  padding: 5px 12px;
  color: #a1a1aa;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.curve-stage {
  min-height: 0;
  flex: 1;
  margin-top: 18px;
  border: 1px solid #27272a;
  border-radius: 10px;
  background:
    radial-gradient(circle at 50% 10%, rgba(167, 139, 250, 0.08), transparent 34%),
    #101013;
  overflow: hidden;
}

.curve-svg {
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: block;
}

.axis-line,
.center-line,
.grid-line,
.tick-line {
  fill: none;
  vector-effect: non-scaling-stroke;
}

.axis-line {
  stroke: #3f3f46;
  stroke-width: 1.2;
}

.center-line {
  stroke: #52525b;
  stroke-dasharray: 5 7;
  stroke-width: 1;
}

.grid-line,
.tick-line {
  stroke: rgba(113, 113, 122, 0.22);
  stroke-width: 1;
}

.tick-label {
  fill: #a1a1aa;
  font-size: 12px;
}

.curve-path {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.16));
}

.curve-empty {
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #71717a;
  font-size: 14px;
}

.curve-empty small {
  color: #52525b;
  font-size: 12px;
}

.curve-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  color: #71717a;
  font-size: 12px;
}

.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.curve-note {
  color: #52525b;
}

.lower-placeholder {
  text-align: center;
  color: #71717a;
}

.lower-placeholder p {
  margin: 8px 0 0;
  color: #a1a1aa;
  font-size: 14px;
}
</style>
