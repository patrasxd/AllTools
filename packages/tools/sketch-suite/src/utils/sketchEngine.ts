import { Point, SketchTool, ShapeFillMode, SelectionRect } from '../types'

export interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Parse hex color (#RRGGBB or #RGB or #RRGGBBAA) to RGBA
 */
export function hexToRgba(hex: string): RgbaColor {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (clean.length === 6) {
    clean += 'ff'
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0, a: 255 }
  }
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: num & 255,
  }
}

/**
 * Check if two colors match within a given tolerance
 */
export function colorMatch(data: Uint8ClampedArray, pos: number, target: RgbaColor, tolerance = 32): boolean {
  const rDiff = Math.abs(data[pos] - target.r)
  const gDiff = Math.abs(data[pos + 1] - target.g)
  const bDiff = Math.abs(data[pos + 2] - target.b)
  const aDiff = Math.abs(data[pos + 3] - target.a)
  return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance && aDiff <= tolerance
}

/**
 * Fast BFS / Scanline Flood Fill on ImageData
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 32,
): boolean {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data

  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) {
    return false
  }

  const startPos = (y0 * width + x0) * 4
  const targetColor: RgbaColor = {
    r: data[startPos],
    g: data[startPos + 1],
    b: data[startPos + 2],
    a: data[startPos + 3],
  }

  const replacement = hexToRgba(fillColorHex)

  // If start color matches replacement color within tolerance, nothing to do
  if (
    Math.abs(targetColor.r - replacement.r) <= 2 &&
    Math.abs(targetColor.g - replacement.g) <= 2 &&
    Math.abs(targetColor.b - replacement.b) <= 2 &&
    Math.abs(targetColor.a - replacement.a) <= 2
  ) {
    return false
  }

  // Linear byte queue for performance
  const queue: number[] = [x0, y0]
  const visited = new Uint8Array(width * height)
  visited[y0 * width + x0] = 1

  while (queue.length > 0) {
    const cy = queue.pop()!
    const cx = queue.pop()!

    const currentPos = (cy * width + cx) * 4
    data[currentPos] = replacement.r
    data[currentPos + 1] = replacement.g
    data[currentPos + 2] = replacement.b
    data[currentPos + 3] = replacement.a

    // 4-way neighbors
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0]
      const ny = neighbors[i][1]

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const index = ny * width + nx
        if (!visited[index]) {
          const nPos = index * 4
          if (colorMatch(data, nPos, targetColor, tolerance)) {
            visited[index] = 1
            queue.push(nx, ny)
          }
        }
      }
    }
  }

  return true
}

/**
 * Draw a shape onto a Canvas 2D context
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  tool: SketchTool,
  start: Point,
  end: Point,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number,
  fillMode: ShapeFillMode,
) {
  ctx.save()
  ctx.strokeStyle = strokeColor
  ctx.fillStyle = fillColor
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const shouldStroke = fillMode === 'outline' || fillMode === 'both'
  const shouldFill = fillMode === 'fill' || fillMode === 'both'

  const minX = Math.min(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  ctx.beginPath()

  switch (tool) {
    case 'line':
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      break

    case 'arrow': {
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const headLength = Math.max(12, strokeWidth * 3)

      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      // Arrow head
      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fillStyle = strokeColor
      ctx.fill()
      break
    }

    case 'rectangle':
      if (shouldFill) {
        ctx.fillRect(minX, minY, width, height)
      }
      if (shouldStroke) {
        ctx.strokeRect(minX, minY, width, height)
      }
      break

    case 'rounded-rect': {
      const radius = Math.min(16, width / 4, height / 4)
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(minX, minY, width, height, radius)
      } else {
        // Fallback for older browsers
        ctx.rect(minX, minY, width, height)
      }
      if (shouldFill) ctx.fill()
      if (shouldStroke) ctx.stroke()
      break
    }

    case 'ellipse': {
      const rx = width / 2
      const ry = height / 2
      const cx = minX + rx
      const cy = minY + ry
      ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
      if (shouldFill) ctx.fill()
      if (shouldStroke) ctx.stroke()
      break
    }

    case 'triangle': {
      ctx.moveTo(minX + width / 2, minY)
      ctx.lineTo(minX + width, minY + height)
      ctx.lineTo(minX, minY + height)
      ctx.closePath()
      if (shouldFill) ctx.fill()
      if (shouldStroke) ctx.stroke()
      break
    }

    default:
      break
  }

  ctx.restore()
}

/**
 * Get pointer position on canvas relative to its coordinate space
 */
export function getCanvasCoordinates(
  event: React.PointerEvent<HTMLCanvasElement> | PointerEvent,
  canvas: HTMLCanvasElement,
  zoom = 1,
): Point {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    return {
      x: Math.round((event.clientX - (rect ? rect.left : 0)) / (zoom || 1)),
      y: Math.round((event.clientY - (rect ? rect.top : 0)) / (zoom || 1)),
    }
  }
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: Math.round((event.clientX - rect.left) * scaleX),
    y: Math.round((event.clientY - rect.top) * scaleY),
  }
}

/**
 * Copy canvas content (or a specific bounding rect with optional polygon clipping mask) to clipboard
 */
