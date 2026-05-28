import { watch, type ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Node as PmNode } from '@tiptap/pm/model'
import { buildLineGrid } from '../components/editor/line-grid/build-line-grid'
import { LINE_GRID_CONFIG } from '../components/editor/line-grid/constants'
import { extractScreenplayBlocks } from '../components/editor/line-grid/extract-blocks'
import type { MarkerLineRange } from '../components/editor/line-grid/types'
import { useStructureStore, type StructureAct } from '../stores/structure'

const PADDING_ACTIONS = 25

function scanMarkers(doc: PmNode): MarkerLineRange[] {
  return buildLineGrid(extractScreenplayBlocks(doc), LINE_GRID_CONFIG).markers
}

function buildDocJson(acts: StructureAct[]) {
  const content: any[] = []

  for (const act of acts) {
    content.push({
      type: 'newAct',
      attrs: { actId: act.id },
      content: [{ type: 'text', text: act.label }],
    })

    for (let si = 0; si < act.sequences.length; si++) {
      const seq = act.sequences[si]
      content.push({
        type: 'sequence',
        attrs: { actId: act.id, seqId: seq.id },
        content: [{ type: 'text', text: seq.label }],
      })
      for (let i = 0; i < PADDING_ACTIONS; i++) {
        content.push({ type: 'action' })
      }
    }

    content.push({
      type: 'endOfAct',
      attrs: { actId: act.id },
      content: [{ type: 'text', text: act.label + ' 终' }],
    })
  }

  if (content.length === 0) {
    content.push({ type: 'sceneHeading' })
  }

  return { type: 'doc', content }
}

function hasStructureMarkers(doc: PmNode): boolean {
  return scanMarkers(doc).length > 0
}

