import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { StopwatchInterval } from '../StopwatchInterval'

describe('StopwatchInterval', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders stopwatch with digits at top and buttons at bottom, laps hidden initially', () => {
    render(<StopwatchInterval locale="en" />)

    // Mode pills
    expect(screen.getByRole('button', { name: 'Stopwatch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intervals' })).toBeInTheDocument()

    // Digits
    expect(screen.getByText('00:00.00')).toBeInTheDocument()

    // Laps table does NOT appear initially
    expect(screen.queryByText('Lap time')).not.toBeInTheDocument()

    // Circular start button
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('displays laps table once a lap is recorded', () => {
    render(<StopwatchInterval locale="en" />)

    // Start timing
    const startBtn = screen.getByRole('button', { name: 'Start' })
    fireEvent.click(startBtn)

    // Click Lap
    const lapBtn = screen.getByRole('button', { name: 'Lap' })
    act(() => {
      fireEvent.click(lapBtn)
    })

    // Now the Laps table appears
    expect(screen.getByText('Lap time')).toBeInTheDocument()
    expect(screen.getByText('Total time')).toBeInTheDocument()
    expect(screen.getByText(/#1/)).toBeInTheDocument()
  })

  it('switches to intervals mode and displays presets including Custom', () => {
    render(<StopwatchInterval locale="en" />)

    const intervalsTab = screen.getByRole('button', { name: 'Intervals' })
    fireEvent.click(intervalsTab)

    expect(screen.getByRole('button', { name: 'Tabata' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'HIIT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pomodoro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument()

    // Summary card with configure button
    expect(screen.getByRole('button', { name: 'Configure custom' })).toBeInTheDocument()
  })

  it('opens custom interval dialog, configures intervals, and saves to localStorage', () => {
    render(<StopwatchInterval locale="en" />)

    // Switch to intervals
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }))

    // Open configure dialog
    const configureBtn = screen.getByRole('button', { name: 'Configure custom' })
    fireEvent.click(configureBtn)

    // Dialog inputs (multi-step routines have an input per step)
    const workInputs = screen.getAllByLabelText('Work time (s)')
    const restInputs = screen.getAllByLabelText('Rest time (s)')
    const setsInputs = screen.getAllByLabelText('Sets per loop')

    expect(workInputs[0]).toBeInTheDocument()
    expect(restInputs[0]).toBeInTheDocument()
    expect(setsInputs[0]).toBeInTheDocument()

    fireEvent.change(workInputs[0], { target: { value: '40' } })
    fireEvent.change(restInputs[0], { target: { value: '20' } })
    fireEvent.change(setsInputs[0], { target: { value: '10' } })

    // Save and apply
    const saveBtn = screen.getByRole('button', { name: 'Save & Apply' })
    fireEvent.click(saveBtn)

    // Verify localStorage
    expect(localStorage.getItem('alltools:interval:customWorkSec')).toBe('40')
    expect(localStorage.getItem('alltools:interval:customRestSec')).toBe('20')
    expect(localStorage.getItem('alltools:interval:customSetsTotal')).toBe('10')
    expect(localStorage.getItem('alltools:interval:preset')).toBe('custom')
    expect(localStorage.getItem('alltools:interval:customSteps')).toBeDefined()

    // Verify summary reflects custom routine
    expect(screen.getByText(/40s/i)).toBeInTheDocument()
  })

  it('allows incrementing and decrementing via stepper buttons', () => {
    render(<StopwatchInterval locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configure custom' }))

    const workInput = screen.getAllByLabelText('Work time (s)')[0] as HTMLInputElement
    const initialVal = parseInt(workInput.value, 10)

    const increaseBtn = screen.getAllByRole('button', { name: 'Increase Work time (s)' })[0]
    fireEvent.click(increaseBtn)
    expect(parseInt(workInput.value, 10)).toBe(initialVal + 5)

    const decreaseBtn = screen.getAllByRole('button', { name: 'Decrease Work time (s)' })[0]
    fireEvent.click(decreaseBtn)
    expect(parseInt(workInput.value, 10)).toBe(initialVal)
  })

  it('renders styled remove button and removes step when clicked', () => {
    render(<StopwatchInterval locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configure custom' }))

    // Default custom setup has 2 steps, so Remove buttons are visible
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    expect(removeButtons.length).toBe(2)
    expect(removeButtons[0]).toHaveClass('all-btn--danger')
    expect(removeButtons[0]).toHaveClass('all-btn--sm')

    // Click remove on step 2
    fireEvent.click(removeButtons[1])
    expect(screen.queryAllByRole('button', { name: 'Remove' }).length).toBe(0) // 1 step left, so no remove buttons
  })

  it('displays loop info in subtitle without undefined', () => {
    render(<StopwatchInterval locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }))
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))

    // Should display Step 1/2 · Loop 1/2 · Set 1/8
    // Most importantly, "undefined" must not appear anywhere in document
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Interval training · Step 1\/2 · Loop 1\/2 · Set 1\/8/)).toBeInTheDocument()
  })
})
