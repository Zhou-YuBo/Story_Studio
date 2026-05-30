export interface ExportLine {
  text: string
  lineIndexInBlock: number
}

export interface ExportBlockFragment {
  blockIndex: number
  type: string
  attrs: Record<string, unknown>
  pageIndex: number
  lineInPage: number
  lines: ExportLine[]
  continuedFromPreviousPage: boolean
  continuesToNextPage: boolean
}

export interface ExportPage {
  pageIndex: number
  pageNumber: number
  showPageNumber: boolean
  blocks: ExportBlockFragment[]
  more?: string
  contd?: string
}

export interface ExportPagination {
  pages: ExportPage[]
  totalPages: number
}
