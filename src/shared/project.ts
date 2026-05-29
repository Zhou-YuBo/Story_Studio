export interface ProjectAssetItem {
  id: string
  relativePath: string
  originalName?: string
  mimeType?: string
  createdAt: string
}

export interface ProjectEditorData {
  sceneDoc: Record<string, unknown>
}

export interface StructureProjectData {
  version: 2
  acts: unknown[]
  valueAxes: unknown[]
  visibleValueAxisIds: Record<string, unknown>
  valuePoints: unknown[]
  storyCore: unknown
}

export interface BeatProjectData {
  version: 1
  cards: unknown[]
}

export interface InspirationProjectData {
  items: unknown[]
  notes: unknown[]
  canvases: unknown[]
}

export interface WorldProjectData {
  categories: unknown[]
  objects: unknown[]
  canvases: unknown[]
}

export interface CharacterProjectData {
  characters: unknown[]
}

export interface CharacterRelationshipProjectData {
  relationships: unknown[]
}

export interface CharacterCastUniverseProjectData {
  board: unknown | null
}

export interface ReminderProjectData {
  version: 1
  categories: unknown[]
  notes: unknown[]
}

export interface ProjectDocument {
  schemaVersion: 1
  projectId: string
  title: string
  updatedAt: string
  editor: ProjectEditorData
  structure: StructureProjectData
  beats: BeatProjectData
  inspiration: InspirationProjectData
  world: WorldProjectData
  characters: CharacterProjectData
  characterRelationships: CharacterRelationshipProjectData
  characterCastUniverse: CharacterCastUniverseProjectData
  reminders: ReminderProjectData
  assets: {
    items: ProjectAssetItem[]
  }
}

export interface ProjectInfo {
  projectPath: string | null
  assetsPath: string | null
}

export type ProjectLoadResult =
  | { ok: true; document: ProjectDocument; projectPath: string | null; assetsPath: string | null }
  | {
      ok: false
      document: ProjectDocument
      projectPath?: string | null
      assetsPath?: string | null
      error: string
    }

export type ProjectSaveResult =
  | { ok: true; document: ProjectDocument; projectPath: string; assetsPath: string | null }
  | { ok: false; canceled?: boolean; error: string }

export type ProjectImportResult =
  | { ok: true; document: ProjectDocument; projectPath: string; assetsPath: string | null }
  | { ok: false; canceled?: boolean; error: string }

export interface ProjectApi {
  load(): Promise<ProjectLoadResult>
  save(document: ProjectDocument): Promise<ProjectSaveResult>
  saveAs(document: ProjectDocument): Promise<ProjectSaveResult>
  importJson(): Promise<ProjectImportResult>
  getInfo(): Promise<ProjectInfo>
  openFromPath(filePath: string): Promise<ProjectOpenFromPathResult>
}

export interface AppApi {
  project: ProjectApi
  recent: RecentApi
}

export interface RecentProjectEntry {
  projectPath: string
  title: string
  lastOpenedAt: string
}

export interface RecentApi {
  get(): Promise<RecentProjectEntry[]>
  add(projectPath: string, title: string): Promise<void>
  remove(projectPath: string): Promise<void>
}

export type ProjectOpenFromPathResult =
  | { ok: true; document: ProjectDocument; projectPath: string; assetsPath: string | null }
  | { ok: false; error: string }

const DEFAULT_SCENE_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'sceneHeading' }]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizeAssets(value: unknown): { items: ProjectAssetItem[] } {
  const assets = recordOrEmpty(value)
  const items = arrayOrEmpty(assets.items).filter((item): item is ProjectAssetItem => {
    if (!isRecord(item)) return false
    return (
      typeof item.id === 'string' &&
      typeof item.relativePath === 'string' &&
      typeof item.createdAt === 'string'
    )
  })
  return { items }
}

export function createDefaultProjectDocument(): ProjectDocument {
  const now = new Date().toISOString()

  return {
    schemaVersion: 1,
    projectId: 'default-project',
    title: '未命名项目',
    updatedAt: now,
    editor: {
      sceneDoc: DEFAULT_SCENE_DOC
    },
    structure: {
      version: 2,
      acts: [],
      valueAxes: [],
      visibleValueAxisIds: {},
      valuePoints: [],
      storyCore: {}
    },
    beats: {
      version: 1,
      cards: []
    },
    inspiration: {
      items: [],
      notes: [],
      canvases: []
    },
    world: {
      categories: [],
      objects: [],
      canvases: []
    },
    characters: {
      characters: []
    },
    characterRelationships: {
      relationships: []
    },
    characterCastUniverse: {
      board: null
    },
    reminders: {
      version: 1,
      categories: [],
      notes: []
    },
    assets: {
      items: []
    }
  }
}

export function normalizeProjectDocument(value: unknown): ProjectDocument {
  const defaults = createDefaultProjectDocument()
  if (!isRecord(value)) return defaults

  const editor = recordOrEmpty(value.editor)
  const structure = recordOrEmpty(value.structure)
  const beats = recordOrEmpty(value.beats)
  const inspiration = recordOrEmpty(value.inspiration)
  const world = recordOrEmpty(value.world)
  const characters = recordOrEmpty(value.characters)
  const characterRelationships = recordOrEmpty(value.characterRelationships)
  const characterCastUniverse = recordOrEmpty(value.characterCastUniverse)
  const reminders = recordOrEmpty(value.reminders)

  return {
    schemaVersion: 1,
    projectId: typeof value.projectId === 'string' ? value.projectId : defaults.projectId,
    title: typeof value.title === 'string' ? value.title : defaults.title,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : defaults.updatedAt,
    editor: {
      sceneDoc: isRecord(editor.sceneDoc) ? editor.sceneDoc : defaults.editor.sceneDoc
    },
    structure: {
      version: 2,
      acts: arrayOrEmpty(structure.acts),
      valueAxes: arrayOrEmpty(structure.valueAxes),
      visibleValueAxisIds: recordOrEmpty(structure.visibleValueAxisIds),
      valuePoints: arrayOrEmpty(structure.valuePoints),
      storyCore: structure.storyCore ?? {}
    },
    beats: {
      version: 1,
      cards: arrayOrEmpty(beats.cards)
    },
    inspiration: {
      items: arrayOrEmpty(inspiration.items),
      notes: arrayOrEmpty(inspiration.notes),
      canvases: arrayOrEmpty(inspiration.canvases)
    },
    world: {
      categories: arrayOrEmpty(world.categories),
      objects: arrayOrEmpty(world.objects),
      canvases: arrayOrEmpty(world.canvases)
    },
    characters: {
      characters: arrayOrEmpty(characters.characters)
    },
    characterRelationships: {
      relationships: arrayOrEmpty(characterRelationships.relationships)
    },
    characterCastUniverse: {
      board: characterCastUniverse.board ?? null
    },
    reminders: {
      version: 1,
      categories: arrayOrEmpty(reminders.categories),
      notes: arrayOrEmpty(reminders.notes)
    },
    assets: normalizeAssets(value.assets)
  }
}
