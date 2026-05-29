import { ipcMain } from 'electron'
import type {
  ProjectDocument,
  ProjectImportResult,
  ProjectLoadResult,
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
    async (_, document: ProjectDocument): Promise<ProjectSaveResult> => {
      try {
        const savedDocument = await repository.save(document)
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
    async (_, document: ProjectDocument): Promise<ProjectSaveResult> => {
      try {
        const savedDocument = await repository.saveAs(document)
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

  ipcMain.handle('project:import-json', async (): Promise<ProjectImportResult> => {
    try {
      const document = await repository.importJson()
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
}
