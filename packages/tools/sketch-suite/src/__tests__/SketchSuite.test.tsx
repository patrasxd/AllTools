import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
        closePath: vi.fn(),
        clip: vi.fn(),
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

  it('opens Resize Canvas dialog with AllUI Button presets and AllUI Input fields', () => {
    render(<SketchSuite locale="en" />)
    const fileBtn = screen.getByRole('button', { name: /file/i })
    fireEvent.click(fileBtn)

    const resizeOption = screen.getByText('Resize Canvas...')
    fireEvent.click(resizeOption)

    // Dialog should be open
    const resizeDialog = screen.getByRole('dialog')
    expect(resizeDialog).toBeDefined()
    expect(resizeDialog.querySelector('.all-dialog__title')?.textContent).toBe('Resize Canvas')

    // Presets should be rendered using @all/ui Button
    const presetButtons = resizeDialog.querySelectorAll('.paint-presets-grid button')
    expect(presetButtons.length).toBeGreaterThan(0)
    presetButtons.forEach((btn) => {
      expect(btn.classList.contains('all-btn')).toBe(true)
    })

    // Input fields should use @all/ui Input with all-input-field
    const inputs = resizeDialog.querySelectorAll('.all-input-field')
    expect(inputs.length).toBe(2)

    // Actions should use @all/ui Button in paint-dialog-actions without ugly footer cut-off
    const actions = resizeDialog.querySelector('.paint-dialog-actions')
    expect(actions).not.toBeNull()
    const applyBtn = screen.getByRole('button', { name: 'Apply Dimensions' })
    expect(applyBtn.classList.contains('all-btn')).toBe(true)
    expect(applyBtn.classList.contains('all-btn--primary')).toBe(true)

    // Clicking Apply Dimensions closes dialog
    fireEvent.click(applyBtn)
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

    // Text input inside the on-canvas box (multiline textarea)
    const textInput = textBox?.querySelector('.paint-text-box-input') as HTMLTextAreaElement
    expect(textInput).toBeDefined()
    fireEvent.change(textInput, { target: { value: 'Hello\nPaint' } })
    expect(textInput.value).toBe('Hello\nPaint')

    // Commit button inside the drag bar
    const commitBtn = textBox?.querySelector('.paint-text-box-btn--commit') as HTMLButtonElement
    expect(commitBtn).toBeDefined()
    fireEvent.click(commitBtn)

    // Text box closes after committing onto canvas
    expect(container.querySelector('.paint-canvas-text-box')).toBeNull()
  })

  it('allows committing multiline text box using Ctrl+Enter shortcut', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const textToolBtn = screen.getByTitle('Text Tool')
    fireEvent.click(textToolBtn)

    const mainCanvas = container.querySelector('canvas.paint-canvas') as HTMLCanvasElement
    fireEvent.pointerDown(mainCanvas, { clientX: 100, clientY: 100 })

    const textBox = container.querySelector('.paint-canvas-text-box')
    const textInput = textBox?.querySelector('.paint-text-box-input') as HTMLTextAreaElement
    fireEvent.change(textInput, { target: { value: 'Line 1\nLine 2' } })

    // Plain Enter should not close the box (it allows multiline typing)
    fireEvent.keyDown(textInput, { key: 'Enter' })
    expect(container.querySelector('.paint-canvas-text-box')).not.toBeNull()

    // Ctrl+Enter commits the box
    fireEvent.keyDown(textInput, { key: 'Enter', ctrlKey: true })
    expect(container.querySelector('.paint-canvas-text-box')).toBeNull()
  })

  it('opens interactive placed image overlay with resize handles on paste (Ctrl+V) and allows commit/cancel', async () => {
    // Mock Image & FileReader for jsdom
    const originalImage = window.Image
    const originalFileReader = window.FileReader

    class MockImage {
      onload: (() => void) | null = null
      width = 1200
      height = 800
      naturalWidth = 1200
      naturalHeight = 800
      _src = ''
      set src(val: string) {
        this._src = val
        setTimeout(() => {
          this.onload?.()
        }, 10)
      }
      get src() {
        return this._src
      }
    }

    class MockFileReader {
      onload: ((e: { target: { result: string } }) => void) | null = null
      readAsDataURL() {
        setTimeout(() => {
          this.onload?.({ target: { result: 'data:image/png;base64,sample' } })
        }, 5)
      }
    }

    // @ts-expect-error mock
    window.Image = MockImage
    // @ts-expect-error mock
    globalThis.Image = MockImage
    // @ts-expect-error mock
    window.FileReader = MockFileReader
    // @ts-expect-error mock
    globalThis.FileReader = MockFileReader

    try {
      const { container } = render(<SketchSuite locale="pl" />)

      // Paste image
      fireEvent.paste(window, {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => new File(['img'], 'test.png', { type: 'image/png' }),
            },
          ],
        },
      })

      // Wait for image overlay to appear
      const img = await screen.findByRole('img', { name: /pasted content/i })
      const overlay = img.closest('.paint-placed-image-overlay')
      expect(overlay).not.toBeNull()

      // Should have placed image box with resize handles
      const box = overlay?.querySelector('.paint-placed-image-box')
      expect(box).not.toBeNull()

      const handles = overlay?.querySelectorAll('.paint-placed-image-handle')
      expect(handles?.length).toBe(8) // 4 corners + 4 edges

      // Toolbar should have action buttons
      const fitBtn = overlay?.querySelector('button[aria-label="Dopasuj do płótna"]')
      expect(fitBtn).toBeDefined()

      const originalSizeBtn = overlay?.querySelector('button[aria-label="Oryginalny rozmiar (100%)"]')
      expect(originalSizeBtn).toBeDefined()

      const commitBtn = overlay?.querySelector('button.paint-placed-image-btn--commit') as HTMLButtonElement
      expect(commitBtn).toBeDefined()

      const cancelBtn = overlay?.querySelector('button.paint-placed-image-btn--cancel') as HTMLButtonElement
      expect(cancelBtn).toBeDefined()

      // Test commit button
      fireEvent.click(commitBtn)

      // Overlay should close after committing
      expect(container.querySelector('.paint-placed-image-overlay')).toBeNull()

      // Paste again to test escape key cancel
      fireEvent.paste(window, {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => new File(['img'], 'test2.png', { type: 'image/png' }),
            },
          ],
        },
      })

      const img2 = await screen.findByRole('img', { name: /pasted content/i })
      expect(img2.closest('.paint-placed-image-overlay')).not.toBeNull()

      // Press Escape to cancel
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('img', { name: /pasted content/i })).toBeNull()
    } finally {
      window.Image = originalImage
      window.FileReader = originalFileReader
    }
  })

  it('renders Hand tool dynamic section and title when hand tool is active', () => {
    const { container } = render(<SketchSuite locale="pl" />)
    const handBtn = screen.getByRole('button', { name: /rączka/i })
    fireEvent.click(handBtn)

    // Dynamic box for hand tool should be rendered
    const handBox = container.querySelector('.paint-dynamic-box--hand')
    expect(handBox).not.toBeNull()

    // Title should be Hand title, NOT shape outline
    const dynamicSection = handBox?.closest('.paint-section')
    const title = dynamicSection?.querySelector('.paint-section-title')
    expect(title?.textContent).toBe('Rączka: Przesuwanie i nawigacja')
  })

  it('renders Export dialog without separate footer shelf and with proper action buttons', () => {
    render(<SketchSuite locale="pl" />)
    const fileBtn = screen.getByRole('button', { name: /plik/i })
    fireEvent.click(fileBtn)

    const exportOption = screen.getByText(/eksportuj \/ zapisz jako/i)
    fireEvent.click(exportOption)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.querySelector('.all-dialog__title')?.textContent).toBe('Eksportuj obraz')

    // Should NOT have .all-dialog__footer
    expect(dialog.querySelector('.all-dialog__footer')).toBeNull()

    // Should have paint-dialog-actions with Download, Copy, and Cancel buttons
    const actions = dialog.querySelector('.paint-dialog-actions')
    expect(actions).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Pobierz' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Kopiuj' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeDefined()
  })

  it('renders 3 selection modes (rect, freehand, polygon) in ribbon when select tool is active', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const selectToolBtn = screen.getByRole('button', { name: /select \(rectangle\)/i })
    fireEvent.click(selectToolBtn)

    // Select dynamic box should be visible
    const selectBox = container.querySelector('.paint-dynamic-box--select')
    expect(selectBox).not.toBeNull()

    // Mode buttons row
    const modesRow = selectBox?.querySelector('.paint-select-modes-row')
    expect(modesRow).not.toBeNull()
    const modeButtons = modesRow?.querySelectorAll('button')
    expect(modeButtons?.length).toBe(3)

    // Default active mode is Rect
    const rectBtn = screen.getByRole('button', { name: /rectangular selection/i })
    expect(rectBtn.classList.contains('active')).toBe(true)

    // Switch to Freehand Lasso
    const freehandBtn = screen.getByRole('button', { name: /freehand lasso/i })
    fireEvent.click(freehandBtn)
    expect(freehandBtn.classList.contains('active')).toBe(true)
    expect(rectBtn.classList.contains('active')).toBe(false)

    // Switch to Polygonal Lasso
    const polygonBtn = screen.getByRole('button', { name: /polygonal lasso/i })
    fireEvent.click(polygonBtn)
    expect(polygonBtn.classList.contains('active')).toBe(true)
    expect(freehandBtn.classList.contains('active')).toBe(false)
  })

  it('handles polygon lasso point placement and finalize with Enter key', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const selectToolBtn = screen.getByRole('button', { name: /select \(rectangle\)/i })
    fireEvent.click(selectToolBtn)

    // Switch to Polygonal Lasso
    const polygonBtn = screen.getByRole('button', { name: /polygonal lasso/i })
    fireEvent.click(polygonBtn)

    const canvas = container.querySelector('.paint-canvas') as HTMLCanvasElement
    expect(canvas).toBeDefined()

    // Click 3 points on canvas
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50 })
    fireEvent.pointerDown(canvas, { clientX: 150, clientY: 50 })
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 150 })

    // Status bar should show "3 pts"
    const statusBar = container.querySelector('.paint-status-bar')
    expect(statusBar?.textContent).toContain('3 pts')

    // Press Enter to close polygon
    fireEvent.keyDown(window, { key: 'Enter' })

    // Polygon finalized: status bar now indicates selection with dimensions
    expect(statusBar?.textContent).toContain('Selection:')
    expect(statusBar?.textContent).toContain('100 × 100 px')
  })

  it('applies tool-specific cursor classes to canvas element', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const canvas = container.querySelector('.paint-canvas') as HTMLCanvasElement
    expect(canvas).toBeDefined()

    // Default brush tool
    expect(canvas.classList.contains('paint-canvas--tool-brush')).toBe(true)

    // Select eyedropper
    const eyedropperBtn = screen.getByRole('button', { name: /color picker/i })
    fireEvent.click(eyedropperBtn)
    expect(canvas.classList.contains('paint-canvas--tool-eyedropper')).toBe(true)

    // Select tool
    const selectBtn = screen.getByRole('button', { name: /select \(rectangle\)/i })
    fireEvent.click(selectBtn)
    expect(canvas.classList.contains('paint-canvas--tool-select')).toBe(true)
    expect(canvas.classList.contains('paint-canvas--select-rect')).toBe(true)
  })
})

