import type { ElementConfig } from './types'

export const PAGE_LINES = 54

export const ELEMENT_CONFIG: Record<string, ElementConfig> = {
  sceneHeading:   { charsPerLine: 60, marginTopLines: 2, isFirstNoMargin: true },
  action:         { charsPerLine: 60, marginTopLines: 1 },
  character:      { charsPerLine: 38, marginTopLines: 1 },
  dialogue:       { charsPerLine: 35, marginTopLines: 0 },
  parenthetical:  { charsPerLine: 25, marginTopLines: 0 },
  transition:     { charsPerLine: 60, marginTopLines: 1 },
  general:        { charsPerLine: 60, marginTopLines: 0 },
  shot:           { charsPerLine: 60, marginTopLines: 1 },
  castList:       { charsPerLine: 60, marginTopLines: 1 },
  summary:        { charsPerLine: 45, marginTopLines: 1 },
  note:           { charsPerLine: 45, marginTopLines: 0 },
  newAct:         { charsPerLine: 60, marginTopLines: 1, isFirstNoMargin: true },
  endOfAct:       { charsPerLine: 60, marginTopLines: 1 },
  sequence:       { charsPerLine: 60, marginTopLines: 1, isFirstNoMargin: true },
}
