<script setup lang="ts">
import { computed, ref } from 'vue'
import ValueCurvePanel from '../components/structure/ValueCurvePanel.vue'
import {
  PROJECT_OWNER_ID,
  type StoryCoreFields,
  type StructureOwnerType,
  useStructureStore,
} from '../stores/structure'

const PROJECT_TITLE = '未命名项目'

type SelectedNode =
  | { type: 'project' }
  | { type: 'act'; actId: string }
  | { type: 'sequence'; actId: string; seqId: string }

const store = useStructureStore()
const selectedNode = ref<SelectedNode>({ type: 'project' })
const counterIdeaOpen = ref(false)
const coreAxisPickerOpen = ref(false)
const newCorePositiveLabel = ref('')
const newCoreNegativeLabel = ref('')

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

const selectedOwnerType = computed<StructureOwnerType>(() => selectedNode.value.type)

const selectedOwnerId = computed(() => {
  if (selectedNode.value.type === 'project') return PROJECT_OWNER_ID
  if (selectedNode.value.type === 'act') return selectedNode.value.actId
  return selectedNode.value.seqId
})

const curveTargets = computed(() => {
  if (selectedNode.value.type === 'project') {
    return store.acts.map((act) => ({
      id: act.id,
      type: 'act' as StructureOwnerType,
      label: act.label,
    }))
  }

  if (selectedNode.value.type === 'act') {
    return (selectedAct.value?.sequences ?? []).map((seq) => ({
      id: seq.id,
      type: 'sequence' as StructureOwnerType,
      label: seq.label,
    }))
  }

  return []
})

const projectValueAxes = computed(() =>
  store.getValueAxesForOwner('project', PROJECT_OWNER_ID),
)

const selectedCoreAxisIds = computed(() =>
  store.storyCore.coreValueAxisIds.filter((axisId) =>
    projectValueAxes.value.some((axis) => axis.id === axisId),
  ),
)

const selectedCoreAxes = computed(() =>
  selectedCoreAxisIds.value
    .map((axisId) => projectValueAxes.value.find((axis) => axis.id === axisId))
    .filter((axis) => axis !== undefined),
)

const availableCoreAxes = computed(() =>
  projectValueAxes.value.filter((axis) => !selectedCoreAxisIds.value.includes(axis.id)),
)

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

type StoryCoreTextField = Exclude<keyof StoryCoreFields, 'coreValueAxisIds'>

function axisLabel(axisId: string) {
  const axis = projectValueAxes.value.find((item) => item.id === axisId)
  return axis ? `${axis.positiveLabel} / ${axis.negativeLabel}` : ''
}

function updateStoryField(field: StoryCoreTextField, e: Event) {
  store.updateStoryCoreField(field, (e.target as HTMLTextAreaElement | HTMLInputElement).value)
}

function addCoreAxis(axisId: string) {
  store.addStoryCoreValueAxis(axisId)
  coreAxisPickerOpen.value = false
}

function removeCoreAxis(axisId: string) {
  store.removeStoryCoreValueAxis(axisId)
}

function setPrimaryCoreAxis(axisId: string) {
  store.setPrimaryStoryCoreValueAxis(axisId)
}

