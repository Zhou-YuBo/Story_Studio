<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PortableCharacterDetailPanel from '../components/character/detail/PortableCharacterDetailPanel.vue'
import PortableCharacterDetailTrigger from '../components/character/detail/PortableCharacterDetailTrigger.vue'
import type { CharacterDetail } from '../components/character/detail/types'
import { useCharacterStore } from '../stores/character'
import {
  type CharacterRelationship,
  type RelationshipSelf,
  useCharacterRelationshipStore,
} from '../stores/characterRelationship'

const characterStore = useCharacterStore()
const relationshipStore = useCharacterRelationshipStore()

const characterAId = ref('')
const characterBId = ref('')
const activeNodeId = ref('')
const detailPanelOpen = ref(false)
const portableCharacterId = ref('')
const draggingNodeId = ref('')
const curveBoardRef = ref<HTMLElement | null>(null)

const curveYAxisTop = 12
const curveXAxisY = 82
const curveXAxisLabelY = 92

const characterA = computed(() => characterStore.getCharacterById(characterAId.value))
const characterB = computed(() => characterStore.getCharacterById(characterBId.value))
const portableCharacterName = computed(() => {
  const character =
    characterStore.getCharacterById(portableCharacterId.value) ?? characterStore.characters[0]
  return character?.profile.name || '未命名人物'
})
const relationship = computed(() => relationshipStore.ensureRelationship(characterAId.value, characterBId.value))

const selfFields: Array<{ key: keyof RelationshipSelf; label: string }> = [
  { key: 'bornCraftedSelf', label: '因对方而诞生的定制自我' },
  { key: 'cherishesCraftedSelf', label: '是否珍视这个定制自我' },
  { key: 'fearsSelfDeath', label: '是否恐惧这个自我的死亡' },
  { key: 'preventsSelfDeath', label: '为了避免这个自我的死亡，能做到什么地步' }
]

const definitionFields: Array<{ key: keyof CharacterRelationship['definitions']; label: string; placeholder: string }> = [
  { key: 'surface', label: '表层关系', placeholder: '观众一眼能看出的关系。' },
  { key: 'actual', label: '实际关系', placeholder: '表层之下真正的关系。' },
  { key: 'social', label: '社会关系', placeholder: '可与表层关系重叠。' },
  { key: 'symbolic', label: '象征关系', placeholder: '不一定要设置。' }
]

const curvePoints = computed(() => {
  const nodes = sortedChangeNodes.value
  if (!nodes.length) return ''

  return nodes
    .map((node) => {
      const x = getCurvePointX(node.timelinePosition)
      const y = getCurvePointY(node.closeness)
      return `${x},${y}`
    })
    .join(' ')
})

const sortedChangeNodes = computed(() => {
  return [...(relationship.value?.changeNodes ?? [])].sort(
    (nodeA, nodeB) => nodeA.timelinePosition - nodeB.timelinePosition
  )
})

const activeNode = computed(() => {
  const nodes = sortedChangeNodes.value
  return nodes.find((node) => node.id === activeNodeId.value) ?? nodes[0]
})

const actSegments = computed(() => {
  return [
    { id: 'act-1', label: '第一幕', left: 8, width: 28 },
    { id: 'act-2', label: '第二幕', left: 36, width: 34 },
    { id: 'act-3', label: '第三幕', left: 70, width: 22 }
  ]
})

function normalizeSelectedCharacters(): void {
  const characters = characterStore.characters
  if (!characters.length) {
    characterAId.value = ''
    characterBId.value = ''
    return
  }

  if (!characters.some((character) => character.id === characterAId.value)) {
    characterAId.value = characters[0]?.id ?? ''
  }

  if (
    !characters.some((character) => character.id === characterBId.value) ||
    characterBId.value === characterAId.value
  ) {
    characterBId.value = characters.find((character) => character.id !== characterAId.value)?.id ?? ''
  }
}

watch(
  () => characterStore.characters.map((character) => character.id),
  normalizeSelectedCharacters,
  { immediate: true }
)

watch([characterAId, characterBId], normalizeSelectedCharacters)

watch(
  relationship,
  (nextRelationship) => {
    const nodes = nextRelationship?.changeNodes ?? []
    if (!nodes.some((node) => node.id === activeNodeId.value)) {
      activeNodeId.value = nodes[0]?.id ?? ''
    }
  },
  { immediate: true }
)

function getCurvePointX(timelinePosition: number): number {
  return Math.max(4, Math.min(96, timelinePosition))
}

function getCurvePointY(closeness: number): number {
  return curveXAxisY - (Math.max(0, Math.min(100, closeness)) / 100) * (curveXAxisY - curveYAxisTop)
}

