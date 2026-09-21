import { describe, it, expect } from 'vitest'
import {
  UNIT_CATEGORIES,
  convertValue,
  convertRadix,
  formatFormattedValue,
} from '../conversionData'

describe('conversionData', () => {
  describe('convertValue', () => {
    it('converts weight units accurately', () => {
      const weightCat = UNIT_CATEGORIES.find((c) => c.id === 'weight')!
      // 1 kg = 1000 g
      expect(convertValue(1, 'kg', 'g', weightCat)).toBe(1000)
      // 1000 g = 1 kg
      expect(convertValue(1000, 'g', 'kg', weightCat)).toBe(1)
      // 1 kg to lb
      expect(convertValue(1, 'kg', 'lb', weightCat)).toBeCloseTo(2.20462, 4)
    })

    it('converts length units accurately', () => {
      const lengthCat = UNIT_CATEGORIES.find((c) => c.id === 'length')!
      // 1 km = 1000 m
      expect(convertValue(1, 'km', 'm', lengthCat)).toBe(1000)
      // 1 m = 100 cm
      expect(convertValue(1, 'm', 'cm', lengthCat)).toBe(100)
      // 1 in = 2.54 cm
      expect(convertValue(1, 'in', 'cm', lengthCat)).toBe(2.54)
    })

    it('converts temperature units accurately with offset formulas', () => {
      const tempCat = UNIT_CATEGORIES.find((c) => c.id === 'temperature')!
      // 0 C = 32 F
      expect(convertValue(0, 'c', 'f', tempCat)).toBe(32)
      // 100 C = 212 F
      expect(convertValue(100, 'c', 'f', tempCat)).toBe(212)
      // 0 C = 273.15 K
      expect(convertValue(0, 'c', 'k', tempCat)).toBe(273.15)
    })

    it('converts speed units accurately', () => {
      const speedCat = UNIT_CATEGORIES.find((c) => c.id === 'speed')!
      // 100 km/h to mph
      expect(convertValue(100, 'kmh', 'mph', speedCat)).toBeCloseTo(62.1371, 3)
    })
  })

  describe('convertRadix', () => {
    it('converts decimal to binary, hex, and octal', () => {
      expect(convertRadix('255', 'dec', 'hex')).toBe('FF')
      expect(convertRadix('255', 'dec', 'bin')).toBe('11111111')
      expect(convertRadix('255', 'dec', 'oct')).toBe('377')
    })

    it('converts hex to decimal and binary', () => {
      expect(convertRadix('FF', 'hex', 'dec')).toBe('255')
      expect(convertRadix('10', 'hex', 'dec')).toBe('16')
    })

    it('converts binary to decimal and hex', () => {
      expect(convertRadix('1010', 'bin', 'dec')).toBe('10')
      expect(convertRadix('1010', 'bin', 'hex')).toBe('A')
    })
  })

  describe('formatFormattedValue', () => {
    it('formats values without excessive scientific noise', () => {
      expect(formatFormattedValue(0)).toBe('0')
      expect(formatFormattedValue(12.3456789)).toBe('12.345679')
      expect(formatFormattedValue(1000)).toBe('1000')
    })
  })
})
