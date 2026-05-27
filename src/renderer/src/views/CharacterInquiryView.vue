<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PortableCharacterDetailPanel from '../components/character/detail/PortableCharacterDetailPanel.vue'
import PortableCharacterDetailTrigger from '../components/character/detail/PortableCharacterDetailTrigger.vue'
import type { CharacterDetail } from '../components/character/detail/types'
import { useCharacterStore } from '../stores/character'

type ParticipantMode = 'single' | 'pair' | 'group'
type PlayMode = 'preset' | 'freeform'
type InquiryStage = 'setup' | 'prepare' | 'interrogate' | 'summary'

interface PresetQuestion {
  id: string
  text: string
}

interface InquiryMessage {
  id: string
  speakerId: string
  content: string
}

interface DialogueRow {
  id: string
  side: 'left' | 'right'
  speaker: string
  content: string
  meta?: string
}

const characterStore = useCharacterStore()

const participantMode = ref<ParticipantMode>('single')
const playMode = ref<PlayMode>('preset')
const stage = ref<InquiryStage>('setup')
const selectedParticipantIds = ref<string[]>([])
const detailPanelOpen = ref(false)
const presetQuestions = ref<PresetQuestion[]>([
  { id: 'question-1', text: '你最怕失去什么？' },
  { id: 'question-2', text: '如果对方真的离开，你会先怪谁？' },
  { id: 'question-3', text: '有什么事你一直没有说出口？' },
])
const nextQuestionId = ref(4)
const currentQuestionIndex = ref(0)
const currentAnswerParticipantIndex = ref(0)
const presetAnswers = ref<Record<string, Record<string, string>>>({})
const presetAnswerDraft = ref('')
const activeSpeakerId = ref('interviewer')
const freeformDraft = ref('')
const freeformMessages = ref<InquiryMessage[]>([])
const nextMessageId = ref(1)
const summaryDraft = ref('')
const summaryTargetId = ref('')

const participants = computed(() => {
  return selectedParticipantIds.value
    .map((id) => characterStore.getCharacterById(id))
    .filter((character): character is CharacterDetail => Boolean(character))
})

const requiredParticipantCount = computed(() => {
  if (participantMode.value === 'single') return 1
  if (participantMode.value === 'pair') return 2
  return 1
})

const canEnterInquiry = computed(() => participants.value.length >= requiredParticipantCount.value)

const currentPresetQuestion = computed(() => presetQuestions.value[currentQuestionIndex.value])

const currentAnswerParticipant = computed(() => participants.value[currentAnswerParticipantIndex.value])

const isLastPresetAnswer = computed(() => {
  return (
    currentQuestionIndex.value >= presetQuestions.value.length - 1 &&
    currentAnswerParticipantIndex.value >= participants.value.length - 1
  )
})

const presetDialogueRows = computed<DialogueRow[]>(() => {
  const rows: DialogueRow[] = []

  presetQuestions.value.forEach((question, questionIndex) => {
    if (questionIndex > currentQuestionIndex.value) return

    rows.push({
      id: `${question.id}-question`,
      side: 'left',
      speaker: '询问者',
      content: question.text || '未填写问题',
      meta: `第 ${questionIndex + 1} 问`,
    })

    participants.value.forEach((participant, participantIndex) => {
      const answer = getPresetAnswer(question.id, participant.id)
      const shouldShowAnswer =
        questionIndex < currentQuestionIndex.value || participantIndex < currentAnswerParticipantIndex.value

      if (!answer || !shouldShowAnswer) return

      rows.push({
        id: `${question.id}-${participant.id}-answer`,
        side: 'right',
        speaker: participant.profile.name || '未命名人物',
        content: answer,
      })
    })
  })

  return rows
})

const freeformDialogueRows = computed<DialogueRow[]>(() => {
  return freeformMessages.value.map((message) => ({
    id: message.id,
    side: message.speakerId === 'interviewer' ? 'left' : 'right',
    speaker: getSpeakerName(message.speakerId),
    content: message.content,
  }))
})

const stageTitle = computed(() => {
  if (stage.value === 'setup') return '开场选择'
  if (stage.value === 'prepare') return '准备问题'
  if (stage.value === 'interrogate') return playMode.value === 'preset' ? '预设问询' : '自问自答'
  return '总结沉淀'
})

