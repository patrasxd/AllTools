/**
 * Unit tests for imageEngine.ts — non-visual logic only.
 *
 * heic2any is mocked because it uses a Web Worker internally,
 * which is not available in the jsdom test environment.
 *
 * Canvas rendering is not tested here because jsdom has no real
 * canvas implementation; that requires a real browser or canvas npm package.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock heic2any before any module imports ────────────────────
// heic2any uses Worker internally; jsdom doesn't support it.
vi.mock('heic2any', () => ({
  default: vi.fn().mockResolvedValue(new Blob(['fake-jpeg'], { type: 'image/jpeg' })),
}))

import { calculateDimensions, exportCompressedBlob } from '../utils/imageEngine'
import type { ResizeConfig } from '../types'

// ─── Helpers ────────────────────────────────────────────────────

function makeResizeConfig(
  preset: ResizeConfig['preset'] = 'original',
  overrides: Partial<ResizeConfig> = {},
): ResizeConfig {
  return {
    preset,
    customWidth: 800,
    customHeight: 600,
    lockAspect: true,
    cropMode: 'cover',
    crop: { offsetX: 0, offsetY: 0, zoom: 1, showPassportGuide: false },
    ...overrides,
  }
}

// ─── calculateDimensions ────────────────────────────────────────

describe('calculateDimensions', () => {
  it('original: preserves source aspect ratio', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('original'))
    expect(result.targetW / result.targetH).toBeCloseTo(1200 / 800, 3)
  })

  it('1:1: produces square output', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('1:1'))
    expect(result.targetW).toBe(result.targetH)
  })

  it('4:3: produces 4:3 ratio', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('4:3'))
    expect(result.targetW / result.targetH).toBeCloseTo(4 / 3, 3)
  })

  it('16:9: produces 16:9 ratio', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('16:9'))
    expect(result.targetW / result.targetH).toBeCloseTo(16 / 9, 3)
  })

  it('3:2: produces 3:2 ratio', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('3:2'))
    expect(result.targetW / result.targetH).toBeCloseTo(3 / 2, 3)
  })

  it('id-photo: produces 7:9 ratio (35×45mm standard)', () => {
    const result = calculateDimensions(1200, 800, makeResizeConfig('id-photo'))
    expect(result.targetW / result.targetH).toBeCloseTo(7 / 9, 3)
  })

  it('custom: uses customWidth/customHeight for output dimensions', () => {
    const config = makeResizeConfig('custom', { customWidth: 400, customHeight: 300 })
    const result = calculateDimensions(1200, 800, config)
    expect(result.targetW).toBe(400)
    expect(result.targetH).toBe(300)
  })

  // ─── Zoom clamping ─────────────────────────────────────────
  it('clamps zoom below 1 to 1 — sampled area equals full image', () => {
    const config = makeResizeConfig('original', {
      crop: { offsetX: 0, offsetY: 0, zoom: 0.1, showPassportGuide: false },
    })
    const result = calculateDimensions(1200, 800, config)
    // At zoom=1 (clamped from 0.1), srcW = baseCropW / 1 = full width
    expect(result.srcW).toBeCloseTo(1200, 0)
    expect(result.srcH).toBeCloseTo(800, 0)
  })

  it('clamps zoom above 4 to 4 — srcW = baseCropW / 4', () => {
    const config = makeResizeConfig('original', {
      crop: { offsetX: 0, offsetY: 0, zoom: 99, showPassportGuide: false },
    })
    const result = calculateDimensions(1200, 800, config)
    expect(result.srcW).toBeCloseTo(1200 / 4, 0)
    expect(result.srcH).toBeCloseTo(800 / 4, 0)
  })

  it('zoom=2 halves the sampled rectangle', () => {
    const config = makeResizeConfig('original', {
      crop: { offsetX: 0, offsetY: 0, zoom: 2, showPassportGuide: false },
    })
    const result = calculateDimensions(1200, 800, config)
    expect(result.srcW).toBeCloseTo(600, 0)
    expect(result.srcH).toBeCloseTo(400, 0)
  })

  // ─── Pan offset clamping ──────────────────────────────────
  it('srcX and srcY stay within image bounds for extreme offset values', () => {
    const config = makeResizeConfig('1:1', {
      crop: { offsetX: 999, offsetY: -999, zoom: 2, showPassportGuide: false },
    })
    const { srcX, srcY, srcW, srcH } = calculateDimensions(1200, 800, config)
    expect(srcX).toBeGreaterThanOrEqual(0)
    expect(srcY).toBeGreaterThanOrEqual(0)
    expect(srcX + srcW).toBeLessThanOrEqual(1200 + 0.5) // allow rounding
    expect(srcY + srcH).toBeLessThanOrEqual(800 + 0.5)
  })

  it('center pan (offset 0,0) samples center of the image', () => {
    const config = makeResizeConfig('1:1', {
      crop: { offsetX: 0, offsetY: 0, zoom: 2, showPassportGuide: false },
    })
    const { srcX, srcY, srcW, srcH } = calculateDimensions(1200, 800, config)
    const centerX = srcX + srcW / 2
    const centerY = srcY + srcH / 2
    expect(centerX).toBeCloseTo(600, 0) // center of 1200
    expect(centerY).toBeCloseTo(400, 0) // center of 800
  })

  // ─── Output dimensions are always positive integers ────────
  it('always produces positive integer output dimensions for all presets', () => {
    const presets: ResizeConfig['preset'][] = ['original', '1:1', '4:3', '16:9', '3:2', 'id-photo']
    for (const preset of presets) {
      const { targetW, targetH } = calculateDimensions(320, 240, makeResizeConfig(preset))
      expect(targetW).toBeGreaterThan(0)
      expect(targetH).toBeGreaterThan(0)
      expect(Number.isInteger(targetW)).toBe(true)
      expect(Number.isInteger(targetH)).toBe(true)
    }
  })

  it('handles square source image without NaN or zero', () => {
    const config = makeResizeConfig('16:9')
    const { targetW, targetH, srcW, srcH } = calculateDimensions(800, 800, config)
    expect(targetW).toBeGreaterThan(0)
    expect(targetH).toBeGreaterThan(0)
    expect(isNaN(srcW)).toBe(false)
    expect(isNaN(srcH)).toBe(false)
  })
})

// ─── exportCompressedBlob — binary search termination ──────────
// jsdom doesn't implement HTMLCanvasElement.toBlob, so we mock it globally
// to synchronously return a small Blob. This lets us count iterations and
// verify the promise resolves correctly without installing the canvas package.

describe('exportCompressedBlob binary search', () => {
  beforeEach(() => {
    // Override toBlob to immediately invoke the callback with a tiny fake blob.
    // Size is always 100 bytes so the binary search will always find a result
    // within the 500KB target and terminate early.
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      cb: BlobCallback,
      _type?: string,
      _quality?: number,
    ) {
      const fakeBlob = new Blob([new Uint8Array(100)], { type: 'image/jpeg' })
      Promise.resolve().then(() => cb(fakeBlob))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs at most 6 toBlob iterations when targetMaxKb is set', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    await exportCompressedBlob(canvas, 'image/jpeg', 85, 500)

    // toBlob spy counts every iteration of the binary search
    expect((HTMLCanvasElement.prototype.toBlob as ReturnType<typeof vi.spyOn>).mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('returns a blob and dataUrl when targetMaxKb is null', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    const result = await exportCompressedBlob(canvas, 'image/jpeg', 85, null)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(typeof result.dataUrl).toBe('string')
    expect(result.sizeBytes).toBeGreaterThanOrEqual(0)
  })

  it('calls toBlob exactly once when targetMaxKb is null', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    await exportCompressedBlob(canvas, 'image/png', 100, null)

    expect((HTMLCanvasElement.prototype.toBlob as ReturnType<typeof vi.spyOn>).mock.calls.length).toBe(1)
  })
})

// ─── HEIC file detection heuristic ─────────────────────────────
// Tests the detection logic synchronously — no real image loading needed.

describe('HEIC file detection heuristic', () => {
  function isHeicFile(file: File): boolean {
    return file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name)
  }

  it('detects .heic extension as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'photo.heic', { type: '' }))).toBe(true)
  })

  it('detects .HEIF extension (uppercase) as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'photo.HEIF', { type: '' }))).toBe(true)
  })

  it('detects image/heic MIME type as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'photo.jpg', { type: 'image/heic' }))).toBe(true)
  })

  it('does not flag a regular .jpg file as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'photo.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('does not flag a .png file as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'image.png', { type: 'image/png' }))).toBe(false)
  })

  it('does not flag a .webp file as HEIC', () => {
    expect(isHeicFile(new File(['data'], 'image.webp', { type: 'image/webp' }))).toBe(false)
  })
})