describe('SketchSuite: import photo as canvas', () => {
  let drawImage: ReturnType<typeof vi.fn>

  function stubImage(naturalWidth: number, naturalHeight: number, fail = false) {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = naturalWidth
      naturalHeight = naturalHeight
      width = naturalWidth
      height = naturalHeight
      private _src = ''
      get src() {
        return this._src
      }
      set src(val: string) {
        this._src = val
        setTimeout(() => (fail ? this.onerror?.() : this.onload?.()), 0)
      }
    }
    vi.stubGlobal('Image', MockImage)
  }

  beforeEach(() => {
    drawImage = vi.fn()
    const base = HTMLCanvasElement.prototype.getContext as unknown as (id: string) => Record<string, unknown>
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((id: string) => {
      const ctx = base(id)
      return ctx ? { ...ctx, drawImage } : ctx
    })
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })

  function pickPhoto(name = 'photo.jpg') {
    const input = document.getElementById('paint-photo-input') as HTMLInputElement
    expect(input).not.toBeNull()
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
  }

  function canvasSize(): [number, number] {
    const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas')
    const main = canvases[0]
    return [main.width, main.height]
  }

  it('offers an "Import Photo" action in the File menu', () => {
    render(<SketchSuite locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /file/i }))
    expect(document.getElementById('paint-import-photo-btn')).not.toBeNull()
    expect(screen.getByText('Import Photo...')).toBeDefined()
  })

  it('makes the canvas exactly as big as the photo and draws it 1:1 over the whole canvas', async () => {
    stubImage(1600, 1200)
    render(<SketchSuite locale="en" />)
    expect(canvasSize()).toEqual([900, 600])

    pickPhoto()
    await waitFor(() => expect(canvasSize()).toEqual([1600, 1200]))

    // every canvas layer follows the new size
    document.querySelectorAll<HTMLCanvasElement>('canvas').forEach((c) => {
      expect([c.width, c.height]).toEqual([1600, 1200])
    })
    // photo drawn at the origin at full canvas size (no floating overlay, no 85% fitting)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(screen.queryByText(/fitted/i)).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
  })

  it('scales a huge photo down to the 4096 px limit, keeping the aspect ratio', async () => {
    stubImage(8000, 6000)
    render(<SketchSuite locale="en" />)

    pickPhoto()
    await waitFor(() => expect(canvasSize()).toEqual([4096, 3072]))
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 4096, 3072)
    expect(await screen.findByText(/scaled down to 4096×3072 px/)).toBeDefined()
  })

  it('shows an error notice and keeps the canvas when the image cannot be decoded', async () => {
    stubImage(100, 100, true)
    render(<SketchSuite locale="en" />)

    pickPhoto('broken.jpg')
    expect(await screen.findByText('Could not load this image')).toBeDefined()
    expect(canvasSize()).toEqual([900, 600])
    expect(drawImage).not.toHaveBeenCalled()
  })
})

