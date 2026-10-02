import { describe, it, expect } from 'vitest'
import { calculateScaledDimensions, countSvgPaths, sanitizeSvgOutput, traceImageDataToSVG } from '../utils/vectorEngine'
import type { VectorizeConfig } from '../types'

function makeVectorConfig(overrides: Partial<VectorizeConfig> = {}): VectorizeConfig {
  return {
    mode: 'color',
    numberOfColors: 8,
    bwThreshold: 128,
    speckleFilter: 4,
    smoothing: 'medium',
    rightAngleEnhance: false,
    lineFilter: false,
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

describe('sanitizeSvgOutput', () => {
  it('injects viewBox when missing in raw svg markup', () => {
    const raw = '<svg width="200" height="100"><path d="M0 0"/></svg>'
    const sanitized = sanitizeSvgOutput(raw, 200, 100)
    expect(sanitized).toContain('viewBox="0 0 200 100"')
  })

  it('preserves existing viewBox', () => {
    const raw = '<svg viewBox="0 0 50 50"><path d="M0 0"/></svg>'
    const sanitized = sanitizeSvgOutput(raw, 100, 100)
    expect(sanitized).toContain('viewBox="0 0 50 50"')
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

  it('traces color image to SVG with valid markup and paths', () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)
    const config = makeVectorConfig({ mode: 'color', numberOfColors: 4 })

    const result = traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('</svg>')
    expect(result.svg).toContain('<path')
    expect(result.pathsCount).toBeGreaterThan(0)
  })

  it('traces black and white binary mode correctly', () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)
    const config = makeVectorConfig({ mode: 'bw', bwThreshold: 128 })

    const result = traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('</svg>')
    expect(result.svg).toContain('rgb(0,0,0)')
    expect(result.pathsCount).toBeGreaterThan(0)
  })

  it('handles smoothing options (low, medium, high)', () => {
    const width = 16
    const height = 16
    const data = createTestPattern(width, height)

    for (const smoothing of ['low', 'medium', 'high'] as const) {
      const config = makeVectorConfig({ smoothing })
      const result = traceImageDataToSVG({ width, height, data }, config)
      expect(result.svg).toContain('<svg')
      expect(result.pathsCount).toBeGreaterThan(0)
    }
  })

  it('respects speckle filter threshold', () => {
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
    const filteredResult = traceImageDataToSVG(
      { width, height, data: new Uint8ClampedArray(data) },
      makeVectorConfig({ mode: 'bw', speckleFilter: 16 }),
    )

    // Trace with speckle filter disabled (pathomit = 0)
    const unfilteredResult = traceImageDataToSVG(
      { width, height, data: new Uint8ClampedArray(data) },
      makeVectorConfig({ mode: 'bw', speckleFilter: 0 }),
    )

    expect(unfilteredResult.pathsCount).toBeGreaterThanOrEqual(filteredResult.pathsCount)
  })

  it('handles transparent pixels treating them as white background', () => {
    const width = 8
    const height = 8
    const data = new Uint8ClampedArray(width * height * 4) // All zeros (transparent black)

    const config = makeVectorConfig({ mode: 'bw', bwThreshold: 128 })
    const result = traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('<svg')
  })

  it('generates clean filled vector paths with strokewidth="0" to eliminate jagged edges', () => {
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

    const config = makeVectorConfig({ mode: 'bw', smoothing: 'high' })
    const result = traceImageDataToSVG({ width, height, data }, config)

    expect(result.svg).toContain('stroke-width="0"')
    // Must contain quadratic bezier curve segments (Q command in SVG path)
    expect(result.svg).toMatch(/Q\s+[\d.-]+/i)
  })

  it('supports rightAngleEnhance and speckleFilter options cleanly', () => {
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
      smoothing: 'medium',
      rightAngleEnhance: true,
      speckleFilter: 8,
    })

    const result = traceImageDataToSVG({ width, height, data }, config)
    expect(result.svg).toContain('<path')
    expect(result.pathsCount).toBeGreaterThan(0)
  })
})
