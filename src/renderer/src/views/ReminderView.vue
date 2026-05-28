<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useReminderStore, type ReminderNote, type ReminderTarget, type ReminderWorkbenchId } from '../stores/reminder'
import { useStructureStore } from '../stores/structure'

const reminderStore = useReminderStore()
const structureStore = useStructureStore()

const selectedFilter = ref<'all' | 'enabled' | 'draft' | string>('all')
const selectedNoteId = ref<string | null>(reminderStore.notes[0]?.id ?? null)
const newCategoryName = ref('')
const newCategoryColor = ref('#a1a1aa')

const workbenchOptions: Array<{ id: ReminderWorkbenchId; label: string }> = [
  { id: 'inspiration', label: '灵感' },
  { id: 'world', label: '世界' },
  { id: 'character', label: '人物' },
  { id: 'structure', label: '结构' },
  { id: 'export', label: '导出' },
]

const sceneTargetExpanded = ref(false)

const selectedNote = computed(() =>
  reminderStore.notes.find((note) => note.id === selectedNoteId.value) ?? null,
)

watch(
  () => selectedNote.value?.id,
  () => {
    sceneTargetExpanded.value = Boolean(selectedNote.value?.targets.some((target) => target.type === 'scene'))
  },
  { immediate: true },
)

const filteredNotes = computed(() => {
  if (selectedFilter.value === 'enabled') {
    return reminderStore.notes.filter((note) => note.status === 'enabled')
  }
  if (selectedFilter.value === 'draft') {
    return reminderStore.notes.filter((note) => note.status === 'draft')
  }
  if (selectedFilter.value !== 'all') {
    return reminderStore.notes.filter((note) => note.categoryId === selectedFilter.value)
  }
  return reminderStore.notes
})

watch(
  () => reminderStore.notes.map((note) => note.id),
  () => {
    if (!selectedNote.value) selectedNoteId.value = reminderStore.notes[0]?.id ?? null
  },
)

function createNote(): void {
  const note = reminderStore.createNote()
  selectedNoteId.value = note.id
}

function deleteSelectedNote(): void {
  const note = selectedNote.value
  if (!note) return
  reminderStore.deleteNote(note.id)
  selectedNoteId.value = reminderStore.notes[0]?.id ?? null
}

function createCategory(): void {
  const category = reminderStore.addCategory(newCategoryName.value, newCategoryColor.value)
  selectedFilter.value = category.id
  newCategoryName.value = ''
  newCategoryColor.value = '#a1a1aa'
}

function categoryColor(categoryId: string): string {
  return reminderStore.getCategoryById(categoryId)?.color ?? '#a1a1aa'
}

function titleOf(note: ReminderNote): string {
  return note.title.trim() || note.content.trim().slice(0, 18) || '未命名便利贴'
}

function targetEquals(a: ReminderTarget, b: ReminderTarget): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'workbench' && b.type === 'workbench') return a.workbench === b.workbench
  if (a.type === 'scene' && b.type === 'scene') {
    if (a.scope !== b.scope) return false
    if (a.scope === 'act' && b.scope === 'act') return a.actId === b.actId
    if (a.scope === 'sequence' && b.scope === 'sequence') return a.seqId === b.seqId
  }
  return false
}

function hasTarget(note: ReminderNote, target: ReminderTarget): boolean {
  return note.targets.some((candidate) => targetEquals(candidate, target))
}

function toggleTarget(note: ReminderNote, target: ReminderTarget): void {
  const nextTargets = hasTarget(note, target)
    ? note.targets.filter((candidate) => !targetEquals(candidate, target))
    : [...note.targets, target]
  reminderStore.setNoteTargets(note.id, nextTargets)
}

function toggleSceneTargets(): void {
  sceneTargetExpanded.value = !sceneTargetExpanded.value
}

function isActCovered(note: ReminderNote, actId: string): boolean {
  return hasTarget(note, { type: 'scene', scope: 'act', actId })
}

function updateTitle(note: ReminderNote, event: Event): void {
  reminderStore.updateNote(note.id, { title: (event.target as HTMLInputElement).value })
}

function updateContent(note: ReminderNote, event: Event): void {
  reminderStore.updateNote(note.id, { content: (event.target as HTMLTextAreaElement).value })
}

function updateCategory(note: ReminderNote, event: Event): void {
  reminderStore.updateNote(note.id, { categoryId: (event.target as HTMLSelectElement).value })
}

function enableSelectedNote(): void {
  const note = selectedNote.value
  if (!note) return
  reminderStore.enableNote(note.id)
}

function saveSelectedAsDraft(): void {
  const note = selectedNote.value
  if (!note) return
  reminderStore.saveAsDraft(note.id)
}