describe('SketchSuite: canvas size dialogs', () => {
  function openNewCanvasDialog() {
    render(<SketchSuite locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /file/i }))
    fireEvent.click(screen.getByText('New Canvas...'))
    return screen.getByRole('dialog')
  }
  const widthField = () => screen.getByLabelText('Width (px)') as HTMLInputElement
  const heightField = () => screen.getByLabelText('Height (px)') as HTMLInputElement
  const createBtn = () => screen.getByRole('button', { name: 'Create Canvas' }) as HTMLButtonElement

  it('lets you type small values without forcing a minimum', () => {
    openNewCanvasDialog()
    fireEvent.change(widthField(), { target: { value: '2' } })
    expect(widthField().value).toBe('2')
    fireEvent.change(widthField(), { target: { value: '20' } })
    fireEvent.change(widthField(), { target: { value: '200' } })
    expect(widthField().value).toBe('200')
    expect(createBtn().disabled).toBe(false)
  })

  it('allows typing 0 or clearing the field, but disables Create while the size is invalid', () => {
    openNewCanvasDialog()

    fireEvent.change(widthField(), { target: { value: '0' } })
    expect(widthField().value).toBe('0')
    expect(createBtn().disabled).toBe(true)

    fireEvent.change(widthField(), { target: { value: '' } })
    expect(widthField().value).toBe('')
    expect(createBtn().disabled).toBe(true)

    fireEvent.change(widthField(), { target: { value: '5000' } })
    expect(widthField().value).toBe('5000')
    expect(createBtn().disabled).toBe(true)

    fireEvent.change(widthField(), { target: { value: '300' } })
    expect(createBtn().disabled).toBe(false)
  })

  it('creates a canvas with exactly the typed (small) size', () => {
    openNewCanvasDialog()

    fireEvent.change(widthField(), { target: { value: '200' } })
    fireEvent.change(heightField(), { target: { value: '150' } })
    fireEvent.click(createBtn())

    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect([canvas.width, canvas.height]).toEqual([200, 150])
  })

  it('applies the same rules in the Resize Canvas dialog', () => {
    render(<SketchSuite locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /file/i }))
    fireEvent.click(screen.getByText('Resize Canvas...'))

    fireEvent.change(widthField(), { target: { value: '0' } })
    const applyBtn = screen.getByRole('button', { name: 'Apply Dimensions' }) as HTMLButtonElement
    expect(applyBtn.disabled).toBe(true)

    fireEvent.change(widthField(), { target: { value: '120' } })
    expect(applyBtn.disabled).toBe(false)
  })
})

