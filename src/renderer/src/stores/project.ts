import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'
import {
  createDefaultProjectDocument,
  type ProjectAssetItem,
  type ProjectDocument,
  type ProjectSaveResult
} from '../../../shared/project'
import { useBeatStore } from './beat'
import { useCharacterStore } from './character'
import { useCharacterCastUniverseStore } from './characterCastUniverse'
import { useCharacterRelationshipStore } from './characterRelationship'
import { useEditorBridge } from './editor-bridge'
import { useInspirationStore } from './inspiration'
import { useReminderStore } from './reminder'
import { useStructureStore } from './structure'
import { useWorldStore } from './world'

const SAVE_DEBOUNCE_MS = 500

export const useProjectStore = defineStore('project', () => {
  const hydrated = ref(false)
  const isHydrating = ref(false)
  const isSaving = ref(false)
  const lastSavedAt = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const projectPath = ref<string | null>(null)
  const assetsPath = ref<string | null>(null)
  const projectId = ref('default-project')
  const title = ref('未命名项目')
  const sceneDoc = ref<Record<string, unknown> | null>(null)
  const assets = ref<ProjectAssetItem[]>([])
  const hasUnsavedChanges = ref(false)

  const needsSaveLocation = computed(() => !projectPath.value)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveInFlight: Promise<void> | null = null
  let savePending = false

  async function hydrate(): Promise<void> {
    if (hydrated.value || isHydrating.value) return

    isHydrating.value = true
    try {
      const result = await window.api.project.load()
      const document = result.document
      if (!result.ok) lastError.value = result.error
      projectPath.value = result.projectPath ?? null
      assetsPath.value = result.assetsPath ?? null
      applyDocument(document)
      savePending = false
      hydrated.value = true
      hasUnsavedChanges.value = false
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '项目加载失败'
      applyDocument(createDefaultProjectDocument())
      savePending = false
      hydrated.value = true
      hasUnsavedChanges.value = false
    } finally {
      isHydrating.value = false
    }
  }

  function applyDocument(document: ProjectDocument): void {
    projectId.value = document.projectId
    title.value = document.title
    sceneDoc.value = document.editor.sceneDoc
    assets.value = [...document.assets.items]

    useStructureStore().hydrateFromProject(document.structure)
    useBeatStore().hydrateFromProject(document.beats)
    useCharacterStore().hydrateFromProject(document.characters)
    useCharacterRelationshipStore().hydrateFromProject(document.characterRelationships)
    useCharacterCastUniverseStore().hydrateFromProject(document.characterCastUniverse)
    useReminderStore().hydrateFromProject(document.reminders)
    useInspirationStore().hydrateFromProject(document.inspiration)
    useWorldStore().hydrateFromProject(document.world)
  }

  function cloneForIpc<T>(value: T): T {
    return JSON.parse(JSON.stringify(toRaw(value))) as T
  }

  function syncSceneDocFromEditor(): void {
    const editor = useEditorBridge().editor
    if (!editor) return
    sceneDoc.value = editor.getJSON()
  }

  function toProjectDocument(): ProjectDocument {
    syncSceneDocFromEditor()
    const now = new Date().toISOString()

    return cloneForIpc({
      schemaVersion: 1,
      projectId: projectId.value,
      title: title.value,
      updatedAt: lastSavedAt.value ?? now,
      editor: {
        sceneDoc: sceneDoc.value ?? createDefaultProjectDocument().editor.sceneDoc
      },
      structure: useStructureStore().toProjectData(),
      beats: useBeatStore().toProjectData(),
      inspiration: useInspirationStore().toProjectData(),
      world: useWorldStore().toProjectData(),
      characters: useCharacterStore().toProjectData(),
      characterRelationships: useCharacterRelationshipStore().toProjectData(),
      characterCastUniverse: useCharacterCastUniverseStore().toProjectData(),
      reminders: useReminderStore().toProjectData(),
      assets: {
        items: assets.value
      }
    })
  }

  function setSceneDoc(doc: Record<string, unknown>): void {
    sceneDoc.value = doc
    scheduleSave()
  }

  function scheduleSave(): void {
    if (isHydrating.value || !hydrated.value) return
    hasUnsavedChanges.value = true
    if (!projectPath.value) return
    savePending = true
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      void flushSave()
    }, SAVE_DEBOUNCE_MS)
  }

  async function saveNow(): Promise<void> {
    if (!projectPath.value) return saveAs()
    return flushSave()
  }

  async function saveAs(): Promise<void> {
    if (isHydrating.value || !hydrated.value) return
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await runSave(() => window.api.project.saveAs(toProjectDocument()))
  }

  async function importJson(): Promise<void> {
    if (isHydrating.value) return
    isHydrating.value = true
    try {
      const result = await window.api.project.importJson()
      if (!result.ok) {
        if (!result.canceled) lastError.value = result.error
        return
      }
      projectPath.value = result.projectPath
      assetsPath.value = result.assetsPath
      lastSavedAt.value = result.document.updatedAt
      applyDocument(result.document)
      savePending = false
      hasUnsavedChanges.value = false
      lastError.value = null
      hydrated.value = true
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '项目导入失败'
    } finally {
      isHydrating.value = false
    }
  }

  async function flushSave(): Promise<void> {
    if (isHydrating.value || !hydrated.value || !projectPath.value)
      return saveInFlight ?? Promise.resolve()
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (saveInFlight) {
      savePending = true
      return saveInFlight
    }

    savePending = false
    return runSave(() => window.api.project.save(toProjectDocument()))
  }

  async function runSave(saveRequest: () => Promise<ProjectSaveResult>): Promise<void> {
    if (saveInFlight) {
      savePending = true
      return saveInFlight
    }

    isSaving.value = true
    saveInFlight = saveRequest()
      .then((result) => {
        if (!result.ok) {
          savePending = false
          if (!result.canceled) lastError.value = result.error
          return
        }
        projectPath.value = result.projectPath
        assetsPath.value = result.assetsPath
        lastSavedAt.value = result.document.updatedAt
        hasUnsavedChanges.value = false
        lastError.value = null
      })
      .catch((error) => {
        savePending = false
        lastError.value = error instanceof Error ? error.message : '项目保存失败'
      })
      .finally(() => {
        isSaving.value = false
        saveInFlight = null
        if (savePending && projectPath.value) {
          void flushSave()
        }
      })

    return saveInFlight
  }

  return {
    hydrated,
    isHydrating,
    isSaving,
    lastSavedAt,
    lastError,
    projectPath,
    assetsPath,
    projectId,
    title,
    sceneDoc,
    assets,
    hasUnsavedChanges,
    needsSaveLocation,
    hydrate,
    scheduleSave,
    flushSave,
    saveNow,
    saveAs,
    importJson,
    setSceneDoc,
    syncSceneDocFromEditor,
    toProjectDocument
  }
})