function actById(actId: string) {
  return structureStore.acts.find((act) => act.id === actId)
}

function sequenceLabel(actId: string, seqId: string): string | null {
  const act = actById(actId)
  const sequence = act?.sequences.find((seq) => seq.id === seqId)
  if (!act || !sequence) return null
  return `${act.label} / ${sequence.label}`
}

function targetLabel(target: ReminderTarget): string {
  if (target.type === 'workbench') {
    return workbenchOptions.find((option) => option.id === target.workbench)?.label ?? target.workbench
  }
  if (target.scope === 'act') {
    return actById(target.actId)?.label ?? '已失效的幕'
  }
  return sequenceLabel(target.actId, target.seqId) ?? '已失效的序列'
}

function targetSummary(note: ReminderNote): string {
  if (note.targets.length === 0) return '尚未选择发射位置'
  return note.targets.map(targetLabel).join('、')
}

function removeTarget(note: ReminderNote, target: ReminderTarget): void {
  reminderStore.setNoteTargets(
    note.id,
    note.targets.filter((candidate) => !targetEquals(candidate, target)),
  )
}
</script>

<template>
  <div class="reminder-view">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div>
          <div class="eyebrow">Reminder</div>
          <h1>提醒工作台</h1>
        </div>
        <button class="primary-icon-button" title="新建便利贴" @click="createNote">+</button>
      </div>

      <button
        class="filter-button"
        :class="{ active: selectedFilter === 'all' }"
        @click="selectedFilter = 'all'"
      >
        <span>全部便利贴</span>
        <b>{{ reminderStore.notes.length }}</b>
      </button>
      <button
        class="filter-button"
        :class="{ active: selectedFilter === 'enabled' }"
        @click="selectedFilter = 'enabled'"
      >
        <span>已启用</span>
        <b>{{ reminderStore.enabledNotes.length }}</b>
      </button>
      <button
        class="filter-button"
        :class="{ active: selectedFilter === 'draft' }"
        @click="selectedFilter = 'draft'"
      >
        <span>草稿</span>
        <b>{{ reminderStore.draftNotes.length }}</b>
      </button>

      <div class="section-title">分类</div>
      <div class="category-list">
        <button
          v-for="category in reminderStore.categories"
          :key="category.id"
          class="category-button"
          :class="{ active: selectedFilter === category.id }"
          @click="selectedFilter = category.id"
        >
          <i :style="{ background: category.color }"></i>
          <input
            :value="category.name"
            @click.stop
            @input="reminderStore.renameCategory(category.id, ($event.target as HTMLInputElement).value)"
          />
          <input
            type="color"
            :value="category.color"
            @click.stop
            @input="reminderStore.updateCategoryColor(category.id, ($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="category.id !== 'category-uncategorized'"
            class="tiny-danger"
            title="删除分类"
            @click.stop="reminderStore.deleteCategory(category.id)"
          >×</button>
        </button>
      </div>

      <div class="new-category">
        <input v-model="newCategoryName" placeholder="新分类" @keydown.enter="createCategory" />
        <input v-model="newCategoryColor" type="color" />
        <button @click="createCategory">添加</button>
      </div>
    </aside>

    <main class="note-list-panel">
      <div class="list-header">
        <div>
          <div class="eyebrow">Stickies</div>
          <h2>便利贴</h2>
        </div>
        <button class="primary-button" @click="createNote">新建便利贴</button>
      </div>

      <div v-if="filteredNotes.length === 0" class="empty-state">
        <h3>还没有便利贴</h3>
        <p>把需要反复记住的设定、约束、语气或结构意图写成便利贴，再发射到指定工作台。</p>
        <button class="primary-button" @click="createNote">新建便利贴</button>
      </div>

      <button
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-list-item"
        :class="{ active: selectedNoteId === note.id }"
        @click="selectedNoteId = note.id"
      >
        <span class="note-color" :style="{ background: categoryColor(note.categoryId) }"></span>
        <span class="note-main">
          <strong>{{ titleOf(note) }}</strong>
          <small>{{ note.content || '还没有写提醒内容。' }}</small>
          <em>{{ targetSummary(note) }}</em>
        </span>
        <span class="status-pill" :class="note.status">{{ note.status === 'enabled' ? '启用' : '草稿' }}</span>
      </button>
    </main>

    <aside class="editor-panel">
      <template v-if="selectedNote">
        <div class="editor-header">
          <div>
            <div class="eyebrow">Editor</div>
            <h2>编辑便利贴</h2>
          </div>
          <button class="danger-button" @click="deleteSelectedNote">删除</button>
        </div>

        <label class="field">
          <span>标题</span>
          <input :value="selectedNote.title" placeholder="例如：主角的感情线" @input="updateTitle(selectedNote, $event)" />
        </label>

        <label class="field grow-field">
          <span>提醒内容</span>
          <textarea
            :value="selectedNote.content"
            placeholder="写下你想在创作时反复看到的提醒。"
            @input="updateContent(selectedNote, $event)"
          ></textarea>
        </label>

        <label class="field">
          <span>分类</span>
          <select :value="selectedNote.categoryId" @change="updateCategory(selectedNote, $event)">
            <option v-for="category in reminderStore.categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>

        <section class="target-section">
          <div class="section-row">
            <div>
              <h3>发射到工作台</h3>
              <p>便利贴只会出现在勾选的工作台里。</p>
            </div>
          </div>
          <div class="target-grid">
            <label v-for="option in workbenchOptions" :key="option.id" class="target-checkbox">
              <input
                type="checkbox"
                :checked="hasTarget(selectedNote, { type: 'workbench', workbench: option.id })"
                @change="toggleTarget(selectedNote, { type: 'workbench', workbench: option.id })"
              />
              <span>{{ option.label }}</span>
            </label>
            <label class="target-checkbox">
              <input
                type="checkbox"
                :checked="sceneTargetExpanded"
                :disabled="structureStore.acts.length === 0"
                @change="toggleSceneTargets()"
              />
              <span>场景</span>
            </label>
          </div>
          <div v-if="structureStore.acts.length === 0" class="hint-box">
            还没有幕和序列。先在结构工作台添加结构后，才能发射到场景工作台。
          </div>
        </section>

        <section v-if="sceneTargetExpanded" class="target-section">
          <h3>场景出现范围</h3>
          <p>选择整幕后，会覆盖该幕下所有序列；选择单个序列时，只在光标进入该序列时显示。</p>
          <div class="structure-targets">
            <div v-for="act in structureStore.acts" :key="act.id" class="act-target">
              <label class="target-checkbox act-checkbox">
                <input
                  type="checkbox"
                  :checked="hasTarget(selectedNote, { type: 'scene', scope: 'act', actId: act.id })"
                  @change="toggleTarget(selectedNote, { type: 'scene', scope: 'act', actId: act.id })"
                />
                <span>{{ act.label }}</span>
                <em v-if="isActCovered(selectedNote, act.id)">包含本幕全部序列</em>
              </label>
              <label
                v-for="seq in act.sequences"
                :key="seq.id"
                class="target-checkbox seq-checkbox"
                :class="{ covered: isActCovered(selectedNote, act.id) }"
              >
                <input
                  type="checkbox"
                  :checked="hasTarget(selectedNote, { type: 'scene', scope: 'sequence', actId: act.id, seqId: seq.id })"
                  :disabled="isActCovered(selectedNote, act.id)"
                  @change="toggleTarget(selectedNote, { type: 'scene', scope: 'sequence', actId: act.id, seqId: seq.id })"
                />
                <span>{{ seq.label }}</span>
                <em v-if="isActCovered(selectedNote, act.id)">已由整幕覆盖</em>
              </label>
            </div>
          </div>
        </section>

        <section class="target-section">
          <h3>已选位置</h3>
          <div v-if="selectedNote.targets.length === 0" class="hint-box">
            选择至少一个发射位置后才能启用。
          </div>
          <div v-else class="target-chips">
            <button v-for="target in selectedNote.targets" :key="`${target.type}-${targetLabel(target)}`" @click="removeTarget(selectedNote, target)">
              {{ targetLabel(target) }} ×
            </button>
          </div>
        </section>

        <div class="editor-actions">
          <button class="secondary-button" @click="saveSelectedAsDraft">保存为草稿</button>
          <button class="primary-button" :disabled="selectedNote.targets.length === 0" @click="enableSelectedNote">
            启用并发射
          </button>
        </div>
      </template>

      <div v-else class="empty-editor">
        <h3>选择一张便利贴</h3>
        <p>或新建一张便利贴，写下你想提醒自己的创作约束。</p>
        <button class="primary-button" @click="createNote">新建便利贴</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.reminder-view {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 280px minmax(360px, 1fr) 420px;
  background: #09090b;
  color: #e4e4e7;
  overflow: hidden;
}

