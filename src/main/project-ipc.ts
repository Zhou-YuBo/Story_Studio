import { BrowserWindow, ipcMain } from 'electron'
import type {
  ProjectDocument,
  ProjectImportResult,
  ProjectLoadResult,
  ProjectOpenFromPathResult,
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
}
