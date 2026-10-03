import ImageTracer, { type ImageTracerOptions } from 'imagetracerjs'
import type { VectorizeConfig } from '../types'
import type { RasterImage, VTracerBinaryOptions } from './vtracer'

export const DEFAULT_MAX_VECTOR_DIMENSION = 2000
/** Longest side (px) of the internally upscaled image that is actually traced. */
export const MAX_TRACE_DIMENSION = 2400
/** Upper bound for the pixel count of the upscaled image (keeps memory sane on phones). */
export const MAX_TRACE_PIXELS = 5_500_000
export const DEFAULT_SMOOTHNESS = 50

/**
 * Calculates scaled dimensions preserving aspect ratio so the longest side <= maxDimension.
 */
export function calculateScaledDimensions(
  width: number,
  height: number,
  maxDimension = DEFAULT_MAX_VECTOR_DIMENSION,
): { width: number; height: number; scaled: boolean } {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height), scaled: false }
  }

  const longestSide = Math.max(width, height)
  if (longestSide <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height), scaled: false }
  }

  const scale = maxDimension / longestSide
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  }
}

/**
 * Extracts raw pixel data from an HTMLImageElement or HTMLCanvasElement,
 * automatically downscaling if it exceeds maxDimension.
 */
export function extractImageDataFromSource(
  source: HTMLImageElement | HTMLCanvasElement,
  maxDimension = DEFAULT_MAX_VECTOR_DIMENSION,
): { width: number; height: number; data: Uint8ClampedArray } {
  const origW = 'naturalWidth' in source ? source.naturalWidth : source.width
  const origH = 'naturalHeight' in source ? source.naturalHeight : source.height

  const { width, height } = calculateScaledDimensions(origW, origH, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for vectorization')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)

  const imgData = ctx.getImageData(0, 0, width, height)
  return {
    width,
    height,
    data: imgData.data,
  }
}

/**
 * Counts the number of <path> elements in an SVG string.
 */
export function countSvgPaths(svg: string): number {
  const matches = svg.match(/<path\b/gi)
  return matches ? matches.length : 0
}

// ─── Pre-trace smoothing (upscale + gaussian blur) ────────────────────────────
//
// Tracers work on the pixel grid. Thresholding/quantizing at the source resolution throws away the
// anti-aliasing of edges, which is what produces stair-stepped, "painted with a brush" outlines.
// Upscaling and blurring first, and only then thresholding, recovers the sub-pixel position of each
// edge so the fitted curves follow the real shape.

export interface SmoothnessParams {
  /** Upscale factor applied before tracing (>= 1). */
  scale: number
  /** Width/height of the upscaled image. */
  width: number
  height: number
  /** Gaussian sigma in upscaled pixels (0 = no blur). */
  blurSigma: number
  /** Line/curve fitting tolerance for imagetracerjs, in upscaled pixels. */
  curveTolerance: number
  /** VTracer corner threshold (degrees). */
  cornerThreshold: number
  /** VTracer segment length threshold. */
  lengthThreshold: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Maps the single 0-100 "smoothness" control onto all the knobs that actually affect edge quality.
 */
export function smoothnessToParams(smoothness: number, width: number, height: number): SmoothnessParams {
  const s = clamp(Number.isFinite(smoothness) ? smoothness : DEFAULT_SMOOTHNESS, 0, 100) / 100
  const longest = Math.max(1, width, height)
  const desiredScale = 1 + 2 * s
  const maxByDimension = MAX_TRACE_DIMENSION / longest
  const maxByPixels = Math.sqrt(MAX_TRACE_PIXELS / Math.max(1, width * height))
  const scale = Math.max(1, Math.min(desiredScale, maxByDimension, maxByPixels))

  const scaledWidth = Math.max(1, Math.round(width * scale))
  const scaledHeight = Math.max(1, Math.round(height * scale))
  const effectiveScale = scaledWidth / Math.max(1, width)

  return {
    scale: effectiveScale,
    width: scaledWidth,
    height: scaledHeight,
    blurSigma: 1.1 * s * effectiveScale,
    curveTolerance: (0.4 + 1.6 * s) * effectiveScale,
    cornerThreshold: 30 + 60 * s,
    lengthThreshold: 3.5 + 4.5 * s,
  }
}

/** Bilinear resize of an interleaved `channels`-channel 8-bit image (half-pixel centres). */
export function resizeBilinear(
  src: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  channels: number,
  dstWidth: number,
  dstHeight: number,
): Uint8ClampedArray {
  if (dstWidth === srcWidth && dstHeight === srcHeight) return src

  const dst = new Uint8ClampedArray(dstWidth * dstHeight * channels)
  const xScale = srcWidth / dstWidth
  const yScale = srcHeight / dstHeight

  const x0 = new Int32Array(dstWidth)
  const x1 = new Int32Array(dstWidth)
  const xw = new Float32Array(dstWidth)
  for (let x = 0; x < dstWidth; x++) {
    const fx = clamp((x + 0.5) * xScale - 0.5, 0, srcWidth - 1)
    const ix = Math.floor(fx)
    x0[x] = ix
    x1[x] = Math.min(srcWidth - 1, ix + 1)
    xw[x] = fx - ix
  }

  for (let y = 0; y < dstHeight; y++) {
    const fy = clamp((y + 0.5) * yScale - 0.5, 0, srcHeight - 1)
    const iy = Math.floor(fy)
    const iy1 = Math.min(srcHeight - 1, iy + 1)
    const wy = fy - iy
    const row0 = iy * srcWidth
    const row1 = iy1 * srcWidth

    for (let x = 0; x < dstWidth; x++) {
      const wx = xw[x]
      const a = (row0 + x0[x]) * channels
      const b = (row0 + x1[x]) * channels
      const c = (row1 + x0[x]) * channels
      const d = (row1 + x1[x]) * channels
      const o = (y * dstWidth + x) * channels
      for (let ch = 0; ch < channels; ch++) {
        const top = src[a + ch] * (1 - wx) + src[b + ch] * wx
        const bottom = src[c + ch] * (1 - wx) + src[d + ch] * wx
        dst[o + ch] = top * (1 - wy) + bottom * wy
      }
    }
  }

  return dst
}

/** Separable gaussian blur of an interleaved 8-bit image with clamped edges. */
export function gaussianBlur(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  sigma: number,
): Uint8ClampedArray {
  if (!(sigma >= 0.25)) return src

  const radius = Math.max(1, Math.ceil(sigma * 3))
  const kernel = new Float32Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + radius] = v
    sum += v
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  const tmp = new Uint8ClampedArray(src.length)
  const out = new Uint8ClampedArray(src.length)

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowStart = y * width
    for (let x = 0; x < width; x++) {
      for (let ch = 0; ch < channels; ch++) {
        let acc = 0
        for (let k = -radius; k <= radius; k++) {
          const sx = clamp(x + k, 0, width - 1)
          acc += src[(rowStart + sx) * channels + ch] * kernel[k + radius]
        }
        tmp[(rowStart + x) * channels + ch] = acc
      }
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let ch = 0; ch < channels; ch++) {
        let acc = 0
        for (let k = -radius; k <= radius; k++) {
          const sy = clamp(y + k, 0, height - 1)
          acc += tmp[(sy * width + x) * channels + ch] * kernel[k + radius]
        }
        out[(y * width + x) * channels + ch] = acc
      }
    }
  }

  return out
}

