/**
 * Code-to-image rendering. The pipeline is: highlighted spans -> token lines -> layout (a flat list of draw
 * operations) -> SVG string or PNG canvas. Both outputs consume the same layout, so they always match.
 * Everything here runs locally; nothing is uploaded.
 */

// ─── Tokens ───

export const TOKEN_CLASSES = [
  'keyword',
  'string',
  'regexp',
  'number',
  'comment',
  'function',
  'type',
  'property',
  'tag',
  'definition',
  'punct',
  'meta',
  'heading',
  'strong',
  'emphasis',
  'link',
  'quote',
  'code',
  'strike',
  'invalid',
] as const

export type TokenClass = (typeof TOKEN_CLASSES)[number]

export interface TokenSpan {
  from: number
  to: number
  /** CSS classes reported by the highlighter, e.g. `cs-tok-keyword`. */
  classes: string
}

export interface Run {
  text: string
  token: TokenClass | null
  /** Column (in characters, tabs already expanded) where the run starts. */
  col: number
}

export type TokenLine = Run[]

const TOKEN_SET = new Set<string>(TOKEN_CLASSES)

export function resolveTokenClass(classes: string): TokenClass | null {
  for (const name of classes.split(/\s+/)) {
    if (name.startsWith('cs-tok-') && TOKEN_SET.has(name.slice(7))) return name.slice(7) as TokenClass
  }
  return null
}

/** Splits text into lines of styled runs. Tabs are expanded to the next tab stop. */
export function buildTokenLines(text: string, spans: TokenSpan[], tabSize: number): TokenLine[] {
  const tokenAt: (TokenClass | null)[] = new Array(text.length).fill(null)
  for (const span of spans) {
    const token = resolveTokenClass(span.classes)
    if (!token) continue
    for (let i = Math.max(0, span.from); i < Math.min(text.length, span.to); i++) tokenAt[i] = token
  }

  const lines: TokenLine[] = []
  let line: TokenLine = []
  let col = 0
  let current: Run | null = null

  const endLine = () => {
    lines.push(line)
    line = []
    col = 0
    current = null
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\n') {
      endLine()
      continue
    }
    if (char === '\r') continue
    const token = tokenAt[i]
    const piece = char === '\t' ? ' '.repeat(tabSize - (col % tabSize)) : char
    if (!current || current.token !== token) {
      current = { text: '', token, col }
      line.push(current)
    }
    current.text += piece
    col += piece.length
  }
  endLine()
  return lines
}

export function lineWidth(line: TokenLine): number {
  const last = line[line.length - 1]
  return last ? last.col + last.text.length : 0
}

// ─── Themes ───

export type ImageThemeId = 'dark' | 'light' | 'mono'

export const IMAGE_THEME_IDS: ImageThemeId[] = ['dark', 'light', 'mono']

