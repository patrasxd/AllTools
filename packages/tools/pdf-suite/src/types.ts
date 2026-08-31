export type PdfMode = 'merge' | 'split' | 'rotate' | 'images'

export interface PdfFileItem {
  id: string
  name: string
  sizeBytes: number
  pageCount: number
  file: File
}

export interface PdfPageItem {
  id: string
  fileId: string
  fileName: string
  pageIndex: number // 0-indexed in original document
  displayNumber: number // 1-indexed
  rotation: number // 0, 90, 180, 270
  selected: boolean
  thumbnailUrl?: string
}

export interface ImageFileItem {
  id: string
  name: string
  sizeBytes: number
  file: File
  previewUrl: string
}
