export type PdfMode = 'merge' | 'split' | 'rotate' | 'images'

export type GuidedStep = 'upload' | 'merge_files' | 'edit_pages' | 'images'

export type SignaturePosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'top-right'
  | 'center'
  | 'custom'

export interface SignatureCoordinates {
  xPercent: number // 0 to 100 (% from left)
  yPercent: number // 0 to 100 (% from top)
  widthPercent?: number // 0 to 100 (% box width)
  heightPercent?: number // 0 to 100 (% box height)
}

export type SignatureFont = 'dancing-script' | 'cursive' | 'caveat' | 'calligraphy'

export interface SignatureConfig {
  mode: 'draw' | 'type'
  dataUrl: string
  pageIndex: number // 0-indexed
  position: SignaturePosition
  customCoordinates?: SignatureCoordinates
}

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
  aspectRatio?: number
}

export interface ImageFileItem {
  id: string
  name: string
  sizeBytes: number
  file: File
  previewUrl: string
}

export type DocumentFilter = 'original' | 'grayscale' | 'bw' | 'contrast'

export interface Point2D {
  x: number // 0 to 1
  y: number // 0 to 1
}

export interface EditableImageItem {
  id: string
  name: string
  sizeBytes: number
  file: File
  originalUrl: string
  width: number
  height: number
  rotation: number // 0, 90, 180, 270
  filter: DocumentFilter
  corners: [Point2D, Point2D, Point2D, Point2D] // TL, TR, BR, BL
  previewUrl: string
}
