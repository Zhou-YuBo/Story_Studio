<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CastUniverseExpandedNode from '../components/character/CastUniverseExpandedNode.vue'
import CastUniverseFocusNode from '../components/character/CastUniverseFocusNode.vue'
import CastUniversePersonNode from '../components/character/CastUniversePersonNode.vue'
import PortableCharacterDetailPanel from '../components/character/detail/PortableCharacterDetailPanel.vue'
import PortableCharacterDetailTrigger from '../components/character/detail/PortableCharacterDetailTrigger.vue'
import { useCharacterStore } from '../stores/character'
import { type CastUniverseRing, useCharacterCastUniverseStore } from '../stores/characterCastUniverse'

interface RingLayoutItem {
  characterId: string
  x: number
  y: number
  angle: number
}

const characterStore = useCharacterStore()
const castStore = useCharacterCastUniverseStore()

const selectedCharacterId = ref('')
const detailPanelOpen = ref(false)
const portableCharacterId = ref('')
const viewportRef = ref<HTMLElement | null>(null)
const pan = ref({ x: 0, y: 0 })
const zoom = ref(0.86)
const panning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOrigin = ref({ x: 0, y: 0 })

const focusCharacter = computed(() => {
  return characterStore.getCharacterById(castStore.board.focusCharacterId) ?? characterStore.characters[0]
})

const selectedConfig = computed(() => {
  return castStore.board.characters.find((character) => character.characterId === selectedCharacterId.value)
})

const selectedCharacter = computed(() => {
  return characterStore.getCharacterById(selectedCharacterId.value) ?? focusCharacter.value
})

const portableCharacterName = computed(() => {
  const character = characterStore.getCharacterById(portableCharacterId.value) ?? focusCharacter.value
  return character?.profile.name || '未命名人物'
})

const canvasTransform = computed(() => {
  return `translate(calc(-50% + ${pan.value.x}px), calc(-50% + ${pan.value.y}px)) scale(${zoom.value})`
})

const firstRingItems = computed(() => getRingItems('first', 330, -100))
const secondRingItems = computed(() => getRingItems('second', 470, -112))
const thirdRingItems = computed(() => getRingItems('third', 620, -124))

function isExpanded(characterId: string) {
  return castStore.board.characters.some((character) => character.characterId === characterId && character.expanded)
}

function getCharacter(characterId: string) {
  return characterStore.getCharacterById(characterId)
}

watch(
  () => characterStore.characters.map((character) => character.id),
  (characterIds) => {
    castStore.ensureCharacters(characterIds)
    if (!selectedCharacterId.value || !characterStore.getCharacterById(selectedCharacterId.value)) {
      selectedCharacterId.value = castStore.board.focusCharacterId || characterIds[0] || ''
    }
  },
  { immediate: true }
)

function getCharacterName(characterId: string) {
  return characterStore.getCharacterById(characterId)?.profile.name || '未命名人物'
}

function getCharacterLayer(characterId: string) {
  return characterStore.getCharacterById(characterId)?.profile.layer || '第三圈人物'
}

function getCharacterKeyword(characterId: string) {
  const config = castStore.board.characters.find((character) => character.characterId === characterId)
  const character = characterStore.getCharacterById(characterId)
  return config?.keyword || character?.profile.brief || character?.profile.layer || '关键词'
}

function getRingItems(ring: Exclude<CastUniverseRing, 'center'>, radius: number, startAngle: number): RingLayoutItem[] {
  const configs = castStore.board.characters.filter((character) => {
    return character.ring === ring && character.characterId !== castStore.board.focusCharacterId
  })
  if (!configs.length) return []

  const arc = configs.length <= 4 ? 216 : configs.length <= 7 ? 260 : 300
  const step = configs.length === 1 ? 0 : arc / (configs.length - 1)
  const offset = startAngle - arc / 2

  return configs.map((config, index) => {
    const angle = offset + step * index
    const radians = (angle * Math.PI) / 180
    return {
      characterId: config.characterId,
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
      angle,
    }
  })
}

function selectCharacter(characterId: string) {
  selectedCharacterId.value = characterId
}

