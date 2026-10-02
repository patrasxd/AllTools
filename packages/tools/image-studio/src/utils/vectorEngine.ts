import ImageTracer, { type ImageTracerOptions } from 'imagetracerjs'
import type { VectorizeConfig } from '../types'

export const DEFAULT_MAX_VECTOR_DIMENSION = 2000

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

/**
 * Ensures the SVG string has a proper viewBox and responsive attributes.
 */
export function sanitizeSvgOutput(rawSvg: string, width: number, height: number): string {
  let cleaned = rawSvg.trim()

  // Ensure viewBox exists
  if (!/viewBox=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}" `)
  }

  return cleaned
}

/**
 * Core vectorization function: runs ImageTracer with given configuration.
 * Can be executed in a Web Worker or in unit tests.
 */
export function traceImageDataToSVG(
  imageData: { width: number; height: number; data: Uint8ClampedArray },
  config: VectorizeConfig,
): { svg: string; pathsCount: number } {
  const { width, height } = imageData
  let pixelData = imageData.data

  // Curve smoothing presets mapping
  // Low/Medium/High control straight line (ltres) and quadratic curve (qtres) tolerance.
  // Pre-blur is kept at 0 to avoid blurring sharp edges into wide color-gradient halos,
  // which causes ImageTracer to generate wavy, stepped "brush-painted" contour bands.
  let ltres = 1.0
  let qtres = 1.0
  let blurradius = 0
  let blurdelta = 20
  let roundcoords = 1

  if (config.smoothing === 'low') {
    // Sharp / crisp mode (pixel art, technical schematics, logos): tight curves, faithful to geometry
    ltres = 1.0
    qtres = 0.5
    blurradius = 0
    blurdelta = 20
    roundcoords = 1
  } else if (config.smoothing === 'high') {
    // High smoothing mode (organic illustrations, flowing curves): relaxed quadratic spline tolerance
    ltres = 0.5
    qtres = 1.2
    blurradius = 0
    blurdelta = 20
    roundcoords = 1
  }

  const speckle = config.speckleFilter !== undefined ? config.speckleFilter : 8

  const baseOptions: ImageTracerOptions = {
    ltres,
    qtres,
    pathomit: Math.max(0, speckle),
    rightangleenhance: config.rightAngleEnhance !== undefined ? Boolean(config.rightAngleEnhance) : true,
    linefilter: config.lineFilter !== undefined ? Boolean(config.lineFilter) : true,
    roundcoords,
    blurradius,
    blurdelta,
    strokewidth: 0,
    viewbox: true,
    desc: false,
  }

  if (config.mode === 'bw') {
    // Binary Black & White mode
    const threshold = Math.max(0, Math.min(255, config.bwThreshold))
    const totalPixels = width * height
    const binaryData = new Uint8ClampedArray(totalPixels * 4)

    for (let i = 0; i < totalPixels * 4; i += 4) {
      const r = pixelData[i]
      const g = pixelData[i + 1]
      const b = pixelData[i + 2]
      const a = pixelData[i + 3]

      // Standard sRGB luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b

      if (a < 64) {
        // Transparent is considered white background
        binaryData[i] = 255
        binaryData[i + 1] = 255
        binaryData[i + 2] = 255
        binaryData[i + 3] = 255
      } else {
        const val = luminance < threshold ? 0 : 255
        binaryData[i] = val
        binaryData[i + 1] = val
        binaryData[i + 2] = val
        binaryData[i + 3] = 255
      }
    }

    pixelData = binaryData
    baseOptions.numberofcolors = 2
    baseOptions.colorquantcycles = 1
    baseOptions.colorsampling = 0
    baseOptions.pal = [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ]
  } else {
    // Full color mode
    const colors = Math.max(2, Math.min(64, Math.round(config.numberOfColors)))
    baseOptions.numberofcolors = colors
    baseOptions.colorsampling = 2 // selective sampling
    baseOptions.colorquantcycles = 3
    baseOptions.mincolorratio = 0.015 // drop anti-aliasing edge halos that create messy stepped paths
  }

  const rawSvg = ImageTracer.imagedataToSVG(
    {
      width,
      height,
      data: pixelData,
    },
    baseOptions,
  )

  const sanitized = sanitizeSvgOutput(rawSvg, width, height)
  const pathsCount = countSvgPaths(sanitized)

  return {
    svg: sanitized,
    pathsCount,
  }
}