const seatTitle = computed(() => {
  if (participantMode.value === 'single') return '单人坐席'
  if (participantMode.value === 'pair') return '双人坐席'
  return '圆桌'
})

const triggerName = computed(() => {
  if (participantMode.value === 'single') return participants.value[0]?.profile.name
  if (participants.value.length) return '多人问询'
  return undefined
})

const summaryRecords = computed(() => {
  if (playMode.value === 'freeform') return []
  return presetQuestions.value.map((question, index) => ({
    question,
    index,
    answers: participants.value.map((participant) => ({
      participant,
      answer: getPresetAnswer(question.id, participant.id),
    })),
  }))
})

watch(
  () => characterStore.characters.map((character) => character.id),
  () => {
    selectedParticipantIds.value = normalizeParticipantIds(selectedParticipantIds.value)
  },
  { immediate: true },
)

watch(participants, (nextParticipants) => {
  if (!nextParticipants.some((participant) => participant.id === summaryTargetId.value)) {
    summaryTargetId.value = nextParticipants[0]?.id ?? ''
  }

  if (
    activeSpeakerId.value !== 'interviewer' &&
    !nextParticipants.some((participant) => participant.id === activeSpeakerId.value)
  ) {
    activeSpeakerId.value = nextParticipants[0]?.id ?? 'interviewer'
  }
})

function normalizeParticipantIds(
  ids: string[],
  mode: ParticipantMode = participantMode.value
): string[] {
  const availableIds = characterStore.characters.map((character) => character.id)
  const uniqueIds = ids.filter((id, index) => availableIds.includes(id) && ids.indexOf(id) === index)

  if (mode === 'single') {
    const nextId = uniqueIds[0] ?? availableIds[0]
    return nextId ? [nextId] : []
  }

  if (mode === 'pair') {
    const nextIds = [...uniqueIds]
    for (const id of availableIds) {
      if (nextIds.length >= 2) break
      if (!nextIds.includes(id)) nextIds.push(id)
    }
    return nextIds.slice(0, 2)
  }

  if (uniqueIds.length) return uniqueIds
  return availableIds.slice(0, Math.min(3, availableIds.length))
}

function setParticipantMode(mode: ParticipantMode) {
  participantMode.value = mode
  selectedParticipantIds.value = normalizeParticipantIds(selectedParticipantIds.value, mode)
}

function setPlayMode(mode: PlayMode) {
  playMode.value = mode
}

function setParticipantAt(index: number, characterId: string) {
  const nextIds = [...selectedParticipantIds.value]
  nextIds[index] = characterId
  selectedParticipantIds.value = normalizeParticipantIds(nextIds)
}

function toggleGroupParticipant(characterId: string) {
  if (selectedParticipantIds.value.includes(characterId)) {
    if (selectedParticipantIds.value.length <= 1) return
    selectedParticipantIds.value = selectedParticipantIds.value.filter((id) => id !== characterId)
    return
  }

  selectedParticipantIds.value = [...selectedParticipantIds.value, characterId]
}

function enterInquiry() {
  if (!canEnterInquiry.value) return
  currentQuestionIndex.value = 0
  currentAnswerParticipantIndex.value = 0
  presetAnswerDraft.value = ''
  stage.value = playMode.value === 'preset' ? 'prepare' : 'interrogate'
  activeSpeakerId.value = participants.value[0]?.id ?? 'interviewer'
}

function inviteParticipants() {
  currentQuestionIndex.value = 0
  currentAnswerParticipantIndex.value = 0
  presetAnswerDraft.value = ''
  stage.value = 'interrogate'
}

function addPresetQuestion() {
  presetQuestions.value.push({ id: `question-${nextQuestionId.value++}`, text: '' })
}

function removePresetQuestion(questionId: string) {
  if (presetQuestions.value.length <= 1) return
  const index = presetQuestions.value.findIndex((question) => question.id === questionId)
  presetQuestions.value = presetQuestions.value.filter((question) => question.id !== questionId)
  if (currentQuestionIndex.value >= presetQuestions.value.length) {
    currentQuestionIndex.value = presetQuestions.value.length - 1
  }
  if (index >= 0 && presetAnswers.value[questionId]) delete presetAnswers.value[questionId]
}