function startPan(event: PointerEvent) {
  if (event.button !== 0) return

  const target = event.target as HTMLElement
  if (target.closest('button, input, select')) return

  panning.value = true
  panStart.value = { x: event.clientX, y: event.clientY }
  panOrigin.value = { ...pan.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function movePan(event: PointerEvent) {
  if (!panning.value) return

  pan.value = {
    x: panOrigin.value.x + event.clientX - panStart.value.x,
    y: panOrigin.value.y + event.clientY - panStart.value.y,
  }
}

function stopPan(event: PointerEvent) {
  if (!panning.value) return

  panning.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function zoomCanvas(delta: number) {
  zoom.value = Math.min(1.35, Math.max(0.52, zoom.value + delta))
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  zoomCanvas(event.deltaY > 0 ? -0.06 : 0.06)
}

function resetCanvasView() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 0.86
}

function fitCanvasView() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 0.68
}

function updateSelectedRing(ring: CastUniverseRing) {
  if (!selectedCharacter.value) return
  castStore.setCharacterRing(selectedCharacter.value.id, ring)
}

function updateSelectedKeyword(value: string) {
  if (!selectedCharacter.value) return
  castStore.setCharacterKeyword(selectedCharacter.value.id, value)
}
</script>

<template>
  <div class="cast-universe-page">
    <header class="cast-header">
      <div>
        <p class="section-kicker">人物工作台 / 卡司宇宙</p>
        <h1>把卡司摆成一张宇宙图</h1>
      </div>
      <RouterLink class="back-button" to="/character">返回首页</RouterLink>
    </header>

    <main class="cast-stage">
      <section
        ref="viewportRef"
        class="cast-map"
        :class="{ 'cast-map-panning': panning }"
        aria-label="卡司宇宙图"
        @wheel="handleWheel"
        @pointerdown="startPan"
        @pointermove="movePan"
        @pointerup="stopPan"
        @pointercancel="stopPan"
      >
        <div class="map-controls">
          <button type="button" @click="zoomCanvas(0.08)">放大</button>
          <button type="button" @click="zoomCanvas(-0.08)">缩小</button>
          <button type="button" @click="fitCanvasView">适配</button>
          <button type="button" @click="resetCanvasView">回中心</button>
          <span>{{ Math.round(zoom * 100) }}%</span>
        </div>
        <p class="map-hint">滚轮缩放，拖动画布空白处平移</p>

        <div class="cast-canvas" :style="{ transform: canvasTransform }">
          <div class="orbit orbit-first"></div>
          <div class="orbit orbit-second"></div>
          <div class="orbit orbit-third"></div>

          <button
            v-if="focusCharacter"
            class="focus-button"
            type="button"
            @click="selectCharacter(focusCharacter.id)"
          >
            <CastUniverseFocusNode :character="focusCharacter" />
          </button>

          <template v-for="item in firstRingItems" :key="item.characterId">
            <CastUniverseExpandedNode
              v-if="isExpanded(item.characterId) && getCharacter(item.characterId)"
              class="ring-expanded-node"
              :style="{ left: `${item.x}px`, top: `${item.y}px` }"
              :character="getCharacter(item.characterId)!"
              :keyword="getCharacterKeyword(item.characterId)"
              :active="item.characterId === selectedCharacterId"
              @click="selectCharacter(item.characterId)"
            />
            <CastUniversePersonNode
              v-else
              class="ring-person-node"
              :style="{ left: `${item.x}px`, top: `${item.y}px` }"
              :name="getCharacterName(item.characterId)"
              :layer="getCharacterLayer(item.characterId)"
              :keyword="getCharacterKeyword(item.characterId)"
              :active="item.characterId === selectedCharacterId"
              @click="selectCharacter(item.characterId)"
            />
          </template>

          <CastUniversePersonNode
            v-for="item in secondRingItems"
            :key="item.characterId"
            class="ring-person-node"
            :style="{ left: `${item.x}px`, top: `${item.y}px` }"
            :name="getCharacterName(item.characterId)"
            :layer="getCharacterLayer(item.characterId)"
            :keyword="getCharacterKeyword(item.characterId)"
            :active="item.characterId === selectedCharacterId"
            @click="selectCharacter(item.characterId)"
          />

          <CastUniversePersonNode
            v-for="item in thirdRingItems"
            :key="item.characterId"
            class="ring-person-node"
            :style="{ left: `${item.x}px`, top: `${item.y}px` }"
            :name="getCharacterName(item.characterId)"
            :layer="getCharacterLayer(item.characterId)"
            :keyword="getCharacterKeyword(item.characterId)"
            :active="item.characterId === selectedCharacterId"
            @click="selectCharacter(item.characterId)"
          />
        </div>
      </section>

      <aside v-if="selectedCharacter" class="cast-editor">
        <div>
          <p class="section-kicker">Selected Cast</p>
          <h2>{{ selectedCharacter.profile.name || '未命名人物' }}</h2>
        </div>

        <label>
          <span>所在位置</span>
          <select :value="selectedConfig?.ring ?? 'third'" @change="updateSelectedRing(($event.target as HTMLSelectElement).value as CastUniverseRing)">
            <option value="center">中心人物</option>
            <option value="first">第一圈人物</option>
            <option value="second">第二圈人物</option>
            <option value="third">第三圈人物</option>
          </select>
        </label>

        <label>
          <span>宇宙关键词</span>
          <input :value="selectedConfig?.keyword ?? ''" placeholder="他在这张宇宙图里的作用" @blur="updateSelectedKeyword(($event.target as HTMLInputElement).value)" />
        </label>

        <div class="editor-actions">
          <button class="ghost-button" type="button" @click="castStore.toggleExpanded(selectedCharacter.id)">
            {{ selectedConfig?.expanded ? '收起维度圈' : '展开维度圈' }}
          </button>
          <button class="ghost-button" type="button" @click="castStore.setFocusCharacter(selectedCharacter.id)">设为中心</button>
        </div>
      </aside>
    </main>

    <PortableCharacterDetailTrigger
      :character-name="portableCharacterName"
      @open="detailPanelOpen = true"
    />

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
.cast-universe-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 50% 44%, rgba(82, 82, 91, 0.2), transparent 36%),
    #09090b;
  color: #f4f4f5;
}

