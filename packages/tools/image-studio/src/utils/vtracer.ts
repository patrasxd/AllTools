import { loadVTracer } from './vtracerRuntime'

export interface RasterImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface VTracerBinaryOptions {
  /** Discard patches smaller than this (px, in traced-image pixels). */
  filterSpeckle: number
  /** Minimum angle (degrees) for a point to be treated as a corner. Higher = smoother. */
  cornerThreshold: number
  /** Segment length threshold used while fitting splines. */
  lengthThreshold: number
  /** Minimum angle displacement (degrees) to splice a spline. */
  spliceThreshold: number
  /** Decimal digits kept in path coordinates. */
  pathPrecision: number
}

const MAX_TICKS = 5_000_000

/**
 * Traces a black-on-white binary image (black = shape) with VTracer in spline mode.
 * Returns an SVG string with black filled paths and no viewBox (the caller sets the viewport).
 */
export async function traceBinaryWithVTracer(image: RasterImage, options: VTracerBinaryOptions): Promise<string> {
  const { BinaryImageConverter } = await loadVTracer()

  // The WASM side only reads `.data`, `.width` and `.height`, so a plain object is enough
  // (ImageData is not available in every worker/test environment).
  const converter = new BinaryImageConverter(
    image as unknown as ImageData,
    { debug: false, mode: 'spline', ...options },
    { invert: false, pathFill: '#000', backgroundColor: undefined, attributes: undefined, scale: 1 },
  )

  try {
    converter.init()
    let ticks = 0
    while (!converter.tick()) {
      if (++ticks > MAX_TICKS) {
        throw new Error('VTracer did not finish in a reasonable number of steps')
      }
    }
    return converter.getResult()
  } finally {
    converter.free()
  }
}
