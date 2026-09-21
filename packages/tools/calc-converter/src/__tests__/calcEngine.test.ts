import { describe, it, expect } from 'vitest'
import {
  safeEvaluate,
  evaluateScientific,
  formatCalcDisplay,
  cleanPrecision,
} from '../utils/calcEngine'

describe('calcEngine', () => {
  describe('safeEvaluate', () => {
    it('evaluates basic arithmetic operations correctly', () => {
      expect(safeEvaluate('2 + 3')).toBe(5)
      expect(safeEvaluate('10 − 4')).toBe(6)
      expect(safeEvaluate('6 × 7')).toBe(42)
      expect(safeEvaluate('20 ÷ 4')).toBe(5)
    })

    it('respects operator precedence', () => {
      expect(safeEvaluate('2 + 3 × 4')).toBe(14)
      expect(safeEvaluate('(2 + 3) × 4')).toBe(20)
    })

    it('handles floating point arithmetic cleanly without IEEE drift', () => {
      expect(safeEvaluate('0.1 + 0.2')).toBe(0.3)
      expect(safeEvaluate('0.7 + 0.1')).toBe(0.8)
    })

    it('handles exponentiation and math constants', () => {
      expect(safeEvaluate('2 ^ 3')).toBe(8)
      expect(safeEvaluate('π')).toBeCloseTo(Math.PI, 6)
      expect(safeEvaluate('e')).toBeCloseTo(Math.E, 6)
    })

    it('throws errors on invalid syntax or divide by zero', () => {
      expect(() => safeEvaluate('')).toThrow()
      expect(() => safeEvaluate('2 ÷ 0')).toThrow()
      expect(() => safeEvaluate('2 ++-- 3')).toThrow()
      expect(() => safeEvaluate('console.log(1)')).toThrow()
    })
  })

  describe('evaluateScientific', () => {
    it('calculates square and square root', () => {
      expect(evaluateScientific('sqr', 5)).toBe(25)
      expect(evaluateScientific('sqrt', 9)).toBe(3)
      expect(() => evaluateScientific('sqrt', -4)).toThrow('Negative sqrt')
    })

    it('calculates inverse (1/x)', () => {
      expect(evaluateScientific('inv', 4)).toBe(0.25)
      expect(() => evaluateScientific('inv', 0)).toThrow('Division by zero')
    })

    it('calculates trigonometry in degrees', () => {
      expect(evaluateScientific('sin', 0)).toBe(0)
      expect(evaluateScientific('sin', 30)).toBeCloseTo(0.5, 6)
      expect(evaluateScientific('cos', 0)).toBe(1)
      expect(evaluateScientific('cos', 60)).toBeCloseTo(0.5, 6)
      expect(evaluateScientific('tan', 45)).toBeCloseTo(1, 6)
    })

    it('calculates logarithm and natural logarithm', () => {
      expect(evaluateScientific('log', 100)).toBe(2)
      expect(evaluateScientific('ln', Math.E)).toBeCloseTo(1, 6)
      expect(() => evaluateScientific('log', -5)).toThrow()
      expect(() => evaluateScientific('ln', 0)).toThrow()
    })

    it('returns math constants', () => {
      expect(evaluateScientific('pi', 0)).toBeCloseTo(Math.PI, 6)
      expect(evaluateScientific('e', 0)).toBeCloseTo(Math.E, 6)
    })
  })

  describe('formatCalcDisplay', () => {
    it('formats numbers cleanly', () => {
      expect(formatCalcDisplay(0)).toBe('0')
      expect(formatCalcDisplay(42)).toBe('42')
      expect(formatCalcDisplay(0.3)).toBe('0.3')
      expect(formatCalcDisplay(12345678)).toBe('12345678')
    })

    it('handles infinity and NaN gracefully', () => {
      expect(formatCalcDisplay(Infinity)).toBe('∞')
      expect(formatCalcDisplay(-Infinity)).toBe('-∞')
      expect(formatCalcDisplay(NaN)).toBe('Error')
    })
  })
})
