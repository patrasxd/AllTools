export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

export type AspectRatioPreset =
  | 'original'
  | 'id-photo' // 35x45 mm (7:9) - Dowód / Paszport / Legitymacja
  | '1:1' // Kwadrat / Avatar
  | '4:3' // Standard foto
  | '16:9' // Ekran / Krajobraz
  | '3:2' // Aparat DSLR
  | '9:16' // Social Story / Rolka
  | 'custom'

export type WatermarkMode = 'diagonal-single' | 'diagonal-repeat' | 'bottom-right'

export interface WatermarkConfig {
  enabled: boolean
  text: string
  opacity: number // 0.1 to 1.0
  fontSize: number // 12 to 96 px
  mode: WatermarkMode
  color: string // '#ffffff', '#000000', '#ff0000', etc.
}

export interface CropTransform {
  offsetX: number // -1.0 to 1.0 (0 is center)
  offsetY: number // -1.0 to 1.0 (0 is center)
  zoom: number // 1.0 to 3.0
  showPassportGuide: boolean
}

export interface ResizeConfig {
  preset: AspectRatioPreset
  customWidth: number
  customHeight: number
  lockAspect: boolean
  cropMode: 'cover' | 'contain'
  crop: CropTransform
}

export interface CompressionConfig {
  quality: number // 1 to 100
  targetMaxKb: number | null // e.g. 2048 (2MB) or 500 (500KB)
}

export type VectorizeMode = 'color' | 'bw'
export type VectorizeSmoothing = 'low' | 'medium' | 'high'

export interface VectorizeConfig {
  mode: VectorizeMode
  numberOfColors: number // 2 to 64 (color mode)
  bwThreshold: number // 10 to 240 (bw mode)
  speckleFilter?: number // 0 to 64 (corresponds to pathomit, default: 4)
  smoothing?: VectorizeSmoothing
  rightAngleEnhance?: boolean
  lineFilter?: boolean
}

export interface VectorizeResult {
  svg: string
  sizeBytes: number
  pathsCount: number
  durationMs: number
}

export interface VectorizeWorkerRequest {
  id: number
  type: 'vectorize'
  width: number
  height: number
  buffer: ArrayBuffer
  config: VectorizeConfig
}

export interface VectorizeWorkerSuccessResponse {
  id: number
  type: 'success'
  svg: string
  pathsCount: number
  durationMs: number
}

export interface VectorizeWorkerErrorResponse {
  id: number
  type: 'error'
  error: string
}

export type VectorizeWorkerResponse = VectorizeWorkerSuccessResponse | VectorizeWorkerErrorResponse

export interface BgRemovalConfig {
  enabled: boolean
  color: string // Hex color string, e.g. '#ffffff'
  tolerance: number // 1 to 100 (%)
  mode: 'contiguous' | 'all'
  feather: number // 0 to 4 px
}

export interface ImageStudioState {
  originalFile: File | null
  originalImage: HTMLImageElement | null
  originalWidth: number
  originalHeight: number
  originalSizeBytes: number
  format: ImageFormat
  watermark: WatermarkConfig
  resize: ResizeConfig
  compression: CompressionConfig
  vectorize: VectorizeConfig
  bgRemoval: BgRemovalConfig
  activeTab: 'crop' | 'remove-bg' | 'watermark' | 'format' | 'vectorize'
}
