import { describe, it, expect } from 'vitest'
import {
  calculateCalibratedTilt,
  calculateAngleBetween,
  normalizeHeading,
  getCardinalDirection,
  requiresOrientationPermission,
  detectPhoneOrientation,
  calculateSlopePercent,
  calculateEdgeLevel,
} from '../utils/sensorUtils'

describe('Sensor and Math Utilities (level-protractor)', () => {
  describe('calculateCalibratedTilt', () => {
    it('detects perfect level within default 0.5 deg tolerance', () => {
      const result = calculateCalibratedTilt(0, 0, 0, 0)
      expect(result.pitch).toBe(0)
      expect(result.roll).toBe(0)
      expect(result.isLevel).toBe(true)
    })

    it('detects level when slight tilt is below tolerance', () => {
      const result = calculateCalibratedTilt(0.3, -0.4, 0, 0)
      expect(result.pitch).toBe(0.3)
      expect(result.roll).toBe(-0.4)
      expect(result.isLevel).toBe(true)
    })

    it('detects tilt when exceeding tolerance', () => {
      const result = calculateCalibratedTilt(1.2, 0, 0, 0)
      expect(result.pitch).toBe(1.2)
      expect(result.isLevel).toBe(false)
    })

    it('applies calibration offsets correctly', () => {
      // Surface is tilted by +5.0 pitch and -2.0 roll, user calibrates zero here
      const result = calculateCalibratedTilt(5.2, -1.9, 5.0, -2.0)
      expect(result.pitch).toBe(0.2)
      expect(result.roll).toBe(0.1)
      expect(result.isLevel).toBe(true)
    })
  })

  describe('calculateAngleBetween', () => {
    it('calculates standard acute angle (0 to 45 deg)', () => {
      const res = calculateAngleBetween(0, 45)
      expect(res.angle).toBe(45)
      expect(res.rad).toBeCloseTo(0.785, 2)
      expect(res.supplementary).toBe(135)
    })

    it('calculates right angle (0 to 90 deg)', () => {
      const res = calculateAngleBetween(0, 90)
      expect(res.angle).toBe(90)
      expect(res.rad).toBeCloseTo(1.571, 2)
      expect(res.supplementary).toBe(90)
    })

    it('handles angle wrapping across 0/360 degree boundary', () => {
      // 350 deg and 10 deg -> difference across 0 is 20 deg
      const res = calculateAngleBetween(350, 10)
      expect(res.angle).toBe(20)
      expect(res.supplementary).toBe(160)
    })

    it('calculates minimal angle when difference exceeds 180 degrees', () => {
      // Arms at 10 deg and 270 deg (raw diff 260 -> angle 100)
      const res = calculateAngleBetween(10, 270)
      expect(res.angle).toBe(100)
      expect(res.supplementary).toBe(80)
    })

    it('calculates straight angle (180 deg)', () => {
      const res = calculateAngleBetween(0, 180)
      expect(res.angle).toBe(180)
      expect(res.supplementary).toBe(0)
    })
  })

  describe('normalizeHeading', () => {
    it('keeps 0-359 angles unchanged', () => {
      expect(normalizeHeading(0)).toBe(0)
      expect(normalizeHeading(180)).toBe(180)
      expect(normalizeHeading(359)).toBe(359)
    })

    it('wraps 360 to 0', () => {
      expect(normalizeHeading(360)).toBe(0)
      expect(normalizeHeading(720)).toBe(0)
    })

    it('converts negative angles correctly', () => {
      expect(normalizeHeading(-45)).toBe(315)
      expect(normalizeHeading(-90)).toBe(270)
    })
  })

  describe('getCardinalDirection', () => {
    it('maps exact cardinal points correctly', () => {
      expect(getCardinalDirection(0).code).toBe('N')
      expect(getCardinalDirection(45).code).toBe('NE')
      expect(getCardinalDirection(90).code).toBe('E')
      expect(getCardinalDirection(135).code).toBe('SE')
      expect(getCardinalDirection(180).code).toBe('S')
      expect(getCardinalDirection(225).code).toBe('SW')
      expect(getCardinalDirection(270).code).toBe('W')
      expect(getCardinalDirection(315).code).toBe('NW')
    })

    it('maps nearby headings to nearest cardinal', () => {
      expect(getCardinalDirection(358).code).toBe('N')
      expect(getCardinalDirection(2).code).toBe('N')
      expect(getCardinalDirection(88).code).toBe('E')
      expect(getCardinalDirection(183).code).toBe('S')
    })

    it('returns localized direction names', () => {
      const north = getCardinalDirection(0)
      expect(north.en).toBe('North')
      expect(north.pl).toBe('Północ')

      const east = getCardinalDirection(90)
      expect(east.en).toBe('East')
      expect(east.pl).toBe('Wschód')
    })
  })

  describe('detectPhoneOrientation', () => {
    it('detects flat orientation when pitch and roll are near zero', () => {
      expect(detectPhoneOrientation(5, -4)).toBe('flat')
      expect(detectPhoneOrientation(20, 15)).toBe('flat')
    })

    it('detects portrait upright when pitch is steep and roll is small', () => {
      expect(detectPhoneOrientation(85, 2)).toBe('portrait')
    })

    it('detects landscape right and left based on roll', () => {
      expect(detectPhoneOrientation(10, 75)).toBe('landscape-right')
      expect(detectPhoneOrientation(-5, -60)).toBe('landscape-left')
    })

    it('detects portrait inverted when pitch is negative steep', () => {
      expect(detectPhoneOrientation(-80, 0)).toBe('portrait-inverted')
    })
  })

  describe('calculateSlopePercent', () => {
    it('calculates 0% slope for 0 deg level', () => {
      expect(calculateSlopePercent(0)).toBe(0)
    })

    it('calculates 57.7% slope for 30 deg', () => {
      expect(calculateSlopePercent(30)).toBe(57.7)
    })

    it('calculates 100% slope for 45 deg', () => {
      expect(calculateSlopePercent(45)).toBe(100)
    })
  })

  describe('calculateEdgeLevel', () => {
    it('evaluates level status and slope on edge', () => {
      // Upright portrait with 0 deg roll -> level
      const res1 = calculateEdgeLevel(85, 0, 0, 0, 0.5, 0)
      expect(res1.isLevel).toBe(true)
      expect(res1.angle).toBe(0)
      expect(res1.slopePercent).toBe(0)

      // Upright portrait with 30 deg roll -> 30 deg slope and matches 30 deg target
      const res2 = calculateEdgeLevel(85, 30, 0, 0, 0.5, 30)
      expect(res2.isLevel).toBe(false)
      expect(res2.angle).toBe(30)
      expect(res2.slopePercent).toBe(57.7)
      expect(res2.isTargetMatch).toBe(true) // Matches 30 deg target
    })

    it('evaluates landscape right and left edges with slope and target match', () => {
      // Landscape right resting: pitch is the measuring angle
      const resRight = calculateEdgeLevel(45, 80, 0, 0, 0.5, 45)
      expect(resRight.orientation).toBe('landscape-right')
      expect(resRight.angle).toBe(45)
      expect(resRight.slopePercent).toBe(100)
      expect(resRight.isTargetMatch).toBe(true)

      // Landscape left resting: -pitch is the measuring angle
      const resLeft = calculateEdgeLevel(-30, -80, 0, 0, 0.5, 30)
      expect(resLeft.orientation).toBe('landscape-left')
      expect(resLeft.angle).toBe(30)
      expect(resLeft.slopePercent).toBe(57.7)
      expect(resLeft.isTargetMatch).toBe(true)
    })

    it('respects forcedOrientation override', () => {
      const resForced = calculateEdgeLevel(0, 0, 0, 0, 0.5, 0, 'landscape-right')
      expect(resForced.orientation).toBe('landscape-right')
    })

    it('caps slope percent at 999.9 for vertical or steep angles', () => {
      expect(calculateSlopePercent(89.95)).toBe(999.9)
      expect(calculateSlopePercent(90)).toBe(999.9)
    })
  })
})

