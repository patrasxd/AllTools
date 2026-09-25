import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderTypedSignaturePng, SIGNATURE_FONT_CONFIG } from '../PdfSuite'
import type { SignatureFont } from '../types'

describe('Typed Signature Font Loading (renderTypedSignaturePng)', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
  const originalFonts = document.fonts

  let loadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    loadMock = vi.fn().mockResolvedValue([])

    Object.defineProperty(document, 'fonts', {
      value: {
        load: loadMock,
        ready: Promise.resolve(),
        check: vi.fn().mockReturnValue(true),
      },
      configurable: true,
      writable: true,
    })

    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 150 }),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      })),
      createImageData: vi.fn((w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      })),
      putImageData: vi.fn(),
    }))

    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockSignatureData')
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL
    Object.defineProperty(document, 'fonts', {
      value: originalFonts,
      configurable: true,
      writable: true,
    })
  })

  it('calls document.fonts.load() with the corresponding font family for each signature style', async () => {
    const fonts: SignatureFont[] = ['dancing-script', 'caveat', 'calligraphy', 'cursive']

    for (const font of fonts) {
      loadMock.mockClear()
      const expectedFamily = SIGNATURE_FONT_CONFIG[font].family

      const result = await renderTypedSignaturePng('John Doe', font)

      expect(loadMock).toHaveBeenCalledTimes(1)
      expect(loadMock).toHaveBeenCalledWith(expect.stringContaining(expectedFamily), 'John Doe')
      expect(result).toBe('data:image/png;base64,mockSignatureData')
    }
  })

  it('awaits document.fonts.load() before rendering text to canvas', async () => {
    const callOrder: string[] = []

    loadMock.mockImplementation(async () => {
      callOrder.push('font:load:start')
      await new Promise((resolve) => setTimeout(resolve, 25))
      callOrder.push('font:load:done')
      return []
    })

    const fillTextMock = vi.fn().mockImplementation(() => {
      callOrder.push('canvas:fillText')
    })

    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      clearRect: vi.fn(),
      fillText: fillTextMock,
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 200 }),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(400 * 160 * 4),
        width: 400,
        height: 160,
      })),
    }))

    const result = await renderTypedSignaturePng('Alice Smith', 'caveat')

    expect(callOrder).toEqual(['font:load:start', 'font:load:done', 'canvas:fillText'])
    expect(result).toBe('data:image/png;base64,mockSignatureData')
  })

  it('gracefully continues and renders canvas even if document.fonts.load() rejects', async () => {
    loadMock.mockRejectedValue(new Error('Network error loading font'))

    const fillTextMock = vi.fn()
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      clearRect: vi.fn(),
      fillText: fillTextMock,
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 160 }),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(400 * 160 * 4),
        width: 400,
        height: 160,
      })),
    }))

    const result = await renderTypedSignaturePng('Fallback User', 'calligraphy')

    expect(loadMock).toHaveBeenCalled()
    expect(fillTextMock).toHaveBeenCalled()
    expect(result).toBe('data:image/png;base64,mockSignatureData')
  })

  it('renders safely when document.fonts is undefined', async () => {
    Object.defineProperty(document, 'fonts', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const fillTextMock = vi.fn()
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      clearRect: vi.fn(),
      fillText: fillTextMock,
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 140 }),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(400 * 160 * 4),
        width: 400,
        height: 160,
      })),
    }))

    const result = await renderTypedSignaturePng('No Fonts API', 'cursive')

    expect(fillTextMock).toHaveBeenCalled()
    expect(result).toBe('data:image/png;base64,mockSignatureData')
  })

  it('defaults to "Signature" placeholder when text is empty or only whitespace', async () => {
    await renderTypedSignaturePng('   ', 'dancing-script')

    expect(loadMock).toHaveBeenCalledWith(expect.stringContaining('Dancing Script'), 'Signature')
  })
})
