import { watch, type ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useStructureStore, type StructureAct } from '../stores/structure'
import type { Node as PmNode } from '@tiptap/pm/model'

const LINES_PER_PAGE = 54
const PADDING_ACTIONS = 25

interface MarkerInfo {
  type: 'newAct' | 'endOfAct' | 'sequence'
  actId: string
  seqId: string
  pos: number
  nodeSize: number
}

function scanMarkers(doc: PmNode): MarkerInfo[] {
  const markers: MarkerInfo[] = []
  doc.forEach((node, offset) => {
    const t = node.type.name
    if (t === 'newAct' || t === 'endOfAct' || t === 'sequence') {
      markers.push({
        type: t as MarkerInfo['type'],
        actId: node.attrs.actId || '',
        seqId: node.attrs.seqId || '',
        pos: offset,
        nodeSize: node.nodeSize,
      })
    }
  })
  return markers
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
    const json = buildDocJson(structureStore.acts)
    editor.commands.setContent(json)
    isSyncing = false
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

        const insertPos = tr.doc.content.size
        for (const node of nodes) {
          tr.insert(insertPos, node)
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

    editor.view.dispatch(tr)
    isSyncing = false
  }

  function syncLabels(editor: Editor, markers: MarkerInfo[]) {
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
      editor.view.dispatch(tr)
      isSyncing = false
    }
  }

  watch(
    () => structureStore.acts,
    () => {
      const editor = editorRef.value
      if (!editor || isSyncing) return

      if (!hasStructureMarkers(editor.state.doc)) {
        fullFill(editor)
      } else {
        incrementalSync(editor)
      }
    },
    { deep: true },
  )

  watch(
    editorRef,
    (editor) => {
      if (!editor || structureStore.acts.length === 0) return
      if (!hasStructureMarkers(editor.state.doc)) {
        fullFill(editor)
      }
    },
    { immediate: true },
  )
}
