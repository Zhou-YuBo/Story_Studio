import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppApi, ProjectDocument } from '../shared/project'

// Custom APIs for renderer
const api: AppApi = {
  project: {
    load: () => ipcRenderer.invoke('project:load'),
    save: (document: ProjectDocument) => ipcRenderer.invoke('project:save', document),
    saveAs: (document: ProjectDocument) => ipcRenderer.invoke('project:save-as', document),
    importJson: () => ipcRenderer.invoke('project:import-json'),
    getInfo: () => ipcRenderer.invoke('project:get-info'),
    openFromPath: (filePath: string) => ipcRenderer.invoke('project:open-from-path', filePath),
    importFile: () => ipcRenderer.invoke('project:import-file'),
    importPaths: (paths: string[]) => ipcRenderer.invoke('project:import-paths', paths),
    readAssetFile: (relativePath: string) => ipcRenderer.invoke('project:read-asset-file', relativePath)
  },
  recent: {
    get: () => ipcRenderer.invoke('recent:get'),
    add: (projectPath: string, title: string) => ipcRenderer.invoke('recent:add', projectPath, title),
    remove: (projectPath: string) => ipcRenderer.invoke('recent:remove', projectPath)
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
