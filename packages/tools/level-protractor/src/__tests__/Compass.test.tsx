import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Compass } from '../components/Compass'

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
})