function addChangeNode(relationshipId: string): void {
  const node = relationshipStore.addChangeNode(relationshipId, activeNode.value?.id)
  activeNodeId.value = node?.id ?? activeNodeId.value
}

function getNodeLabelSide(index: number): 'top' | 'bottom' {
  const previousNode = sortedChangeNodes.value[index - 1]
  const nextNode = sortedChangeNodes.value[index + 1]
  const node = sortedChangeNodes.value[index]

  if (!node) return 'top'

  const neighborCloseness = [previousNode?.closeness, nextNode?.closeness].filter(
    (closeness): closeness is number => typeof closeness === 'number'
  )
  const neighborAverage = neighborCloseness.length
    ? neighborCloseness.reduce((sum, closeness) => sum + closeness, 0) / neighborCloseness.length
    : node.closeness

  return node.closeness >= neighborAverage ? 'bottom' : 'top'
}

function startDragNode(nodeId: string, event: PointerEvent): void {
  activeNodeId.value = nodeId
  draggingNodeId.value = nodeId
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateDraggedNode(event)
}

function dragNode(event: PointerEvent): void {
  if (!draggingNodeId.value) return
  updateDraggedNode(event)
}

function stopDragNode(event: PointerEvent): void {
  if (!draggingNodeId.value) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  draggingNodeId.value = ''
  saveRelationship()
}

function updateDraggedNode(event: PointerEvent): void {
  const targetRelationship = relationship.value
  const board = curveBoardRef.value
  if (!targetRelationship || !board) return

  const node = targetRelationship.changeNodes.find((item) => item.id === draggingNodeId.value)
  if (!node) return

  const rect = board.getBoundingClientRect()
  const timelinePosition = ((event.clientX - rect.left) / rect.width) * 100
  const closeness = 100 - ((event.clientY - rect.top) / rect.height) * 100

  node.timelinePosition = Math.max(4, Math.min(96, timelinePosition))
  node.closeness = Math.round(Math.max(0, Math.min(100, closeness)))
  targetRelationship.changeNodes.sort(
    (nodeA, nodeB) => nodeA.timelinePosition - nodeB.timelinePosition
  )
}

function removeActiveNode(relationshipId: string): void {
  if (!activeNode.value) return
  relationshipStore.removeChangeNode(relationshipId, activeNode.value.id)
  activeNodeId.value = relationship.value?.changeNodes[0]?.id ?? ''
}

function getRelationshipSelf(relationship: CharacterRelationship, character: CharacterDetail): RelationshipSelf {
  return relationship.selves[character.id]
}

function saveRelationship(): void {
  relationshipStore.saveRelationships()
}
</script>

