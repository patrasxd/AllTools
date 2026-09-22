import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CARD_LONG_MM,
  CARD_SHORT_MM,
  DEFAULT_PPM_DESKTOP,
  DEFAULT_PPM_MOBILE,
  RULER_STORAGE_KEY_PPM,
  getInitialPpm,
  calculatePpm,
  calculateCardHeightPx,
  calculateDpi,
  calculateMeasurements,
  formatMeasurement,
  clampPointer,
  clampLaser,
  generateTickMarks,
} from '../utils/rulerMath'

describe('rulerMath utilities', () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      // Ignore if localStorage unavailable
    }
  })

  describe('Standard Dimensions & PPM Initialization', () => {
    it('defines ISO 7810 ID-1 card dimensions accurately', () => {
      expect(CARD_LONG_MM).toBe(85.60)
      expect(CARD_SHORT_MM).toBe(53.98)
    })

    it('returns default desktop PPM when no storage is present and not mobile', () => {
      const ppm = getInitialPpm(false)
      expect(ppm).toBe(DEFAULT_PPM_DESKTOP)
    })

    it('returns default mobile PPM when isMobile is true', () => {
      const ppm = getInitialPpm(true)
      expect(ppm).toBe(DEFAULT_PPM_MOBILE)
    })

    it('retrieves saved PPM from localStorage if valid', () => {
      localStorage.setItem(RULER_STORAGE_KEY_PPM, '4.25')
      const ppm = getInitialPpm(false)
      expect(ppm).toBe(4.25)
    })

    it('falls back to default if saved PPM is invalid or non-numeric', () => {
      localStorage.setItem(RULER_STORAGE_KEY_PPM, 'not-a-number')
      const ppm = getInitialPpm(false)
      expect(ppm).toBe(DEFAULT_PPM_DESKTOP)
    })
  })

  describe('Calibration Math', () => {
    it('calculates pixels per mm correctly', () => {
      // 320 px for 85.6 mm card => ~3.738 ppm
      const ppm = calculatePpm(320, CARD_LONG_MM)
      expect(ppm).toBeCloseTo(320 / 85.6, 4)
    })

    it('returns 0 when targetWidthMm or cardWidthPx are zero or negative', () => {
      expect(calculatePpm(0, CARD_LONG_MM)).toBe(0)
      expect(calculatePpm(-50, CARD_LONG_MM)).toBe(0)
      expect(calculatePpm(300, 0)).toBe(0)
    })

    it('calculates proportional card height based on aspect ratio', () => {
      // Card in landscape: width 342px, long side 85.6mm, short side 53.98mm
      const height = calculateCardHeightPx(342, CARD_LONG_MM, CARD_SHORT_MM)
      const expected = Math.round(342 * (53.98 / 85.60))
      expect(height).toBe(expected)
    })

    it('calculates proportional card height in portrait orientation', () => {
      // Card in portrait: width 216px, short side 53.98mm, long side 85.60mm
      const height = calculateCardHeightPx(216, CARD_SHORT_MM, CARD_LONG_MM)
      const expected = Math.round(216 * (85.60 / 53.98))
      expect(height).toBe(expected)
    })

    it('estimates DPI from PPM accurately', () => {
      // Standard 96 DPI: 96 / 25.4 = 3.7795 ppm => DPI should be 96
      expect(calculateDpi(3.78)).toBe(96)
      // High-res mobile screen: ~5.5 ppm => 5.5 * 25.4 = ~140 DPI
      expect(calculateDpi(5.5)).toBe(140)
      expect(calculateDpi(0)).toBe(0)
    })
  })

  describe('Measurement Calculations', () => {
    it('calculates 2D distances and diagonal from caliper position', () => {
      const ppm = 4.0 // 4 px per mm
      const caliper = { x: 400, y: 300 } // 100mm X, 75mm Y

      const res = calculateMeasurements(caliper, ppm)

      expect(res.mmX).toBe(100)
      expect(res.mmY).toBe(75)

      expect(res.cmX).toBe(10)
      expect(res.cmY).toBe(7.5)

      expect(res.inX).toBeCloseTo(100 / 25.4, 3)
      expect(res.inY).toBeCloseTo(75 / 25.4, 3)

      // Diagonal: 3-4-5 triangle => 100^2 + 75^2 = 10000 + 5625 = 15625, sqrt = 125
      expect(res.diagMm).toBe(125)
      expect(res.diagCm).toBe(12.5)
      expect(res.diagIn).toBeCloseTo(125 / 25.4, 3)
      expect(res.estimatedDpi).toBe(Math.round(4.0 * 25.4))
    })

    it('handles zero caliper positions cleanly', () => {
      const res = calculateMeasurements({ x: 0, y: 0 }, 3.78)
      expect(res.mmX).toBe(0)
      expect(res.mmY).toBe(0)
      expect(res.diagMm).toBe(0)
    })

    it('formats measurements according to cm and inch units', () => {
      expect(formatMeasurement(12.3456, 'cm')).toBe('12.35 CM')
      expect(formatMeasurement(5.6789, 'inch')).toBe('5.68 IN')
    })
  })

  describe('Pointer & Laser Clamping', () => {
    const mockRect = {
      width: 800,
      height: 600,
      right: 900,
      bottom: 700,
    }

    it('computes distance from bottom-right corner correctly', () => {
      // clientX = 800, clientY = 600
      // distance from right = 900 - 800 = 100px
      // distance from bottom = 700 - 600 = 100px
      const pos = clampPointer(800, 600, mockRect)
      expect(pos).toEqual({ x: 100, y: 100 })
    })

    it('clamps clicks outside the bounds to the workspace limits', () => {
      // Clicked far past right: clientX = 1000 => distRight clamped to 0
      const outsideRight = clampPointer(1000, 500, mockRect)
      expect(outsideRight.x).toBe(0)

      // Clicked far left: clientX = 0 => distRight = 900, clamped to rect.width (800)
      const outsideLeft = clampPointer(0, 500, mockRect)
      expect(outsideLeft.x).toBe(800)
    })

    it('clamps laser crosshair inside the workspace ruler bounds', () => {
      const dims = { width: 800, height: 600 }
      const rulerSize = 60
      const caliper = { x: 200, y: 150 }

      const laser = clampLaser(caliper, dims, rulerSize)
      // laserX = width - caliper.x = 800 - 200 = 600
      // laserY = height - caliper.y = 600 - 150 = 450
      expect(laser.laserX).toBe(600)
      expect(laser.laserY).toBe(450)

      // Near edge clamping: caliper distance 20 => laserX = 780, clamped to width - rulerSize (740)
      const nearEdge = clampLaser({ x: 20, y: 20 }, dims, rulerSize)
      expect(nearEdge.laserX).toBe(740)
      expect(nearEdge.laserY).toBe(540)
    })
  })

  describe('Ruler Graduation Tick Marks', () => {
    it('generates graduation tick marks with correct intervals and labels', () => {
      const ppm = 4.0
      const rulerSize = 60
      const totalSpan = 500
      const maxMm = 25

      const ticks = generateTickMarks(maxMm, ppm, rulerSize, totalSpan)

      expect(ticks.length).toBe(26) // 0 to 25 mm inclusive

      // Tick 0: 0 cm
      expect(ticks[0].isCm).toBe(true)
      expect(ticks[0].tickLength).toBe(28)
      expect(ticks[0].label).toBe('0')

      // Tick 5: 5 mm (half-cm)
      expect(ticks[5].isHalfCm).toBe(true)
      expect(ticks[5].isCm).toBe(false)
      expect(ticks[5].tickLength).toBe(18)
      expect(ticks[5].label).toBeUndefined()

      // Tick 10: 1 cm
      expect(ticks[10].isCm).toBe(true)
      expect(ticks[10].tickLength).toBe(28)
      expect(ticks[10].label).toBe('1')

      // Tick 1: 1 mm (minor tick)
      expect(ticks[1].isCm).toBe(false)
      expect(ticks[1].isHalfCm).toBe(false)
      expect(ticks[1].tickLength).toBe(10)
    })

    it('returns empty array if maxMm or ppm is invalid', () => {
      expect(generateTickMarks(0, 4, 60, 500)).toEqual([])
      expect(generateTickMarks(20, 0, 60, 500)).toEqual([])
    })
  })
})
