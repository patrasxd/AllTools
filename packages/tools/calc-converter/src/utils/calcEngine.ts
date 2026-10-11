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

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '%' | '^' }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'ident'; value: string }

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  ln: Math.log,
  log: Math.log10,
}

const CONSTANTS: Record<string, number> = {
  π: Math.PI,
  e: Math.E,
}

function tokenize(input: string): Token[] {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')

  // Reject runs of three or more operators such as "++-" or "*/-"
  if (/[+\-*/]{3,}/.test(src.replace(/\s+/g, ''))) {
    throw new Error('Invalid operator sequence')
  }

  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    // Numbers, including decimals and exponents (e.g. 12, 0.5, .5, 1.5e+12)
    const num = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i))
    if (num) {
      tokens.push({ type: 'num', value: parseFloat(num[0]) })
      i += num[0].length
      continue
    }
    if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch as '+' | '-' | '*' | '/' | '%' | '^' })
      i++
      continue
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i++
      continue
    }
    if (ch === 'π') {
      tokens.push({ type: 'ident', value: 'π' })
      i++
      continue
    }
    const word = /^[a-z]+/.exec(src.slice(i))
    if (word) {
      tokens.push({ type: 'ident', value: word[0] })
      i += word[0].length
      continue
    }
    throw new Error('Invalid expression')
  }
  return tokens
}

/**
 * Recursive-descent parser. Grammar (lowest to highest precedence):
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/' | '%') unary)*
 *   unary   := ('+' | '-') unary | power
 *   power   := primary ('^' unary)?        (right-associative)
 *   primary := number | constant | func '(' expr ')' | '(' expr ')'
 */
class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.expr()
    if (this.pos < this.tokens.length) throw new Error('Invalid expression')
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private isOp(...ops: string[]): boolean {
    const t = this.peek()
    return t !== undefined && t.type === 'op' && ops.includes(t.value)
  }

  private expr(): number {
    let left = this.term()
    while (this.isOp('+', '-')) {
      const op = (this.tokens[this.pos++] as { value: string }).value
      const right = this.term()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  private term(): number {
    let left = this.unary()
    while (this.isOp('*', '/', '%')) {
      const op = (this.tokens[this.pos++] as { value: string }).value
      const right = this.unary()
      left = op === '*' ? left * right : op === '/' ? left / right : left % right
    }
    return left
  }

  private unary(): number {
    if (this.isOp('+', '-')) {
      const op = (this.tokens[this.pos++] as { value: string }).value
      const value = this.unary()
      return op === '-' ? -value : value
    }
    return this.power()
  }

  private power(): number {
    const base = this.primary()
    if (this.isOp('^')) {
      this.pos++
      return Math.pow(base, this.unary())
    }
    return base
  }

  private primary(): number {
    const t = this.tokens[this.pos++]
    if (!t) throw new Error('Invalid expression')
    if (t.type === 'num') return t.value
    if (t.type === 'paren' && t.value === '(') {
      const value = this.expr()
      const close = this.tokens[this.pos++]
      if (!close || close.type !== 'paren' || close.value !== ')') throw new Error('Invalid expression')
      return value
    }
    if (t.type === 'ident') {
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, t.value)) return CONSTANTS[t.value]
      if (Object.prototype.hasOwnProperty.call(FUNCTIONS, t.value)) {
        const open = this.tokens[this.pos++]
        if (!open || open.type !== 'paren' || open.value !== '(') throw new Error('Invalid expression')
        const arg = this.expr()
        const close = this.tokens[this.pos++]
        if (!close || close.type !== 'paren' || close.value !== ')') throw new Error('Invalid expression')
        return FUNCTIONS[t.value](arg)
      }
    }
    throw new Error('Invalid expression')
  }
}

/**
 * Safely evaluate a mathematical expression string.
 * Uses a small hand-written parser; the input is never executed as code.
 * Supports + - × ÷ * / % ^, parentheses, unary signs, the constants π and e,
 * and the functions sqrt, sin, cos, tan (radians), ln and log (base 10).
 */
export function safeEvaluate(exprStr: string): number {
  if (!exprStr || !exprStr.trim()) {
    throw new Error('Empty expression')
  }

  const result = new Parser(tokenize(exprStr)).parse()

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
