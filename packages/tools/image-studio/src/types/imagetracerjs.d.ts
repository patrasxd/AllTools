declare module 'imagetracerjs' {
  export interface ImageTracerOptions {
    corsenabled?: boolean
    ltres?: number
    qtres?: number
    pathomit?: number
    rightangleenhance?: boolean
    colorsampling?: 0 | 1 | 2
    numberofcolors?: number
    mincolorratio?: number
    colorquantcycles?: number
    layering?: 0 | 1
    strokewidth?: number
    linefilter?: boolean
    scale?: number
    roundcoords?: number
    viewbox?: boolean
    desc?: boolean
    lcpr?: number
    qcpr?: number
    blurradius?: number
    blurdelta?: number
    pal?: Array<{ r: number; g: number; b: number; a: number }>
  }

  export interface ImageTracerData {
    width: number
    height: number
    data: Uint8ClampedArray | Uint8Array
  }

  export interface ImageTracerInstance {
    imagedataToSVG(imgd: ImageTracerData, options?: ImageTracerOptions): string
    optionpresets: Record<string, ImageTracerOptions>
  }

  const ImageTracer: ImageTracerInstance
  export default ImageTracer
}
