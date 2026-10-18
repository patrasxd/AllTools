import { describe, it, expect, vi } from 'vitest'
import { loadLanguageExtension } from '../languages'
import { highlightToSpans } from '../utils/highlightSpans'
import { buildImageTheme } from '../utils/imageTheme'
import {
  DEFAULT_IMAGE_OPTIONS,
  MAX_CANVAS_SIDE,
  buildTokenLines,
  fitScale,
  layoutImage,
  type LayoutInput,
  layoutToSvg,
  lineWidth,
  paintLayout,
  resolveTokenClass,
  sanitizeImageOptions,
  type DrawOp,
  type ImageOptions,
  type PaintContext,
} from '../utils/imageEngine'

const options = (patch: Partial<ImageOptions> = {}): ImageOptions => ({
  ...DEFAULT_IMAGE_OPTIONS,
  fontSize: 10,
  padding: 16,
  outerPadding: 0,
  windowChrome: false,
  lineNumbers: false,
  ...patch,
})

/** Colors are resolved to readable placeholders, so tests can tell exactly which token a fill came from. */
const resolve = (expression: string) => `<${expression}>`

function lay(input: Omit<LayoutInput, 'theme'>) {
  return layoutImage({ ...input, theme: buildImageTheme(input.options.theme, resolve) })
}

const texts = (ops: DrawOp[]) => ops.flatMap((op) => (op.kind === 'text' ? [op] : []))

describe('resolveTokenClass', () => {
  it('finds the token among several classes', () => {
    expect(resolveTokenClass('cs-tok-keyword')).toBe('keyword')
    expect(resolveTokenClass('other cs-tok-string')).toBe('string')
    expect(resolveTokenClass('cs-tok-unknown')).toBeNull()
    expect(resolveTokenClass('')).toBeNull()
  })
})

describe('buildTokenLines', () => {
  it('splits lines and groups characters with the same token', () => {
    const lines = buildTokenLines('let x\n1', [{ from: 0, to: 3, classes: 'cs-tok-keyword' }], 2)
    expect(lines).toEqual([
      [
        { text: 'let', token: 'keyword', col: 0 },
        { text: ' x', token: null, col: 3 },
      ],
      [{ text: '1', token: null, col: 0 }],
    ])
  })

  it('keeps an empty line for every line break', () => {
    expect(buildTokenLines('a\n\nb', [], 2)).toHaveLength(3)
    expect(buildTokenLines('', [], 2)).toEqual([[]])
    expect(buildTokenLines('a\n', [], 2)).toHaveLength(2)
  })

  it('expands tabs to the next tab stop', () => {
    const [line] = buildTokenLines('a\tb', [], 4)
    expect(line.map((run) => run.text).join('')).toBe('a   b')
    expect(lineWidth(line)).toBe(5)
  })

  it('ignores carriage returns and spans outside the text', () => {
    const lines = buildTokenLines('ab\r\ncd', [{ from: -5, to: 99, classes: 'cs-tok-string' }], 2)
    expect(lines.map((line) => line.map((run) => run.text).join(''))).toEqual(['ab', 'cd'])
    expect(lines[0][0].token).toBe('string')
  })

  it('ignores spans without a known token class', () => {
    const [line] = buildTokenLines('abc', [{ from: 0, to: 3, classes: 'something-else' }], 2)
    expect(line).toEqual([{ text: 'abc', token: null, col: 0 }])
  })
})

