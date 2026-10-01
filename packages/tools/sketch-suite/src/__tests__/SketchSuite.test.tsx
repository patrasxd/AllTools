import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SketchSuite } from '../SketchSuite'

// Mock canvas getContext for jsdom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
    if (contextId === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          width: 900,
          height: 600,
          data: new Uint8ClampedArray(900 * 600 * 4),
        }),
        putImageData: vi.fn(),
        createImageData: vi.fn().mockReturnValue({
          width: 900,
          height: 600,
          data: new Uint8ClampedArray(900 * 600 * 4),
        }),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 50 }),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        setLineDash: vi.fn(),
        strokeRect: vi.fn(),
      }
    }
    return null
  })
})

describe('SketchSuite UI Component', () => {
  it('renders File button using @all/ui Button with all-btn and all-btn--primary classes', () => {
    render(<SketchSuite locale="en" />)
    const fileBtn = screen.getByRole('button', { name: /file/i })
    expect(fileBtn).toBeDefined()
    expect(fileBtn.classList.contains('all-btn')).toBe(true)
    expect(fileBtn.classList.contains('all-btn--primary')).toBe(true)
    expect(fileBtn.classList.contains('paint-file-btn')).toBe(true)
  })

  it('renders Custom Color button with embedded input and color wheel icon', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const customColorLabel = container.querySelector('.paint-custom-color-btn')
    expect(customColorLabel).toBeDefined()
    expect(customColorLabel?.querySelector('.paint-color-wheel-icon')).toBeDefined()
    
    const colorInput = customColorLabel?.querySelector('input[type="color"]') as HTMLInputElement
    expect(colorInput).toBeDefined()
    expect(colorInput.classList.contains('paint-hidden-color-input')).toBe(true)
  })

  it('opens Tool Size Settings Dialog when custom size trigger is clicked', () => {
    render(<SketchSuite locale="en" />)
    const customSizeBtn = screen.getByTitle('Custom Size')
    expect(customSizeBtn).toBeDefined()

    // Dialog should not be visible initially
    expect(screen.queryByRole('dialog')).toBeNull()

    // Click trigger to open size settings popup dialog
    fireEvent.click(customSizeBtn)

    // Dialog should now be open
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.querySelector('.all-dialog__title')?.textContent).toBe('Brush Size')

    // Preset buttons should be present in dialog using AllUI Button with pill shape
    const presetBtns = screen.getAllByRole('button', { name: '24px' })
    expect(presetBtns.length).toBeGreaterThan(0)
    const dialogPresetBtn = presetBtns[presetBtns.length - 1]
    expect(dialogPresetBtn.classList.contains('all-btn')).toBe(true)
    expect(dialogPresetBtn.classList.contains('all-btn--pill')).toBe(true)
    fireEvent.click(dialogPresetBtn)

    // Shortcut text should NOT be present in dialog
    expect(screen.queryByText(/shortcut/i)).toBeNull()
    expect(screen.queryByText(/ctrl \+/i)).toBeNull()

    // Done button should close dialog
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    expect(doneBtn.classList.contains('all-btn')).toBe(true)
    fireEvent.click(doneBtn)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens File Menu Popover when File button is clicked and unifies with anchored popovers', () => {
    render(<SketchSuite locale="en" />)
    const fileBtn = screen.getByRole('button', { name: /file/i })
    fireEvent.click(fileBtn)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.classList.contains('paint-anchored-popover')).toBe(true)
    expect(dialog.classList.contains('paint-file-popover')).toBe(true)
    expect(screen.getByText('New Canvas...')).toBeDefined()
    expect(screen.getByText('Export / Save As...')).toBeDefined()

    // Clicking close button closes popover
    const closeBtn = dialog.querySelector('.paint-popover-close-btn') as HTMLButtonElement
    expect(closeBtn).toBeDefined()
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens Custom Color Popover when custom color button is clicked and unifies layout with size popover', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const customColorBtn = screen.getByRole('button', { name: /custom\.\.\./i })
    expect(customColorBtn).toBeDefined()

    // Popover should not be visible initially
    expect(container.ownerDocument.body.querySelector('.paint-anchored-popover.paint-color-popover')).toBeNull()

    // Click to open color popover
    fireEvent.click(customColorBtn)

    // Anchored popover should be open and share exact class structure with size popover
    const colorPopover = container.ownerDocument.body.querySelector('.paint-anchored-popover.paint-color-popover')
    expect(colorPopover).toBeDefined()
    expect(colorPopover?.getAttribute('role')).toBe('dialog')

    // Hex input should be present with current color
    const hexInput = colorPopover?.querySelector('input[type="text"]') as HTMLInputElement
    expect(hexInput).toBeDefined()
    expect(hexInput.value).toBe('#000000')

    // Done button should close popover
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(doneBtn)
    expect(container.ownerDocument.body.querySelector('.paint-anchored-popover.paint-color-popover')).toBeNull()
  })

  it('unifies dynamic tool section structure across tools', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const dynamicSection = container.querySelector('.paint-dynamic-section')
    expect(dynamicSection).toBeDefined()
    expect(dynamicSection?.classList.contains('paint-section')).toBe(true)

    // Initially with brush tool, size box should be rendered
    expect(container.querySelector('.paint-dynamic-box--size')).toBeDefined()

    // Switch to text tool
    const textToolBtn = screen.getByTitle('Text Tool')
    fireEvent.click(textToolBtn)

    // Dynamic section should now have text box with typography controls
    expect(container.querySelector('.paint-dynamic-box--text')).toBeDefined()
    expect(container.querySelector('.paint-select--font')).toBeDefined()
    expect(container.querySelector('.paint-select--size')).toBeDefined()

    // Switch to shapes (e.g. Rectangle)
    const rectBtn = screen.getByTitle('Rectangle')
    fireEvent.click(rectBtn)
    expect(container.querySelector('.paint-dynamic-box--shapes')).toBeDefined()
    expect(container.querySelector('.paint-shape-fill-toggles')).toBeDefined()

    // Switch to Select tool
    const selectBtn = screen.getByTitle('Select (Rectangle)')
    fireEvent.click(selectBtn)
    expect(container.querySelector('.paint-dynamic-box--select')).toBeDefined()
    expect(container.querySelector('.paint-select-info-box')).toBeDefined()
  })

  it('pans the canvas viewport with the hand tool', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const viewport = container.querySelector('.paint-canvas-viewport') as HTMLElement
    const canvas = container.querySelector('canvas.paint-canvas') as HTMLCanvasElement
    viewport.scrollLeft = 60
    viewport.scrollTop = 40

    fireEvent.click(screen.getByRole('button', { name: 'Hand Tool' }))
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 70, clientY: 75, pointerId: 1 })

    expect(viewport.scrollLeft).toBe(90)
    expect(viewport.scrollTop).toBe(65)

    fireEvent.pointerUp(canvas, { pointerId: 1 })
  })

  it('renders MS Paint-style inline on-canvas text box with repositioning drag handle', () => {
    const { container } = render(<SketchSuite locale="en" />)
    
    // Select Text tool
    const textToolBtn = screen.getByTitle('Text Tool')
    fireEvent.click(textToolBtn)

    // Click canvas to initiate text entry
    const mainCanvas = container.querySelector('canvas.paint-canvas') as HTMLCanvasElement
    expect(mainCanvas).toBeDefined()
    fireEvent.pointerDown(mainCanvas, { clientX: 150, clientY: 150 })

    // Active text box should be displayed directly on canvas
    const textBox = container.querySelector('.paint-canvas-text-box')
    expect(textBox).not.toBeNull()
    expect(textBox?.classList.contains('paint-text-inline-overlay')).toBe(true)

    // It should have the drag handle with grip
    const dragHandle = textBox?.querySelector('.paint-text-box-drag-handle')
    expect(dragHandle).toBeDefined()

    // Test repositioning drag start and move
    fireEvent.pointerDown(dragHandle as HTMLElement, { clientX: 150, clientY: 150 })
    fireEvent.pointerMove(window, { clientX: 200, clientY: 220 })
    fireEvent.pointerUp(window)

    // Text input inside the on-canvas box
    const textInput = textBox?.querySelector('input.paint-text-box-input') as HTMLInputElement
    expect(textInput).toBeDefined()
    fireEvent.change(textInput, { target: { value: 'Hello Paint' } })
    expect(textInput.value).toBe('Hello Paint')

    // Commit button inside the drag bar
    const commitBtn = textBox?.querySelector('.paint-text-box-btn--commit') as HTMLButtonElement
    expect(commitBtn).toBeDefined()
    fireEvent.click(commitBtn)

    // Text box closes after committing onto canvas
    expect(container.querySelector('.paint-canvas-text-box')).toBeNull()
  })
})
