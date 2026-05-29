import type { App, BrowserWindow, OpenDialogOptions, SaveDialogOptions } from 'electron'
import { dialog } from 'electron'
import { mkdir, readFile, rename, writeFile, copyFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { randomUUID } from 'crypto'
import {
  createDefaultProjectDocument,
  normalizeProjectDocument,
  type ProjectDocument,
  type ProjectInfo,
  type ImportedAsset
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

  async loadFromPath(filePath: string): Promise<ProjectDocument> {
    const raw = await readFile(filePath, 'utf-8')
    const document = normalizeProjectDocument(JSON.parse(raw))
    this.projectFile = filePath
    return document
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

  getAssetsDir(): string {
    const projectDir = this.projectFile ? dirname(this.projectFile) : this.defaultDir
    return join(projectDir, 'assets')
  }

  async importAsset(sourcePath: string): Promise<ImportedAsset> {
    const assetsDir = this.getAssetsDir()
    await mkdir(assetsDir, { recursive: true })

    const ext = extname(sourcePath)
    const relativePath = `${randomUUID()}${ext}`
    const destPath = join(assetsDir, relativePath)

    await copyFile(sourcePath, destPath)

    const mimeType = guessMimeType(ext)
    return {
      relativePath,
      originalName: basename(sourcePath),
      mimeType
    }
  }

  getAssetAbsolutePath(relativePath: string): string {
    return join(this.getAssetsDir(), relativePath)
  }
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/plain',
    '.csv': 'text/plain',
    '.json': 'text/plain'
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, '').trim() || '未命名项目'
}