/** Upscales and blurs an image according to the smoothness parameters. */
function smoothImage(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  params: SmoothnessParams,
): Uint8ClampedArray {
  const resized = resizeBilinear(src, width, height, channels, params.width, params.height)
  return gaussianBlur(resized, params.width, params.height, channels, params.blurSigma)
}

/** Luminance of an RGBA image composited over white (transparent = white). */
function toGrayOverWhite(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    const alpha = rgba[i + 3] / 255
    const luminance = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
    gray[p] = luminance * alpha + 255 * (1 - alpha)
  }
  return gray
}

function grayToBinaryRgba(gray: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(gray.length * 4)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const v = gray[p] < threshold ? 0 : 255
    rgba[i] = v
    rgba[i + 1] = v
    rgba[i + 2] = v
    rgba[i + 3] = 255
  }
  return rgba
}

function premultiply(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length)
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255
    out[i] = rgba[i] * a
    out[i + 1] = rgba[i + 1] * a
    out[i + 2] = rgba[i + 2] * a
    out[i + 3] = rgba[i + 3]
  }
  return out
}

function unpremultiply(rgba: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3]
    if (a === 0) {
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 0
    } else if (a < 255) {
      const f = 255 / a
      rgba[i] = rgba[i] * f
      rgba[i + 1] = rgba[i + 1] * f
      rgba[i + 2] = rgba[i + 2] * f
    }
  }
  return rgba
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

/**
 * Sets the root <svg> viewport: the viewBox spans the traced (upscaled) coordinate space, while
 * width/height are the source image dimensions, so the file keeps the original natural size.
 */