.cast-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
  padding: 18px 26px;
}

.cast-header h1,
.cast-editor h2 {
  margin: 0;
  color: #fafafa;
  font-weight: 620;
}

.section-kicker {
  margin: 0 0 6px;
  color: #a1a1aa;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.back-button,
.ghost-button {
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 9px 12px;
  text-decoration: none;
}

.cast-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.cast-map {
  position: relative;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.cast-map-panning {
  cursor: grabbing;
}

.cast-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1400px;
  height: 1400px;
  transform-origin: center;
}

.map-controls {
  position: absolute;
  z-index: 20;
  left: 24px;
  top: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 999px;
  background: rgba(9, 9, 11, 0.68);
  padding: 7px;
  backdrop-filter: blur(12px);
}

.map-controls button {
  border: 0;
  border-radius: 999px;
  background: rgba(39, 39, 42, 0.86);
  color: #f4f4f5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 6px 10px;
}

.map-controls span {
  min-width: 42px;
  color: #a1a1aa;
  font-size: 12px;
  text-align: center;
}

.map-hint {
  position: absolute;
  z-index: 20;
  left: 32px;
  top: 72px;
  margin: 0;
  color: #71717a;
  font-size: 12px;
}

.orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 1px solid rgba(244, 244, 245, 0.38);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.orbit-first {
  width: 660px;
  height: 660px;
}

.orbit-second {
  width: 940px;
  height: 940px;
  border-style: dashed;
  border-color: rgba(244, 244, 245, 0.3);
}

.orbit-third {
  width: 1240px;
  height: 1240px;
  border-color: rgba(244, 244, 245, 0.24);
}

.focus-button {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  transform: translate(-50%, -50%);
}

.ring-person-node,
.ring-expanded-node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.cast-editor {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(180px, 1fr) minmax(260px, 1.2fr) auto;
  align-items: end;
  gap: 14px;
  border-top: 1px solid rgba(63, 63, 70, 0.82);
  background: rgba(9, 9, 11, 0.9);
  padding: 14px 26px;
}

.cast-editor label,
.editor-actions {
  display: grid;
  gap: 7px;
  color: #a1a1aa;
  font-size: 12px;
}

.editor-actions {
  grid-template-columns: auto auto;
  align-items: end;
}

.cast-editor input,
.cast-editor select {
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 12px;
  background: rgba(24, 24, 27, 0.86);
  color: #f4f4f5;
  font: inherit;
  outline: none;
  padding: 9px 11px;
}

@media (max-width: 1180px) {
  .orbit-third {
    width: 930px;
    height: 930px;
  }

  .cast-editor {
    grid-template-columns: 1fr;
  }
}
</style>
