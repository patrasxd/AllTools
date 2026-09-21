import type { DocumentFilter, EditableImageItem, Point2D } from '../types'

/**
 * Loads an image URL or Blob into an HTMLImageElement asynchronously.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/**
 * Default normalized 4 corners (top-left, top-right, bottom-right, bottom-left).
 */
export const DEFAULT_CORNERS: [Point2D, Point2D, Point2D, Point2D] = [
  { x: 0, y: 0 }, // Top-Left
  { x: 1, y: 0 }, // Top-Right
  { x: 1, y: 1 }, // Bottom-Right
  { x: 0, y: 1 }, // Bottom-Left
]

/**
 * Checks if 4 corners are approximately default (full frame, within 0.5% tolerance).
 */
export function isDefaultCorners(corners: [Point2D, Point2D, Point2D, Point2D]): boolean {
  const eps = 0.008
  return (
    Math.abs(corners[0].x - 0) < eps &&
    Math.abs(corners[0].y - 0) < eps &&
    Math.abs(corners[1].x - 1) < eps &&
    Math.abs(corners[1].y - 0) < eps &&
    Math.abs(corners[2].x - 1) < eps &&
    Math.abs(corners[2].y - 1) < eps &&
    Math.abs(corners[3].x - 0) < eps &&
    Math.abs(corners[3].y - 1) < eps
  )
}

/**
 * Performs closed-form 4-point projective homography (Heckbert warp) to straighten
 * a quadrilateral document scan into a clean axis-aligned rectangle with bilinear interpolation.
 */
export function warpPerspective(
  image: CanvasImageSource,
  corners: [Point2D, Point2D, Point2D, Point2D],
  srcWidth: number,
  srcHeight: number,
  maxDim: number = 2400
): HTMLCanvasElement {
  // Pixel coordinates in source image
  const p0 = { x: corners[0].x * srcWidth, y: corners[0].y * srcHeight }
  const p1 = { x: corners[1].x * srcWidth, y: corners[1].y * srcHeight }
  const p2 = { x: corners[2].x * srcWidth, y: corners[2].y * srcHeight }
  const p3 = { x: corners[3].x * srcWidth, y: corners[3].y * srcHeight }

  // Estimate natural rectified output dimensions based on edge lengths
  const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y)
  const bottomW = Math.hypot(p2.x - p3.x, p2.y - p3.y)
  const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y)
  const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y)

  let outW = Math.max(10, Math.round(Math.max(topW, bottomW)))
  let outH = Math.max(10, Math.round(Math.max(leftH, rightH)))

  // Scale down if exceeding maximum synthesis dimension
  const maxSide = Math.max(outW, outH)
  if (maxSide > maxDim) {
    const scale = maxDim / maxSide
    outW = Math.round(outW * scale)
    outH = Math.round(outH * scale)
  }

  // Fast path: if corners are full frame, draw directly
  if (isDefaultCorners(corners)) {
    const directCanvas = document.createElement('canvas')
    directCanvas.width = outW
    directCanvas.height = outH
    const ctx = directCanvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(image, 0, 0, outW, outH)
    }
    return directCanvas
  }

  // Draw source image to an offscreen canvas to obtain raw pixel buffer
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcWidth
  srcCanvas.height = srcHeight
  const srcCtx = srcCanvas.getContext('2d')
  if (!srcCtx) {
    const fallback = document.createElement('canvas')
    fallback.width = outW
    fallback.height = outH
    return fallback
  }
  srcCtx.drawImage(image, 0, 0, srcWidth, srcHeight)
  const srcImgData = srcCtx.getImageData(0, 0, srcWidth, srcHeight)
  const srcPixels = srcImgData.data

  // Create destination canvas
  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = outW
  dstCanvas.height = outH
  const dstCtx = dstCanvas.getContext('2d')
  if (!dstCtx) return dstCanvas
  const dstImgData = dstCtx.createImageData(outW, outH)
  const dstPixels = dstImgData.data

  // Compute Heckbert mapping matrix from unit square [0,1]^2 to source quad (p0, p1, p2, p3)
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const sx = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const sy = p0.y - p1.y + p2.y - p3.y

  const det = dx1 * dy2 - dy1 * dx2
  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number

  if (Math.abs(det) < 1e-7) {
    // Parallelogram / Affine
    g = 0
    h = 0
    a = p1.x - p0.x
    b = p3.x - p0.x
    c = p0.x
    d = p1.y - p0.y
    e = p3.y - p0.y
    f = p0.y
  } else {
    g = (sx * dy2 - sy * dx2) / det
    h = (dx1 * sy - dy1 * sx) / det
    a = p1.x - p0.x + g * p1.x
    b = p3.x - p0.x + h * p3.x
    c = p0.x
    d = p1.y - p0.y + g * p1.y
    e = p3.y - p0.y + h * p3.y
    f = p0.y
  }

  // Map each destination pixel (u, v) back to source image (srcX, srcY)
  for (let v = 0; v < outH; v++) {
    const vNorm = v / (outH - 1 || 1)
    const rowOffset = v * outW * 4

    for (let u = 0; u < outW; u++) {
      const uNorm = u / (outW - 1 || 1)
      const w = g * uNorm + h * vNorm + 1
      const invW = 1 / (w || 0.00001)
      const srcX = (a * uNorm + b * vNorm + c) * invW
      const srcY = (d * uNorm + e * vNorm + f) * invW

      // Bilinear interpolation
      const x0 = Math.floor(srcX)
      const y0 = Math.floor(srcY)
      const x1 = Math.min(srcWidth - 1, Math.max(0, x0 + 1))
      const y1 = Math.min(srcHeight - 1, Math.max(0, y0 + 1))
      const cx0 = Math.min(srcWidth - 1, Math.max(0, x0))
      const cy0 = Math.min(srcHeight - 1, Math.max(0, y0))

      const fx = Math.max(0, Math.min(1, srcX - x0))
      const fy = Math.max(0, Math.min(1, srcY - y0))
      const w00 = (1 - fx) * (1 - fy)
      const w10 = fx * (1 - fy)
      const w01 = (1 - fx) * fy
      const w11 = fx * fy

      const idx00 = (cy0 * srcWidth + cx0) * 4
      const idx10 = (cy0 * srcWidth + x1) * 4
      const idx01 = (y1 * srcWidth + cx0) * 4
      const idx11 = (y1 * srcWidth + x1) * 4

      const dstIdx = rowOffset + u * 4
      dstPixels[dstIdx] =
        w00 * srcPixels[idx00] +
        w10 * srcPixels[idx10] +
        w01 * srcPixels[idx01] +
        w11 * srcPixels[idx11]
      dstPixels[dstIdx + 1] =
        w00 * srcPixels[idx00 + 1] +
        w10 * srcPixels[idx10 + 1] +
        w01 * srcPixels[idx01 + 1] +
        w11 * srcPixels[idx11 + 1]
      dstPixels[dstIdx + 2] =
        w00 * srcPixels[idx00 + 2] +
        w10 * srcPixels[idx10 + 2] +
        w01 * srcPixels[idx01 + 2] +
        w11 * srcPixels[idx11 + 2]
      dstPixels[dstIdx + 3] = 255
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0)
  return dstCanvas
}