.sidebar,
.note-list-panel,
.editor-panel {
  min-height: 0;
  overflow: auto;
  border-right: 1px solid #27272a;
}

.sidebar {
  padding: 24px 18px;
  background: #111113;
}

.note-list-panel {
  padding: 24px;
  background: #18181b;
}

.editor-panel {
  border-right: 0;
  padding: 24px;
  background: #101012;
}

.sidebar-header,
.list-header,
.editor-header,
.section-row,
.editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-header,
.list-header,
.editor-header {
  margin-bottom: 22px;
}

.eyebrow {
  color: #71717a;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2 {
  color: #f4f4f5;
  font-size: 20px;
  font-weight: 700;
}

h3 {
  color: #e4e4e7;
  font-size: 14px;
  font-weight: 700;
}

p {
  color: #71717a;
  font-size: 12px;
  line-height: 1.6;
}

button,
input,
select,
textarea {
  font: inherit;
}

.primary-button,
.secondary-button,
.danger-button,
.primary-icon-button {
  border: 1px solid #3f3f46;
  border-radius: 10px;
  padding: 8px 12px;
  color: #e4e4e7;
  background: #27272a;
  cursor: pointer;
}

.primary-button,
.primary-icon-button {
  border-color: #7c6f56;
  background: #a18b5f;
  color: #111113;
  font-weight: 700;
}