describe('layoutImage', () => {
  const lines = buildTokenLines('const a = 1\nreturn a', [{ from: 0, to: 5, classes: 'cs-tok-keyword' }], 2)

  it('sizes the card from the longest line, padding and line height', () => {
    // 11 columns * 6px + 2 * 16 padding; 2 lines * 15px + 2 * 16 padding
    const layout = lay({ lines, options: options(), charWidth: 6, startLine: 1, fallbackTitle: 'x' })
    expect(layout.width).toBe(98)
    expect(layout.height).toBe(62)
  })

  it('places tokens on the character grid', () => {
    const layout = lay({ lines, options: options(), charWidth: 6, startLine: 1, fallbackTitle: 'x' })
    const keyword = texts(layout.ops).find((op) => op.text === 'const')!
    expect(keyword.x).toBe(16)
    expect(keyword.width).toBe(30)
    expect(keyword.fill).toBe('<var(--cs-keyword)>')
    const rest = texts(layout.ops).find((op) => op.text === ' a = 1')
    expect(rest?.x).toBe(16 + 5 * 6)
  })

  it('adds a line number gutter that follows the start line', () => {
    const layout = lay({
      lines,
      options: options({ lineNumbers: true }),
      charWidth: 6,
      startLine: 99,
      fallbackTitle: 'x',
    })
    const numbers = texts(layout.ops).filter((op) => op.anchor === 'end')
    expect(numbers.map((op) => op.text)).toEqual(['99', '100'])
    // gutter = 3 digits + 2 = 5 columns, so the card is wider than without numbers
    expect(layout.width).toBe(Math.ceil((5 + 11) * 6 + 32))
  })

  it('draws window chrome with a title, falling back to the file name', () => {
    const withChrome = lay({
      lines,
      options: options({ windowChrome: true }),
      charWidth: 6,
      startLine: 1,
      fallbackTitle: 'main.ts',
    })
    expect(withChrome.ops.filter((op) => op.kind === 'circle')).toHaveLength(3)
    expect(texts(withChrome.ops).some((op) => op.text === 'main.ts' && op.anchor === 'middle')).toBe(true)
    expect(withChrome.height).toBe(40 + 32 + 30)

    const custom = lay({
      lines,
      options: options({ windowChrome: true, title: 'My title' }),
      charWidth: 6,
      startLine: 1,
      fallbackTitle: 'main.ts',
    })
    expect(texts(custom.ops).some((op) => op.text === 'My title')).toBe(true)
  })

  it('adds an outer frame only when it has size and a background', () => {
    const base = { lines, charWidth: 6, startLine: 1, fallbackTitle: 'x' }
    const framed = lay({ ...base, options: options({ outerPadding: 32, outer: 'gradient' }) })
    expect(framed.width).toBe(98 + 64)
    expect(framed.ops[0]).toMatchObject({ kind: 'rect', x: 0, y: 0, w: framed.width, h: framed.height })
    expect(typeof (framed.ops[0] as { fill: unknown }).fill).toBe('object')

    const transparent = lay({ ...base, options: options({ outerPadding: 32, outer: 'transparent' }) })
    expect(transparent.width).toBe(98 + 64)
    expect(transparent.ops[0]).toMatchObject({ x: 32, y: 32 })

    const none = lay({ ...base, options: options({ outerPadding: 0, outer: 'solid' }) })
    expect(none.ops[0]).toMatchObject({ x: 0, y: 0 })
  })

  it('underlines tokens whose style asks for it', () => {
    const link = buildTokenLines('see', [{ from: 0, to: 3, classes: 'cs-tok-link' }], 2)
    const layout = lay({ lines: link, options: options(), charWidth: 6, startLine: 1, fallbackTitle: 'x' })
    const underline = layout.ops.filter((op) => op.kind === 'rect').at(-1)!
    expect(underline).toMatchObject({ kind: 'rect', w: 18 })
  })

  it('skips whitespace-only runs but keeps their space in the grid', () => {
    const spaced = buildTokenLines(
      'a    b',
      [
        { from: 0, to: 1, classes: 'cs-tok-keyword' },
        { from: 5, to: 6, classes: 'cs-tok-keyword' },
      ],
      2,
    )
    const layout = lay({ lines: spaced, options: options(), charWidth: 6, startLine: 1, fallbackTitle: 'x' })
    const drawn = texts(layout.ops)
    expect(drawn.map((op) => op.text)).toEqual(['a', 'b'])
    expect(drawn[1].x).toBe(16 + 5 * 6)
  })

  it('tells token kinds apart without color in the black & white theme', () => {
    const layout = lay({ lines, options: options({ theme: 'mono' }), charWidth: 6, startLine: 1, fallbackTitle: 'x' })
    expect(texts(layout.ops).find((op) => op.text === 'const')?.bold).toBe(true)
  })
})

