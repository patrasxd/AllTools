import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Compass } from '../components/Compass'

function fireOrientation(type: string, props: { alpha: number; absolute?: boolean }) {
  const e = new Event(type) as Event & { alpha: number; beta: number; gamma: number; absolute?: boolean }
  e.alpha = props.alpha
  e.beta = 0
  e.gamma = 0
  if (props.absolute !== undefined) e.absolute = props.absolute
  act(() => {
    window.dispatchEvent(e)
  })
}

// Mirrors LevelProtractor.tsx: the parent keeps state and passes a NEW inline callback on every render.
function ParentWithInlineCallback() {
  const [stats, setStats] = useState({ heading: 0, direction: 'N' })
  return (
    <div>
      <span data-testid="parent-heading">{stats.heading}</span>
      <Compass onHeadingChange={(heading, direction) => setStats({ heading, direction })} />
    </div>
  )
}

describe('Compass Component', () => {
  const originalDeviceOrientationEvent = window.DeviceOrientationEvent

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    delete (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent
  })

  afterEach(() => {
    if (originalDeviceOrientationEvent) {
      window.DeviceOrientationEvent = originalDeviceOrientationEvent
    } else {
      delete (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent
    }
  })

  it('renders default heading 0° and North badge', () => {
    render(<Compass />)

    expect(screen.getByText('0°')).toBeDefined()
    expect(screen.getAllByText('N').length).toBeGreaterThan(0)
  })

  it('allows manual rotation slider on desktop', () => {
    const onHeadingChange = vi.fn()
    render(<Compass onHeadingChange={onHeadingChange} />)

    const slider = screen.getByLabelText(/manual heading adjustment/i)
    expect(slider).toBeDefined()

    // Change to 90 degrees (East)
    fireEvent.change(slider, { target: { value: '90' } })

    expect(screen.getByText('90°')).toBeDefined()
    expect(screen.getAllByText('E').length).toBeGreaterThan(0)
    expect(onHeadingChange).toHaveBeenCalledWith(90, 'E')
  })

  it('updates cardinal direction when rotating to 180° (South)', () => {
    render(<Compass />)

    const slider = screen.getByLabelText(/manual heading adjustment/i)
    fireEvent.change(slider, { target: { value: '180' } })

    expect(screen.getByText('180°')).toBeDefined()
    expect(screen.getAllByText('S').length).toBeGreaterThan(0)
  })

  it('updates cardinal direction when rotating to 270° (West)', () => {
    render(<Compass />)

    const slider = screen.getByLabelText(/manual heading adjustment/i)
    fireEvent.change(slider, { target: { value: '270' } })

    expect(screen.getByText('270°')).toBeDefined()
    expect(screen.getAllByText('W').length).toBeGreaterThan(0)
  })

  describe('Motion Permission CTA (iOS Safari)', () => {
    it('does not display Enable Compass CTA on standard browsers that do not require permission', () => {
      render(<Compass />)
      expect(screen.queryByRole('button', { name: /enable compass/i })).toBeNull()
    })

    it('displays Enable Compass CTA when orientation permission is required but not granted', () => {
      ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = {
        requestPermission: vi.fn(),
      }

      render(<Compass sensorPermissionGranted={false} />)

      expect(screen.getByRole('button', { name: /enable compass/i })).toBeDefined()
      expect(screen.getByText(/requires permission to access motion sensors/i)).toBeDefined()
    })

    it('displays Polish CTA text when locale is pl', () => {
      ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = {
        requestPermission: vi.fn(),
      }

      render(<Compass locale="pl" sensorPermissionGranted={false} />)

      expect(screen.getByRole('button', { name: /włącz kompas/i })).toBeDefined()
      expect(screen.getByText(/wymaga zgody na dostęp do czujników ruchu/i)).toBeDefined()
    })

    it('hides Enable Compass CTA when permission is already granted via props', () => {
      ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = {
        requestPermission: vi.fn(),
      }

      render(<Compass sensorPermissionGranted={true} />)

      expect(screen.queryByRole('button', { name: /enable compass/i })).toBeNull()
    })

    it('calls requestOrientationPermission directly on click, hides CTA, and notifies parent when granted', async () => {
      const requestMock = vi.fn().mockResolvedValue('granted')
      ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = {
        requestPermission: requestMock,
      }
      const onPermissionGranted = vi.fn()

      render(<Compass sensorPermissionGranted={false} onPermissionGranted={onPermissionGranted} />)

      const btn = screen.getByRole('button', { name: /enable compass/i })
      expect(btn).toBeDefined()

      fireEvent.click(btn)

      await waitFor(() => {
        expect(requestMock).toHaveBeenCalledTimes(1)
        expect(onPermissionGranted).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('button', { name: /enable compass/i })).toBeNull()
      })
    })

    it('keeps CTA visible when permission is denied', async () => {
      const requestMock = vi.fn().mockResolvedValue('denied')
      ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = {
        requestPermission: requestMock,
      }
      const onPermissionGranted = vi.fn()

      render(<Compass sensorPermissionGranted={false} onPermissionGranted={onPermissionGranted} />)

      const btn = screen.getByRole('button', { name: /enable compass/i })
      fireEvent.click(btn)

      await waitFor(() => {
        expect(requestMock).toHaveBeenCalledTimes(1)
      })

      expect(onPermissionGranted).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /enable compass/i })).toBeDefined()
    })
  })

  describe('Real Device Orientation Handling', () => {
    it('correctly calculates heading from deviceorientationabsolute without 270 degree freeze', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      // Simulate Android deviceorientationabsolute with alpha = 315 (which is 45° North-East)
      const absEvent = new Event('deviceorientationabsolute') as any
      absEvent.alpha = 315
      absEvent.beta = 45 // Held tilted in hand
      absEvent.gamma = 5
      act(() => {
        window.dispatchEvent(absEvent)
      })

      expect(screen.getByText('45°')).toBeDefined()
      expect(screen.getAllByText('NE').length).toBeGreaterThan(0)
      expect(onHeadingChange).toHaveBeenCalledWith(45, 'NE')
    })

    it('uses iOS webkitCompassHeading directly when available', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      // Simulate iOS deviceorientation with webkitCompassHeading = 120 (South-East)
      const iosEvent = new Event('deviceorientation') as any
      iosEvent.webkitCompassHeading = 120
      act(() => {
        window.dispatchEvent(iosEvent)
      })

      expect(screen.getByText('120°')).toBeDefined()
      expect(screen.getAllByText('SE').length).toBeGreaterThan(0)
      expect(onHeadingChange).toHaveBeenCalledWith(120, 'SE')
    })

    it('ignores relative deviceorientation events after absolute event has been established', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      // 1. Establish absolute reading at 90° (East)
      const absEvent = new Event('deviceorientationabsolute') as any
      absEvent.alpha = 270 // 360 - 270 = 90° East
      absEvent.beta = 30
      absEvent.gamma = 0
      act(() => {
        window.dispatchEvent(absEvent)
      })

      expect(screen.getByText('90°')).toBeDefined()

      // 2. Relative event with alpha = 90 (which previously caused 270° bug) should be ignored
      const relEvent = new Event('deviceorientation') as any
      relEvent.alpha = 90
      relEvent.beta = 45
      relEvent.gamma = 0
      act(() => {
        window.dispatchEvent(relEvent)
      })

      // Heading must remain 90° East, NOT jump to 270°
      expect(screen.getByText('90°')).toBeDefined()
      expect(screen.queryByText('270°')).toBeNull()
    })

    it('does not flip between absolute and relative readings when the parent passes an inline callback (Android)', () => {
      render(<ParentWithInlineCallback />)

      const seen = new Set<string>()
      for (let i = 0; i < 6; i++) {
        fireOrientation('deviceorientationabsolute', { alpha: 270 }) // real heading: 90° (E)
        seen.add(screen.getByTestId('parent-heading').textContent ?? '')
        fireOrientation('deviceorientation', { alpha: 10, absolute: false }) // relative, arbitrary origin
        seen.add(screen.getByTestId('parent-heading').textContent ?? '')
      }

      expect([...seen]).toEqual(['90'])
    })

    it('accepts deviceorientation events that are flagged absolute (e.g. Firefox Android)', () => {
      render(<Compass />)
      fireOrientation('deviceorientation', { alpha: 270, absolute: true })
      expect(screen.getByText('90°')).toBeDefined()
    })

    it('ignores plain deviceorientation events without an absolute flag (relative on Chrome/Android)', () => {
      render(<Compass />)
      fireOrientation('deviceorientation', { alpha: 270, absolute: false })
      expect(screen.queryByText('90°')).toBeNull()
      expect(screen.getByText('0°')).toBeDefined()
    })

    it('smooths noisy readings instead of following every sample', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      // Steady at 90°, then a single +40° glitch (alpha 270 -> 230), then back to 90°
      fireOrientation('deviceorientationabsolute', { alpha: 270 })
      fireOrientation('deviceorientationabsolute', { alpha: 230 })
      const afterGlitch = onHeadingChange.mock.calls.at(-1)![0] as number
      expect(afterGlitch).toBeGreaterThan(90)
      expect(afterGlitch).toBeLessThan(110) // far less than the raw +40° jump
    })

    it('ignores sub-degree jitter', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      fireOrientation('deviceorientationabsolute', { alpha: 270 })
      onHeadingChange.mockClear()
      for (const alpha of [270.3, 269.8, 270.4, 269.7]) {
        fireOrientation('deviceorientationabsolute', { alpha })
      }
      expect(onHeadingChange).not.toHaveBeenCalled()
    })

    it('crosses the 0°/360° meridian the short way', () => {
      const onHeadingChange = vi.fn()
      render(<Compass onHeadingChange={onHeadingChange} />)

      fireOrientation('deviceorientationabsolute', { alpha: 2 }) // heading 358°
      for (let i = 0; i < 40; i++) fireOrientation('deviceorientationabsolute', { alpha: 358 }) // heading 2°

      const headings = onHeadingChange.mock.calls.map((c) => c[0] as number)
      // Must pass through 359/0/1, never through the middle of the dial
      expect(headings.every((h) => h >= 358 || h <= 3)).toBe(true)
      expect(headings.at(-1)).toBeLessThanOrEqual(3)
    })
  })
})
