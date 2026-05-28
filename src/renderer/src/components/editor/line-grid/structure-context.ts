import type { LineGridSnapshot } from './types'

export interface StructureLineContext {
  actId: string
  seqId: string
}

export function resolveStructureAtLine(
  snapshot: LineGridSnapshot,
  lineIndex: number,
): StructureLineContext {
  let actId = ''
  let seqId = ''

  for (const marker of snapshot.markers) {
    if (marker.lineIndex > lineIndex) break

    if (marker.type === 'newAct') {
      actId = marker.actId
      seqId = ''
    } else if (marker.type === 'sequence') {
      seqId = marker.seqId
      if (marker.actId) actId = marker.actId
    }
  }

  return { actId, seqId }
}
