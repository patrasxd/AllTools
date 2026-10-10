import { describe, it, expect } from 'vitest'
import {
  hexToRgba,
  colorMatch,
  floodFill,
  getCanvasCoordinates,
  fitImageToCanvasLimit,
  calculateFitZoom,
  parseCanvasDimension,
  getMarqueeStroke,
  MAX_CANVAS_SIZE,
} from '../utils/sketchEngine'

describe('hexToRgba', () => {
  it('parses standard 6-character hex', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    expect(hexToRgba('#00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 255 })
    expect(hexToRgba('#0000ff')).toEqual({ r: 0, g: 0, b: 255, a: 255 })
  })

  it('parses 3-character short hex', () => {
    expect(hexToRgba('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
    expect(hexToRgba('#000')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
    expect(hexToRgba('#f0a')).toEqual({ r: 255, g: 0, b: 170, a: 255 })
  })

  it('parses hex without leading hash', () => {
    expect(hexToRgba('ffffff')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
  })

  it('handles invalid hex gracefully', () => {
    expect(hexToRgba('invalid')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
  })
})

describe('colorMatch', () => {
  it('matches identical colors', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255])
    expect(colorMatch(data, 0, { r: 255, g: 0, b: 0, a: 255 }, 10)).toBe(true)
  })

  it('matches within tolerance', () => {
    const data = new Uint8ClampedArray([250, 5, 5, 255])
    expect(colorMatch(data, 0, { r: 255, g: 0, b: 0, a: 255 }, 10)).toBe(true)
  })

  it('rejects outside tolerance', () => {
    const data = new Uint8ClampedArray([200, 50, 0, 255])
    expect(colorMatch(data, 0, { r: 255, g: 0, b: 0, a: 255 }, 10)).toBe(false)
  })
})

describe('floodFill', () => {
  function createMockImageData(width: number, height: number, fillColor: [number, number, number, number]): ImageData {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor[0]
      data[i + 1] = fillColor[1]
      data[i + 2] = fillColor[2]
      data[i + 3] = fillColor[3]
    }
    return {
      width,
      height,
      data,
      colorSpace: 'srgb',
    } as ImageData
  }

  it('flood fills a solid color area', () => {
    const imgData = createMockImageData(4, 4, [255, 255, 255, 255])
    const changed = floodFill(imgData, 0, 0, '#ff0000', 10)
    expect(changed).toBe(true)

    // Check pixel at (0, 0)
    expect(imgData.data[0]).toBe(255)
    expect(imgData.data[1]).toBe(0)
    expect(imgData.data[2]).toBe(0)

    // Check pixel at (3, 3)
    const lastIdx = (3 * 4 + 3) * 4
    expect(imgData.data[lastIdx]).toBe(255)
    expect(imgData.data[lastIdx + 1]).toBe(0)
    expect(imgData.data[lastIdx + 2]).toBe(0)
  })

  it('returns false when clicking outside canvas boundaries', () => {
    const imgData = createMockImageData(4, 4, [255, 255, 255, 255])
    expect(floodFill(imgData, -1, 0, '#000000')).toBe(false)
    expect(floodFill(imgData, 10, 2, '#000000')).toBe(false)
  })

  it('returns false when clicking on pixel already matching the fill color', () => {
    const imgData = createMockImageData(4, 4, [255, 0, 0, 255])
    expect(floodFill(imgData, 1, 1, '#ff0000', 10)).toBe(false)
  })
})

describe('getCanvasCoordinates', () => {
  it('scales coordinates accurately based on canvas bounding rect', () => {
    const canvas = {
      width: 800,
      height: 600,
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 400,
        height: 300,
      }),
    } as unknown as HTMLCanvasElement

    const pointer = {
      clientX: 200,
      clientY: 150,
    } as unknown as PointerEvent

    const pos = getCanvasCoordinates(pointer, canvas)
    // clientX - left = 100, scaleX = 800 / 400 = 2 -> x = 200
    // clientY - top = 100, scaleY = 600 / 300 = 2 -> y = 200
    expect(pos.x).toBe(200)
    expect(pos.y).toBe(200)
  })
})

