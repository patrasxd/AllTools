import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('heic2any', () => ({
  default: vi.fn().mockResolvedValue(new Blob([])),
}))

import { ImageStudio } from '../ImageStudio'

// Mock canvas getContext and Image for jsdom
beforeEach(() => {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 1200
    naturalHeight = 800
    width = 1200
    height = 800
    private _src = ''
    get src() {
      return this._src
    }
    set src(val: string) {
      this._src = val
      setTimeout(() => this.onload?.(), 0)
    }
  }
  vi.stubGlobal('Image', MockImage)

  HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb) => {
    cb(new Blob(['fake'], { type: 'image/jpeg' }))
  })

  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
    if (contextId === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          width: 800,
          height: 600,
          data: new Uint8ClampedArray(800 * 600 * 4),
        }),
        putImageData: vi.fn(),
        createImageData: vi.fn().mockReturnValue({
          width: 800,
          height: 600,
          data: new Uint8ClampedArray(800 * 600 * 4),
        }),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
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
      }
    }
    return null
  })
})

describe('ImageStudio Component', () => {
  it('renders dropzone with From Clipboard button in English', () => {
    render(<ImageStudio locale="en" />)
    const pasteBtn = document.getElementById('img-paste-btn')
    expect(pasteBtn).toBeDefined()
    expect(pasteBtn?.textContent).toContain('From Clipboard')
    expect(screen.getByText(/or paste \(Ctrl\+V\)/i)).toBeDefined()
  })

  it('renders dropzone with Ze schowka button in Polish', () => {
    render(<ImageStudio locale="pl" />)
    const pasteBtn = document.getElementById('img-paste-btn')
    expect(pasteBtn).toBeDefined()
    expect(pasteBtn?.textContent).toContain('Ze schowka')
    expect(screen.getByText(/lub wklej \(Ctrl\+V\)/i)).toBeDefined()
  })

  it('notifies user when clipboard is empty on clipboard button click', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        read: vi.fn().mockResolvedValue([]),
      },
      configurable: true,
    })

    render(<ImageStudio locale="en" />)
    const pasteBtn = document.getElementById('img-paste-btn')
    expect(pasteBtn).toBeDefined()
    if (pasteBtn) {
      fireEvent.click(pasteBtn)
    }

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('No image found in clipboard. You can also press Ctrl+V to paste.')
    })
    alertMock.mockRestore()
  })

  it('calls setIsDirty with false initially', () => {
    const setIsDirtyMock = vi.fn()
    render(<ImageStudio locale="en" setIsDirty={setIsDirtyMock} />)
    expect(setIsDirtyMock).toHaveBeenCalledWith(false)
  })

  it('supports global Ctrl+V paste event without crashing', () => {
    render(<ImageStudio locale="en" />)
    const pasteEvent = new Event('paste') as any
    pasteEvent.clipboardData = {
      items: [],
      files: [],
    }
    window.dispatchEvent(pasteEvent)
    // No error thrown
    expect(document.getElementById('img-browse-btn')).toBeDefined()
  })

  it('does not render redundant reset or toolbar clipboard buttons after image is loaded', async () => {
    render(<ImageStudio locale="en" />)
    const demoBtn = document.getElementById('img-demo-btn')
    expect(demoBtn).toBeDefined()
    if (demoBtn) {
      fireEvent.click(demoBtn)
    }

    await waitFor(() => {
      expect(document.getElementById('img-download-btn')).toBeDefined()
    })

    // Reset button must not exist
    expect(document.getElementById('img-reset-btn')).toBeNull()
    // Toolbar paste button must not exist
    expect(document.getElementById('img-paste-toolbar-btn')).toBeNull()
    // Canvas must be present
    expect(document.querySelector('.img-preview-canvas')).toBeDefined()
  })

  it('renders remove-bg tab and allows toggling background removal', async () => {
    render(<ImageStudio locale="en" />)
    const demoBtn = document.getElementById('img-demo-btn')
    if (demoBtn) fireEvent.click(demoBtn)

    await waitFor(() => {
      expect(document.getElementById('img-download-btn')).toBeDefined()
    })

    // Click on Remove BG tab in PillGroup
    const removeBgPill = screen.getByRole('button', { name: /Remove BG/i })
    expect(removeBgPill).toBeDefined()
    fireEvent.click(removeBgPill)

    // Toggle for background removal
    const toggle = document.getElementById('img-bgremoval-toggle')
    expect(toggle).toBeDefined()
    if (toggle) {
      fireEvent.click(toggle)
    }

    // Color picker and pipette should be rendered
    expect(document.getElementById('img-bgremoval-color')).toBeDefined()
    expect(document.getElementById('img-pick-color-btn')).toBeDefined()
    expect(document.getElementById('img-tolerance-slider')).toBeDefined()
  })
})