function getPresetAnswer(questionId: string, characterId: string) {
  return presetAnswers.value[questionId]?.[characterId] ?? ''
}

function setPresetAnswer(questionId: string, characterId: string, value: string) {
  if (!presetAnswers.value[questionId]) presetAnswers.value[questionId] = {}
  presetAnswers.value[questionId][characterId] = value
}

function submitPresetAnswer() {
  const question = currentPresetQuestion.value
  const participant = currentAnswerParticipant.value
  const content = presetAnswerDraft.value.trim()

  if (!question || !participant || !content) return

  setPresetAnswer(question.id, participant.id, content)
  presetAnswerDraft.value = ''

  if (currentAnswerParticipantIndex.value < participants.value.length - 1) {
    currentAnswerParticipantIndex.value += 1
    return
  }

  if (currentQuestionIndex.value < presetQuestions.value.length - 1) {
    currentQuestionIndex.value += 1
    currentAnswerParticipantIndex.value = 0
    return
  }

  finishInquiry()
}

function addFreeformMessage() {
  const content = freeformDraft.value.trim()
  if (!content) return

  freeformMessages.value.push({
    id: `message-${nextMessageId.value++}`,
    speakerId: activeSpeakerId.value,
    content,
  })
  freeformDraft.value = ''
}

function getSpeakerName(speakerId: string) {
  if (speakerId === 'interviewer') return '询问者'
  return characterStore.getCharacterById(speakerId)?.profile.name ?? '未知人物'
}

function finishInquiry() {
  stage.value = 'summary'
  summaryTargetId.value = participants.value[0]?.id ?? ''
}

function saveSummaryToQuickNote() {
  const content = summaryDraft.value.trim()
  if (!content || !summaryTargetId.value) return
  characterStore.addQuickNote(summaryTargetId.value, `问询总结：${content}`)
}

function resetInquiry() {
  stage.value = 'setup'
  currentQuestionIndex.value = 0
  currentAnswerParticipantIndex.value = 0
  presetAnswers.value = {}
  presetAnswerDraft.value = ''
  freeformMessages.value = []
  freeformDraft.value = ''
  summaryDraft.value = ''
}

function openDetailPanel() {
  detailPanelOpen.value = true
}
</script>

