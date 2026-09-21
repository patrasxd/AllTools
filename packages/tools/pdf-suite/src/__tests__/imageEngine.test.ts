import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  DEFAULT_CORNERS,
  isDefaultCorners,
  applyDocumentFilter,
  rotateCanvas,
  warpPerspective,
} from '../utils/imageEngine'
import type { Point2D } from '../types'

describe('PDF Suite imageEngine', () => {
  describe('isDefaultCorners', () => {
    it('returns true for exact default corners', () => {
      expect(isDefaultCorners(DEFAULT_CORNERS)).toBe(true)
    })

    it('returns true for corners within tolerance', () => {
      const nearCorners: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0.002, y: 0.003 },
        { x: 0.998, y: 0.001 },
        { x: 0.996, y: 0.997 },
        { x: 0.004, y: 0.999 },
      ]
      expect(isDefaultCorners(nearCorners)).toBe(true)
    })

    it('returns false when any corner is noticeably moved', () => {
      const movedCorners: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0.15, y: 0.05 },
        { x: 0.92, y: 0.08 },
        { x: 0.88, y: 0.95 },
        { x: 0.12, y: 0.91 },
      ]
      expect(isDefaultCorners(movedCorners)).toBe(false)
    })
  })

  describe('rotateCanvas', () => {
    it('swaps width and height for 90 degree rotation', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 100
      const rotated = rotateCanvas(canvas, 90)
      expect(rotated.width).toBe(100)
      expect(rotated.height).toBe(200)
    })

    it('preserves width and height for 180 degree rotation', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 100
      const rotated = rotateCanvas(canvas, 180)
      expect(rotated.width).toBe(200)
      expect(rotated.height).toBe(100)
    })

    it('swaps width and height for 270 degree rotation', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150
      const rotated = rotateCanvas(canvas, 270)
      expect(rotated.width).toBe(150)
      expect(rotated.height).toBe(300)
    })

    it('returns original canvas for 0 degree rotation', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 100
      const rotated = rotateCanvas(canvas, 0)
      expect(rotated).toBe(canvas)
    })
  })

  describe('Canvas Filters & Perspective with Mock Context', () => {
    let mockPixelData: Uint8ClampedArray
    const originalGetContext = HTMLCanvasElement.prototype.getContext

    beforeEach(() => {
      mockPixelData = new Uint8ClampedArray(10 * 10 * 4)
      // Fill with red (200, 50, 50, 255)
      for (let i = 0; i < mockPixelData.length; i += 4) {
        mockPixelData[i] = 200
        mockPixelData[i + 1] = 50
        mockPixelData[i + 2] = 50
        mockPixelData[i + 3] = 255
      }

      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
          if (w === 10 && h === 10) {
            return { data: mockPixelData, width: w, height: h }
          }
          const buf = new Uint8ClampedArray(w * h * 4)
          for (let i = 0; i < buf.length; i += 4) {
            buf[i] = 200
            buf[i + 1] = 50
            buf[i + 2] = 50
            buf[i + 3] = 255
          }
          return { data: buf, width: w, height: h }
        }),
        createImageData: vi.fn((w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        })),
        putImageData: vi.fn((imgData: ImageData) => {
          if (mockPixelData.length >= imgData.data.length) {
            mockPixelData.set(imgData.data)
          }
        }),
      }))
    })

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = originalGetContext
    })

    it('applyDocumentFilter original leaves pixels intact', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 10
      canvas.height = 10
      const before = mockPixelData[0]
      applyDocumentFilter(canvas, 'original')
      expect(mockPixelData[0]).toBe(before)
    })

    it('applyDocumentFilter grayscale sets equal R, G, B channels', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 10
      canvas.height = 10
      applyDocumentFilter(canvas, 'grayscale')
      expect(mockPixelData[0]).toBe(mockPixelData[1])
      expect(mockPixelData[1]).toBe(mockPixelData[2])
      expect(mockPixelData[3]).toBe(255)
    })

    it('applyDocumentFilter bw thresholds to 0 or 255', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 10
      canvas.height = 10
      applyDocumentFilter(canvas, 'bw')
      expect(mockPixelData[0] === 0 || mockPixelData[0] === 255).toBe(true)
      expect(mockPixelData[1]).toBe(mockPixelData[0])
      expect(mockPixelData[2]).toBe(mockPixelData[0])
    })

    it('applyDocumentFilter contrast processes pixel channels', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 10
      canvas.height = 10
      applyDocumentFilter(canvas, 'contrast')
      expect(mockPixelData[3]).toBe(255)
    })

    it('warpPerspective returns canvas with calculated dimensions', () => {
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = 400
      srcCanvas.height = 600

      const corners: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.12 },
        { x: 0.85, y: 0.9 },
        { x: 0.15, y: 0.88 },
      ]

      const warped = warpPerspective(srcCanvas, corners, 400, 600)
      expect(warped).toBeInstanceOf(HTMLCanvasElement)
      expect(warped.width).toBeGreaterThan(0)
      expect(warped.height).toBeGreaterThan(0)
    })

    it('warpPerspective uses fast path for default corners', () => {
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = 300
      srcCanvas.height = 400

      const warped = warpPerspective(srcCanvas, DEFAULT_CORNERS, 300, 400)
      expect(warped.width).toBe(300)
      expect(warped.height).toBe(400)
    })
  })
})
