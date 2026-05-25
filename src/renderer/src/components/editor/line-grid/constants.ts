import type { ElementLayoutConfig, LineGridConfig } from './types'
import {
  ELEMENT_LAYOUT,
  LINE_HEIGHT_PX,
  PAGE_LINES as PAGE_LINES_SOURCE
} from '../page-layout/page-config'

export const LINE_HEIGHT = LINE_HEIGHT_PX
export const PAGE_LINES = PAGE_LINES_SOURCE

function deriveElementConfig(): Record<string, ElementLayoutConfig> {
  const result: Record<string, ElementLayoutConfig> = {}
  for (const [type, layout] of Object.entries(ELEMENT_LAYOUT)) {
    result[type] = {
      charsPerLine: layout.charsPerLine,
      marginTopLines: layout.marginTopLines,
      isFirstNoMargin: layout.isFirstNoMargin
    }
  }
  return result
}

export const ELEMENT_CONFIG: LineGridConfig['elementConfig'] = deriveElementConfig()

export const LINE_GRID_CONFIG: LineGridConfig = {
  lineHeight: LINE_HEIGHT,
  pageLines: PAGE_LINES,
  elementConfig: ELEMENT_CONFIG
}

export function elementLayoutConfig(
  type: string,
  config: LineGridConfig = LINE_GRID_CONFIG
): ElementLayoutConfig {
  return config.elementConfig[type] ?? config.elementConfig.general
}