export function useStructureSync(editorRef: ShallowRef<Editor | undefined>) {
  const structureStore = useStructureStore()
  let isSyncing = false

  function fullFill(editor: Editor) {
    if (structureStore.acts.length === 0) return
    isSyncing = true
    try {
      const json = buildDocJson(structureStore.acts)
      editor.commands.setContent(json)
    } finally {
      isSyncing = false
    }
  }

  function syncStructureToEditor(editor: Editor) {
    if (structureStore.acts.length === 0) return

    if (!hasStructureMarkers(editor.state.doc)) {
      fullFill(editor)
    } else {
      incrementalSync(editor)
    }
  }

  function incrementalSync(editor: Editor) {
    const doc = editor.state.doc
    const markers = scanMarkers(doc)
    const existingActIds = new Set(
      markers.filter((m) => m.type === 'newAct').map((m) => m.actId),
    )
    const existingSeqIds = new Set(
      markers.filter((m) => m.type === 'sequence').map((m) => m.seqId),
    )

    const storeActIds = new Set(structureStore.acts.map((a) => a.id))
    const storeSeqIds = new Set(
      structureStore.acts.flatMap((a) => a.sequences.map((s) => s.id)),
    )

    const actsToRemove = [...existingActIds].filter((id) => !storeActIds.has(id))
    const seqsToRemove = [...existingSeqIds].filter((id) => !storeSeqIds.has(id))
    const actsToAdd = structureStore.acts.filter((a) => !existingActIds.has(a.id))
    const seqsToAdd: { act: StructureAct; seqId: string; seqLabel: string }[] = []

    for (const act of structureStore.acts) {
      if (existingActIds.has(act.id)) {
        for (const seq of act.sequences) {
          if (!existingSeqIds.has(seq.id)) {
            seqsToAdd.push({ act, seqId: seq.id, seqLabel: seq.label })
          }
        }
      }
    }

    if (
      actsToRemove.length === 0 &&
      seqsToRemove.length === 0 &&
      actsToAdd.length === 0 &&
      seqsToAdd.length === 0
    ) {
      syncLabels(editor, markers)
      return
    }

    isSyncing = true
    const tr = editor.state.tr

    const removals: { from: number; to: number }[] = []
    for (const marker of markers) {
      if (marker.type === 'newAct' && actsToRemove.includes(marker.actId)) {
        removals.push({ from: marker.pos, to: marker.pos + marker.nodeSize })
      }
      if (marker.type === 'endOfAct' && actsToRemove.includes(marker.actId)) {
        removals.push({ from: marker.pos, to: marker.pos + marker.nodeSize })
      }
      if (marker.type === 'sequence' && seqsToRemove.includes(marker.seqId)) {
        removals.push({ from: marker.pos, to: marker.pos + marker.nodeSize })
      }
    }

    removals.sort((a, b) => b.from - a.from)
    for (const r of removals) {
      tr.delete(r.from, r.to)
    }

    if (actsToAdd.length > 0) {
      const schema = editor.state.schema
      for (const act of actsToAdd) {
        const nodes: PmNode[] = []
        nodes.push(
          schema.nodes.newAct.create(
            { actId: act.id },
            act.label ? schema.text(act.label) : undefined,
          ),
        )
        for (const seq of act.sequences) {
          nodes.push(
            schema.nodes.sequence.create(
              { actId: act.id, seqId: seq.id },
              seq.label ? schema.text(seq.label) : undefined,
            ),
          )
          for (let i = 0; i < PADDING_ACTIONS; i++) {
            nodes.push(schema.nodes.action.create())
          }
        }
        nodes.push(
          schema.nodes.endOfAct.create(
            { actId: act.id },
            schema.text(act.label + ' 终'),
          ),
        )

        let insertPos = tr.doc.content.size
        for (const node of nodes) {
          tr.insert(insertPos, node)
          insertPos += node.nodeSize
        }
      }
    }

    if (seqsToAdd.length > 0) {
      const schema = editor.state.schema
      for (const { act, seqId, seqLabel } of seqsToAdd) {
        const freshMarkers = scanMarkers(tr.doc)
        const endOfAct = freshMarkers.find(
          (m) => m.type === 'endOfAct' && m.actId === act.id,
        )
        if (endOfAct) {
          const nodes: PmNode[] = []
          nodes.push(
            schema.nodes.sequence.create(
              { actId: act.id, seqId },
              seqLabel ? schema.text(seqLabel) : undefined,
            ),
          )
          for (let i = 0; i < PADDING_ACTIONS; i++) {
            nodes.push(schema.nodes.action.create())
          }
          for (let ni = nodes.length - 1; ni >= 0; ni--) {
            tr.insert(endOfAct.pos, nodes[ni])
          }
        }
      }
    }

    try {
      editor.view.dispatch(tr)
    } finally {
      isSyncing = false
    }
  }

  function syncLabels(editor: Editor, markers: MarkerLineRange[]) {
    const doc = editor.state.doc
    let changed = false
    const tr = editor.state.tr

    for (const marker of markers) {
      if (marker.type === 'newAct') {
        const act = structureStore.acts.find((a) => a.id === marker.actId)
        if (act) {
          const node = doc.nodeAt(marker.pos)
          if (node && node.textContent !== act.label) {
            tr.replaceWith(
              marker.pos + 1,
              marker.pos + marker.nodeSize - 1,
              act.label ? editor.state.schema.text(act.label) : [],
            )
            changed = true
          }
        }
      }
      if (marker.type === 'endOfAct') {
        const act = structureStore.acts.find((a) => a.id === marker.actId)
        if (act) {
          const expected = act.label + ' 终'
          const node = doc.nodeAt(marker.pos)
          if (node && node.textContent !== expected) {
            tr.replaceWith(
              marker.pos + 1,
              marker.pos + marker.nodeSize - 1,
              editor.state.schema.text(expected),
            )
            changed = true
          }
        }
      }
      if (marker.type === 'sequence') {
        const act = structureStore.acts.find((a) => a.id === marker.actId)
        const seq = act?.sequences.find((s) => s.id === marker.seqId)
        if (seq) {
          const node = doc.nodeAt(marker.pos)
          if (node && node.textContent !== seq.label) {
            tr.replaceWith(
              marker.pos + 1,
              marker.pos + marker.nodeSize - 1,
              seq.label ? editor.state.schema.text(seq.label) : [],
            )
            changed = true
          }
        }
      }
    }

    if (changed) {
      isSyncing = true
      try {
        editor.view.dispatch(tr)
      } finally {
        isSyncing = false
      }
    }
  }

  watch(
    () => structureStore.acts,
    () => {
      const editor = editorRef.value
      if (!editor || isSyncing) return
      syncStructureToEditor(editor)
    },
    { deep: true },
  )

  watch(
    editorRef,
    (editor) => {
      if (!editor || isSyncing) return
      syncStructureToEditor(editor)
    },
    { immediate: true },
  )
}