export interface TokenStyle {
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

/**
 * A fully resolved theme: every color is a concrete CSS color. Themes are built from the shared design tokens by
 * `imageTheme.ts`, so this module never contains color literals.
 */
export interface ImageTheme {
  id: ImageThemeId
  background: string
  foreground: string
  lineNumber: string
  border: string | null
  /** Colors of the three window buttons. */
  chrome: [string, string, string]
  /** Colors of the area around the card. */
  outer: { solid: string; gradient: Gradient }
  tokens: Partial<Record<TokenClass, TokenStyle>>
}

// ─── Options ───

export type OuterBackground = 'transparent' | 'solid' | 'gradient'
export type ImageScale = 1 | 2 | 3

export interface ImageOptions {
  theme: ImageThemeId
  fontSize: number
  padding: number
  /** Space around the card; 0 renders the card alone. */
  outerPadding: number
  outer: OuterBackground
  lineNumbers: boolean
  windowChrome: boolean
  title: string
  scale: ImageScale
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  theme: 'dark',
  fontSize: 14,
  padding: 24,
  outerPadding: 32,
  outer: 'gradient',
  lineNumbers: false,
  windowChrome: true,
  title: '',
  scale: 2,
}

const PADDINGS = [8, 16, 24, 32, 48, 64]
const OUTER_PADDINGS = [0, 16, 32, 48, 64]

const nearest = (value: number, allowed: number[]) =>
  allowed.reduce(
    (best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best),
    allowed[0],
  )

export function sanitizeImageOptions(input: unknown): ImageOptions {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<ImageOptions>
  const d = DEFAULT_IMAGE_OPTIONS
  const num = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return {
    theme: raw.theme && IMAGE_THEME_IDS.includes(raw.theme) ? raw.theme : d.theme,
    fontSize: Math.min(24, Math.max(10, Math.round(num(raw.fontSize, d.fontSize)))),
    padding: nearest(num(raw.padding, d.padding), PADDINGS),
    outerPadding: nearest(num(raw.outerPadding, d.outerPadding), OUTER_PADDINGS),
    outer: raw.outer === 'transparent' || raw.outer === 'solid' || raw.outer === 'gradient' ? raw.outer : d.outer,
    lineNumbers: typeof raw.lineNumbers === 'boolean' ? raw.lineNumbers : d.lineNumbers,
    windowChrome: typeof raw.windowChrome === 'boolean' ? raw.windowChrome : d.windowChrome,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 80) : d.title,
    scale: raw.scale === 1 || raw.scale === 3 ? raw.scale : 2,
  }
}

// ─── Layout ───

export interface Gradient {
  from: string
  to: string
}

export type DrawOp =
  | {
      kind: 'rect'
      x: number
      y: number
      w: number
      h: number
      rx: number
      fill: string | Gradient | null
      stroke: string | null
    }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string }
  | {
      kind: 'text'
      x: number
      y: number
      text: string
      fill: string
      bold: boolean
      italic: boolean
      anchor: 'start' | 'middle' | 'end'
      /** Pixel width of the text on the monospace grid; lets SVG viewers keep every token in place. */
      width: number | null
    }

export interface ImageLayout {
  width: number
  height: number
  fontSize: number
  charWidth: number
  ops: DrawOp[]
}

export const FONT_FAMILY =
  '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

const CHROME_HEIGHT = 40
const LINE_HEIGHT_RATIO = 1.5
/** Browsers refuse canvases larger than roughly this in one dimension. */
export const MAX_CANVAS_SIDE = 16000

export interface LayoutInput {
  lines: TokenLine[]
  options: ImageOptions
  theme: ImageTheme
  /** Width of one character in pixels at `options.fontSize`. */
  charWidth: number
  /** Number shown for the first line (so a selection keeps its original numbering). */
  startLine: number
  fallbackTitle: string
}

