export type WorkbenchId =
  | 'inspiration'
  | 'world'
  | 'character'
  | 'structure'
  | 'scene'
  | 'reminder'
  | 'export'

export interface WorkbenchConfig {
  id: WorkbenchId
  label: string
  path: string
}

export const WORKBENCHES: WorkbenchConfig[] = [
  { id: 'inspiration', label: '灵感', path: '/' },
  { id: 'world', label: '世界', path: '/world' },
  { id: 'character', label: '人物', path: '/character' },
  { id: 'structure', label: '结构', path: '/structure' },
  { id: 'scene', label: '场景', path: '/scene' },
  { id: 'reminder', label: '提醒', path: '/reminder' },
  { id: 'export', label: '导出', path: '/export' }
]

export function getWorkbenchById(id: WorkbenchId | null | undefined): WorkbenchConfig | null {
  return WORKBENCHES.find((workbench) => workbench.id === id) ?? null
}

export function isWorkbenchId(value: unknown): value is WorkbenchId {
  return typeof value === 'string' && WORKBENCHES.some((workbench) => workbench.id === value)
}

export function getWorkbenchIdFromPath(path: string): WorkbenchId | null {
  if (path === '/') return 'inspiration'
  if (path.startsWith('/character')) return 'character'

  const workbench = WORKBENCHES.find(
    (item) => item.path !== '/' && (path === item.path || path.startsWith(`${item.path}/`))
  )
  return workbench?.id ?? null
}
