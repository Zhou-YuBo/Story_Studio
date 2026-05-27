<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const characterA = computed(() => characterStore.getCharacterById(characterAId.value))
const characterB = computed(() => characterStore.getCharacterById(characterBId.value))
const relationship = computed(() => relationshipStore.ensureRelationship(characterAId.value, characterBId.value))

const selfFields: Array<{ key: keyof RelationshipSelf; label: string }> = [
  { key: 'presentedSelf', label: '在对方面前是谁' },
  { key: 'craftedSelf', label: '刻意塑造' },
  { key: 'hiddenSelf', label: '刻意隐藏' },
  { key: 'unconsciousSelf', label: '未意识到' },
  { key: 'cherishesSelf', label: '是否珍视' },
  { key: 'selfDeathView', label: '如何看待死亡' },
  { key: 'preventsSelfDeath', label: '是否主动防止' },
  { key: 'expectedDeathCondition', label: '自认何时死去' },
  { key: 'actualDeathCondition', label: '实际何时死去' }
]

const definitionFields: Array<{ key: keyof CharacterRelationship['definitions']; label: string; placeholder: string }> = [
  { key: 'surface', label: '表层关系', placeholder: '观众一眼能看出的关系。' },
  { key: 'actual', label: '实际/情感关系', placeholder: '表层之下真正的关系。' },
  { key: 'social', label: '社会关系', placeholder: '可与表层关系重叠。' },
  { key: 'symbolic', label: '象征关系', placeholder: '不一定要设置。' }
]

const curvePoints = computed(() => {
  const nodes = relationship.value?.changeNodes ?? []
  if (!nodes.length) return ''

  return nodes
    .map((node, index) => {
      const x = getCurvePointX(index, nodes.length)
      const y = getCurvePointY(node.closeness)
      return `${x},${y}`
    })
    .join(' ')
})

const activeNode = computed(() => {
  const nodes = relationship.value?.changeNodes ?? []
  return nodes.find((node) => node.id === activeNodeId.value) ?? nodes[0]
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

function getCurvePointX(index: number, total: number): number {
  return total === 1 ? 50 : 8 + (index / (total - 1)) * 84
}

function getCurvePointY(closeness: number): number {
  return 92 - closeness * 0.84
}

function addChangeNode(relationshipId: string): void {
  relationshipStore.addChangeNode(relationshipId)
  const nodes = relationship.value?.changeNodes ?? []
  activeNodeId.value = nodes[nodes.length - 1]?.id ?? activeNodeId.value
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
      <div>
        <p class="section-kicker">人物工作台 / 二人关系</p>
        <h1>二人关系</h1>
      </div>
      <section class="relationship-selector">
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
      <RouterLink class="back-button" to="/character">返回首页</RouterLink>
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
            rows="1"
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

          <div class="curve-board">
            <span class="curve-label curve-label-top">亲近</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline :points="curvePoints" />
            </svg>
            <button
              v-for="(node, index) in relationship.changeNodes"
              :key="node.id"
              class="curve-node-tag"
              :class="{ 'curve-node-tag-active': node.id === activeNode?.id }"
              :style="{
                left: `${getCurvePointX(index, relationship.changeNodes.length)}%`,
                top: `${getCurvePointY(node.closeness)}%`
              }"
              type="button"
              @click="activeNodeId = node.id"
            >
              {{ node.structurePosition || `节点 ${index + 1}` }}
            </button>
            <span class="curve-label curve-label-bottom">疏远</span>
          </div>

          <div v-if="activeNode" class="active-node-editor">
            <label>
              <span>关联剧情位置</span>
              <input
                v-model="activeNode.structurePosition"
                placeholder="某一幕 / 某一序列 / 某一场景"
                @blur="saveRelationship"
              />
            </label>
            <label>
              <span>亲疏程度 {{ activeNode.closeness }}</span>
              <input
                v-model.number="activeNode.closeness"
                type="range"
                min="0"
                max="100"
                @change="saveRelationship"
              />
            </label>
            <label class="active-node-turning-point">
              <span>发生了什么</span>
              <textarea
                v-model="activeNode.turningPoint"
                rows="2"
                placeholder="这段关系在这里发生了什么变化。"
                @blur="saveRelationship"
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
            rows="1"
            @blur="saveRelationship"
          />
        </label>
      </aside>
    </main>

    <main v-else class="empty-state">
      <p>至少需要两个角色，才能建立二人关系。</p>
    </main>
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
  height: 76px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: auto minmax(520px, 1fr) auto;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
  padding: 12px 22px;
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

.text-button {
  color: #fca5a5;
  padding: 6px 9px;
}

.text-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.relationship-selector {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  align-items: end;
  gap: 14px;
}

.relationship-selector label {
  display: grid;
  gap: 5px;
  color: #a1a1aa;
  font-size: 11px;
}

.relationship-selector select,
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
  grid-template-columns: minmax(250px, 0.86fr) minmax(420px, 1.28fr) minmax(250px, 0.86fr);
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
  display: grid;
  grid-template-rows: auto repeat(9, minmax(0, 1fr));
  gap: 6px;
  padding: 12px;
}

.column-heading h2,
.panel-heading h2 {
  font-size: 16px;
}

.self-row {
  min-height: 0;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;
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
  height: 100%;
  min-height: 32px;
  line-height: 1.45;
  resize: none;
}

.relationship-axis {
  display: grid;
  grid-template-rows: minmax(0, 1.18fr) minmax(0, 0.82fr);
  gap: 12px;
}

.closeness-panel,
.definitions-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.closeness-panel {
  grid-template-rows: auto minmax(150px, 1fr) auto;
}

.definitions-panel {
  grid-template-rows: auto minmax(0, 1fr);
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

.curve-node-tag {
  position: absolute;
  z-index: 3;
  max-width: 104px;
  overflow: hidden;
  border: 1px solid rgba(113, 113, 122, 0.78);
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.92);
  color: #d4d4d8;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  padding: 5px 8px;
  text-overflow: ellipsis;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

.curve-node-tag-active {
  border-color: rgba(244, 244, 245, 0.82);
  background: rgba(82, 82, 91, 0.92);
  color: #fafafa;
}

.active-node-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px auto;
  gap: 8px;
  align-items: end;
}

.active-node-editor label {
  display: grid;
  gap: 5px;
}

.active-node-turning-point {
  grid-column: 1 / 3;
}

.active-node-editor input[type='range'] {
  width: 100%;
  accent-color: #a1a1aa;
}

.active-node-editor textarea {
  height: 50px;
  line-height: 1.45;
  resize: none;
}

.definition-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.definition-cell {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 5px;
  border: 1px solid rgba(63, 63, 70, 0.62);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.22);
  padding: 9px;
}

.definition-cell textarea {
  height: 100%;
  min-height: 46px;
  line-height: 1.45;
  resize: none;
}

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: #a1a1aa;
}

@media (max-width: 1280px) {
  .relationship-header {
    grid-template-columns: 1fr auto;
    height: auto;
  }

  .relationship-selector {
    grid-column: 1 / -1;
  }

  .relationship-workbench {
    grid-template-columns: 1fr;
    overflow: auto;
  }
}
</style>
