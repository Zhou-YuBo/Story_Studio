import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type StructureOwnerType = 'project' | 'act' | 'sequence' | 'scene'

export interface StoryCoreFields {
  premise: string
  balanceBreak: string
  consciousDesire: string
  unconsciousDesire: string
  controllingIdea: string
  controllingIdeaReason: string
  counterIdea: string
  counterIdeaReason: string
  coreValueAxisIds: string[]
}

type StoryCoreTextField = Exclude<keyof StoryCoreFields, 'coreValueAxisIds'>

export interface ActCoreFields {
  task: string
  startState: string
  endState: string
  endingTest: string
  synopsis: string
}

export type ActCoreTextField = keyof ActCoreFields

export interface StructureSequence {
  id: string
  label: string
  color: string
}

export interface StructureAct {
  id: string
  label: string
  color: string
  sequences: StructureSequence[]
  core: ActCoreFields
}

export interface ValueAxis {
  id: string
  ownerType: StructureOwnerType
  ownerId: string
  positiveLabel: string
  negativeLabel: string
  color: string
  order: number
}

export interface ValuePoint {
  axisId: string
  targetType: StructureOwnerType
  targetId: string
  value: number
}

interface StructureState {
  version: 2
  acts: StructureAct[]
  valueAxes: ValueAxis[]
  visibleValueAxisIds: Record<string, string[]>
  valuePoints: ValuePoint[]
  storyCore: StoryCoreFields
}

export const MORANDY_COLORS = [
  '#a8b5a2',
  '#b8a9c9',
  '#c9b8a8',
  '#a8bcc9',
  '#c9a8a8',
]

const VALUE_AXIS_COLORS = [
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#22d3ee',
  '#c084fc',
  '#f97316',
]

const ACT_LABELS = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '第六幕', '第七幕', '第八幕']

const STORAGE_KEY = 'story-studio-structure-v2'
const LEGACY_STORAGE_KEY = 'story-studio-structure'
const PROJECT_OWNER_ID = 'current-project'

let nextActNum = 1
let nextSeqNum = 1
let nextAxisNum = 1

function createEmptyStoryCore(): StoryCoreFields {
  return {
    premise: '',
    balanceBreak: '',
    consciousDesire: '',
    unconsciousDesire: '',
    controllingIdea: '',
    controllingIdeaReason: '',
    counterIdea: '',
    counterIdeaReason: '',
    coreValueAxisIds: [],
  }
}

function createEmptyActCore(): ActCoreFields {
  return {
    task: '',
    startState: '',
    endState: '',
    endingTest: '',
    synopsis: '',
  }
}

function createEmptyState(): StructureState {
  return {
    version: 2,
    acts: [],
    valueAxes: [],
    visibleValueAxisIds: {},
    valuePoints: [],
    storyCore: createEmptyStoryCore(),
  }
}

function normalizeStoryCore(value: unknown): StoryCoreFields {
  const empty = createEmptyStoryCore()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty

  const core = value as Partial<StoryCoreFields>
  return {
    premise: typeof core.premise === 'string' ? core.premise : '',
    balanceBreak: typeof core.balanceBreak === 'string' ? core.balanceBreak : '',
    consciousDesire: typeof core.consciousDesire === 'string' ? core.consciousDesire : '',
    unconsciousDesire: typeof core.unconsciousDesire === 'string' ? core.unconsciousDesire : '',
    controllingIdea: typeof core.controllingIdea === 'string' ? core.controllingIdea : '',
    controllingIdeaReason:
      typeof core.controllingIdeaReason === 'string' ? core.controllingIdeaReason : '',
    counterIdea: typeof core.counterIdea === 'string' ? core.counterIdea : '',
    counterIdeaReason: typeof core.counterIdeaReason === 'string' ? core.counterIdeaReason : '',
    coreValueAxisIds: Array.isArray(core.coreValueAxisIds)
      ? core.coreValueAxisIds.filter((id): id is string => typeof id === 'string').slice(0, 5)
      : [],
  }
}

function normalizeActCore(value: unknown): ActCoreFields {
  const empty = createEmptyActCore()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty

  const core = value as Partial<ActCoreFields>
  return {
    task: typeof core.task === 'string' ? core.task : '',
    startState: typeof core.startState === 'string' ? core.startState : '',
    endState: typeof core.endState === 'string' ? core.endState : '',
    endingTest: typeof core.endingTest === 'string' ? core.endingTest : '',
    synopsis: typeof core.synopsis === 'string' ? core.synopsis : '',
  }
}

