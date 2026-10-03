import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateScaledDimensions,
  countSvgPaths,
  gaussianBlur,
  resizeBilinear,
  setSvgViewport,
  smoothnessToParams,
  traceImageDataToSVG,
  MAX_TRACE_DIMENSION,
  MAX_TRACE_PIXELS,
} from '../utils/vectorEngine'
import type { VectorizeConfig } from '../types'

// The VTracer WASM wrapper is mocked: it cannot be instantiated in jsdom. By default it "fails",
// which exercises the imagetracerjs fallback; individual tests make it succeed.
const { vtracerMock } = vi.hoisted(() => ({ vtracerMock: vi.fn() }))
vi.mock('../utils/vtracer', () => ({
  traceBinaryWithVTracer: (...args: unknown[]) => vtracerMock(...args),
}))

beforeEach(() => {
  vtracerMock.mockReset()
  vtracerMock.mockRejectedValue(new Error('WASM unavailable in test'))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function makeVectorConfig(overrides: Partial<VectorizeConfig> = {}): VectorizeConfig {
  return {
    mode: 'color',
    numberOfColors: 8,
    bwThreshold: 128,
    speckleFilter: 4,
    smoothness: 50,
    rightAngleEnhance: false,
    ...overrides,
  }
}

describe('calculateScaledDimensions', () => {
  it('preserves dimensions when both width and height are within max limit', () => {
    const result = calculateScaledDimensions(800, 600, 2000)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.scaled).toBe(false)
  })

  it('scales down proportionally when width exceeds maxDimension', () => {
    const result = calculateScaledDimensions(4000, 2000, 2000)
    expect(result.width).toBe(2000)
    expect(result.height).toBe(1000)
    expect(result.scaled).toBe(true)
  })

  it('scales down proportionally when height exceeds maxDimension', () => {
    const result = calculateScaledDimensions(1500, 3000, 2000)
    expect(result.width).toBe(1000)
    expect(result.height).toBe(2000)
    expect(result.scaled).toBe(true)
  })

  it('handles square images above maxDimension', () => {
    const result = calculateScaledDimensions(3200, 3200, 2000)
    expect(result.width).toBe(2000)
    expect(result.height).toBe(2000)
    expect(result.scaled).toBe(true)
  })

  it('handles small edge cases gracefully', () => {
    const result = calculateScaledDimensions(1, 1, 2000)
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(result.scaled).toBe(false)
  })
})

describe('countSvgPaths', () => {
  it('counts path elements in an SVG string accurately', () => {
    const svg = '<svg><path d="M0 0"/><path d="M1 1"/><circle cx="5" cy="5"/><path d="M2 2"/></svg>'
    expect(countSvgPaths(svg)).toBe(3)
  })

  it('returns 0 when no path elements are present', () => {
    const svg = '<svg><rect width="10" height="10"/></svg>'
    expect(countSvgPaths(svg)).toBe(0)
  })
})

describe('setSvgViewport', () => {
  it('adds viewBox and natural width/height when missing', () => {
    const svg = setSvgViewport('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>', 400, 300, 200, 150)
    expect(svg).toContain('viewBox="0 0 400 300"')
    expect(svg).toContain('width="200"')
    expect(svg).toContain('height="150"')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('replaces existing viewBox/width/height and keeps other attributes', () => {
    const raw = '\n  <svg width="10" height="10" viewBox="0 0 10 10" style="background:#fff;"><path d="M0 0"/></svg>'
    const svg = setSvgViewport(raw, 40, 20, 20, 10)
    expect(svg.match(/viewBox=/g)).toHaveLength(1)
    expect(svg.match(/width=/g)).toHaveLength(1)
    expect(svg).toContain('viewBox="0 0 40 20"')
    expect(svg).toContain('style="background:#fff;"')
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('does not touch width/height attributes of child elements', () => {
    const svg = setSvgViewport('<svg><rect width="5" height="5"/></svg>', 10, 10, 5, 5)
    expect(svg).toContain('<rect width="5" height="5"/>')
  })
})

describe('smoothnessToParams', () => {
  it('means "no preprocessing" at 0', () => {
    const p = smoothnessToParams(0, 559, 559)
    expect(p.scale).toBe(1)
    expect(p.width).toBe(559)
    expect(p.height).toBe(559)
    expect(p.blurSigma).toBe(0)
  })

  it('upscales small images up to 3x at 100', () => {
    const p = smoothnessToParams(100, 500, 400)
    expect(p.scale).toBeCloseTo(3, 5)
    expect(p.width).toBe(1500)
    expect(p.height).toBe(1200)
  })

  it('increases blur, tolerances and corner/length thresholds monotonically', () => {
    const low = smoothnessToParams(10, 400, 400)
    const mid = smoothnessToParams(50, 400, 400)
    const high = smoothnessToParams(90, 400, 400)
    expect(low.blurSigma).toBeLessThan(mid.blurSigma)
    expect(mid.blurSigma).toBeLessThan(high.blurSigma)
    expect(low.curveTolerance).toBeLessThan(high.curveTolerance)
    expect(low.cornerThreshold).toBeLessThan(high.cornerThreshold)
    expect(low.lengthThreshold).toBeLessThan(high.lengthThreshold)
  })

  it('caps the traced size by longest side and by total pixels', () => {
    const wide = smoothnessToParams(100, 2000, 200)
    expect(Math.max(wide.width, wide.height)).toBeLessThanOrEqual(MAX_TRACE_DIMENSION)

    const big = smoothnessToParams(100, 2000, 2000)
    expect(big.width * big.height).toBeLessThanOrEqual(MAX_TRACE_PIXELS * 1.01)
    expect(big.scale).toBeGreaterThanOrEqual(1)
  })

  it('clamps out-of-range and invalid input', () => {
    expect(smoothnessToParams(-50, 100, 100).scale).toBe(1)
    expect(smoothnessToParams(500, 100, 100).scale).toBeCloseTo(3, 5)
    expect(smoothnessToParams(Number.NaN, 100, 100).scale).toBeCloseTo(2, 5)
  })
})

describe('resizeBilinear', () => {
  it('returns the same buffer when size is unchanged', () => {
    const src = new Uint8ClampedArray([1, 2, 3, 4])
    expect(resizeBilinear(src, 2, 2, 1, 2, 2)).toBe(src)
  })

  it('produces the requested size and keeps constant images constant', () => {
    const src = new Uint8ClampedArray(3 * 2 * 4).fill(77)
    const out = resizeBilinear(src, 3, 2, 4, 9, 6)
    expect(out.length).toBe(9 * 6 * 4)
    expect(Array.from(new Set(out))).toEqual([77])
  })

  it('interpolates a horizontal gradient monotonically', () => {
    const src = new Uint8ClampedArray([0, 255])
    const out = resizeBilinear(src, 2, 1, 1, 8, 1)
    for (let i = 1; i < out.length; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(out[i - 1])
    }
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(255)
  })
})

describe('gaussianBlur', () => {
  it('is a no-op for a negligible sigma', () => {
    const src = new Uint8ClampedArray([0, 255, 0, 255])
    expect(gaussianBlur(src, 2, 2, 1, 0)).toBe(src)
  })

  it('keeps uniform images unchanged', () => {
    const src = new Uint8ClampedArray(10 * 10).fill(200)
    const out = gaussianBlur(src, 10, 10, 1, 1.5)
    expect(Array.from(new Set(out))).toEqual([200])
  })

  it('turns a hard edge into a monotonic ramp that crosses 128 at the edge', () => {
    const width = 41
    const src = new Uint8ClampedArray(width)
    for (let x = 20; x < width; x++) src[x] = 255
    const out = gaussianBlur(src, width, 1, 1, 2)
    for (let x = 1; x < width; x++) {
      expect(out[x]).toBeGreaterThanOrEqual(out[x - 1])
    }
    expect(out[19]).toBeLessThan(128)
    expect(out[20]).toBeGreaterThanOrEqual(128)
    expect(out[0]).toBe(0)
    expect(out[width - 1]).toBe(255)
  })

  it('blurs all channels independently for interleaved data', () => {
    const w = 9
    const src = new Uint8ClampedArray(w * 2)
    src[4 * 2] = 255 // impulse in channel 0 only
    const out = gaussianBlur(src, w, 1, 2, 1)
    expect(out[4 * 2]).toBeGreaterThan(0)
    for (let x = 0; x < w; x++) expect(out[x * 2 + 1]).toBe(0)
  })
})

describe('traceImageDataToSVG', () => {
  function createTestPattern(width = 16, height = 16): Uint8ClampedArray {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        // Create 4 distinct quadrant colors: Red, Green, Blue, White
        if (x < width / 2 && y < height / 2) {
          data[idx] = 255
          data[idx + 1] = 0
          data[idx + 2] = 0
          data[idx + 3] = 255
        } else if (x >= width / 2 && y < height / 2) {
          data[idx] = 0
          data[idx + 1] = 255
          data[idx + 2] = 0
          data[idx + 3] = 255
        } else if (x < width / 2 && y >= height / 2) {
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 255
          data[idx + 3] = 255
        } else {
          data[idx] = 255
          data[idx + 1] = 255
          data[idx + 2] = 255
          data[idx + 3] = 255
        }
      }
    }
    return data
  }

  it('traces color image to SVG with valid markup and paths', async () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)
    const config = makeVectorConfig({ mode: 'color', numberOfColors: 4 })

    const result = await traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('</svg>')
    expect(result.svg).toContain('<path')
    expect(result.pathsCount).toBeGreaterThan(0)
  })

  it('traces black and white binary mode correctly', async () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)
    const config = makeVectorConfig({ mode: 'bw', bwThreshold: 128 })

    const result = await traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('</svg>')
    expect(result.svg).toContain('rgb(0,0,0)')
    expect(result.pathsCount).toBeGreaterThan(0)
  })

  it('handles the whole smoothness range in both modes', async () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)

    for (const mode of ['color', 'bw'] as const) {
      for (const smoothness of [0, 25, 50, 100]) {
        const config = makeVectorConfig({ mode, smoothness })
        const result = await traceImageDataToSVG({ width, height, data }, config)
        expect(result.svg).toContain('<svg')
        expect(result.pathsCount).toBeGreaterThan(0)
        expect(result.svg).not.toContain('NaN')
      }
    }
  })

  it('keeps the source size as natural size and the upscaled grid as viewBox', async () => {
    const width = 16
    const height = 12
    const data = createTestPattern(width, height)
    const result = await traceImageDataToSVG({ width, height, data }, makeVectorConfig({ smoothness: 50 }))

    // smoothness 50 => 2x upscale
    expect(result.svg).toContain('viewBox="0 0 32 24"')
    expect(result.svg).toContain('width="16"')
    expect(result.svg).toContain('height="12"')
  })

  it('respects speckle filter threshold', async () => {
    const width = 20
    const height = 20
    const data = new Uint8ClampedArray(width * height * 4).fill(255)

    // Add a single 1-pixel speckle
    const speckleIdx = (10 * width + 10) * 4
    data[speckleIdx] = 0
    data[speckleIdx + 1] = 0
    data[speckleIdx + 2] = 0
    data[speckleIdx + 3] = 255

    // Trace with speckle filter enabled (pathomit = 16)
    const filteredResult = await traceImageDataToSVG(
      { width, height, data: new Uint8ClampedArray(data) },
      makeVectorConfig({ mode: 'bw', speckleFilter: 16 }),
    )

    // Trace with speckle filter disabled (pathomit = 0)
    const unfilteredResult = await traceImageDataToSVG(
      { width, height, data: new Uint8ClampedArray(data) },
      makeVectorConfig({ mode: 'bw', speckleFilter: 0 }),
    )

    expect(unfilteredResult.pathsCount).toBeGreaterThanOrEqual(filteredResult.pathsCount)
  })

  it('handles transparent pixels treating them as white background', async () => {
    const width = 8
    const height = 8
    const data = new Uint8ClampedArray(width * height * 4) // All zeros (transparent black)

    const config = makeVectorConfig({ mode: 'bw', bwThreshold: 128 })
    const result = await traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
  })

  it('generates clean filled vector paths with strokewidth="0" to eliminate jagged edges', async () => {
    const width = 64
    const height = 64
    const data = new Uint8ClampedArray(width * height * 4)
    data.fill(255)

    // Draw a circular disc
    const cx = 32
    const cy = 32
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 < 20 ** 2) {
          const idx = (y * width + x) * 4
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
          data[idx + 3] = 255
        }
      }
    }

    const config = makeVectorConfig({ mode: 'bw', smoothness: 100 })
    const result = await traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('stroke-width="0"')
    // Must contain quadratic bezier curve segments (Q command in SVG path)
    expect(result.svg).toMatch(/Q\s+[\d.-]+/i)
  })

  it('supports rightAngleEnhance and speckleFilter options cleanly', async () => {
    const width = 32
    const height = 32
    const data = new Uint8ClampedArray(width * height * 4).fill(255)

    // Draw a sharp rectangular box with 90-degree corners
    for (let y = 8; y < 24; y++) {
      for (let x = 8; x < 24; x++) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
        data[idx + 3] = 255
      }
    }

    const config = makeVectorConfig({
      mode: 'color',
      numberOfColors: 2,
      smoothness: 50,
      rightAngleEnhance: true,
      speckleFilter: 8,
    })

    const result = await traceImageDataToSVG({ width, height, data }, config)
    expect(result.svg).toContain('<path')
    expect(result.pathsCount).toBeGreaterThan(0)
  })
  describe('B&W mode with VTracer', () => {
    const width = 20
    const height = 10
    const FAKE_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" style="background:#fff;"><g><path d="M0 0 L5 5 Z" fill="#000"/></g></svg>'

    function makeBlackWhitePattern(): Uint8ClampedArray {
      const data = new Uint8ClampedArray(width * height * 4).fill(255)
      for (let y = 2; y < 8; y++) {
        for (let x = 4; x < 12; x++) {
          const i = (y * width + x) * 4
          data[i] = data[i + 1] = data[i + 2] = 0
        }
      }
      return data
    }

    it('uses the VTracer result and sets viewport attributes on it', async () => {
      vtracerMock.mockResolvedValue(FAKE_SVG)
      const result = await traceImageDataToSVG(
        { width, height, data: makeBlackWhitePattern() },
        makeVectorConfig({ mode: 'bw', smoothness: 50, speckleFilter: 8 }),
      )

      expect(vtracerMock).toHaveBeenCalledTimes(1)
      expect(result.svg).toContain('fill="#000"')
      expect(result.svg).toContain('viewBox="0 0 40 20"')
      expect(result.svg).toContain('width="20"')
      expect(result.svg).toContain('height="10"')
      expect(result.pathsCount).toBe(1)
    })

    it('feeds VTracer an upscaled, smoothed, strictly binary image and smoothness-driven options', async () => {
      vtracerMock.mockResolvedValue(FAKE_SVG)
      await traceImageDataToSVG(
        { width, height, data: makeBlackWhitePattern() },
        makeVectorConfig({ mode: 'bw', smoothness: 50, speckleFilter: 8, bwThreshold: 128 }),
      )

      const [image, options] = vtracerMock.mock.calls[0] as [
        { width: number; height: number; data: Uint8ClampedArray },
        Record<string, number>,
      ]
      expect(image.width).toBe(40)
      expect(image.height).toBe(20)
      expect(image.data.length).toBe(40 * 20 * 4)
      const values = new Set<number>()
      for (let i = 0; i < image.data.length; i += 4) values.add(image.data[i])
      expect([...values].sort()).toEqual([0, 255])

      const expected = smoothnessToParams(50, width, height)
      expect(options.cornerThreshold).toBeCloseTo(expected.cornerThreshold, 5)
      expect(options.lengthThreshold).toBeCloseTo(expected.lengthThreshold, 5)
      expect(options.filterSpeckle).toBe(Math.round((8 * expected.scale) / 2))
    })

    it('treats transparent pixels as white background', async () => {
      vtracerMock.mockResolvedValue(FAKE_SVG)
      await traceImageDataToSVG(
        { width: 4, height: 4, data: new Uint8ClampedArray(4 * 4 * 4) },
        makeVectorConfig({ mode: 'bw', smoothness: 0 }),
      )
      const [image] = vtracerMock.mock.calls[0] as [{ data: Uint8ClampedArray }]
      for (let i = 0; i < image.data.length; i += 4) expect(image.data[i]).toBe(255)
    })

    it('falls back to imagetracerjs when VTracer fails', async () => {
      const result = await traceImageDataToSVG(
        { width, height, data: makeBlackWhitePattern() },
        makeVectorConfig({ mode: 'bw', smoothness: 50 }),
      )
      expect(vtracerMock).toHaveBeenCalled()
      expect(result.svg).toContain('rgb(0,0,0)')
      expect(result.svg).toContain('viewBox="0 0 40 20"')
    })
  })
})