describe('SketchSuite: bottom status bar', () => {
  it('keeps every status label inside a hideable label span so phones can show icons + values only', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const bar = container.querySelector('.paint-status-bar') as HTMLElement
    expect(bar).not.toBeNull()

    const items = bar.querySelectorAll('.paint-status-item')
    expect(items.length).toBeGreaterThanOrEqual(2)
    items.forEach((item) => {
      expect(item.getAttribute('title')).toBeTruthy() // label stays reachable when the text is hidden
      expect(item.querySelector('.paint-status-label')).not.toBeNull()
    })
    expect(bar.querySelector('.paint-status-cursor')).not.toBeNull()
  })
})

describe('SketchSuite: selection outline visibility', () => {
  it('has a dedicated overlay for the inverted outline, sized like the canvas', () => {
    const { container } = render(<SketchSuite locale="en" />)
    const overlay = container.querySelector('canvas.paint-marquee-invert') as HTMLCanvasElement
    expect(overlay).not.toBeNull()
    expect([overlay.width, overlay.height]).toEqual([900, 600])
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
  })

  it('blends that overlay with `difference` so white strokes invert the colours beneath', () => {
    const css = readFileSync(resolve(__dirname, '../styles/sketch-suite.css'), 'utf8')
    const rule = css.match(/\.paint-marquee-invert\s*\{[^}]*\}/)
    expect(rule).not.toBeNull()
    expect(rule![0]).toContain('mix-blend-mode: difference')
    expect(rule![0]).toContain('pointer-events: none')
  })

  it('keeps the overlay in step with the canvas size after resizing', () => {
    const { container } = render(<SketchSuite locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /file/i }))
    fireEvent.click(screen.getByText('New Canvas...'))
    fireEvent.change(screen.getByLabelText('Width (px)'), { target: { value: '320' } })
    fireEvent.change(screen.getByLabelText('Height (px)'), { target: { value: '240' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Canvas' }))

    const overlay = container.querySelector('canvas.paint-marquee-invert') as HTMLCanvasElement
    expect([overlay.width, overlay.height]).toEqual([320, 240])
  })
})

