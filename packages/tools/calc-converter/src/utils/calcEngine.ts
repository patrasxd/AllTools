import { ScientificFn } from '../types'

/**
 * Clean floating point arithmetic imprecision (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
 */
export function cleanPrecision(num: number, maxDigits = 10): number {
  if (isNaN(num) || !isFinite(num)) return num
  return parseFloat(num.toPrecision(maxDigits))
}

/**
 * Format calculation display numbers cleanly
 */
export function formatCalcDisplay(val: number): string {
  if (isNaN(val)) return 'Error'
  if (!isFinite(val)) return val > 0 ? '∞' : '-∞'

  const abs = Math.abs(val)
  if (abs === 0) return '0'

  if (abs >= 1e12 || (abs < 1e-7 && abs > 0)) {
    return val.toExponential(6).replace(/\.0+e/, 'e')
  }

  // Clean precision to avoid IEEE 754 float drift
  const cleaned = cleanPrecision(val, 12)
  return cleaned.toString()
}

/**
 * Safely evaluate a mathematical expression string
 */
export function safeEvaluate(exprStr: string): number {
  if (!exprStr || !exprStr.trim()) {
    throw new Error('Empty expression')
  }

  // Normalize operators & symbols
  let sanitized = exprStr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\^/g, '**')
    .replace(/π/g, `${Math.PI}`)
    .replace(/e(?![a-zA-Z0-9_])/g, `${Math.E}`)

  // Replace function aliases
  sanitized = sanitized
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/log\(/g, 'Math.log10(')

  // Validate allowed characters only
  if (!/^[0-9+\-*/().,%\sMath.PIEsqrtincoatgl**]+$/.test(sanitized)) {
    throw new Error('Invalid expression')
  }

  // Disallow consecutive operators that are invalid in JS like * / or + *
  if (/[+\-*/]{3,}/.test(sanitized)) {
    throw new Error('Invalid operator sequence')
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)()

  if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
    throw new Error('Math error')
  }

  return cleanPrecision(result)
}

/**
 * Apply a scientific function to a single numeric value
 */
export function evaluateScientific(fn: ScientificFn, val: number): number {
  let res = 0
  switch (fn) {
    case 'sqr':
      res = val * val
      break
    case 'sqrt':
      if (val < 0) throw new Error('Negative sqrt')
      res = Math.sqrt(val)
      break
    case 'inv':
      if (val === 0) throw new Error('Division by zero')
      res = 1 / val
      break
    case 'sin': {
      // In degrees
      const rad = (val * Math.PI) / 180
      res = Math.sin(rad)
      if (Math.abs(res) < 1e-15) res = 0
      break
    }
    case 'cos': {
      // In degrees
      const rad = (val * Math.PI) / 180
      res = Math.cos(rad)
      if (Math.abs(res) < 1e-15) res = 0
      break
    }
    case 'tan': {
      // In degrees
      if ((val - 90) % 180 === 0) throw new Error('Math error')
      const rad = (val * Math.PI) / 180
      res = Math.tan(rad)
      break
    }
    case 'ln':
      if (val <= 0) throw new Error('Non-positive ln')
      res = Math.log(val)
      break
    case 'log':
      if (val <= 0) throw new Error('Non-positive log')
      res = Math.log10(val)
      break
    case 'pi':
      res = Math.PI
      break
    case 'e':
      res = Math.E
      break
    default:
      throw new Error('Unknown function')
  }

  return cleanPrecision(res)
}
