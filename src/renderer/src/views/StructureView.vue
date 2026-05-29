<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ValueCurvePanel from '../components/structure/ValueCurvePanel.vue'
import {
  PROJECT_OWNER_ID,
  type ActCoreTextField,
  type SceneCoreTextField,
  type SequenceCoreTextField,
  type StoryCoreFields,
  type StructureOwnerType,
  useStructureStore,
} from '../stores/structure'

const PROJECT_TITLE = '未命名项目'

type SelectedNode =
  | { type: 'project' }
  | { type: 'act'; actId: string }
  | { type: 'sequence'; actId: string; seqId: string }
  | { type: 'scene'; actId: string; seqId: string; sceneId: string }

const store = useStructureStore()
const route = useRoute()
const selectedNode = ref<SelectedNode>({ type: 'project' })

function applyRouteQuery() {
  const { ownerType, ownerId, actId } = route.query
  if (ownerType === 'project') {
    selectedNode.value = { type: 'project' }
    return
  }

  const oid = (ownerId as string) ?? ''

  if (ownerType === 'act' && oid) {
    if (store.acts.some((a) => a.id === oid)) {
      selectedNode.value = { type: 'act', actId: oid }
      return
    }
  }

  if (ownerType === 'sequence' && oid) {
    const aid = (actId as string) ?? ''
    const act = store.acts.find((a) => a.id === aid && a.sequences.some((s) => s.id === oid))
    if (act) {
      selectedNode.value = { type: 'sequence', actId: aid, seqId: oid }
      return
    }
  }

  // fallback
  selectedNode.value = { type: 'project' }
}

onMounted(() => {
  applyRouteQuery()
})

const counterIdeaOpen = ref(false)
const coreAxisPickerOpen = ref(false)
const newCorePositiveLabel = ref('')
const newCoreNegativeLabel = ref('')
const editingLabelKey = ref('')
const editingLabelDraft = ref('')

const selectedAct = computed(() => {
  const node = selectedNode.value
  if (node.type === 'project') return undefined
  return store.acts.find((act) => act.id === node.actId)
})

const selectedSequence = computed(() => {
  const node = selectedNode.value
  if (node.type !== 'sequence' && node.type !== 'scene') return undefined
  return selectedAct.value?.sequences.find((seq) => seq.id === node.seqId)
})

const selectedScene = computed(() => {
  const node = selectedNode.value
  if (node.type !== 'scene') return undefined
  return selectedSequence.value?.scenes.find((scene) => scene.id === node.sceneId)
})

const selectedTitle = computed(() => {
  if (selectedNode.value.type === 'project') return PROJECT_TITLE
  if (selectedNode.value.type === 'act') return selectedAct.value?.label ?? '未选择幕'
  if (selectedNode.value.type === 'sequence') return selectedSequence.value?.label ?? '未选择序列'
  return selectedScene.value?.label ?? '未选择场景'
})

const selectedKindLabel = computed(() => {
  if (selectedNode.value.type === 'project') return '项目'
  if (selectedNode.value.type === 'act') return '幕'
  if (selectedNode.value.type === 'sequence') return '序列'
  return '场景'
})

const horizontalUnitLabel = computed(() => {
  if (selectedNode.value.type === 'project') return '幕'
  if (selectedNode.value.type === 'act') return '序列'
  if (selectedNode.value.type === 'sequence') return '场景'
  return '节拍'
})

const selectedOwnerType = computed<StructureOwnerType>(() => selectedNode.value.type)

