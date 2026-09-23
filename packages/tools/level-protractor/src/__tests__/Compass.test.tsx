import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Compass } from '../components/Compass'

describe('Compass Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
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
})
