import { ipcMain } from 'electron'
import type { App } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import type { RecentProjectEntry } from '../shared/project'

const MAX_ENTRIES = 20

function getFilePath(app: App): string {
  return join(app.getPath('userData'), 'recent-projects.json')
}

async function readList(app: App): Promise<RecentProjectEntry[]> {
  try {
    const raw = await readFile(getFilePath(app), 'utf-8')
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (e: unknown): e is RecentProjectEntry =>
        typeof e === 'object' && e !== null && typeof (e as RecentProjectEntry).projectPath === 'string'
    )
  } catch {
    return []
  }
}

async function writeList(app: App, list: RecentProjectEntry[]): Promise<void> {
  await mkdir(join(app.getPath('userData')), { recursive: true })
  await writeFile(getFilePath(app), JSON.stringify(list, null, 2), 'utf-8')
}

export function registerRecentIpc(app: App): void {
  ipcMain.handle('recent:get', async (): Promise<RecentProjectEntry[]> => {
    return readList(app)
  })

  ipcMain.handle('recent:add', async (_, projectPath: string, title: string): Promise<void> => {
    const list = await readList(app)
    const filtered = list.filter((e) => e.projectPath !== projectPath)
    filtered.unshift({ projectPath, title, lastOpenedAt: new Date().toISOString() })
    await writeList(app, filtered.slice(0, MAX_ENTRIES))
  })

  ipcMain.handle('recent:remove', async (_, projectPath: string): Promise<void> => {
    const list = await readList(app)
    await writeList(
      app,
      list.filter((e) => e.projectPath !== projectPath)
    )
  })
}
