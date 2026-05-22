export interface ElementConfig {
  charsPerLine: number
  marginTopLines: number
  isFirstNoMargin?: boolean
}

export interface Block {
  type: string
  text: string
  pos: number
  nodeSize: number
}

export interface PageBreakInfo {
  afterBlockIndex: number
  linesUsed: number
  moreContd?: {
    characterName: string
    splitAtLine: number
  }
}

export interface PaginationResult {
  pageBreaks: PageBreakInfo[]
  totalPages: number
}
