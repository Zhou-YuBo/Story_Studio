import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  getWorkbenchById,
  getWorkbenchIdFromPath,
  isWorkbenchId,
  type WorkbenchId
} from '../config/workbenches'

export type SplashVariant = 'structure-big' | 'noir' | 'paper' | 'console' | 'soft'

interface StoredPreferences {
  schemaVersion: 1
  splashVariant: SplashVariant
  defaultWorkbenchId: WorkbenchId
  rememberLastWorkbench: boolean
  lastWorkbenchId: WorkbenchId | null
}

const STORAGE_KEY = 'story-studio:preferences:v1'
const SPLASH_VARIANTS: SplashVariant[] = ['structure-big', 'noir', 'paper', 'console', 'soft']

const DEFAULT_PREFERENCES: StoredPreferences = {
  schemaVersion: 1,
  splashVariant: 'structure-big',
  defaultWorkbenchId: 'inspiration',
  rememberLastWorkbench: true,
  lastWorkbenchId: null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSplashVariant(value: unknown): value is SplashVariant {
  return typeof value === 'string' && SPLASH_VARIANTS.includes(value as SplashVariant)
}

function normalizePreferences(value: unknown): StoredPreferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES }

  return {
    schemaVersion: 1,
    splashVariant: isSplashVariant(value.splashVariant)
      ? value.splashVariant
      : DEFAULT_PREFERENCES.splashVariant,
    defaultWorkbenchId: isWorkbenchId(value.defaultWorkbenchId)
      ? value.defaultWorkbenchId
      : DEFAULT_PREFERENCES.defaultWorkbenchId,
    rememberLastWorkbench:
      typeof value.rememberLastWorkbench === 'boolean'
        ? value.rememberLastWorkbench
        : DEFAULT_PREFERENCES.rememberLastWorkbench,
    lastWorkbenchId:
      value.lastWorkbenchId === null || isWorkbenchId(value.lastWorkbenchId)
        ? value.lastWorkbenchId
        : DEFAULT_PREFERENCES.lastWorkbenchId
  }
}

function loadPreferences(): StoredPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    return normalizePreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<StoredPreferences>(loadPreferences())

  const splashVariant = computed(() => preferences.value.splashVariant)
  const defaultWorkbenchId = computed(() => preferences.value.defaultWorkbenchId)
  const rememberLastWorkbench = computed(() => preferences.value.rememberLastWorkbench)
  const lastWorkbenchId = computed(() => preferences.value.lastWorkbenchId)
  const entryWorkbenchPath = computed(() => {
    const remembered = preferences.value.rememberLastWorkbench
      ? getWorkbenchById(preferences.value.lastWorkbenchId)
      : null
    return (remembered ?? getWorkbenchById(preferences.value.defaultWorkbenchId))?.path ?? '/'
  })

  watch(
    preferences,
    (value) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true }
  )

  function setSplashVariant(variant: SplashVariant): void {
    preferences.value.splashVariant = variant
  }

  function setDefaultWorkbench(id: WorkbenchId): void {
    preferences.value.defaultWorkbenchId = id
  }

  function setRememberLastWorkbench(value: boolean): void {
    preferences.value.rememberLastWorkbench = value
  }

  function recordWorkbenchFromPath(path: string): void {
    const id = getWorkbenchIdFromPath(path)
    if (id) preferences.value.lastWorkbenchId = id
  }

  return {
    splashVariant,
    defaultWorkbenchId,
    rememberLastWorkbench,
    lastWorkbenchId,
    entryWorkbenchPath,
    setSplashVariant,
    setDefaultWorkbench,
    setRememberLastWorkbench,
    recordWorkbenchFromPath
  }
})