<template>
  <div class="relationship-page">
    <header class="relationship-header">
      <div class="relationship-topbar">
        <div>
          <p class="section-kicker">人物工作台 / 二人关系</p>
          <h1>二人关系</h1>
        </div>
        <div class="header-side-actions">
          <RouterLink class="back-button" to="/character">返回首页</RouterLink>
          <PortableCharacterDetailTrigger
            class="relationship-detail-trigger"
            :character-name="portableCharacterName"
            @open="detailPanelOpen = true"
          />
        </div>
      </div>

      <section class="relationship-toolbar">
        <label>
          <span>人物 A</span>
          <select v-model="characterAId">
            <option
              v-for="character in characterStore.characters"
              :key="character.id"
              :value="character.id"
            >
              {{ character.profile.name || '未命名人物' }} · {{ character.profile.layer }}
            </option>
          </select>
        </label>

        <div class="selector-line">
          <span>{{ characterA?.profile.name || '人物 A' }}</span>
          <i></i>
          <span>{{ characterB?.profile.name || '人物 B' }}</span>
        </div>

        <label>
          <span>人物 B</span>
          <select v-model="characterBId">
            <option
              v-for="character in characterStore.characters"
              :key="character.id"
              :disabled="character.id === characterAId"
              :value="character.id"
            >
              {{ character.profile.name || '未命名人物' }} · {{ character.profile.layer }}
            </option>
          </select>
        </label>
      </section>
    </header>

    <main v-if="relationship && characterA && characterB" class="relationship-workbench">
      <aside class="self-column">
        <div class="column-heading">
          <p class="section-kicker">A in B's Eyes</p>
          <h2>{{ characterA.profile.name || '人物 A' }} 在 {{ characterB.profile.name || '人物 B' }} 面前</h2>
        </div>

        <label v-for="field in selfFields" :key="field.key" class="self-row">
          <span>{{ field.label }}</span>
          <textarea
            v-model="getRelationshipSelf(relationship, characterA)[field.key]"
            rows="2"
            @blur="saveRelationship"
          />
        </label>
      </aside>

      <section class="relationship-axis">
        <section class="closeness-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Plot Curve</p>
              <h2>亲疏发展轴</h2>
            </div>
            <button class="ghost-button" type="button" @click="addChangeNode(relationship.id)">
              添加节点
            </button>
          </div>

          <div ref="curveBoardRef" class="curve-board">
            <span class="curve-label curve-label-top">亲近</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline :points="curvePoints" />
              <line x1="4" :y1="curveXAxisY" x2="96" :y2="curveXAxisY" class="curve-axis-line" />
              <g v-for="node in sortedChangeNodes" :key="`${node.id}-guide`">
                <line
                  :x1="getCurvePointX(node.timelinePosition)"
                  :y1="getCurvePointY(node.closeness)"
                  :x2="getCurvePointX(node.timelinePosition)"
                  :y2="curveXAxisY"
                  class="curve-guide-line"
                />
              </g>
            </svg>

            <template v-for="(node, index) in sortedChangeNodes" :key="node.id">
              <span
                class="curve-node-label"
                :class="`curve-node-label-${getNodeLabelSide(index)}`"
                :style="{
                  left: `${getCurvePointX(node.timelinePosition)}%`,
                  top: `${getCurvePointY(node.closeness)}%`
                }"
              >
                {{ node.turningPoint || '关系变化' }}
              </span>
              <button
                class="curve-node-dot"
                :class="{ 'curve-node-dot-active': node.id === activeNode?.id }"
                :style="{
                  left: `${getCurvePointX(node.timelinePosition)}%`,
                  top: `${getCurvePointY(node.closeness)}%`
                }"
                type="button"
                @pointerdown="startDragNode(node.id, $event)"
                @pointermove="dragNode"
                @pointerup="stopDragNode"
                @pointercancel="stopDragNode"
              />
              <span
                class="curve-node-axis-label"
                :style="{
                  left: `${getCurvePointX(node.timelinePosition)}%`,
                  top: `${curveXAxisLabelY}%`
                }"
              >
                {{ node.structurePosition || `节点 ${index + 1}` }}
              </span>
            </template>

            <div class="act-bar" :style="{ top: `${curveXAxisLabelY + 5}%` }">
              <span
                v-for="segment in actSegments"
                :key="segment.id"
                :style="{ left: `${segment.left}%`, width: `${segment.width}%` }"
              >
                {{ segment.label }}
              </span>
            </div>
            <span class="curve-label curve-label-bottom">疏远</span>
          </div>

          <div v-if="activeNode" class="active-node-editor">
            <div class="active-node-controls">
              <label>
                <span>关联剧情位置</span>
                <input
                  v-model="activeNode.structurePosition"
                  placeholder="某一幕 / 某一序列 / 某一场景"
                  @blur="saveRelationship"
                />
              </label>
              <label>
                <span>亲疏程度</span>
                <input
                  v-model.number="activeNode.closeness"
                  type="range"
                  min="0"
                  max="100"
                  @change="saveRelationship"
                />
              </label>
              <button
                class="text-button"
                type="button"
                :disabled="relationship.changeNodes.length <= 2"
                @click="removeActiveNode(relationship.id)"
              >
                删除当前节点
              </button>
            </div>
            <label class="active-node-turning-point">
              <span>发生了什么</span>
              <textarea
                v-model="activeNode.turningPoint"
                rows="2"
                placeholder="这段关系在这里发生了什么变化。"
                @blur="saveRelationship"
              />
            </label>
          </div>
        </section>

        <section class="definitions-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Relationship Definition</p>
              <h2>四类关系</h2>
            </div>
          </div>

          <div class="definition-grid">
            <label v-for="field in definitionFields" :key="field.key" class="definition-cell">
              <span>{{ field.label }}</span>
              <textarea
                v-model="relationship.definitions[field.key]"
                rows="2"
                :placeholder="field.placeholder"
                @blur="saveRelationship"
              />
            </label>
          </div>
        </section>
      </section>

      <aside class="self-column">
        <div class="column-heading">
          <p class="section-kicker">B in A's Eyes</p>
          <h2>{{ characterB.profile.name || '人物 B' }} 在 {{ characterA.profile.name || '人物 A' }} 面前</h2>
        </div>

        <label v-for="field in selfFields" :key="field.key" class="self-row">
          <span>{{ field.label }}</span>
          <textarea
            v-model="getRelationshipSelf(relationship, characterB)[field.key]"
            rows="2"
            @blur="saveRelationship"
          />
        </label>
      </aside>
    </main>

    <main v-else class="empty-state">
      <p>至少需要两个角色，才能建立二人关系。</p>
    </main>

    <PortableCharacterDetailPanel
      :open="detailPanelOpen"
      :characters="characterStore.characters"
      @close="detailPanelOpen = false"
      @save="characterStore.saveCharacters"
      @select-character="(characterId) => (portableCharacterId = characterId)"
      @add-note="(characterId, content) => characterStore.addQuickNote(characterId, content)"
    />
  </div>
