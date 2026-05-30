import { BrowserWindow, app, dialog, ipcMain } from 'electron'
import { readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  ProjectDocument,
  ProjectExportPdfOptions,
  ProjectExportPdfResult,
  ProjectExportProofOptions,
  ProjectExportProofResult,
  ProjectImportFileResult,
  ProjectImportResult,
  ProjectLoadResult,
  ProjectOpenFromPathResult,
  ProjectReadAssetResult,
  ProjectSaveResult,
  ProjectVerifyProofResult
} from '../shared/project'
import { createDefaultProjectDocument, normalizeProjectDocument } from '../shared/project'
import {
  buildProjectProofManifest,
  safeProofFileName,
  verifyProjectProofManifest
} from './project-proof-export'
import type { FileProjectRepository } from './project-repository'

const MAX_IMPORT_PATHS = 100

function safePdfFileName(title: string | undefined): string {
  const name = title?.trim() || 'Story Studio'
  return `${name
    .split('')
    .map((char) => (/[<>:"/\\|?*]/.test(char) || char.charCodeAt(0) < 32 ? '_' : char))
    .join('')}.pdf`
}

function assertNonEmptyString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message)
  }
}

function assertPathList(value: unknown): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new Error('请选择有效的素材文件')
  }

  if (value.length > MAX_IMPORT_PATHS) {
    throw new Error(`一次最多导入 ${MAX_IMPORT_PATHS} 个素材文件`)
  }

  if (!value.every((path) => typeof path === 'string' && path.trim() !== '')) {
    throw new Error('请选择有效的素材文件')
  }
}

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
    async (_, paths: unknown): Promise<ProjectImportFileResult> => {
      try {
        assertPathList(paths)
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
    async (_, filePath: unknown): Promise<ProjectOpenFromPathResult> => {
      try {
        assertNonEmptyString(filePath, '请选择有效的项目文件')
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
          {
            name: '所有支持的格式',
            extensions: [
              'jpg',
              'jpeg',
              'png',
              'gif',
              'webp',
              'svg',
              'bmp',
              'mp3',
              'wav',
              'ogg',
              'flac',
              'aac',
              'm4a',
              'pdf',
              'txt',
              'md',
              'csv',
              'json'
            ]
          },
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
    async (_, relativePath: unknown): Promise<ProjectReadAssetResult> => {
      try {
        assertNonEmptyString(relativePath, '请选择有效的素材文件')
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

  ipcMain.handle(
    'project:export-pdf',
    async (event, options?: ProjectExportPdfOptions): Promise<ProjectExportPdfResult> => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) return { ok: false, error: '导出窗口不可用' }

        const result = await dialog.showSaveDialog(win, {
          title: '导出 PDF',
          defaultPath: safePdfFileName(options?.title),
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        })

        if (result.canceled || !result.filePath) {
          return { ok: false, canceled: true, error: '用户取消导出' }
        }

        const data = await win.webContents.printToPDF({
          printBackground: true,
          preferCSSPageSize: true,
          pageSize: 'Letter'
        })
        const tempPath = join(dirname(result.filePath), `.${Date.now()}.tmp.pdf`)
        await writeFile(tempPath, data)
        await rename(tempPath, result.filePath)
        return { ok: true, filePath: result.filePath }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'PDF 导出失败' }
      }
    }
  )

  ipcMain.handle(
    'project:export-proof',
    async (event, options: ProjectExportProofOptions): Promise<ProjectExportProofResult> => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) return { ok: false, error: '导出窗口不可用' }

        const document = normalizeProjectDocument(options?.document)
        const result = await dialog.showSaveDialog(win, {
          title: '导出本地创作证明',
          defaultPath: safeProofFileName(document.title),
          filters: [{ name: 'Story Studio 创作证明', extensions: ['json'] }]
        })

        if (result.canceled || !result.filePath) {
          return { ok: false, canceled: true, error: '用户取消导出' }
        }

        const proof = await buildProjectProofManifest(document, repository, app.getVersion())
        const tempPath = join(dirname(result.filePath), `.${Date.now()}.tmp.story-proof.json`)
        await writeFile(tempPath, proof.serializedManifest, 'utf8')
        await rename(tempPath, result.filePath)

        return {
          ok: true,
          filePath: result.filePath,
          projectDocumentSha256: proof.projectDocumentSha256,
          proofPayloadSha256: proof.proofPayloadSha256,
          warnings: proof.manifest.warnings
        }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '创作证明导出失败' }
      }
    }
  )

  ipcMain.handle('project:verify-proof', async (event): Promise<ProjectVerifyProofResult> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { ok: false, error: '验证窗口不可用' }

      const result = await dialog.showOpenDialog(win, {
        title: '选择本地创作证明文件',
        filters: [{ name: 'Story Studio 创作证明', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true, error: '用户取消验证' }
      }

      const filePath = result.filePaths[0]
      const raw = await readFile(filePath, 'utf8')
      const verification = verifyProjectProofManifest(JSON.parse(raw))

      return {
        ok: true,
        filePath,
        valid: verification.valid,
        projectTitle: verification.manifest.project.title,
        createdAt: verification.manifest.createdAt,
        recordedProjectDocumentSha256: verification.manifest.hashes.projectDocumentSha256,
        actualProjectDocumentSha256: verification.actualProjectDocumentSha256,
        recordedProofPayloadSha256: verification.manifest.hashes.proofPayloadSha256,
        actualProofPayloadSha256: verification.actualProofPayloadSha256,
        issues: verification.issues
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '创作证明验证失败' }
    }
  })
}
