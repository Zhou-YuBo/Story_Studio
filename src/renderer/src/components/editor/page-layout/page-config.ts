export const PAGE_WIDTH_IN = 8.5
export const PAGE_HEIGHT_IN = 11
export const PAGE_PADDING_TOP_IN = 1
export const PAGE_PADDING_RIGHT_IN = 1
export const PAGE_PADDING_BOTTOM_IN = 1
export const PAGE_PADDING_LEFT_IN = 1.5

export const FONT_FAMILY = "'Courier Prime', 'Courier New', monospace"
export const FONT_SIZE_PT = 12
export const PAGE_NUMBER_FONT_SIZE_PT = 10

export const LINE_HEIGHT_PX = 16
export const PAGE_LINES = 54
export const PAGE_GAP_PX = 0
export const PAGE_MORE_HEIGHT_PX = 16
export const PAGE_CONTD_HEIGHT_PX = 16

export const PAGE_BACKGROUND = '#e8e0d0'
export const PAGE_GAP_BACKGROUND = '#242424'

export interface ElementLayout {
  charsPerLine: number
  marginTopLines: number
  paddingLeftPx?: number
  paddingRightPx?: number
  textAlign?: 'left' | 'center' | 'right'
  uppercase?: boolean
  bold?: boolean
  italic?: boolean
  underline?: boolean
  isFirstNoMargin?: boolean
}

export const ELEMENT_LAYOUT: Record<string, ElementLayout> = {
  sceneHeading: {
    charsPerLine: 60,
    marginTopLines: 2,
    uppercase: true,
    bold: true,
    isFirstNoMargin: true
  },
  action: { charsPerLine: 60, marginTopLines: 1 },
  character: { charsPerLine: 38, marginTopLines: 1, paddingLeftPx: 211, uppercase: true },
  dialogue: { charsPerLine: 35, marginTopLines: 0, paddingLeftPx: 96, paddingRightPx: 144 },
  parenthetical: {
    charsPerLine: 25,
    marginTopLines: 0,
    paddingLeftPx: 154,
    paddingRightPx: 182,
    italic: true
  },
  transition: { charsPerLine: 60, marginTopLines: 1, textAlign: 'right', uppercase: true },
  general: { charsPerLine: 60, marginTopLines: 0 },
  shot: { charsPerLine: 60, marginTopLines: 1, uppercase: true, bold: true },
  castList: { charsPerLine: 60, marginTopLines: 1 },
  summary: { charsPerLine: 45, marginTopLines: 1, paddingLeftPx: 96, paddingRightPx: 48 },
  note: {
    charsPerLine: 45,
    marginTopLines: 0,
    paddingLeftPx: 96,
    paddingRightPx: 48,
    italic: true
  },
  newAct: {
    charsPerLine: 60,
    marginTopLines: 1,
    textAlign: 'center',
    uppercase: true,
    bold: true,
    underline: true,
    isFirstNoMargin: true
  },
  endOfAct: {
    charsPerLine: 60,
    marginTopLines: 1,
    textAlign: 'center',
    uppercase: true,
    bold: true,
    underline: true
  },
  sequence: {
    charsPerLine: 60,
    marginTopLines: 1,
    textAlign: 'center',
    uppercase: true,
    bold: true,
    underline: true,
    isFirstNoMargin: true
  }
}
