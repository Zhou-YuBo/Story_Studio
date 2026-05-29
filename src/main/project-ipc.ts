import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import type {
  ProjectDocument,
  ProjectImportFileResult,
  ProjectImportResult,
  ProjectLoadResult,
  ProjectOpenFromPathResult,
  ProjectReadAssetResult,
  ProjectSaveResult
} from '../shared/project'
import { createDefaultProjectDocument } from '../shared/project'
import type { FileProjectRepository } from './project-repository'

export function registerProjectIpc(repository: FileProjectRepository): void {
  ipcMain.handle('project:load', async (): Promise<ProjectLoadResult> => {
    try {
      const [document, info] = await Promise.all([repository.load(), repository.getInfo()])
      return { ok: true, document, projectPath: info.projectPath, assetsPath: info.assetsPath }
    } catch (error) {
      const info = await repository.getInfo().catch(() => undefined)
      return {
        ok: false,
        document: createDefaultProjectDocument(),
        projectPath: info?.projectPath,
        assetsPath: info?.assetsPath,
        error: error instanceof Error ? error.message : '项目加载失败'
      }
    }
  })

  ipcMain.handle(
    'project:save',
    async (event, document: ProjectDocument): Promise<ProjectSaveResult> => {
      try {
        const savedDocument = await repository.save(
          document,
          BrowserWindow.fromWebContents(event.sender)
        )
        if (!savedDocument) return { ok: false, canceled: true, error: '用户取消保存' }
        const info = await repository.getInfo()
        return {
          ok: true,
          document: savedDocument,
          projectPath: info.projectPath ?? '',
          assetsPath: info.assetsPath
        }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '项目保存失败' }
      }
    }
  )

  ipcMain.handle(
    'project:save-as',
    async (event, document: ProjectDocument): Promise<ProjectSaveResult> => {
      try {
        const savedDocument = await repository.saveAs(
          document,
          BrowserWindow.fromWebContents(event.sender)
        )
        if (!savedDocument) return { ok: false, canceled: true, error: '用户取消保存' }
        const info = await repository.getInfo()
        return {
          ok: true,
          document: savedDocument,
          projectPath: info.projectPath ?? '',
          assetsPath: info.assetsPath
        }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '项目另存失败' }
      }
    }
  )

  ipcMain.handle('project:import-json', async (event): Promise<ProjectImportResult> => {
    try {
      const document = await repository.importJson(BrowserWindow.fromWebContents(event.sender))
      if (!document) return { ok: false, canceled: true, error: '用户取消导入' }
      const info = await repository.getInfo()
      return {
        ok: true,
        document,
        projectPath: info.projectPath ?? '',
        assetsPath: info.assetsPath
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '项目导入失败' }
    }
  })

  ipcMain.handle(
    'project:import-paths',
    async (_, paths: string[]): Promise<ProjectImportFileResult> => {
      try {
        const assets = await Promise.all(paths.map((p) => repository.importAsset(p)))
        return { ok: true, assets }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '文件导入失败' }
      }
    }
  )

  ipcMain.handle('project:get-info', async () => repository.getInfo())

  ipcMain.handle(
    'project:open-from-path',
    async (_, filePath: string): Promise<ProjectOpenFromPathResult> => {
      try {
        const document = await repository.loadFromPath(filePath)
        const info = await repository.getInfo()
        return {
          ok: true,
          document,
          projectPath: info.projectPath ?? filePath,
          assetsPath: info.assetsPath
        }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '项目打开失败' }
      }
    }
  )

  ipcMain.handle('project:import-file', async (event): Promise<ProjectImportFileResult> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        title: '导入素材文件',
        filters: [
          { name: '所有支持的格式', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'pdf', 'txt', 'md', 'csv', 'json'] },
          { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] },
          { name: '音频', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: '文本', extensions: ['txt', 'md', 'csv', 'json'] }
        ],
        properties: ['openFile', 'multiSelections']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true, error: '用户取消选择' }
      }

      const assets = await Promise.all(
        result.filePaths.map((filePath) => repository.importAsset(filePath))
      )
      return { ok: true, assets }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '文件导入失败' }
    }
  })

  ipcMain.handle(
    'project:read-asset-file',
    async (_, relativePath: string): Promise<ProjectReadAssetResult> => {
      try {
        const absolutePath = repository.getAssetAbsolutePath(relativePath)
        const content = await readFile(absolutePath, 'utf-8')
        return { ok: true, content }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : '文件读取失败'
        }
      }
    }
  )
}