<template>
  <div class="inquiry-page">
    <header class="inquiry-header">
      <div>
        <p class="section-kicker">人物工作台 / 问询室</p>
        <h1>请人物进来，让他说话</h1>
      </div>
      <div class="header-actions">
        <span class="stage-pill">{{ stageTitle }}</span>
        <RouterLink class="back-button" to="/character">返回首页</RouterLink>
      </div>
    </header>

    <main v-if="stage === 'setup'" class="setup-stage">
      <section class="setup-card">
        <p class="section-kicker">Before They Enter</p>
        <h2>今天要请谁进来？</h2>
        <p class="setup-copy">先确定坐几把椅子，再决定是提前备好问题，还是直接请人物进来即兴自问自答。</p>

        <div class="setup-block">
          <h3>问几个人？</h3>
          <div class="choice-row">
            <button
              class="choice-button"
              :class="{ 'choice-button-active': participantMode === 'single' }"
              type="button"
              @click="setParticipantMode('single')"
            >
              单人
            </button>
            <button
              class="choice-button"
              :class="{ 'choice-button-active': participantMode === 'pair' }"
              type="button"
              @click="setParticipantMode('pair')"
            >
              双人
            </button>
            <button
              class="choice-button"
              :class="{ 'choice-button-active': participantMode === 'group' }"
              type="button"
              @click="setParticipantMode('group')"
            >
              群体
            </button>
          </div>
        </div>

        <div class="setup-block">
          <h3>怎么玩？</h3>
          <div class="choice-row">
            <button
              class="choice-button"
              :class="{ 'choice-button-active': playMode === 'preset' }"
              type="button"
              @click="setPlayMode('preset')"
            >
              预设问题
            </button>
            <button
              class="choice-button"
              :class="{ 'choice-button-active': playMode === 'freeform' }"
              type="button"
              @click="setPlayMode('freeform')"
            >
              自问自答
            </button>
          </div>
        </div>

        <div class="setup-block">
          <h3>选择参与人物</h3>
          <div v-if="participantMode !== 'group'" class="participant-select-grid">
            <label v-for="(_, index) in Array.from({ length: requiredParticipantCount })" :key="index">
              <span>{{ index === 0 ? '第一把椅子' : '第二把椅子' }}</span>
              <select
                :value="selectedParticipantIds[index]"
                @change="setParticipantAt(index, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="character in characterStore.characters" :key="character.id" :value="character.id">
                  {{ character.profile.name || '未命名人物' }} · {{ character.profile.layer }}
                </option>
              </select>
            </label>
          </div>

          <div v-else class="group-select-grid">
            <button
              v-for="character in characterStore.characters"
              :key="character.id"
              class="group-character-button"
              :class="{ 'group-character-button-active': selectedParticipantIds.includes(character.id) }"
              type="button"
              @click="toggleGroupParticipant(character.id)"
            >
              <strong>{{ character.profile.name || '未命名人物' }}</strong>
              <span>{{ character.profile.layer }}</span>
            </button>
          </div>
        </div>

        <button class="primary-button" type="button" :disabled="!canEnterInquiry" @click="enterInquiry">
          进入问询室
        </button>
      </section>
    </main>

    <main v-else class="inquiry-stage" :class="`inquiry-stage-${stage}`">
      <section class="stage-page stage-page-left">
        <template v-if="stage === 'prepare'">
          <div class="page-title-row">
            <div>
              <p class="section-kicker">Prepare Questions</p>
              <h2>在人物进来前，先准备好要问的问题</h2>
            </div>
            <button class="ghost-button" type="button" @click="addPresetQuestion">添加问题</button>
          </div>

          <div class="question-list">
            <label v-for="(question, index) in presetQuestions" :key="question.id" class="question-editor">
              <span>问题 {{ index + 1 }}</span>
              <textarea v-model="question.text" rows="3" placeholder="写下你准备抛给人物的问题。" />
              <button class="text-button" type="button" @click="removePresetQuestion(question.id)">删除</button>
            </label>
          </div>
        </template>

        <template v-else-if="stage === 'interrogate'">
          <div class="page-title-row">
            <div>
              <p class="section-kicker">{{ seatTitle }}</p>
              <h2>{{ playMode === 'preset' ? '人物已经坐下' : '人物进来了，开始问吧' }}</h2>
            </div>
          </div>

          <div class="seat-stage" :class="`seat-stage-${participantMode}`">
            <div v-if="participantMode === 'group'" class="round-table">
              <span v-for="participant in participants" :key="participant.id">{{ participant.profile.name }}</span>
            </div>
            <div v-else v-for="participant in participants" :key="participant.id" class="seat-card">
              <span class="seat-back"></span>
              <strong>{{ participant.profile.name || '未命名人物' }}</strong>
              <small>{{ participant.profile.layer }}</small>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="page-title-row">
            <div>
              <p class="section-kicker">Records</p>
              <h2>问询记录</h2>
            </div>
          </div>

          <div v-if="playMode === 'preset'" class="record-list">
            <article v-for="record in summaryRecords" :key="record.question.id" class="record-card">
              <span>Q{{ record.index + 1 }}</span>
              <strong>{{ record.question.text || '未填写问题' }}</strong>
              <p v-for="answer in record.answers" :key="answer.participant.id">
                {{ answer.participant.profile.name }}：{{ answer.answer || '尚未回答' }}
              </p>
            </article>
          </div>

          <div v-else class="record-list">
            <article v-for="message in freeformMessages" :key="message.id" class="record-card">
              <span>{{ getSpeakerName(message.speakerId) }}</span>
              <p>{{ message.content }}</p>
            </article>
            <p v-if="!freeformMessages.length" class="empty-copy">这次还没有留下对话。</p>
          </div>
        </template>
      </section>

      <section class="stage-page stage-page-right">
        <template v-if="stage === 'prepare'">
          <div class="waiting-room" :class="`waiting-room-${participantMode}`">
            <p class="section-kicker">Waiting Room</p>
            <h2>{{ participantMode === 'group' ? '圆桌还空着' : '凳子还空着' }}</h2>
            <div class="empty-seats" :class="`empty-seats-${participantMode}`">
              <span v-for="participant in participants" :key="participant.id">{{ participant.profile.name }}</span>
            </div>
            <p>问题准备好后，再请他们进来。</p>
            <button class="primary-button" type="button" @click="inviteParticipants">
              {{ participantMode === 'single' ? '请他进来' : '请他们进来' }}
            </button>
          </div>
        </template>

        <template v-else-if="stage === 'interrogate' && playMode === 'preset'">
          <div class="dialogue-panel">
            <div class="dialogue-title-row">
              <div>
                <p class="section-kicker">Dialogue Flow</p>
                <h2>系统会问下一句，你只负责代人物回答</h2>
              </div>
              <span class="dialogue-progress"
                >{{ currentQuestionIndex + 1 }} / {{ presetQuestions.length }}</span
              >
            </div>

            <div class="chat-thread">
              <article
                v-for="row in presetDialogueRows"
                :key="row.id"
                class="chat-row"
                :class="`chat-row-${row.side}`"
              >
                <span>{{ row.meta || row.speaker }}</span>
                <p>{{ row.content }}</p>
              </article>
            </div>

            <div v-if="currentPresetQuestion && currentAnswerParticipant" class="answer-composer">
              <span>{{ currentAnswerParticipant.profile.name || '未命名人物' }} 回答</span>
              <textarea
                v-model="presetAnswerDraft"
                rows="4"
                :placeholder="`以${currentAnswerParticipant.profile.name || '这个人物'}的身份回答。`"
                @keydown.ctrl.enter.prevent="submitPresetAnswer"
              />
              <div class="dialogue-actions">
                <button class="ghost-button" type="button" @click="finishInquiry">提前结束</button>
                <button
                  class="primary-button"
                  type="button"
                  :disabled="!presetAnswerDraft.trim()"
                  @click="submitPresetAnswer"
                >
                  {{ isLastPresetAnswer ? '回答并总结' : '发送回答' }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="stage === 'interrogate'">
          <div class="dialogue-panel">
            <div class="dialogue-title-row">
              <div>
                <p class="section-kicker">Freeform</p>
                <h2>自问自答</h2>
              </div>
              <button class="ghost-button" type="button" @click="finishInquiry">完成问询</button>
            </div>

            <div class="chat-thread">
              <article
                v-for="row in freeformDialogueRows"
                :key="row.id"
                class="chat-row"
                :class="`chat-row-${row.side}`"
              >
                <span>{{ row.speaker }}</span>
                <p>{{ row.content }}</p>
              </article>
              <p v-if="!freeformDialogueRows.length" class="empty-copy">切换发言者，开始第一句。</p>
            </div>

            <div class="speaker-tabs">
              <button
                class="speaker-tab"
                :class="{ 'speaker-tab-active': activeSpeakerId === 'interviewer' }"
                type="button"
                @click="activeSpeakerId = 'interviewer'"
              >
                询问者
              </button>
              <button
                v-for="participant in participants"
                :key="participant.id"
                class="speaker-tab"
                :class="{ 'speaker-tab-active': activeSpeakerId === participant.id }"
                type="button"
                @click="activeSpeakerId = participant.id"
              >
                {{ participant.profile.name }}
              </button>
            </div>

            <div class="answer-composer">
              <span>{{ getSpeakerName(activeSpeakerId) }} 发言</span>
              <textarea
                v-model="freeformDraft"
                rows="4"
                :placeholder="`以${getSpeakerName(activeSpeakerId)}的身份说话。`"
                @keydown.ctrl.enter.prevent="addFreeformMessage"
              />
              <button
                class="primary-button"
                type="button"
                :disabled="!freeformDraft.trim()"
                @click="addFreeformMessage"
              >
                发送发言
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="summary-panel">
            <p class="section-kicker">Summary</p>
            <h2>这次问出了什么？</h2>
            <textarea v-model="summaryDraft" rows="8" placeholder="写下这次问询真正暴露出来的人物真相、信息差或新的疑问。" />

            <label class="summary-target">
              <span>记入人物</span>
              <select v-model="summaryTargetId">
                <option v-for="participant in participants" :key="participant.id" :value="participant.id">
                  {{ participant.profile.name || '未命名人物' }}
                </option>
              </select>
            </label>

            <div class="dialogue-actions">
              <button class="ghost-button" type="button" @click="saveSummaryToQuickNote">记入快速记录</button>
              <button class="ghost-button" type="button" @click="resetInquiry">重新问询</button>
              <RouterLink class="primary-link" to="/character">返回首页</RouterLink>
            </div>
          </div>
        </template>
      </section>
    </main>

    <PortableCharacterDetailTrigger :character-name="triggerName" @open="openDetailPanel" />

    <PortableCharacterDetailPanel
      :open="detailPanelOpen"
      :characters="characterStore.characters"
      :initial-character-id="participantMode === 'single' ? participants[0]?.id : undefined"
      :select-initial-on-open="participantMode === 'single'"
      @close="detailPanelOpen = false"
      @save="characterStore.saveCharacters"
      @add-note="(characterId, content) => characterStore.addQuickNote(characterId, content)"
    />
  </div>
</template>

<style scoped>
.inquiry-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 16% 18%, rgba(82, 82, 91, 0.22), transparent 28%),
    radial-gradient(circle at 84% 68%, rgba(39, 39, 42, 0.46), transparent 30%),
    #09090b;
  color: #f4f4f5;
}