.primary-button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.primary-icon-button {
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 22px;
}

.danger-button,
.tiny-danger {
  border-color: rgba(248, 113, 113, 0.28);
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.18);
}

.filter-button,
.category-button,
.note-list-item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #d4d4d8;
  background: transparent;
  cursor: pointer;
}

.filter-button {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 6px;
}

.filter-button.active,
.category-button.active,
.note-list-item.active {
  border-color: rgba(161, 139, 95, 0.45);
  background: rgba(161, 139, 95, 0.12);
}

.section-title {
  margin: 22px 0 10px;
  color: #71717a;
  font-size: 12px;
  font-weight: 700;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-button {
  display: grid;
  grid-template-columns: 10px 1fr 30px 22px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
}

.category-button i,
.note-color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.category-button input[type='text'],
.category-button input:not([type]) {
  min-width: 0;
  border: 0;
  color: #d4d4d8;
  background: transparent;
  outline: none;
}

.category-button input[type='color'],
.new-category input[type='color'] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
}

.tiny-danger {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  padding: 0;
}

.new-category {
  display: grid;
  grid-template-columns: 1fr 32px auto;
  gap: 8px;
  margin-top: 12px;
}

.new-category input:not([type='color']),
.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid #27272a;
  border-radius: 10px;
  background: #18181b;
  color: #e4e4e7;
  outline: none;
}

.new-category input:not([type='color']) {
  padding: 8px 10px;
}

.new-category button {
  border: 1px solid #3f3f46;
  border-radius: 10px;
  color: #d4d4d8;
  background: #27272a;
}

.empty-state,
.empty-editor {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  border: 1px dashed #3f3f46;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
}

.note-list-item {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: start;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
}

.note-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.note-main strong {
  color: #f4f4f5;
  font-size: 15px;
}

.note-main small,
.note-main em {
  display: -webkit-box;
  overflow: hidden;
  color: #a1a1aa;
  font-size: 12px;
  font-style: normal;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.note-main em {
  color: #71717a;
  -webkit-line-clamp: 1;
}

.status-pill {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
}

.status-pill.enabled {
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.14);
}

.status-pill.draft {
  color: #d4d4d8;
  background: rgba(161, 161, 170, 0.14);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field span {
  color: #a1a1aa;
  font-size: 12px;
  font-weight: 700;
}

.field input,
.field select,
.field textarea {
  padding: 10px 12px;
}

.grow-field textarea {
  min-height: 140px;
  resize: vertical;
  line-height: 1.6;
}

.target-section {
  margin: 18px 0;
  padding: 16px;
  border: 1px solid #27272a;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.025);
}

.target-section h3 {
  margin-bottom: 4px;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.target-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 8px 10px;
  color: #d4d4d8;
  background: rgba(255, 255, 255, 0.04);
}

.target-checkbox input {
  accent-color: #a18b5f;
}

.target-checkbox em {
  margin-left: auto;
  color: #71717a;
  font-size: 11px;
  font-style: normal;
}

.target-checkbox.covered {
  opacity: 0.58;
}

.hint-box {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px;
  color: #a1a1aa;
  background: rgba(161, 161, 170, 0.08);
  font-size: 12px;
  line-height: 1.6;
}

.structure-targets {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.act-target {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.act-checkbox {
  font-weight: 700;
}

.seq-checkbox {
  margin-left: 18px;
}

.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.target-chips button {
  border: 1px solid rgba(161, 139, 95, 0.35);
  border-radius: 999px;
  padding: 6px 10px;
  color: #e4e4e7;
  background: rgba(161, 139, 95, 0.12);
  cursor: pointer;
}

.editor-actions {
  position: sticky;
  bottom: -24px;
  margin: 22px -24px -24px;
  padding: 16px 24px;
  border-top: 1px solid #27272a;
  background: #101012;
}
</style>