const selectedOwnerId = computed(() => {
  if (selectedNode.value.type === 'project') return PROJECT_OWNER_ID
  if (selectedNode.value.type === 'act') return selectedNode.value.actId
  if (selectedNode.value.type === 'sequence') return selectedNode.value.seqId
  return selectedNode.value.sceneId
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

  if (selectedNode.value.type === 'sequence') {
    return (selectedSequence.value?.scenes ?? []).map((scene) => ({
      id: scene.id,
      type: 'scene' as StructureOwnerType,
      label: scene.label,
    }))
  }

  if (selectedNode.value.type === 'scene') {
    return (selectedScene.value?.beats ?? []).map((beat) => ({
      id: beat.id,
      type: 'scene' as StructureOwnerType,
      label: beat.label,
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

function isSceneSelected(sceneId: string) {
  return selectedNode.value.type === 'scene' && selectedNode.value.sceneId === sceneId
}

function isSequenceScenesOpen(seqId: string) {
  return (
    (selectedNode.value.type === 'sequence' || selectedNode.value.type === 'scene') &&
    selectedNode.value.seqId === seqId
  )
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

function selectScene(actId: string, seqId: string, sceneId: string) {
  selectedNode.value = { type: 'scene', actId, seqId, sceneId }
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

  if (
    (selectedNode.value.type === 'sequence' || selectedNode.value.type === 'scene') &&
    selectedNode.value.seqId === seqId
  ) {
    selectAct(actId)
  }
}

function addSceneAndSelect(actId: string, seqId: string) {
  const scene = store.addScene(actId, seqId)
  if (!scene) return
  selectScene(actId, seqId, scene.id)
  startSceneLabelEdit(scene.id, scene.label)
}

function removeSceneAndRepairSelection(actId: string, seqId: string, sceneId: string) {
  store.removeScene(actId, seqId, sceneId)

  if (selectedNode.value.type === 'scene' && selectedNode.value.sceneId === sceneId) {
    selectSequence(actId, seqId)
  }
}

function onActColorChange(actId: string, e: Event) {
  store.updateActColor(actId, (e.target as HTMLInputElement).value)
}

function labelEditKey(type: 'act' | 'sequence' | 'scene', id: string) {
  return `${type}:${id}`
}

function isEditingLabel(type: 'act' | 'sequence' | 'scene', id: string) {
  return editingLabelKey.value === labelEditKey(type, id)
}

function startActLabelEdit(actId: string, label: string) {
  editingLabelKey.value = labelEditKey('act', actId)
  editingLabelDraft.value = label
}

function startSequenceLabelEdit(seqId: string, label: string) {
  editingLabelKey.value = labelEditKey('sequence', seqId)
  editingLabelDraft.value = label
}

function startSceneLabelEdit(sceneId: string, label: string) {
  editingLabelKey.value = labelEditKey('scene', sceneId)
  editingLabelDraft.value = label
}

function commitLabelEdit() {
  const key = editingLabelKey.value
  const label = editingLabelDraft.value.trim()
  if (!key) return

  const [type, id] = key.split(':')
  if (type === 'act') {
    store.updateActLabel(id, label || selectedAct.value?.label || '未命名幕')
  }

  if (type === 'sequence') {
    const act = store.acts.find((item) => item.sequences.some((seq) => seq.id === id))
    const seq = act?.sequences.find((item) => item.id === id)
    if (act && seq) store.updateSequenceLabel(act.id, id, label || seq.label || '未命名序列')
  }

  if (type === 'scene') {
    const act = store.acts.find((item) =>
      item.sequences.some((seq) => seq.scenes.some((scene) => scene.id === id)),
    )
    const seq = act?.sequences.find((item) => item.scenes.some((scene) => scene.id === id))
    const scene = seq?.scenes.find((item) => item.id === id)
    if (act && seq && scene) store.updateSceneLabel(act.id, seq.id, id, label || scene.label || '未命名场景')
  }

  editingLabelKey.value = ''
  editingLabelDraft.value = ''
}

function cancelLabelEdit() {
  editingLabelKey.value = ''
  editingLabelDraft.value = ''
}

function onLabelEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    ;(e.target as HTMLInputElement).blur()
  }

  if (e.key === 'Escape') {
    cancelLabelEdit()
  }
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

function updateActCoreField(field: ActCoreTextField, e: Event) {
  if (selectedNode.value.type !== 'act') return
  store.updateActCoreField(
    selectedNode.value.actId,
    field,
    (e.target as HTMLTextAreaElement | HTMLInputElement).value,
  )
}

function updateSequenceCoreField(field: SequenceCoreTextField, e: Event) {
  if (selectedNode.value.type !== 'sequence' && selectedNode.value.type !== 'scene') return
  store.updateSequenceCoreField(
    selectedNode.value.actId,
    selectedNode.value.seqId,
    field,
    (e.target as HTMLTextAreaElement | HTMLInputElement).value,
  )
}

function updateSceneCoreField(sceneId: string, field: SceneCoreTextField, e: Event) {
  if (!selectedSequence.value) return
  const node = selectedNode.value
  if (node.type !== 'sequence' && node.type !== 'scene') return
  store.updateSceneCoreField(
    node.actId,
    node.seqId,
    sceneId,
    field,
    (e.target as HTMLTextAreaElement | HTMLInputElement).value,
  )
}

function addBeatToSelectedScene() {
  if (selectedNode.value.type !== 'scene') return
  store.addBeat(selectedNode.value.actId, selectedNode.value.seqId, selectedNode.value.sceneId)
}

function removeBeatFromSelectedScene(beatId: string) {
  if (selectedNode.value.type !== 'scene') return
  store.removeBeat(selectedNode.value.actId, selectedNode.value.seqId, selectedNode.value.sceneId, beatId)
}

function updateBeatSummary(beatId: string, e: Event) {
  if (selectedNode.value.type !== 'scene') return
  store.updateBeatSummary(
    selectedNode.value.actId,
    selectedNode.value.seqId,
    selectedNode.value.sceneId,
    beatId,
    (e.target as HTMLInputElement).value,
  )
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
              v-if="isEditingLabel('act', act.id)"
              v-model="editingLabelDraft"
              type="text"
              class="label-input act-label-input"
              autofocus
              @click.stop
              @blur="commitLabelEdit"
              @keydown="onLabelEditKeydown"
            />
            <span
              v-else
              class="tree-label editable-label act-text-label"
              title="双击修改标题"
              @dblclick.stop="startActLabelEdit(act.id, act.label)"
            >
              {{ act.label }}
            </span>
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
            <div v-for="seq in act.sequences" :key="seq.id" class="sequence-branch">
              <div
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
                  v-if="isEditingLabel('sequence', seq.id)"
                  v-model="editingLabelDraft"
                  type="text"
                  class="label-input seq-label-input"
                  autofocus
                  @click.stop
                  @blur="commitLabelEdit"
                  @keydown="onLabelEditKeydown"
                />
                <span
                  v-else
                  class="tree-label editable-label seq-text-label"
                  title="双击修改标题"
                  @dblclick.stop="startSequenceLabelEdit(seq.id, seq.label)"
                >
                  {{ seq.label }}
                </span>
                <button
                  class="remove-btn remove-btn-sm"
                  type="button"
                  title="删除序列"
                  @click.stop="removeSequenceAndRepairSelection(act.id, seq.id)"
                >
                  ×
                </button>
              </div>

              <div v-if="isSequenceScenesOpen(seq.id)" class="scene-list">
                <div
                  v-for="scene in seq.scenes"
                  :key="scene.id"
                  class="tree-row scene-row"
                  :class="{ selected: isSceneSelected(scene.id) }"
                  @click="selectScene(act.id, seq.id, scene.id)"
                >
                  <span class="scene-mark" />
                  <input
                    v-if="isEditingLabel('scene', scene.id)"
                    v-model="editingLabelDraft"
                    type="text"
                    class="label-input scene-label-input"
                    autofocus
                    @click.stop
                    @blur="commitLabelEdit"
                    @keydown="onLabelEditKeydown"
                  />
                  <span
                    v-else
                    class="tree-label editable-label scene-text-label"
                    title="双击修改标题"
                    @dblclick.stop="startSceneLabelEdit(scene.id, scene.label)"
                  >
                    {{ scene.label }}
                  </span>
                  <button
                    class="remove-btn remove-btn-sm"
                    type="button"
                    title="删除场景"
                    @click.stop="removeSceneAndRepairSelection(act.id, seq.id, scene.id)"
                  >
                    ×
                  </button>
                </div>

                <button class="add-scene-btn" type="button" @click="addSceneAndSelect(act.id, seq.id)">
                  + 场景
                </button>
              </div>
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

        <div
          v-else-if="selectedNode.type === 'scene' && selectedScene"
          class="sequence-core-panel"
        >
          <div class="sequence-top-grid">
            <div class="sequence-structure-fields">
              <div class="story-line">
                <span>开始状态：</span>
                <input class="story-inline-input" type="text" />
              </div>

              <div class="story-line">
                <span>转折处：</span>
                <input class="story-inline-input" type="text" />
              </div>

              <div class="story-line">
                <span>结束状态：</span>
                <input class="story-inline-input" type="text" />
              </div>

              <div class="story-line">
                <span>如果</span>
                <input class="story-inline-input" type="text" />
                <span>，就全剧终。</span>
              </div>
            </div>

            <div class="sequence-scene-panel">
              <div class="sequence-scene-head">
                <span>节拍</span>
                <button class="inline-add-btn" type="button" @click="addBeatToSelectedScene">
                  + 节拍
                </button>
              </div>

              <div class="sequence-scene-list">
                <div
                  v-for="beat in selectedScene.beats"
                  :key="beat.id"
                  class="sequence-scene-row"
                >
                  <span class="sequence-scene-name">{{ beat.label }}</span>
                  <input
                    :value="beat.summary"
                    class="scene-summary-input"
                    type="text"
                    placeholder="一句话梗概"
                    @input="updateBeatSummary(beat.id, $event)"
                  />
                  <button
                    class="scene-inline-remove"
                    type="button"
                    title="删除节拍"
                    @click="removeBeatFromSelectedScene(beat.id)"
                  >
                    ×
                  </button>
                </div>

                <button
                  v-if="selectedScene.beats.length === 0"
                  class="empty-scene-add-btn"
                  type="button"
                  @click="addBeatToSelectedScene"
                >
                  + 添加节拍
                </button>
              </div>
            </div>
          </div>

          <label class="act-synopsis-field sequence-synopsis-field">
            <span>剧情梗概：</span>
            <textarea
              :value="selectedScene.core.summary"
              rows="5"
              @input="updateSceneCoreField(selectedScene.id, 'summary', $event)"
            />
          </label>
        </div>

        <div
          v-else-if="selectedNode.type === 'sequence' && selectedSequence"
          class="sequence-core-panel"
        >
          <div class="sequence-top-grid">
            <div class="sequence-structure-fields">
              <div class="story-line">
                <span>开始状态：</span>
                <input
                  :value="selectedSequence.core.startState"
                  class="story-inline-input"
                  type="text"
                  @input="updateSequenceCoreField('startState', $event)"
                />
              </div>

              <div class="story-line">
                <span>转折处：</span>
                <input
                  :value="selectedSequence.core.turningPoint"
                  class="story-inline-input"
                  type="text"
                  @input="updateSequenceCoreField('turningPoint', $event)"
                />
              </div>

              <div class="story-line">
                <span>结束状态：</span>
                <input
                  :value="selectedSequence.core.endState"
                  class="story-inline-input"
                  type="text"
                  @input="updateSequenceCoreField('endState', $event)"
                />
              </div>

              <div class="story-line">
                <span>如果</span>
                <input
                  :value="selectedSequence.core.endingTest"
                  class="story-inline-input"
                  type="text"
                  @input="updateSequenceCoreField('endingTest', $event)"
                />
                <span>，就全剧终。</span>
              </div>
            </div>

            <div class="sequence-scene-panel">
              <div class="sequence-scene-head">
                <span>场景</span>
                <button class="inline-add-btn" type="button" @click="addSceneAndSelect(selectedNode.actId, selectedNode.seqId)">
                  + 场景
                </button>
              </div>

              <div class="sequence-scene-list">
                <div
                  v-for="scene in selectedSequence.scenes"
                  :key="scene.id"
                  class="sequence-scene-row"
                  :class="{ selected: isSceneSelected(scene.id) }"
                  @click="selectScene(selectedNode.actId, selectedNode.seqId, scene.id)"
                >
                  <span class="sequence-scene-name">{{ scene.label }}</span>
                  <input
                    :value="scene.core.summary"
                    class="scene-summary-input"
                    type="text"
                    placeholder="一句话梗概"
                    @click.stop
                    @input="updateSceneCoreField(scene.id, 'summary', $event)"
                  />
                  <button
                    class="scene-inline-remove"
                    type="button"
                    title="删除场景"
                    @click.stop="removeSceneAndRepairSelection(selectedNode.actId, selectedNode.seqId, scene.id)"
                  >
                    ×
                  </button>
                </div>

                <button
                  v-if="selectedSequence.scenes.length === 0"
                  class="empty-scene-add-btn"
                  type="button"
                  @click="addSceneAndSelect(selectedNode.actId, selectedNode.seqId)"
                >
                  + 添加场景
                </button>
              </div>
            </div>
          </div>

          <label class="act-synopsis-field sequence-synopsis-field">
            <span>剧情梗概：</span>
            <textarea
              :value="selectedSequence.core.synopsis"
              rows="5"
              @input="updateSequenceCoreField('synopsis', $event)"
            />
          </label>
        </div>

        <div v-else-if="selectedNode.type === 'act' && selectedAct" class="act-core-panel">
          <div class="story-line">
            <span>本幕最高任务：</span>
            <input
              :value="selectedAct.core.task"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateActCoreField('task', $event)"
            />
          </div>

          <div class="story-line story-line-wrap">
            <span>开始状态：</span>
            <input
              :value="selectedAct.core.startState"
              class="story-inline-input"
              type="text"
              @input="updateActCoreField('startState', $event)"
            />
            <span>结束状态：</span>
            <input
              :value="selectedAct.core.endState"
              class="story-inline-input"
              type="text"
              @input="updateActCoreField('endState', $event)"
            />
          </div>

          <div class="story-line">
            <span>假如</span>
            <input
              :value="selectedAct.core.endingTest"
              class="story-inline-input story-input-xl"
              type="text"
              @input="updateActCoreField('endingTest', $event)"
            />
            <span>，就全剧终。</span>
          </div>

          <label class="act-synopsis-field">
            <span>剧情梗概：</span>
            <textarea
              :value="selectedAct.core.synopsis"
              rows="5"
              @input="updateActCoreField('synopsis', $event)"
            />
          </label>
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
.add-seq-btn,
.add-scene-btn {
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
.add-seq-btn:hover,
.add-scene-btn:hover {
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

.editable-label {
  min-width: 0;
  flex: 1;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}

.editable-label:hover {
  color: #f4f4f5;
}

.act-text-label {
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 600;
}

.seq-text-label,
.scene-text-label {
  padding: 3px 6px;
  font-size: 13px;
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
.sequence-row,
.scene-row {
  padding: 2px 4px;
  cursor: pointer;
}

.sequence-list,
.scene-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sequence-list {
  margin-left: 24px;
}

.sequence-branch {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scene-list {
  margin-left: 24px;
}

.scene-row {
  min-height: 26px;
  color: #8b8b95;
}

.scene-mark {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #71717a;
  flex-shrink: 0;
}

.scene-row.selected .scene-mark {
  background: #a78bfa;
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

.seq-label-input,
.scene-label-input {
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

.add-seq-btn,
.add-scene-btn {
  align-self: flex-start;
  margin: 2px 0 4px;
  padding: 3px 10px;
  color: #71717a;
  font-size: 12px;
  border-style: dashed;
}

.add-scene-btn {
  padding: 2px 9px;
  font-size: 11px;
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

.story-core-panel,
.act-core-panel,
.sequence-core-panel {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
}

.act-core-panel,
.sequence-core-panel {
  justify-content: flex-start;
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

.sequence-top-grid {
  height: 132px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
  align-items: stretch;
  gap: 16px;
  overflow: hidden;
}

.sequence-structure-fields {
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  overflow: hidden;
}

.sequence-scene-panel {
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #27272a;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  padding: 8px 10px;
  overflow: hidden;
}

.sequence-scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  color: #d4d4d8;
  font-size: 13px;
  font-weight: 600;
}

.inline-add-btn,
.empty-scene-add-btn,
.scene-inline-remove {
  border: 1px solid #3f3f46;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 12px;
}

.inline-add-btn {
  padding: 2px 8px;
}

.sequence-scene-list {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding-right: 2px;
}

.sequence-scene-row {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(64px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 2px 5px;
}

.sequence-scene-row:hover,
.sequence-scene-row.selected {
  border-color: rgba(167, 139, 250, 0.34);
  background: rgba(167, 139, 250, 0.08);
}

.sequence-scene-name {
  overflow: hidden;
  color: #a1a1aa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-summary-input {
  min-width: 0;
  border: none;
  border-bottom: 1px solid #3f3f46;
  background: transparent;
  color: #e4e4e7;
  outline: none;
  padding: 2px 4px;
  font-size: 12px;
}

.scene-summary-input:focus {
  border-bottom-color: #a78bfa;
}

.scene-inline-remove {
  width: 22px;
  height: 22px;
  border: none;
  color: #71717a;
}

.scene-inline-remove:hover {
  color: #ef4444;
}

.empty-scene-add-btn {
  align-self: flex-start;
  border-style: dashed;
  padding: 4px 10px;
}

.act-synopsis-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #d4d4d8;
  font-size: 14px;
}

.act-synopsis-field textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #111114;
  color: #e4e4e7;
  outline: none;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.55;
}

.act-synopsis-field textarea:focus {
  border-color: rgba(167, 139, 250, 0.72);
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.18);
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