.inquiry-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  padding: 28px 34px 22px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.82);
}

.section-kicker {
  margin: 0 0 8px;
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.inquiry-header h1,
.setup-card h2,
.stage-page h2,
.waiting-room h2,
.dialogue-panel h2,
.summary-panel h2 {
  margin: 0;
  color: #fafafa;
  font-weight: 620;
  letter-spacing: 0.04em;
}

.inquiry-header h1 {
  font-size: 30px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-pill,
.back-button,
.primary-link,
.primary-button,
.ghost-button,
.choice-button,
.text-button,
.speaker-tab,
.group-character-button {
  border: 1px solid rgba(113, 113, 122, 0.82);
  border-radius: 12px;
  background: rgba(39, 39, 42, 0.72);
  color: #f4f4f5;
  font: inherit;
  text-decoration: none;
}

.back-button,
.primary-link,
.primary-button,
.ghost-button {
  padding: 10px 14px;
}

.primary-button,
.ghost-button,
.choice-button,
.text-button,
.speaker-tab,
.group-character-button {
  cursor: pointer;
}

.primary-button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.stage-pill {
  padding: 9px 12px;
  color: #d4d4d8;
  font-size: 13px;
}

.primary-button,
.primary-link {
  border-color: rgba(228, 228, 231, 0.7);
  background: rgba(82, 82, 91, 0.78);
}

.setup-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 34px;
}

.setup-card {
  width: min(880px, 100%);
  border: 1px solid rgba(63, 63, 70, 0.88);
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(24, 24, 27, 0.88), rgba(9, 9, 11, 0.72)),
    radial-gradient(circle at 20% 0%, rgba(212, 212, 216, 0.12), transparent 28%);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32);
  padding: 30px;
}