describe('layoutToSvg', () => {
  const build = (source: string, patch: Partial<ImageOptions> = {}) =>
    layoutToSvg(
      lay({
        lines: buildTokenLines(source, [], 2),
        options: options(patch),
        charWidth: 6,
        startLine: 1,
        fallbackTitle: 'x',
      }),
    )

  it('produces a sized SVG document', () => {
    const svg = build('a')
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    // 1 column * 6px + 2 * 16 padding is below the 64px minimum card width
    expect(svg).toContain('viewBox="0 0 64 47"')
    expect(svg.trim().endsWith('</svg>')).toBe(true)
  })

  it('escapes markup characters in the code', () => {
    const svg = build('<script>alert("x") && 1</script>')
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;) &amp;&amp; 1&lt;/script&gt;')
  })

  it('pins every token to its grid width and preserves spaces', () => {
    const svg = build('a  b')
    expect(svg).toContain('textLength="24"')
    expect(svg).toContain('xml:space="preserve"')
  })

  it('defines each gradient once', () => {
    const svg = build('a', { outerPadding: 32, outer: 'gradient' })
    expect(svg.match(/<linearGradient/g)).toHaveLength(1)
    expect(svg).toContain('fill="url(#g0)"')
  })

  it('draws bold and italic tokens', () => {
    const svg = layoutToSvg(
      lay({
        lines: buildTokenLines(
          'kw // c',
          [
            { from: 0, to: 2, classes: 'cs-tok-keyword' },
            { from: 3, to: 7, classes: 'cs-tok-comment' },
          ],
          2,
        ),
        options: options({ theme: 'mono' }),
        charWidth: 6,
        startLine: 1,
        fallbackTitle: 'x',
      }),
    )
    expect(svg).toContain('font-weight="700"')
    expect(svg).toContain('font-style="italic"')
  })
})

describe('fitScale', () => {
  it('keeps the requested scale when the image is small', () => {
    expect(fitScale({ width: 500, height: 300 }, 3)).toBe(3)
    expect(fitScale({ width: 500, height: 300 }, 1)).toBe(1)
  })

  it('lowers the scale for tall images and gives up when 1x does not fit', () => {
    expect(fitScale({ width: 400, height: MAX_CANVAS_SIDE / 2 }, 3)).toBe(2)
    expect(fitScale({ width: 400, height: MAX_CANVAS_SIDE - 1 }, 3)).toBe(1)
    expect(fitScale({ width: 400, height: MAX_CANVAS_SIDE + 1 }, 3)).toBeNull()
  })
})

describe('sanitizeImageOptions', () => {
  it('repairs invalid input', () => {
    expect(sanitizeImageOptions(null)).toEqual(DEFAULT_IMAGE_OPTIONS)
    expect(
      sanitizeImageOptions({
        theme: 'neon',
        fontSize: 99,
        padding: 30,
        outerPadding: 1000,
        outer: 'x',
        scale: 5,
        title: 'x'.repeat(200),
      }),
    ).toEqual({
      ...DEFAULT_IMAGE_OPTIONS,
      fontSize: 24,
      padding: 32,
      outerPadding: 64,
      title: 'x'.repeat(80),
    })
  })

  it('keeps valid values', () => {
    const valid: ImageOptions = {
      theme: 'light',
      fontSize: 16,
      padding: 48,
      outerPadding: 0,
      outer: 'transparent',
      lineNumbers: true,
      windowChrome: false,
      title: 'Hi',
      scale: 3,
    }
    expect(sanitizeImageOptions(valid)).toEqual(valid)
  })
})