function normalizeAct(value: unknown): StructureAct | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const act = value as Partial<StructureAct>
  if (typeof act.id !== 'string' || typeof act.label !== 'string') return null

  return {
    id: act.id,
    label: act.label,
    color: typeof act.color === 'string' ? act.color : MORANDY_COLORS[0],
    sequences: Array.isArray(act.sequences) ? act.sequences : [],
    core: normalizeActCore(act.core),
  }
}

function normalizeState(value: unknown): StructureState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyState()

  const state = value as Partial<StructureState>
  return {
    version: 2,
    acts: Array.isArray(state.acts) ? state.acts.map(normalizeAct).filter((act) => act !== null) : [],
    valueAxes: Array.isArray(state.valueAxes) ? state.valueAxes : [],
    visibleValueAxisIds:
      state.visibleValueAxisIds && typeof state.visibleValueAxisIds === 'object'
        ? state.visibleValueAxisIds
        : {},
    valuePoints: Array.isArray(state.valuePoints) ? state.valuePoints : [],
    storyCore: normalizeStoryCore(state.storyCore),
  }
}

function loadFromStorage(): StructureState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeState(JSON.parse(raw))

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw) return createEmptyState()

    const legacyActs = JSON.parse(legacyRaw)
    return {
      ...createEmptyState(),
      acts: Array.isArray(legacyActs) ? legacyActs : [],
    }
  } catch {
    return createEmptyState()
  }
}