export function setSvgViewport(
  rawSvg: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
  width: number,
  height: number,
): string {
  const svg = rawSvg.trim()
  const viewport = `viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${width}" height="${height}"`

  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s(?:width|height|viewBox)\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/\s+$/, '')
    return `<svg${cleaned} ${viewport}>`
  })
}

// ─── Tracing pipelines ────────────────────────────────────────────────────────

let vtracerFailureLogged = false

function traceBinaryWithImageTracer(binaryRgba: RasterImage, params: SmoothnessParams, speckle: number): string {
  const options: ImageTracerOptions = {
    ltres: params.curveTolerance,
    qtres: params.curveTolerance,
    pathomit: Math.round(speckle * params.scale),
    rightangleenhance: false,
    linefilter: false,
    roundcoords: 1,
    blurradius: 0,
    strokewidth: 0,
    viewbox: true,
    desc: false,
    numberofcolors: 2,
    colorquantcycles: 1,
    colorsampling: 0,
    pal: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ],
  }
  return ImageTracer.imagedataToSVG(binaryRgba, options)
}

async function traceBlackAndWhite(
  imageData: RasterImage,
  config: VectorizeConfig,
  params: SmoothnessParams,
  speckle: number,
): Promise<string> {
  const threshold = clamp(config.bwThreshold, 0, 255)
  const gray = toGrayOverWhite(imageData.data, imageData.width, imageData.height)
  const smoothed = smoothImage(gray, imageData.width, imageData.height, 1, params)
  const binary: RasterImage = {
    width: params.width,
    height: params.height,
    data: grayToBinaryRgba(smoothed, threshold),
  }

  try {
    const { traceBinaryWithVTracer } = await import('./vtracer')
    const options: VTracerBinaryOptions = {
      filterSpeckle: Math.max(0, Math.round((speckle * params.scale) / 2)),
      cornerThreshold: params.cornerThreshold,
      lengthThreshold: params.lengthThreshold,
      spliceThreshold: 45,
      pathPrecision: 2,
    }
    return await traceBinaryWithVTracer(binary, options)
  } catch (err) {
    // WASM unavailable (very old browser, blocked, failed to load): degrade to the pure-JS tracer.
    if (!vtracerFailureLogged) {
      vtracerFailureLogged = true
      console.warn('VTracer is unavailable, falling back to imagetracerjs for B&W vectorization:', err)
    }
    return traceBinaryWithImageTracer(binary, params, speckle)
  }
}

function traceColor(
  imageData: RasterImage,
  config: VectorizeConfig,
  params: SmoothnessParams,
  speckle: number,
): string {
  const premultiplied = premultiply(imageData.data)
  const smoothed = smoothImage(premultiplied, imageData.width, imageData.height, 4, params)
  const pixels = unpremultiply(smoothed)

  const options: ImageTracerOptions = {
    ltres: params.curveTolerance,
    qtres: params.curveTolerance,
    pathomit: Math.round(speckle * params.scale),
    rightangleenhance: config.rightAngleEnhance ?? false,
    linefilter: false,
    roundcoords: 1,
    blurradius: 0,
    strokewidth: 0,
    viewbox: true,
    desc: false,
    numberofcolors: clamp(Math.round(config.numberOfColors), 2, 64),
    colorsampling: 2,
    colorquantcycles: 3,
    mincolorratio: 0.015, // drop anti-aliasing edge halos that create messy stepped paths
  }

  return ImageTracer.imagedataToSVG({ width: params.width, height: params.height, data: pixels }, options)
}

/**
 * Core vectorization function. Runs in a Web Worker (or on the main thread as a fallback / in tests).
 *
 * - B&W: pre-smoothing -> threshold -> VTracer (WASM, spline mode); falls back to imagetracerjs.
 * - Color: pre-smoothing -> imagetracerjs color quantization + tracing.
 */
export async function traceImageDataToSVG(
  imageData: RasterImage,
  config: VectorizeConfig,
): Promise<{ svg: string; pathsCount: number }> {
  const { width, height } = imageData
  const params = smoothnessToParams(config.smoothness ?? DEFAULT_SMOOTHNESS, width, height)
  const speckle = Math.max(0, config.speckleFilter ?? 8)

  const rawSvg =
    config.mode === 'bw'
      ? await traceBlackAndWhite(imageData, config, params, speckle)
      : traceColor(imageData, config, params, speckle)

  const svg = setSvgViewport(rawSvg, params.width, params.height, width, height)

  return {
    svg,
    pathsCount: countSvgPaths(svg),
  }
}