.setup-card h2 {
  font-size: 34px;
}

.setup-copy {
  max-width: 680px;
  margin: 14px 0 24px;
  color: #a1a1aa;
  font-size: 15px;
  line-height: 1.8;
}

.setup-block {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.setup-block h3 {
  margin: 0;
  color: #e4e4e7;
  font-size: 16px;
}

.choice-row,
.speaker-tabs,
.dialogue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.choice-button,
.speaker-tab {
  padding: 10px 14px;
}

.choice-button-active,
.speaker-tab-active,
.group-character-button-active {
  border-color: rgba(244, 244, 245, 0.78);
  background: rgba(82, 82, 91, 0.74);
}

.participant-select-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.participant-select-grid label,
.summary-target {
  display: grid;
  gap: 8px;
  color: #a1a1aa;
  font-size: 12px;
}

.participant-select-grid select,
.summary-target select,
.question-editor textarea,
.dialogue-panel textarea,
.summary-panel textarea {
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 14px;
  background: rgba(9, 9, 11, 0.34);
  color: #f4f4f5;
  font: inherit;
  outline: none;
  padding: 11px 12px;
}

.group-select-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.group-character-button {
  display: grid;
  gap: 5px;
  padding: 12px;
  text-align: left;
}

.group-character-button span {
  color: #a1a1aa;
  font-size: 12px;
}

.inquiry-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  gap: 18px;
  overflow: hidden;
  padding: 24px 34px 34px;
}

