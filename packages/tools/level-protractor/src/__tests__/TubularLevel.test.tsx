import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TubularLevel } from '../components/TubularLevel'

describe('TubularLevel Component', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it('renders centered bubble when perfectly level (0 deg)', () => {
    const { container } = render(
      <TubularLevel
        calibratedPitch={0}
        calibratedRoll={0}
        pitch={85}
        roll={0}
        setPitch={vi.fn()}
        setRoll={vi.fn()}
      />
    )

    // Center is 130px in 260px vial: bubble rect x is 130 - 13 = 117
    const bubbleRect = container.querySelector('.level-vial-svg rect[rx="12"]')
    expect(bubbleRect).not.toBeNull()
    expect(bubbleRect?.getAttribute('x')).toBe('117')

    // Screen readout shows 0.0° and Level badge
    expect(screen.getByText('0.0°')).toBeDefined()
    expect(screen.getByText(/level/i)).toBeDefined()
  })

  it('moves bubble to the left when tilted negatively', () => {
    const { container } = render(
      <TubularLevel
        calibratedPitch={0}
        calibratedRoll={0}
        pitch={85}
        roll={-10} // tilted left
        setPitch={vi.fn()}
        setRoll={vi.fn()}
      />
    )

    const bubbleRect = container.querySelector('.level-vial-svg rect[rx="12"]')
    const xPos = parseFloat(bubbleRect?.getAttribute('x') || '0')
    // Center x is 117. Tilted left should have xPos < 117
    expect(xPos).toBeLessThan(117)
  })

  it('moves bubble to the right when tilted positively', () => {
    const { container } = render(
      <TubularLevel
        calibratedPitch={0}
        calibratedRoll={0}
        pitch={85}
        roll={10} // tilted right
        setPitch={vi.fn()}
        setRoll={vi.fn()}
      />
    )

    const bubbleRect = container.querySelector('.level-vial-svg rect[rx="12"]')
    const xPos = parseFloat(bubbleRect?.getAttribute('x') || '0')
    // Center x is 117. Tilted right should have xPos > 117
    expect(xPos).toBeGreaterThan(117)
  })

  it('renders exactly 2 edge selector buttons (Bottom Edge & Left Edge) and NO auto-detect', () => {
    render(
      <TubularLevel
        calibratedPitch={0}
        calibratedRoll={0}
        pitch={85}
        roll={0}
        setPitch={vi.fn()}
        setRoll={vi.fn()}
      />
    )

    // Two edge options exist
    expect(screen.getByRole('button', { name: /bottom edge/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /left edge/i })).toBeDefined()

    // No Auto Detect buttons
    expect(screen.queryByRole('button', { name: /auto/i })).toBeNull()

    // Switching to Left Edge works
    const leftEdgeBtn = screen.getByRole('button', { name: /left edge/i })
    fireEvent.click(leftEdgeBtn)
    expect(screen.getAllByText(/left edge/i).length).toBeGreaterThan(0)
  })

  it('allows manual desktop angle simulation in both directions', () => {
    const setRoll = vi.fn()
    render(
      <TubularLevel
        calibratedPitch={0}
        calibratedRoll={0}
        pitch={85}
        roll={0}
        setPitch={vi.fn()}
        setRoll={setRoll}
        showSimulationSliders={true}
      />
    )

    // Quick buttons include negative, zero, and positive tilts
    const minusBtn = screen.getByRole('button', { name: '-15°' })
    const plusBtn = screen.getByRole('button', { name: '+15°' })
    const zeroBtn = screen.getByRole('button', { name: '0°' })

    expect(minusBtn).toBeDefined()
    expect(plusBtn).toBeDefined()
    expect(zeroBtn).toBeDefined()

    fireEvent.click(minusBtn)
    expect(setRoll).toHaveBeenCalledWith(-15)

    fireEvent.click(plusBtn)
    expect(setRoll).toHaveBeenCalledWith(15)
  })
})
