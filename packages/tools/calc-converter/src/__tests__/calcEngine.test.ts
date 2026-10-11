import { describe, it, expect } from 'vitest'
import { safeEvaluate, evaluateScientific, formatCalcDisplay } from '../utils/calcEngine'

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

  describe('safeEvaluate parser', () => {
    it('supports unary signs and nested parentheses', () => {
      expect(safeEvaluate('-5 + 3')).toBe(-2)
      expect(safeEvaluate('2 × -3')).toBe(-6)
      expect(safeEvaluate('-(2 + 3) × 2')).toBe(-10)
      expect(safeEvaluate('((1 + 2) × (3 + 4))')).toBe(21)
    })

    it('treats ^ as right-associative and binding tighter than unary minus', () => {
      expect(safeEvaluate('2 ^ 3 ^ 2')).toBe(512)
      expect(safeEvaluate('-2 ^ 2')).toBe(-4)
      expect(safeEvaluate('2 ^ -1')).toBe(0.5)
    })

    it('supports modulo, decimals and exponent notation', () => {
      expect(safeEvaluate('10 % 3')).toBe(1)
      expect(safeEvaluate('.5 + 1.5')).toBe(2)
      expect(safeEvaluate('1.5e3 + 1')).toBe(1501)
    })

    it('supports functions and constants', () => {
      expect(safeEvaluate('sqrt(16) + 1')).toBe(5)
      expect(safeEvaluate('log(1000)')).toBeCloseTo(3, 9)
      expect(safeEvaluate('ln(e)')).toBeCloseTo(1, 9)
      expect(safeEvaluate('sin(0)')).toBe(0)
      expect(safeEvaluate('2 × π')).toBeCloseTo(2 * Math.PI, 6)
    })

    it('rejects malformed input', () => {
      for (const bad of [
        '2 +',
        '(1 + 2',
        '1 + 2)',
        '()',
        'sqrt',
        'sqrt 4',
        '2 3',
        '*3',
        '1 ** 2',
        'sqrt(-1)',
        '5 % 0',
      ]) {
        expect(() => safeEvaluate(bad)).toThrow()
      }
    })

    it('never executes input as code', () => {
      const attempts = [
        'constructor',
        '__proto__',
        'toString()',
        'alert(1)',
        'Math.sqrt(4)',
        'this',
        'globalThis',
        '1; 2',
        '`1`',
        'sqrt.constructor("return 1")()',
      ]
      for (const bad of attempts) {
        expect(() => safeEvaluate(bad)).toThrow()
      }
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