function addNewCoreAxis() {
  const axis = store.addValueAxis('project', PROJECT_OWNER_ID)
  store.updateValueAxis(axis.id, {
    positiveLabel: newCorePositiveLabel.value.trim() || axis.positiveLabel,
    negativeLabel: newCoreNegativeLabel.value.trim() || axis.negativeLabel,
  })
  store.addStoryCoreValueAxis(axis.id)
  newCorePositiveLabel.value = ''
  newCoreNegativeLabel.value = ''
  coreAxisPickerOpen.value = false
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
      <ValueCurvePanel
        :owner-type="selectedOwnerType"
        :owner-id="selectedOwnerId"
        :title="selectedTitle"
        :horizontal-unit-label="horizontalUnitLabel"
        :targets="curveTargets"
      />

      <section class="structure-lower-panel scrollbar-panel">
        <div v-if="isProjectSelected()" class="story-core-panel">
          <div class="story-line">
            <span>如果</span>
            <input
              :value="store.storyCore.premise"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateStoryField('premise', $event)"
            />
            <span>，会怎样？</span>
          </div>

          <div class="story-line">
            <input
              :value="store.storyCore.balanceBreak"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateStoryField('balanceBreak', $event)"
            />
            <span>打破了主角生活的平衡。</span>
          </div>

          <div class="story-line story-line-wrap">
            <span>为了恢复平衡，主角想要</span>
            <input
              :value="store.storyCore.consciousDesire"
              class="story-inline-input"
              type="text"
              @input="updateStoryField('consciousDesire', $event)"
            />
            <span>。实际上，主角要的是</span>
            <input
              :value="store.storyCore.unconsciousDesire"
              class="story-inline-input"
              type="text"
              @input="updateStoryField('unconsciousDesire', $event)"
            />
            <span class="field-note">（选填）</span>
          </div>

          <div class="story-line core-axis-line">
            <span>核心价值冲突是：</span>
            <div class="core-axis-selected-list">
              <div
                v-for="(axis, index) in selectedCoreAxes"
                :key="axis.id"
                class="core-axis-chip selected"
              >
                <button
                  class="core-axis-role"
                  type="button"
                  :title="index === 0 ? '主要冲突' : '设为主要冲突'"
                  @click="setPrimaryCoreAxis(axis.id)"
                >
                  {{ index === 0 ? '主' : '次' }}
                </button>
                <span class="axis-color" :style="{ background: axis.color }" />
                <span>{{ axisLabel(axis.id) }}</span>
                <button
                  class="core-axis-remove"
                  type="button"
                  title="移出核心冲突"
                  @click="removeCoreAxis(axis.id)"
                >
                  ×
                </button>
              </div>

              <span v-if="selectedCoreAxes.length === 0" class="core-axis-empty">尚未选择</span>

              <button
                class="core-axis-add"
                type="button"
                :disabled="selectedCoreAxisIds.length >= 5"
                @click="coreAxisPickerOpen = !coreAxisPickerOpen"
              >
                ＋
              </button>
            </div>
            <span class="field-note">1主 + 4次</span>

            <div v-if="coreAxisPickerOpen" class="core-axis-picker-popover">
              <button
                v-for="axis in availableCoreAxes"
                :key="axis.id"
                class="core-axis-option"
                type="button"
                @click="addCoreAxis(axis.id)"
              >
                <span class="axis-color" :style="{ background: axis.color }" />
                <span>{{ axisLabel(axis.id) }}</span>
              </button>

              <div v-if="availableCoreAxes.length === 0" class="core-axis-empty">没有可选价值轴</div>

              <div class="new-core-axis-row">
                <input
                  v-model="newCorePositiveLabel"
                  class="new-core-axis-input"
                  type="text"
                  placeholder="正价值"
                />
                <span>/</span>
                <input
                  v-model="newCoreNegativeLabel"
                  class="new-core-axis-input"
                  type="text"
                  placeholder="反价值"
                />
                <button class="new-core-axis-btn" type="button" @click="addNewCoreAxis">添加</button>
              </div>
            </div>
          </div>

          <div class="story-line">
            <span>所以说，</span>
            <input
              :value="store.storyCore.controllingIdea"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateStoryField('controllingIdea', $event)"
            />
            <span>，</span>
          </div>

          <div class="story-line">
            <span>因为</span>
            <input
              :value="store.storyCore.controllingIdeaReason"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateStoryField('controllingIdeaReason', $event)"
            />
            <span>。</span>
          </div>

          <div class="counter-idea-block" :class="{ open: counterIdeaOpen }">
            <button class="counter-toggle" type="button" @click="counterIdeaOpen = !counterIdeaOpen">
              <span>反面？</span>
              <strong>{{ counterIdeaOpen ? '收起' : '展开' }}</strong>
            </button>

            <div v-if="counterIdeaOpen" class="counter-fields">
              <div class="story-line">
                <span>这个的反面是</span>
                <input
                  :value="store.storyCore.counterIdea"
                  class="story-inline-input story-input-xl"
                  type="text"
                  @input="updateStoryField('counterIdea', $event)"
                />
                <span>，</span>
              </div>

              <div class="story-line">
                <span>因为</span>
                <input
                  :value="store.storyCore.counterIdeaReason"
                  class="story-inline-input story-input-xl"
                  type="text"
                  @input="updateStoryField('counterIdeaReason', $event)"
                />
                <span>。</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="lower-placeholder">
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

.structure-lower-panel {
  flex: 2;
  min-height: 180px;
  border: 1px solid #27272a;
  border-radius: 12px;
  background: #18181b;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  overflow: auto;
}

.story-core-panel {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
}

.story-line {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.6;
}

.story-line-wrap {
  flex-wrap: wrap;
}

.story-inline-input {
  width: auto;
  min-width: 180px;
  max-width: 420px;
  flex: 0 1 auto;
  field-sizing: content;
  border: none;
  border-bottom: 1px solid #52525b;
  border-radius: 0;
  background: transparent;
  color: #e4e4e7;
  outline: none;
  padding: 2px 4px 3px;
  font-size: 14px;
  line-height: 1.4;
}

.story-input-xl {
  min-width: 220px;
  max-width: 560px;
}

.story-inline-input:focus {
  border-bottom-color: #a78bfa;
  box-shadow: 0 1px 0 rgba(167, 139, 250, 0.45);
}

.field-note {
  color: #71717a;
  font-size: 12px;
}

.core-axis-line {
  position: relative;
  align-items: center;
  flex-wrap: wrap;
}

.core-axis-selected-list {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.core-axis-chip,
.core-axis-option {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #3f3f46;
  border-radius: 999px;
  background: #111114;
  color: #a1a1aa;
  padding: 3px 8px;
  font-size: 12px;
  transition: all 0.15s;
}

.core-axis-chip {
  user-select: none;
}

.core-axis-chip.selected {
  border-color: rgba(167, 139, 250, 0.68);
  background: rgba(167, 139, 250, 0.12);
  color: #f4f4f5;
}

.core-axis-option {
  width: 100%;
  cursor: pointer;
}

.core-axis-option:hover {
  border-color: rgba(167, 139, 250, 0.68);
  background: rgba(167, 139, 250, 0.12);
  color: #f4f4f5;
}

.core-axis-role,
.core-axis-remove,
.core-axis-add,
.new-core-axis-btn {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  user-select: none;
}

.core-axis-role {
  border-radius: 999px;
  background: rgba(167, 139, 250, 0.2);
  color: #d8b4fe;
  padding: 0 5px;
  font-size: 11px;
}

.core-axis-remove {
  color: #71717a;
  font-size: 13px;
  line-height: 1;
}

.core-axis-remove:hover {
  color: #ef4444;
}

.core-axis-add {
  width: 24px;
  height: 24px;
  border: 1px dashed #52525b;
  border-radius: 999px;
  color: #a78bfa;
}

.core-axis-add:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.axis-color {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.core-axis-empty {
  color: #71717a;
  font-size: 12px;
}

.core-axis-picker-popover {
  position: absolute;
  z-index: 10;
  top: 30px;
  left: 112px;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  background: #111114;
  padding: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.36);
}

.new-core-axis-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid #27272a;
  padding-top: 6px;
}

.new-core-axis-input {
  min-width: 0;
  flex: 1;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  background: #18181b;
  color: #e4e4e7;
  outline: none;
  padding: 4px 6px;
  font-size: 12px;
}

.new-core-axis-input:focus {
  border-color: rgba(167, 139, 250, 0.72);
}

.new-core-axis-btn {
  border: 1px solid #3f3f46;
  border-radius: 6px;
  padding: 4px 8px;
  color: #a78bfa;
  font-size: 12px;
}

.new-core-axis-btn:hover {
  border-color: rgba(167, 139, 250, 0.68);
}

.counter-idea-block {
  border-top: 1px solid #27272a;
  padding-top: 8px;
}

.counter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.counter-toggle:hover,
.counter-toggle strong {
  color: #a78bfa;
}

.counter-toggle strong {
  font-size: 12px;
  font-weight: 500;
}

.counter-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.lower-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #71717a;
}

.lower-placeholder p {
  margin: 8px 0 0;
  color: #a1a1aa;
  font-size: 14px;
}
</style>
