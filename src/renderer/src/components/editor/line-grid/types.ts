export interface ElementLayoutConfig {
  charsPerLine: number
  marginTopLines: number
  isFirstNoMargin?: boolean
}

export interface LineGridConfig {
  lineHeight: number
  pageLines: number
  elementConfig: Record<string, ElementLayoutConfig>
}

export interface ScreenplayBlock {
  blockIndex: number
  type: string
  text: string
  attrs: Record<string, unknown>
  pos: number
  nodeSize: number
}

export interface BlockLineRange extends ScreenplayBlock {
  marginTopLines: number
  contentLines: number
  startLine: number
  contentStartLine: number
  endLine: number
  pageIndex: number
  lineInPage: number
}

export interface PageLineRange {
  pageIndex: number
  startLine: number
  endLine: number
}

export interface MarkerLineRange {
  type: 'newAct' | 'endOfAct' | 'sequence'
  actId: string
  seqId: string
  blockIndex: number
  lineIndex: number
  pos: number
  nodeSize: number
}

export interface PageBreakInfo {
  afterBlockIndex: number
  linesUsed: number
  lineIndex: number
  moreContd?: {
    characterName: string
    splitAtLine: number
  }
}

export interface LineGridSnapshot {
  version: number
  totalLines: number
  blocks: BlockLineRange[]
  pages: PageLineRange[]
  markers: MarkerLineRange[]
  pageBreaks: PageBreakInfo[]
  totalPages: number
}