</template>

<style scoped>
.relationship-page {
  width: 100%;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(82, 82, 91, 0.18), transparent 28%),
    radial-gradient(circle at 82% 70%, rgba(39, 39, 42, 0.38), transparent 32%),
    #09090b;
  color: #f4f4f5;
}

.relationship-header {
  flex-shrink: 0;
  display: grid;
  gap: 10px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
  padding: 12px 22px 14px;
}

.relationship-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.relationship-header h1,
.column-heading h2,
.panel-heading h2 {
  margin: 0;
  color: #fafafa;
  font-weight: 620;
  letter-spacing: 0.04em;
}

.relationship-header h1 {
  font-size: 24px;
}

.section-kicker {
  margin: 0 0 5px;
  color: #a1a1aa;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.back-button,
.ghost-button,
.text-button {
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 10px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-decoration: none;
}

.back-button,
.ghost-button {
  padding: 8px 11px;
}

.header-side-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.header-side-actions :deep(.relationship-detail-trigger) {
  position: static;
  width: 128px;
  border-right: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 14px;
  padding: 9px 11px;
  transform: none;
}

.header-side-actions :deep(.relationship-detail-trigger:hover),
.header-side-actions :deep(.relationship-detail-trigger:focus-visible) {
  transform: none;
}

.text-button {
  color: #fca5a5;
  padding: 6px 9px;
}

.text-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.relationship-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  align-items: end;
  gap: 14px;
}

.relationship-toolbar label {
  display: grid;
  gap: 5px;
  color: #a1a1aa;
  font-size: 11px;
}

.relationship-toolbar select,
.self-row textarea,
.definition-cell textarea,
.active-node-editor input,
.active-node-editor textarea {
  width: 100%;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 10px;
  background: rgba(9, 9, 11, 0.32);
  color: #f4f4f5;
  font: inherit;
  outline: none;
  padding: 7px 9px;
}

.selector-line {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #e4e4e7;
  font-size: 12px;
  padding-bottom: 8px;
}

.selector-line i {
  width: 72px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(228, 228, 231, 0.72), transparent);
}

.relationship-workbench {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(210px, 280px) minmax(540px, 1fr) minmax(210px, 280px);
  gap: 12px;
  overflow: hidden;
  padding: 12px 18px 18px;
}

.self-column,
.relationship-axis,
.closeness-panel,
.definitions-panel {
  min-height: 0;
  overflow: hidden;
}

.self-column,
.closeness-panel,
.definitions-panel {
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 18px;
  background: rgba(24, 24, 27, 0.58);
}

.self-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.column-heading h2,
.panel-heading h2 {
  font-size: 16px;
}

.self-row {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(63, 63, 70, 0.62);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.18);
  padding: 8px;
}

.self-row span,
.definition-cell span,
.active-node-editor span {
  align-self: center;
  color: #a1a1aa;
  font-size: 11px;
  line-height: 1.35;
}

.self-row textarea {
  min-height: 52px;
  line-height: 1.45;
  resize: vertical;
}

.relationship-axis {
  display: grid;
  grid-template-rows: minmax(340px, 1fr) auto;
  gap: 12px;
}

.closeness-panel,
.definitions-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.closeness-panel {
  grid-template-rows: auto minmax(220px, 1fr) auto;
}

