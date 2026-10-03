import { describe, it, expect, vi, beforeEach } from 'vitest'

const { converterInstances, FakeConverter, loadMock } = vi.hoisted(() => {
  const instances: Array<{
    args: unknown[]
    freed: boolean
    ticks: number
    ticksNeeded: number
    throwOnInit: boolean
  }> = []

  class FakeConverter {
    static ticksNeeded = 3
    static throwOnInit = false
    args: unknown[]
    freed = false
    ticks = 0
    ticksNeeded: number
    throwOnInit: boolean

    constructor(...args: unknown[]) {
      this.args = args
      this.ticksNeeded = FakeConverter.ticksNeeded
      this.throwOnInit = FakeConverter.throwOnInit
      instances.push(this)
    }
    init() {
      if (this.throwOnInit) throw new Error('init failed')
    }
    tick() {
      this.ticks++
      return this.ticks >= this.ticksNeeded
    }
    getResult() {
      return '<svg><path d="M0 0"/></svg>'
    }
    free() {
      this.freed = true
    }
  }

  return {
    converterInstances: instances,
    FakeConverter,
    loadMock: vi.fn(async () => ({ BinaryImageConverter: FakeConverter })),
  }
})

vi.mock('../utils/vtracerRuntime', () => ({ loadVTracer: loadMock }))

import { traceBinaryWithVTracer } from '../utils/vtracer'

const OPTIONS = { filterSpeckle: 4, cornerThreshold: 60, lengthThreshold: 4, spliceThreshold: 45, pathPrecision: 2 }

describe('traceBinaryWithVTracer', () => {
  beforeEach(() => {
    converterInstances.length = 0
    FakeConverter.ticksNeeded = 3
    FakeConverter.throwOnInit = false
  })

  it('runs the converter to completion and returns the SVG', async () => {
    const image = { width: 2, height: 2, data: new Uint8ClampedArray(16) }
    const svg = await traceBinaryWithVTracer(image, OPTIONS)

    expect(svg).toContain('<path')
    expect(converterInstances).toHaveLength(1)
    expect(converterInstances[0].ticks).toBe(3)
    expect(converterInstances[0].freed).toBe(true)
  })

  it('passes the image, spline mode, inversion and params to VTracer', async () => {
    const image = { width: 2, height: 2, data: new Uint8ClampedArray(16) }
    await traceBinaryWithVTracer(image, OPTIONS)

    const [img, params, options] = converterInstances[0].args as [
      unknown,
      Record<string, unknown>,
      Record<string, unknown>,
    ]
    expect(img).toBe(image)
    expect(params).toMatchObject({ mode: 'spline', debug: false, ...OPTIONS })
    expect(options).toMatchObject({ invert: false, pathFill: '#000', scale: 1 })
  })

  it('frees the converter even when it throws', async () => {
    FakeConverter.throwOnInit = true
    const image = { width: 1, height: 1, data: new Uint8ClampedArray(4) }

    await expect(traceBinaryWithVTracer(image, OPTIONS)).rejects.toThrow('init failed')
    expect(converterInstances[0].freed).toBe(true)
  })
})
