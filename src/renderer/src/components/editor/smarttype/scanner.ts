import type { Node as PmNode } from '@tiptap/pm/model'

let cachedDoc: PmNode | null = null
let cachedCharacters: string[] = []
let cachedLocations: string[] = []

function invalidateCache(doc: PmNode) {
  cachedDoc = doc
  cachedCharacters = doScanCharacterNames(doc)
  cachedLocations = doScanLocationNames(doc)
}

function doScanCharacterNames(doc: PmNode): string[] {
  const names = new Set<string>()
  doc.forEach((node) => {
    if (node.type.name === 'character' && node.textContent.trim()) {
      names.add(node.textContent.trim().toUpperCase())
    }
  })
  return [...names].sort()
}

function doScanLocationNames(doc: PmNode): string[] {
  const locations = new Set<string>()
  const re = /^(?:INT\.|EXT\.|I\/E\.)\s+(.+?)(?:\s+-\s+.*)?$/i
  doc.forEach((node) => {
    if (node.type.name === 'sceneHeading' && node.textContent.trim()) {
      const match = node.textContent.trim().match(re)
      if (match && match[1]) {
        locations.add(match[1].trim().toUpperCase())
      }
    }
  })
  return [...locations].sort()
}

export function scanCharacterNames(doc: PmNode): string[] {
  if (doc !== cachedDoc) invalidateCache(doc)
  return cachedCharacters
}

export function scanLocationNames(doc: PmNode): string[] {
  if (doc !== cachedDoc) invalidateCache(doc)
  return cachedLocations
}