.stage-page {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(63, 63, 70, 0.88);
  border-radius: 28px;
  background: rgba(24, 24, 27, 0.66);
  padding: 22px;
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.inquiry-stage-prepare .stage-page-left {
  transform: translateX(0);
}

.inquiry-stage-interrogate .stage-page-left,
.inquiry-stage-summary .stage-page-left {
  transform: translateX(-4px);
}

.page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.question-list,
.record-list {
  display: grid;
  gap: 12px;
}

.question-editor,
.record-card {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 18px;
  background: rgba(9, 9, 11, 0.28);
  padding: 14px;
}

.question-editor span,
.record-card span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.12em;
}

.question-editor textarea,
.dialogue-panel textarea,
.summary-panel textarea {
  width: 100%;
  line-height: 1.7;
  resize: vertical;
}

.text-button {
  justify-self: start;
  padding: 7px 10px;
  color: #fca5a5;
  font-size: 12px;
}

.waiting-room,
.dialogue-panel,
.summary-panel {
  display: grid;
  align-content: start;
  gap: 16px;
}

.empty-seats {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  border: 1px dashed rgba(113, 113, 122, 0.64);
  border-radius: 26px;
  background: rgba(9, 9, 11, 0.24);
}

.empty-seats span,
.seat-card {
  display: grid;
  place-items: center;
  width: 118px;
  height: 138px;
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 22px 22px 16px 16px;
  background: rgba(39, 39, 42, 0.62);
  color: #d4d4d8;
}

.empty-seats-group {
  border-radius: 50%;
}

.seat-stage {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  border-radius: 26px;
  background:
    radial-gradient(circle at center, rgba(82, 82, 91, 0.24), transparent 46%),
    rgba(9, 9, 11, 0.24);
}

.seat-stage-group {
  min-height: 460px;
}

.seat-card {
  position: relative;
  width: 150px;
  height: 176px;
}

.seat-card small {
  color: #a1a1aa;
}

.seat-back {
  width: 58px;
  height: 42px;
  border: 1px solid rgba(161, 161, 170, 0.72);
  border-radius: 18px 18px 8px 8px;
}

.round-table {
  position: relative;
  width: 340px;
  height: 340px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(113, 113, 122, 0.8);
  border-radius: 50%;
  background: rgba(39, 39, 42, 0.54);
  padding: 52px;
}

.round-table span {
  display: inline-flex;
  margin: 5px;
  padding: 8px 10px;
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 999px;
  background: rgba(9, 9, 11, 0.42);
}

.dialogue-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialogue-progress {
  flex-shrink: 0;
  border: 1px solid rgba(82, 82, 91, 0.86);
  border-radius: 999px;
  color: #d4d4d8;
  font-size: 12px;
  padding: 7px 10px;
}

.chat-thread {
  min-height: 310px;
  max-height: 430px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 22px;
  background: rgba(9, 9, 11, 0.24);
  padding: 16px;
}

.chat-row {
  width: min(78%, 560px);
  display: grid;
  gap: 7px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 18px;
  background: rgba(24, 24, 27, 0.72);
  padding: 12px 14px;
}

.chat-row-left {
  align-self: flex-start;
}

.chat-row-right {
  align-self: flex-end;
  border-color: rgba(113, 113, 122, 0.88);
  background: rgba(63, 63, 70, 0.62);
}

.chat-row span,
.answer-composer span {
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.chat-row p {
  margin: 0;
  color: #f4f4f5;
  line-height: 1.75;
}

.answer-composer {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(63, 63, 70, 0.78);
  border-radius: 20px;
  background: rgba(9, 9, 11, 0.22);
  padding: 14px;
}

.answer-composer .primary-button {
  justify-self: end;
}

.record-card p,
.empty-copy,
.waiting-room p {
  margin: 0;
  color: #d4d4d8;
  line-height: 1.7;
}

.record-card strong {
  color: #f4f4f5;
  font-size: 15px;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .inquiry-stage {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .participant-select-grid,
  .group-select-grid {
    grid-template-columns: 1fr;
  }
}
</style>