export async function copyCanvasToClipboard(
  canvas: HTMLCanvasElement,
  cropRect?: { x: number; y: number; width: number; height: number },
  clipPoints?: Point[],
): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false
  }

  let sourceCanvas: HTMLCanvasElement = canvas
  if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
    const cropped = document.createElement('canvas')
    cropped.width = cropRect.width
    cropped.height = cropRect.height
    const cCtx = cropped.getContext('2d')
    if (cCtx) {
      if (clipPoints && clipPoints.length >= 3) {
        cCtx.save()
        cCtx.translate(-cropRect.x, -cropRect.y)
        cCtx.beginPath()
        cCtx.moveTo(clipPoints[0].x, clipPoints[0].y)
        for (let i = 1; i < clipPoints.length; i++) {
          cCtx.lineTo(clipPoints[i].x, clipPoints[i].y)
        }
        cCtx.closePath()
        cCtx.clip()
        cCtx.drawImage(canvas, 0, 0)
        cCtx.restore()
      } else {
        cCtx.drawImage(
          canvas,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          cropRect.width,
          cropRect.height,
        )
      }
      sourceCanvas = cropped
    }
  }

  return new Promise((resolve) => {
    sourceCanvas.toBlob((blob) => {
      if (!blob) {
        resolve(false)
        return
      }
      navigator.clipboard
        .write([new ClipboardItem({ 'image/png': blob })])
        .then(() => resolve(true))
        .catch(() => resolve(false))
    }, 'image/png')
  })
}

/**
 * Calculates bounding box from an arbitrary array of points
 */
export function getBoundingBoxFromPoints(points: Point[]): SelectionRect {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY)),
  }
}

/**
 * Renders a realistic graphite pencil stroke segment with natural paper tooth grain & opacity
 */
export function drawPencilSegment(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  size: number,
): void {
  const rgba = hexToRgba(color)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)))
  const radius = Math.max(0.5, size / 2)

  ctx.save()

  // 1. Semi-transparent core stroke (graphite core)
  ctx.strokeStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${size === 1 ? 0.75 : 0.4})`
  ctx.lineWidth = Math.max(0.75, size * 0.7)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()

  // 2. Micro-grain graphite texture particles along the stroke path
  const speckCountPerStep = Math.max(2, Math.min(8, Math.round(size * 1.5)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = from.x + dx * t
    const cy = from.y + dy * t

    for (let s = 0; s < speckCountPerStep; s++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.pow(Math.random(), 0.7) * radius
      const px = Math.round(cx + Math.cos(angle) * r)
      const py = Math.round(cy + Math.sin(angle) * r)
      const alpha = 0.15 + Math.random() * 0.45
      ctx.fillStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`
      ctx.fillRect(px, py, 1, 1)
    }
  }

  ctx.restore()
}

/**
 * Renders an initial realistic graphite pencil touch dot with micro-grain dispersion
 */
export function drawPencilDot(ctx: CanvasRenderingContext2D, point: Point, color: string, size: number): void {
  const rgba = hexToRgba(color)
  const radius = Math.max(0.5, size / 2)
  const specks = Math.max(4, Math.round(size * 4))

  ctx.save()

  ctx.fillStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${size === 1 ? 0.8 : 0.45})`
  ctx.beginPath()
  ctx.arc(point.x, point.y, Math.max(0.5, radius * 0.7), 0, Math.PI * 2)
  ctx.fill()

  for (let s = 0; s < specks; s++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.pow(Math.random(), 0.7) * radius
    const px = Math.round(point.x + Math.cos(angle) * r)
    const py = Math.round(point.y + Math.sin(angle) * r)
    const alpha = 0.15 + Math.random() * 0.45
    ctx.fillStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`
    ctx.fillRect(px, py, 1, 1)
  }

  ctx.restore()
}

/** Largest canvas side (px) the New/Resize dialogs allow; photo imports respect the same limit. */
export const MAX_CANVAS_SIZE = 4096

/**
 * Size a photo gets when it becomes the canvas: its own pixel size, scaled down proportionally
 * only if the longest side exceeds `max`.
 */
export function fitImageToCanvasLimit(
  width: number,
  height: number,
  max: number = MAX_CANVAS_SIZE,
): { width: number; height: number; wasScaled: boolean } {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const longest = Math.max(w, h)
  if (longest <= max) return { width: w, height: h, wasScaled: false }

  const ratio = max / longest
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
    wasScaled: true,
  }
}

/**
 * Zoom level (0.1 - 1) at which a whole canvas is visible inside a viewport.
 * Never zooms in past 100%; returns 1 when the viewport size is unknown.
 */
export function calculateFitZoom(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  min: number = 0.1,
  max: number = 1,
): number {
  if (!(contentWidth > 0) || !(contentHeight > 0) || !(viewportWidth > 0) || !(viewportHeight > 0)) return 1
  const fit = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight)
  return Math.max(min, Math.min(max, Math.floor(fit * 100) / 100))
}

/**
 * Parses the text of a canvas width/height field.
 * Returns a whole number of pixels in 1..max, or null when the text is empty, not a number or out of range.
 * The fields themselves never clamp what the user types; callers disable "Create" while this returns null.
 */
export function parseCanvasDimension(text: string, max: number = MAX_CANVAS_SIZE): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < 1 || rounded > max) return null
  return rounded
}

/**
 * Stroke metrics for the selection outline ("marching ants"), in canvas pixels.
 * The overlay is scaled by the view zoom, so below 100% the lines are made proportionally thicker
 * to stay about one screen pixel wide (otherwise they fade to a faint hairline on photos).
 */
export function getMarqueeStroke(zoom: number): { lineWidth: number; dash: number } {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const lineWidth = Math.max(1, 1 / safeZoom)
  return { lineWidth, dash: 4 * lineWidth }
}