describe('getBoundingBoxFromPoints', () => {
  it('returns zero box for empty points array', async () => {
    const { getBoundingBoxFromPoints } = await import('../utils/sketchEngine')
    expect(getBoundingBoxFromPoints([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('calculates bounding box from arbitrary polygon vertices', async () => {
    const { getBoundingBoxFromPoints } = await import('../utils/sketchEngine')
    const points = [
      { x: 50, y: 100 },
      { x: 200, y: 80 },
      { x: 180, y: 250 },
      { x: 30, y: 220 },
    ]
    const bbox = getBoundingBoxFromPoints(points)
    expect(bbox).toEqual({
      x: 30,
      y: 80,
      width: 170, // 200 - 30
      height: 170, // 250 - 80
    })
  })
})

describe('copyCanvasToClipboard', () => {
  it('returns false when clipboard API is unavailable', async () => {
    const { copyCanvasToClipboard } = await import('../utils/sketchEngine')
    const canvas = document.createElement('canvas')
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = await copyCanvasToClipboard(canvas)
    expect(result).toBe(false)

    // Restore
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    })
  })
})

describe('drawPencilDot & drawPencilSegment', () => {
  it('renders realistic graphite pencil dot without error', async () => {
    const { drawPencilDot } = await import('../utils/sketchEngine')
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    expect(() => drawPencilDot(ctx, { x: 50, y: 50 }, '#000000', 2)).not.toThrow()
  })

  it('renders realistic graphite pencil stroke segment without error', async () => {
    const { drawPencilSegment } = await import('../utils/sketchEngine')
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    expect(() => drawPencilSegment(ctx, { x: 10, y: 10 }, { x: 50, y: 50 }, '#333333', 4)).not.toThrow()
  })
})

describe('fitImageToCanvasLimit', () => {
  it('keeps the photo size 1:1 when it fits', () => {
    expect(fitImageToCanvasLimit(1200, 800)).toEqual({ width: 1200, height: 800, wasScaled: false })
    expect(fitImageToCanvasLimit(MAX_CANVAS_SIZE, 100)).toEqual({ width: 4096, height: 100, wasScaled: false })
  })

  it('scales a landscape photo down proportionally to the limit', () => {
    expect(fitImageToCanvasLimit(8192, 4096)).toEqual({ width: 4096, height: 2048, wasScaled: true })
  })

  it('scales a portrait photo down proportionally to the limit', () => {
    expect(fitImageToCanvasLimit(3000, 12000)).toEqual({ width: 1024, height: 4096, wasScaled: true })
  })

  it('never returns a zero-sized canvas', () => {
    const r = fitImageToCanvasLimit(100000, 1)
    expect(r.width).toBe(4096)
    expect(r.height).toBe(1)
    expect(fitImageToCanvasLimit(0, 0)).toEqual({ width: 1, height: 1, wasScaled: false })
  })

  it('honours a custom limit', () => {
    expect(fitImageToCanvasLimit(1000, 500, 250)).toEqual({ width: 250, height: 125, wasScaled: true })
  })
})

describe('calculateFitZoom', () => {
  it('returns 1 when the canvas already fits', () => {
    expect(calculateFitZoom(800, 600, 1200, 900)).toBe(1)
  })

  it('shrinks to fit the limiting side', () => {
    expect(calculateFitZoom(4000, 3000, 1000, 1000)).toBe(0.25)
    expect(calculateFitZoom(1000, 4000, 1000, 1000)).toBe(0.25)
  })

  it('never goes below the minimum zoom', () => {
    expect(calculateFitZoom(4096, 4096, 100, 100)).toBe(0.1)
  })

  it('falls back to 1 for unknown or invalid sizes', () => {
    expect(calculateFitZoom(800, 600, 0, 0)).toBe(1)
    expect(calculateFitZoom(0, 600, 1000, 1000)).toBe(1)
    expect(calculateFitZoom(Number.NaN, 600, 1000, 1000)).toBe(1)
  })
})

describe('parseCanvasDimension', () => {
  it('accepts whole pixel values from 1 to the limit', () => {
    expect(parseCanvasDimension('1')).toBe(1)
    expect(parseCanvasDimension('200')).toBe(200)
    expect(parseCanvasDimension(' 640 ')).toBe(640)
    expect(parseCanvasDimension('4096')).toBe(4096)
  })

  it('rounds fractional input to whole pixels', () => {
    expect(parseCanvasDimension('200.4')).toBe(200)
    expect(parseCanvasDimension('200.6')).toBe(201)
  })

  it('rejects zero, negatives, empty and non-numeric text', () => {
    expect(parseCanvasDimension('0')).toBeNull()
    expect(parseCanvasDimension('0.2')).toBeNull()
    expect(parseCanvasDimension('-5')).toBeNull()
    expect(parseCanvasDimension('')).toBeNull()
    expect(parseCanvasDimension('   ')).toBeNull()
    expect(parseCanvasDimension('abc')).toBeNull()
  })

  it('rejects values above the limit', () => {
    expect(parseCanvasDimension('4097')).toBeNull()
    expect(parseCanvasDimension('100000')).toBeNull()
    expect(parseCanvasDimension('300', 200)).toBeNull()
  })
})

describe('getMarqueeStroke', () => {
  it('uses a 1 px line and 4 px dashes at 100% and above', () => {
    expect(getMarqueeStroke(1)).toEqual({ lineWidth: 1, dash: 4 })
    expect(getMarqueeStroke(3)).toEqual({ lineWidth: 1, dash: 4 })
  })

  it('thickens the outline when zoomed out so it stays ~1 screen pixel', () => {
    expect(getMarqueeStroke(0.5)).toEqual({ lineWidth: 2, dash: 8 })
    expect(getMarqueeStroke(0.25)).toEqual({ lineWidth: 4, dash: 16 })
  })

  it('falls back to defaults for invalid zoom values', () => {
    expect(getMarqueeStroke(0)).toEqual({ lineWidth: 1, dash: 4 })
    expect(getMarqueeStroke(Number.NaN)).toEqual({ lineWidth: 1, dash: 4 })
    expect(getMarqueeStroke(-2)).toEqual({ lineWidth: 1, dash: 4 })
  })
})
