import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
}

export const MORANDY_COLORS = [
  '#a8b5a2',
  '#b8a9c9',
  '#c9b8a8',
  '#a8bcc9',
  '#c9a8a8',
]

const ACT_LABELS = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '第六幕', '第七幕', '第八幕']

const STORAGE_KEY = 'story-studio-structure'

let nextActNum = 1
let nextSeqNum = 1

function loadFromStorage(): StructureAct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveToStorage(acts: StructureAct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acts))
}

function restoreIdCounters(acts: StructureAct[]) {
  for (const a of acts) {
    const n = parseInt(a.id.replace('act-', ''))
    if (!isNaN(n)) nextActNum = Math.max(nextActNum, n + 1)
    for (const s of a.sequences) {
      const sn = parseInt(s.id.replace('seq-', ''))
      if (!isNaN(sn)) nextSeqNum = Math.max(nextSeqNum, sn + 1)
    }
  }
}

export const useStructureStore = defineStore('structure', () => {
  const acts = ref<StructureAct[]>(loadFromStorage())
  restoreIdCounters(acts.value)

  function save() {
    saveToStorage(acts.value)
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
    }
    acts.value.push(act)
    save()
  }

  function removeAct(actId: string) {
    acts.value = acts.value.filter((a) => a.id !== actId)
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

  return {
    acts,
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
  }
})
