import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppApi,
  ProjectDocument,
  ProjectExportPdfOptions,
  ProjectExportProofOptions
} from '../shared/project'

function assertNonEmptyString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(message)
  }
}

function assertStringArray(value: unknown, message: string): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string' && item.trim() !== '')
  ) {
    throw new TypeError(message)
  }
}

function assertExportProofOptions(
  value: unknown,
  message: string
): asserts value is ProjectExportProofOptions {
  if (typeof value !== 'object' || value === null || !('document' in value)) {
    throw new TypeError(message)
  }
}

// Custom APIs for renderer
const api: AppApi = {
  project: {
    load: () => ipcRenderer.invoke('project:load'),
    save: (document: ProjectDocument) => ipcRenderer.invoke('project:save', document),
    saveAs: (document: ProjectDocument) => ipcRenderer.invoke('project:save-as', document),
    importJson: () => ipcRenderer.invoke('project:import-json'),
    getInfo: () => ipcRenderer.invoke('project:get-info'),
    openFromPath: (filePath: string) => {
      assertNonEmptyString(filePath, 'filePath must be a non-empty string')
      return ipcRenderer.invoke('project:open-from-path', filePath)
    },
    importFile: () => ipcRenderer.invoke('project:import-file'),
    importPaths: (paths: string[]) => {
      assertStringArray(paths, 'paths must be a non-empty string array')
      return ipcRenderer.invoke('project:import-paths', paths)
    },
    readAssetFile: (relativePath: string) => {
      assertNonEmptyString(relativePath, 'relativePath must be a non-empty string')
      return ipcRenderer.invoke('project:read-asset-file', relativePath)
    },
    exportPdf: (options?: ProjectExportPdfOptions) =>
      ipcRenderer.invoke('project:export-pdf', options),
    exportProof: (options: ProjectExportProofOptions) => {
      assertExportProofOptions(options, 'options.document must be provided')
      return ipcRenderer.invoke('project:export-proof', options)
    },
    verifyProof: () => ipcRenderer.invoke('project:verify-proof')
  },
  recent: {
    get: () => ipcRenderer.invoke('recent:get'),
    add: (projectPath: string, title: string) => {
      assertNonEmptyString(projectPath, 'projectPath must be a non-empty string')
      assertNonEmptyString(title, 'title must be a non-empty string')
      return ipcRenderer.invoke('recent:add', projectPath, title)
    },
    remove: (projectPath: string) => {
      assertNonEmptyString(projectPath, 'projectPath must be a non-empty string')
      return ipcRenderer.invoke('recent:remove', projectPath)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
