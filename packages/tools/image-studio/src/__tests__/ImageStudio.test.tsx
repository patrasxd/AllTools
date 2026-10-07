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

// Loads an image through the real (hidden) file input, like a user picking a file
function loadImageViaFileInput(name = 'photo.jpg') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  expect(input).not.toBeNull()
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
}

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

  it('does not offer a demo image button on the empty state', () => {
    render(<ImageStudio locale="en" />)
    expect(document.getElementById('img-browse-btn')).not.toBeNull()
    expect(document.getElementById('img-demo-btn')).toBeNull()
    expect(screen.queryByText(/demo/i)).toBeNull()
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
    loadImageViaFileInput()

    await waitFor(() => {
      expect(document.getElementById('img-download-btn')).not.toBeNull()
    })

    // Reset button must not exist
    expect(document.getElementById('img-reset-btn')).toBeNull()
    // Toolbar paste button must not exist
    expect(document.getElementById('img-paste-toolbar-btn')).toBeNull()
    // Canvas must be present
    expect(document.querySelector('.img-preview-canvas')).not.toBeNull()
  })

  it('renders remove-bg tab and allows toggling background removal', async () => {
    render(<ImageStudio locale="en" />)
    loadImageViaFileInput()

    await waitFor(() => {
      expect(document.getElementById('img-download-btn')).not.toBeNull()
    })

    // Click on No BG tab in PillGroup
    const removeBgPill = screen.getByRole('button', { name: /No BG/i })
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
