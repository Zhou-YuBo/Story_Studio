import type { App, BrowserWindow, OpenDialogOptions, SaveDialogOptions } from 'electron'
import { dialog } from 'electron'
import { mkdir, readFile, rename, writeFile, copyFile, stat } from 'fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import {
  createDefaultProjectDocument,
  normalizeProjectDocument,
  type ProjectDocument,
  type ProjectInfo,
  type ImportedAsset
} from '../shared/project'

const PROJECT_FILTER = [{ name: 'Story Studio 项目', extensions: ['story.json', 'json'] }]
const MAX_PROJECT_FILE_SIZE = 50 * 1024 * 1024


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
    await assertSupportedProjectFile(filePath)
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
    const safeName = sanitizeFileName(document.title || '未命名项目')
    const options: SaveDialogOptions = {
      title: '保存 Story Studio 项目',
      defaultPath: join(this.defaultDir, `${safeName}.story.json`),
      filters: PROJECT_FILTER
    }
    const result = owner
      ? await dialog.showSaveDialog(owner, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null

    const chosenDir = dirname(result.filePath)
    const chosenName = basename(result.filePath, '.story.json').replace(/\.json$/, '')
    const projectDir = join(chosenDir, chosenName)
    const jsonPath = join(projectDir, `${chosenName}.story.json`)

    await mkdir(projectDir, { recursive: true })
    this.projectFile = jsonPath
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
    await assertSupportedProjectFile(filePath)
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
    if (!this.projectFile) throw new Error('项目尚未保存，无法管理素材文件')
    return join(dirname(this.projectFile), 'assets')
  }

  async importAsset(sourcePath: string): Promise<ImportedAsset> {
    const sourceStats = await stat(sourcePath)
    if (!sourceStats.isFile()) {
      throw new Error('请选择有效的素材文件')
    }

    const assetsDir = this.getAssetsDir()
    await mkdir(assetsDir, { recursive: true })

    const ext = extname(sourcePath)
    const relativePath = `${randomUUID()}${ext}`
    const destPath = resolveAssetPath(assetsDir, relativePath)

    await copyFile(sourcePath, destPath)

    const mimeType = guessMimeType(ext)
    return {
      relativePath,
      originalName: basename(sourcePath),
      mimeType
    }
  }

  getAssetAbsolutePath(relativePath: string): string {
    return resolveAssetPath(this.getAssetsDir(), relativePath)
  }
}

async function assertSupportedProjectFile(filePath: string): Promise<void> {
  const fileStats = await stat(filePath)

  if (!fileStats.isFile()) {
    throw new Error('请选择有效的项目文件')
  }

  if (fileStats.size > MAX_PROJECT_FILE_SIZE) {
    throw new Error('项目文件过大')
  }

  const lowerPath = filePath.toLowerCase()
  if (!lowerPath.endsWith('.json') && !lowerPath.endsWith('.story.json')) {
    throw new Error('请选择 JSON 项目文件')
  }
}

function assertInsideDir(rootDir: string, targetPath: string): void {
  const resolvedRoot = resolve(rootDir)
  const resolvedTarget = resolve(targetPath)
  const relativePath = relative(resolvedRoot, resolvedTarget)

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('路径不在允许目录内')
  }
}

function resolveAssetPath(assetsDir: string, relativePath: string): string {
  if (!relativePath || isAbsolute(relativePath)) {
    throw new Error('素材路径无效')
  }

  const absolutePath = resolve(assetsDir, relativePath)
  assertInsideDir(assetsDir, absolutePath)
  return absolutePath
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
