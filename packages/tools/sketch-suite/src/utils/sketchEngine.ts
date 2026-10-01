import { Point, SketchTool, ShapeFillMode } from '../types'

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
export function colorMatch(
  data: Uint8ClampedArray,
  pos: number,
  target: RgbaColor,
  tolerance = 32
): boolean {
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
  tolerance = 32
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
  fillMode: ShapeFillMode
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
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      )
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
  zoom = 1
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
 * Copy canvas content (or a specific bounding rect) to clipboard
 */
export async function copyCanvasToClipboard(
  canvas: HTMLCanvasElement,
  cropRect?: { x: number; y: number; width: number; height: number }
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
      cCtx.drawImage(
        canvas,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        cropRect.width,
        cropRect.height
      )
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

