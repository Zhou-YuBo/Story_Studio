import type { App, BrowserWindow, OpenDialogOptions, SaveDialogOptions } from 'electron'
import { dialog } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import {
  createDefaultProjectDocument,
  normalizeProjectDocument,
  type ProjectDocument,
  type ProjectInfo
} from '../shared/project'

const PROJECT_FILTER = [{ name: 'Story Studio 项目', extensions: ['story.json', 'json'] }]

export class FileProjectRepository {
  private projectFile: string | null = null
  private readonly defaultDir: string
  private writeQueue = Promise.resolve()

  constructor(app: App) {
    this.defaultDir = join(app.getPath('documents'), 'Story Studio')
  }

  async load(): Promise<ProjectDocument> {
    return createDefaultProjectDocument()
  }

  async save(
    document: ProjectDocument,
    owner?: BrowserWindow | null
  ): Promise<ProjectDocument | null> {
    if (!this.projectFile) return this.saveAs(document, owner)
    return this.writeToCurrentFile(document)
  }

  async saveAs(
    document: ProjectDocument,
    owner?: BrowserWindow | null
  ): Promise<ProjectDocument | null> {
    await mkdir(this.defaultDir, { recursive: true })
    const options: SaveDialogOptions = {
      title: '保存 Story Studio 项目',
      defaultPath: join(
        this.defaultDir,
        `${sanitizeFileName(document.title || '未命名项目')}.story.json`
      ),
      filters: PROJECT_FILTER
    }
    const result = owner
      ? await dialog.showSaveDialog(owner, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    this.projectFile = result.filePath
    return this.writeToCurrentFile(document)
  }

  async importJson(owner?: BrowserWindow | null): Promise<ProjectDocument | null> {
    await mkdir(this.defaultDir, { recursive: true })
    const options: OpenDialogOptions = {
      title: '导入 Story Studio 项目 JSON',
      defaultPath: this.defaultDir,
      filters: PROJECT_FILTER,
      properties: ['openFile']
    }
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const raw = await readFile(filePath, 'utf-8')
    const document = normalizeProjectDocument(JSON.parse(raw))
    this.projectFile = filePath
    return document
  }

  async getInfo(): Promise<ProjectInfo> {
    return {
      projectPath: this.projectFile,
      assetsPath: this.getAssetsPath()
    }
  }

  private async writeToCurrentFile(document: ProjectDocument): Promise<ProjectDocument> {
    if (!this.projectFile) return document
    const nextDocument = normalizeProjectDocument({
      ...document,
      updatedAt: new Date().toISOString()
    })

    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        if (!this.projectFile) return
        await mkdir(dirname(this.projectFile), { recursive: true })
        const tempFile = `${this.projectFile}.tmp`
        await writeFile(tempFile, JSON.stringify(nextDocument, null, 2), 'utf-8')
        await rename(tempFile, this.projectFile)
      })

    await this.writeQueue
    return nextDocument
  }

  private getAssetsPath(): string | null {
    return this.projectFile ? join(dirname(this.projectFile), 'assets') : null
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, '').trim() || '未命名项目'
}