describe('SketchSuite: selection outline drawing', () => {
  // Records, per canvas element, every stroke colour used for strokeRect calls
  function recordStrokes() {
    const calls = new Map<HTMLCanvasElement, string[]>()
    const base = HTMLCanvasElement.prototype.getContext as unknown as (
      this: HTMLCanvasElement,
      id: string,
    ) => Record<string, unknown>
    const cache = new Map<HTMLCanvasElement, Record<string, unknown>>()
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function (this: HTMLCanvasElement, id: string) {
      if (cache.has(this)) return cache.get(this)
      const ctx = { ...base.call(this, id) } as Record<string, unknown> & { strokeStyle: string }
      ctx.strokeStyle = ''
      ctx.strokeRect = vi.fn(() => {
        const list = calls.get(this) ?? []
        list.push(ctx.strokeStyle)
        calls.set(this, list)
      })
      cache.set(this, ctx)
      return ctx
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext
    return calls
  }

  it('draws white dashes on the inverting overlay and black dashes on the normal preview canvas', () => {
    const strokes = recordStrokes()
    const { container } = render(<SketchSuite locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /select \(rectangle\)/i }))

    const canvas = container.querySelector('.paint-canvas') as HTMLCanvasElement
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 90, pointerId: 1 })

    const overlay = container.querySelector('canvas.paint-marquee-invert') as HTMLCanvasElement
    const preview = container.querySelector('canvas.paint-preview-canvas') as HTMLCanvasElement
    expect(strokes.get(overlay)?.length).toBeGreaterThan(0)
    expect(strokes.get(overlay)?.every((c) => c === '#ffffff')).toBe(true)
    expect(strokes.get(preview)?.length).toBeGreaterThan(0)
    expect(strokes.get(preview)?.every((c) => c === '#000000')).toBe(true)
  })
})