.definitions-panel {
  grid-template-rows: auto auto;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.curve-board {
  position: relative;
  min-height: 0;
  border: 1px solid rgba(63, 63, 70, 0.72);
  border-radius: 16px;
  background:
    linear-gradient(rgba(82, 82, 91, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(82, 82, 91, 0.14) 1px, transparent 1px),
    rgba(9, 9, 11, 0.22);
  background-size: 100% 25%, 20% 100%;
  overflow: hidden;
  padding: 10px;
  touch-action: none;
  user-select: none;
}

.curve-board svg {
  position: absolute;
  inset: 14px 18px;
  width: calc(100% - 36px);
  height: calc(100% - 28px);
  overflow: visible;
}

.curve-board polyline {
  fill: none;
  stroke: #d4d4d8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.2;
}

.curve-axis-line {
  stroke: rgba(161, 161, 170, 0.62);
  stroke-width: 0.7;
}

.curve-guide-line {
  stroke: rgba(161, 161, 170, 0.46);
  stroke-dasharray: 2 2;
  stroke-width: 0.5;
}

.curve-label {
  position: absolute;
  left: 10px;
  z-index: 2;
  color: #a1a1aa;
  font-size: 11px;
}

.curve-label-top {
  top: 8px;
}

.curve-label-bottom {
  bottom: 8px;
}

.curve-node-label,
.curve-node-axis-label {
  position: absolute;
  z-index: 4;
  max-width: 108px;
  overflow: hidden;
  color: #d4d4d8;
  font-size: 10px;
  line-height: 1.25;
  pointer-events: none;
  text-overflow: ellipsis;
  transform: translateX(-50%);
  white-space: nowrap;
}

.curve-node-label-top {
  transform: translate(-50%, calc(-100% - 8px));
}

.curve-node-label-bottom {
  transform: translate(-50%, 9px);
}

.curve-node-axis-label {
  color: #a1a1aa;
  transform: translate(-50%, 0);
}

.curve-node-dot {
  position: absolute;
  z-index: 5;
  width: 11px;
  height: 11px;
  border: 1px solid rgba(244, 244, 245, 0.86);
  border-radius: 999px;
  background: #09090b;
  cursor: grab;
  padding: 0;
  transform: translate(-50%, -50%);
}

.curve-node-dot:active {
  cursor: grabbing;
}

.curve-node-dot-active {
  width: 14px;
  height: 14px;
  background: #f4f4f5;
  box-shadow: 0 0 0 4px rgba(244, 244, 245, 0.12);
}

.act-bar {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  height: 20px;
}

.act-bar span {
  position: absolute;
  top: 0;
  display: grid;
  place-items: end center;
  height: 18px;
  border-top: 1px solid rgba(161, 161, 170, 0.56);
  border-right: 1px solid rgba(161, 161, 170, 0.56);
  border-left: 1px solid rgba(161, 161, 170, 0.56);
  color: #71717a;
  font-size: 10px;
}

.active-node-editor {
  display: grid;
  gap: 8px;
  border-top: 1px solid rgba(63, 63, 70, 0.62);
  padding-top: 10px;
}

.active-node-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px auto;
  gap: 8px;
  align-items: end;
}

.active-node-editor label {
  display: grid;
  gap: 5px;
}

.active-node-editor input[type='range'] {
  width: 100%;
  accent-color: #a1a1aa;
}

.active-node-editor textarea {
  min-height: 48px;
  line-height: 1.45;
  resize: vertical;
}

.definition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.definition-cell {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(63, 63, 70, 0.62);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.22);
  padding: 9px;
}

.definition-cell textarea {
  min-height: 56px;
  line-height: 1.45;
  resize: vertical;
}

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: #a1a1aa;
}

@media (max-width: 1280px) {
  .relationship-toolbar {
    grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  }

  .relationship-workbench {
    grid-template-columns: 1fr;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(161, 161, 170, 0.24) transparent;
  }

  .self-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
  }

  .column-heading {
    grid-column: 1 / -1;
  }

  .relationship-axis,
  .closeness-panel,
  .definitions-panel {
    overflow: visible;
  }

  .curve-board {
    min-height: 320px;
  }

  .relationship-workbench::-webkit-scrollbar {
    width: 7px;
  }

  .relationship-workbench::-webkit-scrollbar-track {
    background: transparent;
  }

  .relationship-workbench::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(161, 161, 170, 0.2);
  }
}

@media (max-width: 920px) {
  .relationship-header {
    padding: 12px 16px 14px;
  }

  .relationship-topbar,
  .header-side-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-side-actions {
    width: 100%;
  }

  .relationship-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .selector-line {
    justify-content: center;
    padding-bottom: 0;
  }

  .relationship-workbench {
    padding: 12px 14px 16px;
  }

  .self-column,
  .definition-grid,
  .active-node-controls {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .relationship-page {
    overflow: auto;
  }

  .relationship-workbench {
    overflow: visible;
  }

  .curve-board {
    min-height: 280px;
  }
}

@media (max-height: 760px) and (min-width: 1281px) {
  .relationship-header {
    gap: 8px;
    padding-block: 10px;
  }

  .relationship-axis {
    grid-template-rows: minmax(300px, 1fr) auto;
  }

  .closeness-panel {
    grid-template-rows: auto minmax(190px, 1fr) auto;
  }

  .self-row textarea,
  .definition-cell textarea {
    min-height: 48px;
  }
}
</style>