export function layoutImage({ lines, options, theme, charWidth, startLine, fallbackTitle }: LayoutInput): ImageLayout {
  const { fontSize, padding, outerPadding } = options
  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO)

  const maxCols = lines.reduce((max, line) => Math.max(max, lineWidth(line)), 0)
  const lastNumber = startLine + lines.length - 1
  const gutterCols = options.lineNumbers ? String(lastNumber).length + 2 : 0
  const chromeHeight = options.windowChrome ? CHROME_HEIGHT : 0

  const contentWidth = (gutterCols + maxCols) * charWidth
  const cardWidth = Math.max(Math.ceil(contentWidth + padding * 2), options.windowChrome ? 200 : 64)
  const cardHeight = chromeHeight + padding * 2 + lines.length * lineHeight
  const width = cardWidth + outerPadding * 2
  const height = cardHeight + outerPadding * 2

  const ops: DrawOp[] = []

  if (outerPadding > 0 && options.outer !== 'transparent') {
    ops.push({
      kind: 'rect',
      x: 0,
      y: 0,
      w: width,
      h: height,
      rx: 0,
      fill: options.outer === 'gradient' ? theme.outer.gradient : theme.outer.solid,
      stroke: null,
    })
  }

  const cardX = outerPadding
  const cardY = outerPadding
  ops.push({
    kind: 'rect',
    x: cardX,
    y: cardY,
    w: cardWidth,
    h: cardHeight,
    rx: 12,
    fill: theme.background,
    stroke: theme.border,
  })

  if (options.windowChrome) {
    theme.chrome.forEach((fill, index) => {
      ops.push({ kind: 'circle', cx: cardX + 22 + index * 20, cy: cardY + CHROME_HEIGHT / 2, r: 6, fill })
    })
    const title = options.title.trim() || fallbackTitle
    if (title) {
      ops.push({
        kind: 'text',
        x: cardX + cardWidth / 2,
        y: cardY + CHROME_HEIGHT / 2 + fontSize * 0.35,
        text: title,
        fill: theme.lineNumber,
        bold: false,
        italic: false,
        anchor: 'middle',
        width: null,
      })
    }
  }

  const contentX = cardX + padding
  const contentY = cardY + chromeHeight + padding
  const baselineOffset = (lineHeight - fontSize) / 2 + fontSize * 0.8

  lines.forEach((line, index) => {
    const baseline = contentY + index * lineHeight + baselineOffset

    if (options.lineNumbers) {
      ops.push({
        kind: 'text',
        x: contentX + (gutterCols - 1) * charWidth,
        y: baseline,
        text: String(startLine + index),
        fill: theme.lineNumber,
        bold: false,
        italic: false,
        anchor: 'end',
        width: null,
      })
    }

    for (const run of line) {
      if (run.text.trim() === '' && !(run.token && theme.tokens[run.token]?.underline)) continue
      const style = (run.token && theme.tokens[run.token]) || {}
      const x = contentX + (gutterCols + run.col) * charWidth
      const runWidth = run.text.length * charWidth
      ops.push({
        kind: 'text',
        x,
        y: baseline,
        text: run.text,
        fill: style.color ?? theme.foreground,
        bold: style.bold ?? false,
        italic: style.italic ?? false,
        anchor: 'start',
        width: runWidth,
      })
      if (style.underline) {
        ops.push({
          kind: 'rect',
          x,
          y: baseline + 2,
          w: runWidth,
          h: Math.max(1, Math.round(fontSize / 14)),
          rx: 0,
          fill: style.color ?? theme.foreground,
          stroke: null,
        })
      }
    }
  })

  return { width, height, fontSize, charWidth, ops }
}

/** Largest scale (up to the requested one) that keeps the canvas within browser limits, or `null` when even 1x is too big. */
export function fitScale(layout: Pick<ImageLayout, 'width' | 'height'>, requested: ImageScale): ImageScale | null {
  const longest = Math.max(layout.width, layout.height)
  for (const scale of [3, 2, 1] as const) {
    if (scale <= requested && longest * scale <= MAX_CANVAS_SIDE) return scale
  }
  return null
}

// ─── SVG ───

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const num = (value: number) => Number(value.toFixed(2))

export function layoutToSvg(layout: ImageLayout): string {
  const { width, height, fontSize, ops } = layout
  const gradients: Gradient[] = []
  const gradientId = (gradient: Gradient) => {
    let index = gradients.findIndex((g) => g.from === gradient.from && g.to === gradient.to)
    if (index === -1) index = gradients.push(gradient) - 1
    return `g${index}`
  }

  const body = ops
    .map((op) => {
      if (op.kind === 'circle') return `<circle cx="${num(op.cx)}" cy="${num(op.cy)}" r="${op.r}" fill="${op.fill}"/>`
      if (op.kind === 'rect') {
        const fill = op.fill === null ? 'none' : typeof op.fill === 'string' ? op.fill : `url(#${gradientId(op.fill)})`
        const stroke = op.stroke ? ` stroke="${op.stroke}" stroke-width="1"` : ''
        const radius = op.rx ? ` rx="${op.rx}"` : ''
        return `<rect x="${num(op.x)}" y="${num(op.y)}" width="${num(op.w)}" height="${num(op.h)}"${radius} fill="${fill}"${stroke}/>`
      }
      const attrs = [
        `x="${num(op.x)}"`,
        `y="${num(op.y)}"`,
        `fill="${op.fill}"`,
        op.bold ? 'font-weight="700"' : '',
        op.italic ? 'font-style="italic"' : '',
        op.anchor !== 'start' ? `text-anchor="${op.anchor}"` : '',
        op.width !== null ? `textLength="${num(op.width)}" lengthAdjust="spacing"` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `<text ${attrs}>${escapeXml(op.text)}</text>`
    })
    .join('\n')

  const defs = gradients.length
    ? `<defs>${gradients
        .map(
          (g, i) =>
            `<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient>`,
        )
        .join('')}</defs>\n`
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">\n` +
    defs +
    `<g font-family='${FONT_FAMILY}' font-size="${fontSize}" xml:space="preserve">\n${body}\n</g>\n</svg>\n`
  )
}