describe('paintLayout', () => {
  function fakeContext() {
    const calls: string[] = []
    const ctx = {
      fillStyle: '' as unknown,
      strokeStyle: '' as unknown,
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      scale: (x: number, y: number) => calls.push(`scale ${x} ${y}`),
      fillRect: vi.fn(),
      fillText: (text: string, x: number, y: number) => calls.push(`text ${text} ${x} ${Math.round(y)}`),
      beginPath: () => calls.push('begin'),
      arc: () => calls.push('arc'),
      rect: () => calls.push('rect'),
      roundRect: () => calls.push('roundRect'),
      fill: () => calls.push(`fill ${String(ctx.fillStyle)}`),
      stroke: () => calls.push('stroke'),
      createLinearGradient: () => ({
        addColorStop: (offset: number, color: string) => calls.push(`stop ${offset} ${color}`),
      }),
    }
    return { ctx: ctx as unknown as PaintContext, calls }
  }

  const layout = lay({
    lines: buildTokenLines('ab c', [{ from: 0, to: 2, classes: 'cs-tok-keyword' }], 2),
    options: options({ outerPadding: 16, outer: 'gradient', windowChrome: true, title: 'T' }),
    charWidth: 6,
    startLine: 1,
    fallbackTitle: 'x',
  })

  it('scales once and draws gradient, card, chrome and text', () => {
    const { ctx, calls } = fakeContext()
    paintLayout(ctx, layout, 2)
    expect(calls[0]).toBe('scale 2 2')
    expect(calls.some((call) => call.startsWith('stop 0 <'))).toBe(true)
    expect(calls).toContain('roundRect')
    expect(calls.filter((call) => call === 'arc')).toHaveLength(3)
  })

  it('draws tokens character by character on the grid and skips spaces', () => {
    const { ctx, calls } = fakeContext()
    paintLayout(ctx, layout, 1)
    const drawn = calls.filter((call) => call.startsWith('text '))
    expect(drawn.some((call) => call.startsWith('text a '))).toBe(true)
    expect(drawn.some((call) => call.startsWith('text b '))).toBe(true)
    expect(drawn.some((call) => call.startsWith('text c '))).toBe(true)
    const a = drawn.find((call) => call.startsWith('text a '))!.split(' ')
    const b = drawn.find((call) => call.startsWith('text b '))!.split(' ')
    expect(Number(b[2]) - Number(a[2])).toBe(6)
  })

  it('falls back to a plain rectangle when roundRect is missing', () => {
    const { ctx, calls } = fakeContext()
    ;(ctx as { roundRect?: unknown }).roundRect = undefined
    paintLayout(ctx, layout, 1)
    expect(calls).toContain('rect')
  })
})

describe('highlightToSpans', () => {
  it('uses the editor grammar and style to classify tokens', async () => {
    const text = '{"a": 1, "b": "x"}'
    const spans = highlightToSpans(text, await loadLanguageExtension('json'))
    const classes = spans.map((span) => resolveTokenClass(span.classes))
    expect(classes).toContain('number')
    expect(classes).toContain('string')
    expect(classes).toContain('property')
    expect(spans.every((span) => span.from >= 0 && span.to <= text.length)).toBe(true)
  })

  it('highlights keywords in JavaScript', async () => {
    const text = 'const x = 1'
    const spans = highlightToSpans(text, await loadLanguageExtension('javascript'))
    const keyword = spans.find((span) => resolveTokenClass(span.classes) === 'keyword')
    expect(keyword && text.slice(keyword.from, keyword.to)).toBe('const')
  })

  it('returns no spans for plain text', async () => {
    expect(highlightToSpans('just words', await loadLanguageExtension('plaintext'))).toEqual([])
  })
})