/**
 * Applies document enhancement filters (grayscale, B&W scan thresholding, contrast).
 */
export function applyDocumentFilter(
  canvas: HTMLCanvasElement,
  filter: DocumentFilter
): HTMLCanvasElement {
  if (filter === 'original') return canvas

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  const len = data.length

  if (filter === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }
  } else if (filter === 'bw') {
    // Document scanner B&W: high-contrast thresholding with brightness curve
    // Cleans desk/shadow background to pure white (#fff) and text to dark black (#000)
    for (let i = 0; i < len; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const val = lum > 140 ? 255 : 0
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }
  } else if (filter === 'contrast') {
    // Enhanced document contrast: removes gray paper tints and sharpens text
    const factor = 1.55
    for (let i = 0; i < len; i += 4) {
      for (let c = 0; c < 3; c++) {
        let val = data[i + c]
        val = (val - 128) * factor + 128 + 18
        data[i + c] = Math.max(0, Math.min(255, Math.round(val)))
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas
}

/**
 * Rotates a canvas by 0, 90, 180, or 270 degrees.
 */
export function rotateCanvas(
  canvas: HTMLCanvasElement,
  rotationDegrees: number
): HTMLCanvasElement {
  const normDeg = ((rotationDegrees % 360) + 360) % 360
  if (normDeg === 0) return canvas

  const rotated = document.createElement('canvas')
  const isSwap = normDeg === 90 || normDeg === 270
  rotated.width = isSwap ? canvas.height : canvas.width
  rotated.height = isSwap ? canvas.width : canvas.height

  const ctx = rotated.getContext('2d')
  if (ctx) {
    ctx.translate(rotated.width / 2, rotated.height / 2)
    ctx.rotate((normDeg * Math.PI) / 180)
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
  }

  return rotated
}

/**
 * Processes an editable image item through the complete pipeline:
 * Perspective warp -> Rotation -> Filter -> Output as JPEG Blob.
 */
export async function processEditableImage(
  item: EditableImageItem,
  maxDim: number = 2400
): Promise<Blob> {
  const img = await loadImageElement(item.originalUrl)
  const warped = warpPerspective(img, item.corners, item.width, item.height, maxDim)
  const rotated = rotateCanvas(warped, item.rotation)
  const filtered = applyDocumentFilter(rotated, item.filter)

  return new Promise((resolve, reject) => {
    filtered.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to encode image to blob'))
      },
      'image/jpeg',
      0.92
    )
  })
}