// ─── Canvas (PNG) ───

/** The parts of CanvasRenderingContext2D the painter uses, so it can be tested with a recording fake. */
export interface PaintContext {
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  scale(x: number, y: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  beginPath(): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  roundRect?(x: number, y: number, w: number, h: number, radius: number): void
  rect(x: number, y: number, w: number, h: number): void
  fill(): void
  stroke(): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
}

export function paintLayout(ctx: PaintContext, layout: ImageLayout, scale: number): void {
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  for (const op of layout.ops) {
    if (op.kind === 'circle') {
      ctx.beginPath()
      ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2)
      ctx.fillStyle = op.fill
      ctx.fill()
      continue
    }

    if (op.kind === 'rect') {
      ctx.beginPath()
      if (op.rx > 0 && ctx.roundRect) ctx.roundRect(op.x, op.y, op.w, op.h, op.rx)
      else ctx.rect(op.x, op.y, op.w, op.h)
      if (op.fill !== null) {
        if (typeof op.fill === 'string') {
          ctx.fillStyle = op.fill
        } else {
          const gradient = ctx.createLinearGradient(op.x, op.y, op.x + op.w, op.y + op.h)
          gradient.addColorStop(0, op.fill.from)
          gradient.addColorStop(1, op.fill.to)
          ctx.fillStyle = gradient
        }
        ctx.fill()
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke
        ctx.lineWidth = 1
        ctx.stroke()
      }
      continue
    }

    ctx.font = `${op.italic ? 'italic ' : ''}${op.bold ? '700' : '400'} ${layout.fontSize}px ${FONT_FAMILY}`
    ctx.fillStyle = op.fill
    if (op.anchor === 'start' && op.width !== null) {
      // Draw character by character on the grid so a fallback font can never shift or overlap tokens.
      ctx.textAlign = 'left'
      for (let i = 0; i < op.text.length; i++) {
        if (op.text[i] !== ' ') ctx.fillText(op.text[i], op.x + i * layout.charWidth, op.y)
      }
    } else {
      ctx.textAlign = op.anchor === 'middle' ? 'center' : op.anchor === 'end' ? 'right' : 'left'
      ctx.fillText(op.text, op.x, op.y)
    }
  }
}

/** Measures one character of the monospace font in pixels. Falls back to a typical 0.6em advance. */
export function measureCharWidth(fontSize: number): number {
  const fallback = fontSize * 0.6
  if (typeof document === 'undefined') return fallback
  try {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return fallback
    context.font = `400 ${fontSize}px ${FONT_FAMILY}`
    const width = context.measureText('0').width
    return Number.isFinite(width) && width > 0 ? width : fallback
  } catch {
    return fallback
  }
}

/** Makes sure the editor font is loaded before measuring or drawing with it. */
export async function ensureFontsLoaded(fontSize: number): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(`400 ${fontSize}px "JetBrains Mono"`),
      document.fonts.load(`700 ${fontSize}px "JetBrains Mono"`),
    ])
  } catch {
    // Missing fonts only change the glyph shapes; the grid layout is independent of them.
  }
}

export async function renderPng(layout: ImageLayout, scale: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(layout.width * scale)
  canvas.height = Math.ceil(layout.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  paintLayout(context as unknown as PaintContext, layout, scale)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png')
  })
}

/** Rendering is per character, so very long snippets are refused instead of freezing the tab. */
export const MAX_IMAGE_LINES = 400