function saveToStorage(state: StructureState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function restoreIdCounters(acts: StructureAct[], axes: ValueAxis[]) {
  for (const a of acts) {
    const n = parseInt(a.id.replace('act-', ''))
    if (!isNaN(n)) nextActNum = Math.max(nextActNum, n + 1)
    for (const s of a.sequences) {
      const sn = parseInt(s.id.replace('seq-', ''))
      if (!isNaN(sn)) nextSeqNum = Math.max(nextSeqNum, sn + 1)
    }
  }

  for (const axis of axes) {
    const axisNum = parseInt(axis.id.replace('axis-', ''))
    if (!isNaN(axisNum)) nextAxisNum = Math.max(nextAxisNum, axisNum + 1)
  }
}

function getOwnerKey(ownerType: StructureOwnerType, ownerId: string): string {
  return `${ownerType}:${ownerId}`
}

function clampValue(value: number): number {
  return Math.max(-100, Math.min(100, value))
}

function createDefaultAxis(
  ownerType: StructureOwnerType,
  ownerId: string,
  order: number,
): ValueAxis {
  return {
    id: `axis-${nextAxisNum++}`,
    ownerType,
    ownerId,
    positiveLabel: '价值',
    negativeLabel: '反价值',
    color: VALUE_AXIS_COLORS[order % VALUE_AXIS_COLORS.length],
    order,
  }
}

export const useStructureStore = defineStore('structure', () => {
  const initialState = loadFromStorage()
  restoreIdCounters(initialState.acts, initialState.valueAxes)

  const acts = ref<StructureAct[]>(initialState.acts)
  const valueAxes = ref<ValueAxis[]>(initialState.valueAxes)
  const visibleValueAxisIds = ref<Record<string, string[]>>(initialState.visibleValueAxisIds)
  const valuePoints = ref<ValuePoint[]>(initialState.valuePoints)
  const storyCore = ref<StoryCoreFields>(initialState.storyCore)

  function save() {
    saveToStorage({
      version: 2,
      acts: acts.value,
      valueAxes: valueAxes.value,
      visibleValueAxisIds: visibleValueAxisIds.value,
      valuePoints: valuePoints.value,
      storyCore: storyCore.value,
    })
  }

  const totalSequences = computed(() =>
    acts.value.reduce((sum, a) => sum + a.sequences.length, 0),
  )

  const flatSequences = computed(() =>
    acts.value.flatMap((a) =>
      a.sequences.map((s) => ({
        actId: a.id,
        actLabel: a.label,
        actColor: a.color,
        seqId: s.id,
        seqLabel: s.label,
        seqColor: s.color,
      })),
    ),
  )

  function addAct() {
    const idx = acts.value.length
    const act: StructureAct = {
      id: `act-${nextActNum++}`,
      label: ACT_LABELS[idx] ?? `第${idx + 1}幕`,
      color: MORANDY_COLORS[idx % MORANDY_COLORS.length],
      sequences: [
        {
          id: `seq-${nextSeqNum++}`,
          label: '序列 1',
          color: MORANDY_COLORS[(idx + 1) % MORANDY_COLORS.length],
        },
      ],
      core: createEmptyActCore(),
    }
    acts.value.push(act)
    save()
  }

  function removeAct(actId: string) {
    const seqIds = acts.value.find((a) => a.id === actId)?.sequences.map((s) => s.id) ?? []
    acts.value = acts.value.filter((a) => a.id !== actId)
    cleanupOwner('act', actId)
    for (const seqId of seqIds) cleanupOwner('sequence', seqId)
    removeValuePointsForTarget('act', actId)
    for (const seqId of seqIds) removeValuePointsForTarget('sequence', seqId)
    save()
  }

  function addSequence(actId: string) {
    const act = acts.value.find((a) => a.id === actId)
    if (!act) return
    const idx = act.sequences.length
    act.sequences.push({
      id: `seq-${nextSeqNum++}`,
      label: `序列 ${idx + 1}`,
      color: MORANDY_COLORS[idx % MORANDY_COLORS.length],
    })
    save()
  }

  function removeSequence(actId: string, seqId: string) {
    const act = acts.value.find((a) => a.id === actId)
    if (!act) return
    act.sequences = act.sequences.filter((s) => s.id !== seqId)
    cleanupOwner('sequence', seqId)
    removeValuePointsForTarget('sequence', seqId)
    save()
  }

  function updateActColor(actId: string, color: string) {
    const act = acts.value.find((a) => a.id === actId)
    if (act) {
      act.color = color
      save()
    }
  }

  function updateActLabel(actId: string, label: string) {
    const act = acts.value.find((a) => a.id === actId)
    if (act) {
      act.label = label
      save()
    }
  }

  function updateSequenceColor(actId: string, seqId: string, color: string) {
    const act = acts.value.find((a) => a.id === actId)
    const seq = act?.sequences.find((s) => s.id === seqId)
    if (seq) {
      seq.color = color
      save()
    }
  }

  function updateSequenceLabel(actId: string, seqId: string, label: string) {
    const act = acts.value.find((a) => a.id === actId)
    const seq = act?.sequences.find((s) => s.id === seqId)
    if (seq) {
      seq.label = label
      save()
    }
  }

  function updateActCoreField(actId: string, field: ActCoreTextField, value: string) {
    const act = acts.value.find((a) => a.id === actId)
    if (!act) return
    act.core[field] = value
    save()
  }

  function getValueAxesForOwner(ownerType: StructureOwnerType, ownerId: string): ValueAxis[] {
    return valueAxes.value
      .filter((axis) => axis.ownerType === ownerType && axis.ownerId === ownerId)
      .sort((a, b) => a.order - b.order)
  }

  function getVisibleAxisIds(ownerType: StructureOwnerType, ownerId: string): string[] {
    return visibleValueAxisIds.value[getOwnerKey(ownerType, ownerId)] ?? []
  }

  function addValueAxis(ownerType: StructureOwnerType, ownerId: string): ValueAxis {
    const order = getValueAxesForOwner(ownerType, ownerId).length
    const axis = createDefaultAxis(ownerType, ownerId, order)
    valueAxes.value.push(axis)
    toggleValueAxisVisible(ownerType, ownerId, axis.id, true)
    save()
    return axis
  }

  function updateValueAxis(axisId: string, patch: Partial<Omit<ValueAxis, 'id'>>) {
    const axis = valueAxes.value.find((item) => item.id === axisId)
    if (!axis) return
    Object.assign(axis, patch)
    save()
  }

  function removeValueAxis(axisId: string) {
    const axis = valueAxes.value.find((item) => item.id === axisId)
    if (!axis) return

    valueAxes.value = valueAxes.value.filter((item) => item.id !== axisId)
    valuePoints.value = valuePoints.value.filter((point) => point.axisId !== axisId)
    cleanupStoryCoreValueAxes()

    const key = getOwnerKey(axis.ownerType, axis.ownerId)
    visibleValueAxisIds.value[key] = (visibleValueAxisIds.value[key] ?? []).filter(
      (id) => id !== axisId,
    )
    normalizeAxisOrder(axis.ownerType, axis.ownerId)
    save()
  }

  function moveValueAxis(axisId: string, direction: 'up' | 'down') {
    const axis = valueAxes.value.find((item) => item.id === axisId)
    if (!axis) return

    const axes = getValueAxesForOwner(axis.ownerType, axis.ownerId)
    const index = axes.findIndex((item) => item.id === axisId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= axes.length) return

    const targetAxis = axes[targetIndex]
    const originalOrder = axis.order
    axis.order = targetAxis.order
    targetAxis.order = originalOrder
    normalizeAxisOrder(axis.ownerType, axis.ownerId)
    save()
  }

  function toggleValueAxisVisible(
    ownerType: StructureOwnerType,
    ownerId: string,
    axisId: string,
    force?: boolean,
  ) {
    const key = getOwnerKey(ownerType, ownerId)
    const current = visibleValueAxisIds.value[key] ?? []
    const exists = current.includes(axisId)
    const shouldShow = force ?? !exists

    visibleValueAxisIds.value[key] = shouldShow
      ? exists
        ? current
        : [...current, axisId]
      : current.filter((id) => id !== axisId)

    save()
  }

  function setValuePoint(
    axisId: string,
    targetType: StructureOwnerType,
    targetId: string,
    value: number,
  ) {
    const point = valuePoints.value.find(
      (item) => item.axisId === axisId && item.targetId === targetId,
    )

    if (point) {
      point.value = clampValue(value)
    } else {
      valuePoints.value.push({
        axisId,
        targetType,
        targetId,
        value: clampValue(value),
      })
    }
    save()
  }

  function getValuePoint(axisId: string, targetId: string): number {
    return valuePoints.value.find((point) => point.axisId === axisId && point.targetId === targetId)
      ?.value ?? 0
  }

  function updateStoryCoreField(field: StoryCoreTextField, value: string) {
    storyCore.value[field] = value
    save()
  }

  function getValidStoryCoreValueAxisIds() {
    const existingIds = new Set(valueAxes.value.map((axis) => axis.id))
    return storyCore.value.coreValueAxisIds.filter((id) => existingIds.has(id))
  }

  function addStoryCoreValueAxis(axisId: string) {
    const current = getValidStoryCoreValueAxisIds()
    if (current.includes(axisId) || current.length >= 5) return
    storyCore.value.coreValueAxisIds = [...current, axisId]
    save()
  }

  function removeStoryCoreValueAxis(axisId: string) {
    storyCore.value.coreValueAxisIds = getValidStoryCoreValueAxisIds().filter((id) => id !== axisId)
    save()
  }

  function setPrimaryStoryCoreValueAxis(axisId: string) {
    const current = getValidStoryCoreValueAxisIds()
    if (!current.includes(axisId)) return
    storyCore.value.coreValueAxisIds = [axisId, ...current.filter((id) => id !== axisId)]
    save()
  }

  function toggleStoryCoreValueAxis(axisId: string) {
    const current = getValidStoryCoreValueAxisIds()
    if (current.includes(axisId)) {
      removeStoryCoreValueAxis(axisId)
    } else {
      addStoryCoreValueAxis(axisId)
    }
  }

  function cleanupStoryCoreValueAxes() {
    const existingIds = new Set(valueAxes.value.map((axis) => axis.id))
    storyCore.value.coreValueAxisIds = storyCore.value.coreValueAxisIds.filter((id) => existingIds.has(id))
  }

  function cleanupOwner(ownerType: StructureOwnerType, ownerId: string) {
    const axesToRemove = getValueAxesForOwner(ownerType, ownerId).map((axis) => axis.id)
    valueAxes.value = valueAxes.value.filter((axis) => !axesToRemove.includes(axis.id))
    valuePoints.value = valuePoints.value.filter((point) => !axesToRemove.includes(point.axisId))
    delete visibleValueAxisIds.value[getOwnerKey(ownerType, ownerId)]
  }

  function removeValuePointsForTarget(targetType: StructureOwnerType, targetId: string) {
    valuePoints.value = valuePoints.value.filter(
      (point) => !(point.targetType === targetType && point.targetId === targetId),
    )
  }

  function normalizeAxisOrder(ownerType: StructureOwnerType, ownerId: string) {
    getValueAxesForOwner(ownerType, ownerId).forEach((axis, index) => {
      axis.order = index
    })
  }

  return {
    acts,
    valueAxes,
    visibleValueAxisIds,
    valuePoints,
    storyCore,
    totalSequences,
    flatSequences,
    addAct,
    removeAct,
    addSequence,
    removeSequence,
    updateActColor,
    updateActLabel,
    updateSequenceColor,
    updateSequenceLabel,
    updateActCoreField,
    getValueAxesForOwner,
    getVisibleAxisIds,
    addValueAxis,
    updateValueAxis,
    removeValueAxis,
    moveValueAxis,
    toggleValueAxisVisible,
    setValuePoint,
    getValuePoint,
    updateStoryCoreField,
    addStoryCoreValueAxis,
    removeStoryCoreValueAxis,
    setPrimaryStoryCoreValueAxis,
    toggleStoryCoreValueAxis,
  }
})

export { PROJECT_OWNER_ID, getOwnerKey }
