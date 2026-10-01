import React, { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { createPortal } from 'react-dom'
import { FullBleedLayout, Dialog, Button, Input, Slider, ThemeContext } from '@all/ui'
import {
  IconPencil,
  IconBrush,
  IconEraser,
  IconBucket,
  IconPipette,
  IconType,
  IconUndo,
  IconRedo,
  IconCopy,
  IconTrash,
  IconSelect,
  IconSelectAll,
  IconScissors,
  IconFile,
  IconFolderOpen,
  IconDownload,
  IconCrosshair,
  IconMaximize2,
  IconZoomIn,
} from '@alltools/ui'
import { ToolComponentProps, SketchTool, ShapeFillMode, Point, SelectionRect } from './types'
import { translations } from './i18n'
import {
  hexToRgba,
  floodFill,
  drawShape,
  getCanvasCoordinates,
  copyCanvasToClipboard,
} from './utils/sketchEngine'
import './styles/sketch-suite.css'

const SWATCH_PALETTE = [
  '#000000',
  '#7f7f7f',
  '#880015',
  '#ed1c24',
  '#ff7f27',
  '#fff200',
  '#22b14c',
  '#00a2e8',
  '#3f48cc',
  '#a349a4',
  '#ffffff',
  '#c3c3c3',
  '#b97a57',
  '#ffaec9',
  '#ffc90e',
  '#efe4b0',
  '#b5e61d',
  '#99d9ea',
  '#7092be',
  '#c8bfe7',
]

const STROKE_SIZES = [1, 2, 4, 8, 14, 24]

const PRESET_RESOLUTIONS = [
  { label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { label: 'HD (1280×720)', width: 1280, height: 720 },
  { label: 'Square (1000×1000)', width: 1000, height: 1000 },
  { label: 'Standard (900×600)', width: 900, height: 600 },
  { label: 'Classic (800×600)', width: 800, height: 600 },
  { label: 'Retro (640×480)', width: 640, height: 480 },
]

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const SketchSuite: React.FC<ToolComponentProps> = ({
  locale = 'en',
  isEink: propEink,
  theme: propTheme,
}) => {
  const themeCtx = useContext(ThemeContext)
  const activeTheme = propTheme || themeCtx?.theme || 'dark'
  const isEink = propEink ?? themeCtx?.isEink ?? (activeTheme === 'e-ink-light' || activeTheme === 'e-ink-dark')
  const t = translations[locale] || translations.en

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const colorPickerRef = useRef<HTMLInputElement | null>(null)
  const textInputRef = useRef<HTMLInputElement | null>(null)

  // Canvas Dimensions & Zoom
  const [canvasDim, setCanvasDim] = useState<{ width: number; height: number }>({
    width: 900,
    height: 600,
  })
  const [zoom, setZoom] = useState<number>(1)
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Tools & Colors
  const [currentTool, setCurrentTool] = useState<SketchTool>('brush')
  const [strokeWidth, setStrokeWidth] = useState<number>(6)
  const [brushSize, setBrushSize] = useState<number>(6)
  const [pencilSize, setPencilSize] = useState<number>(2)
  const [eraserSize, setEraserSize] = useState<number>(16)
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState<number>(2)
  const [color1, setColor1] = useState<string>('#000000') // Foreground
  const [color2, setColor2] = useState<string>('#ffffff') // Background / Secondary
  const [activeColorSlot, setActiveColorSlot] = useState<1 | 2>(1)
  const [shapeFillMode, setShapeFillMode] = useState<ShapeFillMode>('outline')
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)

  // UI Menus & Modals
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [filePopoverPos, setFilePopoverPos] = useState({ top: 90, left: 16 })
  const filePopoverRef = useRef<HTMLDivElement>(null)

  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false)
  const [isResizeDialogOpen, setIsResizeDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  // Dialog temporary form values
  const [tempWidth, setTempWidth] = useState(900)
  const [tempHeight, setTempHeight] = useState(600)
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png')
  const [exportQuality, setExportQuality] = useState(92)

  // Advanced Typography state
  const [fontFamily, setFontFamily] = useState<'sans-serif' | 'monospace' | 'serif' | 'cursive'>('sans-serif')
  const [fontSize, setFontSize] = useState<number>(24)
  const [isBold, setIsBold] = useState<boolean>(false)
  const [isItalic, setIsItalic] = useState<boolean>(false)
  const [isUnderline, setIsUnderline] = useState<boolean>(false)
  const [isSolidBg, setIsSolidBg] = useState<boolean>(false)

  // Inline Canvas Text Input placement state
  const [activeTextOverlay, setActiveTextOverlay] = useState<{
    x: number
    y: number
    text: string
  } | null>(null)

  // Custom Size & Custom Color Anchored Popovers
  const [isCustomSizeOpen, setIsCustomSizeOpen] = useState(false)
  const [sizePopoverPos, setSizePopoverPos] = useState({ top: 90, left: 200 })
  const sizePopoverRef = useRef<HTMLDivElement>(null)

  const [isCustomColorOpen, setIsCustomColorOpen] = useState(false)
  const [colorPopoverPos, setColorPopoverPos] = useState({ top: 90, left: 400 })
  const colorPopoverRef = useRef<HTMLDivElement>(null)

  const handleOpenFilePopover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const popoverWidth = 270
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
    const left = Math.max(12, Math.min(screenWidth - popoverWidth - 12, rect.left))
    setFilePopoverPos({ top: rect.bottom + 8, left })
    setIsFileDialogOpen((open) => !open)
    setIsCustomSizeOpen(false)
    setIsCustomColorOpen(false)
  }

  const handleOpenSizePopover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const popoverWidth = 270
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
    const left = Math.max(12, Math.min(screenWidth - popoverWidth - 12, rect.left + rect.width / 2 - popoverWidth / 2))
    setSizePopoverPos({ top: rect.bottom + 8, left })
    setIsCustomSizeOpen((open) => !open)
    setIsCustomColorOpen(false)
    setIsFileDialogOpen(false)
  }

  const handleOpenColorPopover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const popoverWidth = 290
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
    const left = Math.max(12, Math.min(screenWidth - popoverWidth - 12, rect.left + rect.width / 2 - popoverWidth / 2))
    setColorPopoverPos({ top: rect.bottom + 8, left })
    setIsCustomColorOpen((open) => !open)
    setIsCustomSizeOpen(false)
    setIsFileDialogOpen(false)
  }

  const activeColor = activeColorSlot === 1 ? color1 : color2
  const currentColorRgb = hexToRgba(activeColor)

  const handleRgbChange = (r: number, g: number, b: number) => {
    const newHex = rgbToHex(r, g, b)
    if (activeColorSlot === 1) {
      setColor1(newHex)
    } else {
      setColor2(newHex)
    }
  }

  const handleHexInputChange = (newHex: string) => {
    if (activeColorSlot === 1) {
      setColor1(newHex)
    } else {
      setColor2(newHex)
    }
  }

  // Close popovers on click outside or Escape
  useEffect(() => {
    if (!isCustomSizeOpen && !isCustomColorOpen && !isFileDialogOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        sizePopoverRef.current?.contains(target) ||
        colorPopoverRef.current?.contains(target) ||
        filePopoverRef.current?.contains(target) ||
        target.closest('.paint-size-custom-trigger') ||
        target.closest('.paint-custom-color-btn') ||
        target.closest('.paint-file-btn')
      ) {
        return
      }
      setIsCustomSizeOpen(false)
      setIsCustomColorOpen(false)
      setIsFileDialogOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomSizeOpen(false)
        setIsCustomColorOpen(false)
        setIsFileDialogOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCustomSizeOpen, isCustomColorOpen, isFileDialogOpen])

  // Drawing state refs (avoid React re-renders during high-frequency mouse moves)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef<Point>({ x: 0, y: 0 })
  const lastPointRef = useRef<Point>({ x: 0, y: 0 })

  // History stack
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Save current canvas to history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    newHistory.push(imgData)
    if (newHistory.length > 25) {
      newHistory.shift()
    }
    historyRef.current = newHistory
    historyIndexRef.current = newHistory.length - 1

    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  // Restore history step
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    historyIndexRef.current -= 1
    const previous = historyRef.current[historyIndexRef.current]
    if (previous) {
      ctx.putImageData(previous, 0, 0)
    }
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    historyIndexRef.current += 1
    const next = historyRef.current[historyIndexRef.current]
    if (next) {
      ctx.putImageData(next, 0, 0)
    }
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  // Initialize canvas with clean white background
  useEffect(() => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return

    canvas.width = canvasDim.width
    canvas.height = canvasDim.height
    previewCanvas.width = canvasDim.width
    previewCanvas.height = canvasDim.height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      pushHistory()
    }
  }, [])

  // Show transient status toast
  const showNotice = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => {
      setStatusMessage(null)
    }, 3000)
  }

  // Draw or clear dashed marquee on preview canvas
  const drawMarquee = useCallback((rect: SelectionRect | null) => {
    const previewCanvas = previewCanvasRef.current
    if (!previewCanvas) return
    const pCtx = previewCanvas.getContext('2d')
    if (!pCtx) return
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    if (!rect || rect.width <= 0 || rect.height <= 0) return

    pCtx.save()
    pCtx.strokeStyle = '#000000'
    pCtx.lineWidth = 1
    pCtx.setLineDash([4, 4])
    pCtx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height)
    pCtx.strokeStyle = '#ffffff'
    pCtx.lineDashOffset = 4
    pCtx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height)
    pCtx.restore()
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionRect(null)
    drawMarquee(null)
  }, [drawMarquee])

  // Live render text preview onto preview canvas while typing in text overlay
  useEffect(() => {
    const previewCanvas = previewCanvasRef.current
    if (!previewCanvas) return
    const pCtx = previewCanvas.getContext('2d')
    if (!pCtx) return

    if (!selectionRect) {
      pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    }
  }, [selectionRect])

  // Draw image onto canvas (paste, drop, open)
  const drawImageOntoCanvas = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current
      const previewCanvas = previewCanvasRef.current
      if (!canvas || !previewCanvas) return
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      if (img.width > canvas.width || img.height > canvas.height) {
        const newW = Math.max(canvas.width, img.width)
        const newH = Math.max(canvas.height, img.height)
        setCanvasDim({ width: newW, height: newH })
        canvas.width = newW
        canvas.height = newH
        previewCanvas.width = newW
        previewCanvas.height = newH
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, newW, newH)
      }

      ctx.drawImage(img, 0, 0)
      pushHistory()
      showNotice(locale === 'pl' ? 'Obraz wstawiony na płótno!' : 'Image inserted onto canvas!')
    },
    [pushHistory, locale]
  )

  // Handle image paste from clipboard (Ctrl+V)
  const handleImagePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          if (!blob) continue

          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => drawImageOntoCanvas(img)
            img.src = e.target?.result as string
          }
          reader.readAsDataURL(blob)
          event.preventDefault()
          break
        }
      }
    },
    [drawImageOntoCanvas]
  )

  // Register global paste event listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => handleImagePaste(e)
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleImagePaste])

  // Dynamic size stepper functions
  const increaseToolSize = useCallback(() => {
    if (currentTool === 'pencil') {
      setPencilSize((s) => {
        const next = Math.min(64, s + (s < 4 ? 1 : s < 12 ? 2 : 4))
        showNotice(`${t.dynamicProps.pencilTitle}: ${next}px`)
        return next
      })
    } else if (currentTool === 'brush') {
      setBrushSize((s) => {
        const next = Math.min(64, s + (s < 8 ? 1 : s < 20 ? 2 : 4))
        showNotice(`${t.dynamicProps.brushTitle}: ${next}px`)
        return next
      })
    } else if (currentTool === 'eraser') {
      setEraserSize((s) => {
        const next = Math.min(64, s + (s < 8 ? 2 : 4))
        showNotice(`${t.dynamicProps.eraserTitle}: ${next}px`)
        return next
      })
    } else if (['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool)) {
      setShapeStrokeWidth((s) => {
        const next = Math.min(48, s + (s < 6 ? 1 : 2))
        showNotice(`${t.dynamicProps.shapeTitle}: ${next}px`)
        return next
      })
    }
  }, [currentTool, t])

  const decreaseToolSize = useCallback(() => {
    if (currentTool === 'pencil') {
      setPencilSize((s) => {
        const next = Math.max(1, s - (s <= 4 ? 1 : s <= 12 ? 2 : 4))
        showNotice(`${t.dynamicProps.pencilTitle}: ${next}px`)
        return next
      })
    } else if (currentTool === 'brush') {
      setBrushSize((s) => {
        const next = Math.max(1, s - (s <= 8 ? 1 : s <= 20 ? 2 : 4))
        showNotice(`${t.dynamicProps.brushTitle}: ${next}px`)
        return next
      })
    } else if (currentTool === 'eraser') {
      setEraserSize((s) => {
        const next = Math.max(2, s - (s <= 8 ? 2 : 4))
        showNotice(`${t.dynamicProps.eraserTitle}: ${next}px`)
        return next
      })
    } else if (['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool)) {
      setShapeStrokeWidth((s) => {
        const next = Math.max(1, s - (s <= 6 ? 1 : 2))
        showNotice(`${t.dynamicProps.shapeTitle}: ${next}px`)
        return next
      })
    }
  }, [currentTool, t])

  // Helper to get active tool's size
  const getCurrentToolSize = useCallback(() => {
    if (currentTool === 'pencil') return pencilSize
    if (currentTool === 'eraser') return eraserSize
    if (['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool)) return shapeStrokeWidth
    return brushSize
  }, [currentTool, pencilSize, eraserSize, shapeStrokeWidth, brushSize])

  // Helper to set active tool's size
  const setCurrentToolSize = useCallback((val: number) => {
    if (currentTool === 'pencil') {
      setPencilSize(val)
      showNotice(`${t.dynamicProps.pencilTitle}: ${val}px`)
    } else if (currentTool === 'eraser') {
      setEraserSize(val)
      showNotice(`${t.dynamicProps.eraserTitle}: ${val}px`)
    } else if (['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool)) {
      setShapeStrokeWidth(val)
      showNotice(`${t.dynamicProps.shapeTitle}: ${val}px`)
    } else {
      setBrushSize(val)
      showNotice(`${t.dynamicProps.brushTitle}: ${val}px`)
    }
  }, [currentTool, t])

  // Helper to get title for Size Dialog
  const getSizeDialogTitle = useCallback(() => {
    if (currentTool === 'pencil') return t.dynamicProps.pencilTitle
    if (currentTool === 'eraser') return t.dynamicProps.eraserTitle
    if (['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool)) return t.dynamicProps.shapeTitle
    return t.dynamicProps.brushTitle
  }, [currentTool, t])


  // Selection and Copy/Cut Handlers
  const handleSelectAll = useCallback(() => {
    setCurrentTool('select')
    const rect: SelectionRect = { x: 0, y: 0, width: canvasDim.width, height: canvasDim.height }
    setSelectionRect(rect)
    drawMarquee(rect)
    showNotice(locale === 'pl' ? 'Zaznaczono całe płótno (Ctrl+A)' : 'Selected entire canvas (Ctrl+A)')
  }, [canvasDim.width, canvasDim.height, drawMarquee, locale])

  const handleCopy = useCallback(async () => {
    setIsFileDialogOpen(false)
    const canvas = canvasRef.current
    if (!canvas) return
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      const success = await copyCanvasToClipboard(canvas, selectionRect)
      if (success) {
        showNotice(
          locale === 'pl'
            ? `Skopiowano zaznaczony fragment (${selectionRect.width}×${selectionRect.height}px)!`
            : `Copied selection (${selectionRect.width}×${selectionRect.height}px)!`
        )
      }
    } else {
      const success = await copyCanvasToClipboard(canvas)
      if (success) {
        showNotice(t.actions.copiedNotice)
      }
    }
  }, [selectionRect, locale, t.actions.copiedNotice])

  const handleCut = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const targetRect: SelectionRect = selectionRect || {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    }
    const success = await copyCanvasToClipboard(canvas, targetRect)
    if (success) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.fillStyle = color2
        ctx.fillRect(targetRect.x, targetRect.y, targetRect.width, targetRect.height)
        pushHistory()
      }
      clearSelection()
      showNotice(locale === 'pl' ? 'Wycięto do schowka!' : 'Cut to clipboard!')
    }
  }, [selectionRect, color2, pushHistory, clearSelection, locale])

  const handleDeleteSelection = useCallback(() => {
    if (!selectionRect) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.fillStyle = color2
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height)
      pushHistory()
    }
    clearSelection()
    showNotice(locale === 'pl' ? 'Usunięto zaznaczony fragment' : 'Deleted selection')
  }, [selectionRect, color2, pushHistory, clearSelection, locale])

  // Handle keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+C, Ctrl+X, Del, Escape, Ctrl +/- for size, [ and ] for size)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      if (isInputActive) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo()
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        handleSelectAll()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleCopy()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        handleCut()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectionRect) {
        e.preventDefault()
        handleDeleteSelection()
      } else if (e.key === 'Escape' && selectionRect) {
        e.preventDefault()
        clearSelection()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '=' || e.key === '+' || e.key === 'Add')
      ) {
        // MS Paint style: Ctrl + Plus to increase tool size (preventing browser zoom!)
        e.preventDefault()
        increaseToolSize()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '-' || e.key === '_' || e.key === 'Subtract')
      ) {
        // MS Paint style: Ctrl + Minus to decrease tool size (preventing browser zoom!)
        e.preventDefault()
        decreaseToolSize()
      } else if (e.key === '[') {
        // Universal industry standard
        e.preventDefault()
        decreaseToolSize()
      } else if (e.key === ']') {
        // Universal industry standard
        e.preventDefault()
        increaseToolSize()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    undo,
    redo,
    increaseToolSize,
    decreaseToolSize,
    handleSelectAll,
    handleCopy,
    handleCut,
    handleDeleteSelection,
    clearSelection,
    selectionRect,
  ])

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => drawImageOntoCanvas(img)
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setIsFileDialogOpen(false)
  }

  // Drag and drop onto canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => drawImageOntoCanvas(img)
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // Clear Canvas
  const handleClear = () => {
    setIsFileDialogOpen(false)
    if (!window.confirm(t.actions.clearConfirm)) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      pushHistory()
    }
    clearSelection()
  }

  // Apply New Canvas Dimensions
  const handleCreateNewCanvas = () => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    setCanvasDim({ width: tempWidth, height: tempHeight })
    canvas.width = tempWidth
    canvas.height = tempHeight
    previewCanvas.width = tempWidth
    previewCanvas.height = tempHeight

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tempWidth, tempHeight)
    historyRef.current = []
    historyIndexRef.current = -1
    pushHistory()

    setIsNewCanvasDialogOpen(false)
    showNotice(locale === 'pl' ? 'Utworzono nowe płótno' : 'New canvas created')
  }

  // Resize Canvas preserving current drawing
  const handleApplyResize = () => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Snapshot existing pixels
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0)
    }

    setCanvasDim({ width: tempWidth, height: tempHeight })
    canvas.width = tempWidth
    canvas.height = tempHeight
    previewCanvas.width = tempWidth
    previewCanvas.height = tempHeight

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tempWidth, tempHeight)
    ctx.drawImage(tempCanvas, 0, 0)
    pushHistory()

    setIsResizeDialogOpen(false)
    showNotice(locale === 'pl' ? 'Zmieniono wymiary płótna' : 'Canvas resized')
  }

  // Save Canvas (PNG / JPG / WebP)
  const handleDownloadExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const extension = exportFormat === 'image/jpeg' ? 'jpg' : exportFormat === 'image/webp' ? 'webp' : 'png'
    const link = document.createElement('a')
    link.download = `sketch-${Date.now()}.${extension}`
    link.href = canvas.toDataURL(exportFormat, exportQuality / 100)
    link.click()
    setIsExportDialogOpen(false)
  }

  // Text overlay dragging state (repositioning text selection box directly on canvas)
  const isDraggingTextRef = useRef(false)
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  })

  const handleTextDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeTextOverlay) return
    isDraggingTextRef.current = true
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: activeTextOverlay.x,
      startY: activeTextOverlay.y,
    }

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!isDraggingTextRef.current) return
      const deltaX = (moveEvt.clientX - dragStartPosRef.current.clientX) / zoom
      const deltaY = (moveEvt.clientY - dragStartPosRef.current.clientY) / zoom
      const newX = Math.round(
        Math.max(0, Math.min(canvasDim.width - 20, dragStartPosRef.current.startX + deltaX))
      )
      const newY = Math.round(
        Math.max(0, Math.min(canvasDim.height - 20, dragStartPosRef.current.startY + deltaY))
      )
      setActiveTextOverlay((prev) => (prev ? { ...prev, x: newX, y: newY } : null))
    }

    const handlePointerUp = () => {
      isDraggingTextRef.current = false
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // Commit Inline Text to Canvas
  const handleCommitText = useCallback(() => {
    if (!activeTextOverlay || !activeTextOverlay.text.trim()) {
      setActiveTextOverlay(null)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const fontStyle = isItalic ? 'italic' : 'normal'
    const fontWeight = isBold ? 'bold' : 'normal'
    const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    ctx.save()
    ctx.font = fontStr
    ctx.textBaseline = 'top'

    const lines = activeTextOverlay.text.split('\n')
    const lineHeight = fontSize * 1.25

    let maxWidth = 0
    lines.forEach((line) => {
      const w = ctx.measureText(line).width
      if (w > maxWidth) maxWidth = w
    })
    const totalHeight = lines.length * lineHeight

    // Draw Solid Background if enabled
    if (isSolidBg) {
      ctx.fillStyle = color2
      ctx.fillRect(activeTextOverlay.x - 4, activeTextOverlay.y - 2, maxWidth + 8, totalHeight + 4)
    }

    // Draw Text lines
    lines.forEach((line, i) => {
      const lineY = activeTextOverlay.y + i * lineHeight
      ctx.fillStyle = color1
      ctx.fillText(line, activeTextOverlay.x, lineY)

      if (isUnderline) {
        const lineWidth = ctx.measureText(line).width
        ctx.strokeStyle = color1
        ctx.lineWidth = Math.max(1, fontSize / 14)
        ctx.beginPath()
        ctx.moveTo(activeTextOverlay.x, lineY + fontSize)
        ctx.lineTo(activeTextOverlay.x + lineWidth, lineY + fontSize)
        ctx.stroke()
      }
    })

    ctx.restore()
    pushHistory()
    setActiveTextOverlay(null)
  }, [activeTextOverlay, isItalic, isBold, fontSize, fontFamily, isSolidBg, color2, color1, isUnderline, pushHistory])

  // Automatically commit text when switching away from text tool
  useEffect(() => {
    if (currentTool !== 'text' && activeTextOverlay) {
      if (activeTextOverlay.text.trim()) {
        handleCommitText()
      } else {
        setActiveTextOverlay(null)
      }
    }
  }, [currentTool, activeTextOverlay, handleCommitText])

  // Pointer Down (Start Drawing / Tool Action)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const coords = getCanvasCoordinates(e, canvas, zoom)
    startPointRef.current = coords
    lastPointRef.current = coords
    isDrawingRef.current = true

    const primaryColor = activeColorSlot === 1 ? color1 : color2
    const secondaryColor = activeColorSlot === 1 ? color2 : color1

    // Marquee Selection Tool: reset selection and start tracking
    if (currentTool === 'select') {
      clearSelection()
      return
    }

    // Flood Fill Tool
    if (currentTool === 'bucket') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const modified = floodFill(imgData, coords.x, coords.y, primaryColor)
      if (modified) {
        ctx.putImageData(imgData, 0, 0)
        pushHistory()
      }
      isDrawingRef.current = false
      return
    }

    // Eyedropper Tool
    if (currentTool === 'eyedropper') {
      const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)}`
      if (activeColorSlot === 1) {
        setColor1(hex)
      } else {
        setColor2(hex)
      }
      setCurrentTool('pencil')
      isDrawingRef.current = false
      return
    }

    // Text Tool: open interactive inline selection box directly on canvas
    if (currentTool === 'text') {
      if (activeTextOverlay && activeTextOverlay.text.trim()) {
        handleCommitText()
      }
      setActiveTextOverlay({
        x: coords.x,
        y: coords.y,
        text: '',
      })
      isDrawingRef.current = false
      setTimeout(() => textInputRef.current?.focus(), 50)
      return
    }

    // Freehand Pencil / Brush / Eraser initial dot
    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
      const activeSize = currentTool === 'pencil' ? pencilSize : currentTool === 'brush' ? brushSize : eraserSize
      ctx.save()
      ctx.strokeStyle = currentTool === 'eraser' ? color2 : primaryColor
      ctx.fillStyle = currentTool === 'eraser' ? color2 : primaryColor
      ctx.lineWidth = activeSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.arc(
        coords.x,
        coords.y,
        Math.max(0.5, activeSize / 2),
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()
    }
  }

  // Pointer Move (Continue Freehand or Update Shape Preview)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return

    const coords = getCanvasCoordinates(e, canvas, zoom)
    setCursorPos(coords)

    if (!isDrawingRef.current) return

    const primaryColor = activeColorSlot === 1 ? color1 : color2
    const secondaryColor = activeColorSlot === 1 ? color2 : color1
    // Marquee Selection: draw live dotted rectangle on preview canvas
    if (currentTool === 'select') {
      const minX = Math.round(Math.min(startPointRef.current.x, coords.x))
      const minY = Math.round(Math.min(startPointRef.current.y, coords.y))
      const w = Math.round(Math.abs(coords.x - startPointRef.current.x))
      const h = Math.round(Math.abs(coords.y - startPointRef.current.y))
      drawMarquee({ x: minX, y: minY, width: w, height: h })
      return
    }

    // Freehand drawing directly onto main canvas
    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      const activeSize = currentTool === 'pencil' ? pencilSize : currentTool === 'brush' ? brushSize : eraserSize
      ctx.save()
      ctx.strokeStyle = currentTool === 'eraser' ? color2 : primaryColor
      ctx.lineWidth = activeSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      ctx.restore()

      lastPointRef.current = coords
      return
    }

    // Shapes: Render live preview on preview canvas
    const pCtx = previewCanvas.getContext('2d')
    if (!pCtx) return
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)

    drawShape(
      pCtx,
      currentTool,
      startPointRef.current,
      coords,
      primaryColor,
      secondaryColor,
      shapeStrokeWidth,
      shapeFillMode
    )
  }

  // Pointer Up (Commit Shapes and Push History)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const pCtx = previewCanvas.getContext('2d')
    if (!ctx || !pCtx) return

    const coords = getCanvasCoordinates(e, canvas, zoom)
    const primaryColor = activeColorSlot === 1 ? color1 : color2
    const secondaryColor = activeColorSlot === 1 ? color2 : color1

    // Marquee Selection Tool: finalize bounding box
    if (currentTool === 'select') {
      const minX = Math.round(Math.min(startPointRef.current.x, coords.x))
      const minY = Math.round(Math.min(startPointRef.current.y, coords.y))
      const w = Math.round(Math.abs(coords.x - startPointRef.current.x))
      const h = Math.round(Math.abs(coords.y - startPointRef.current.y))
      if (w > 3 && h > 3) {
        const newRect: SelectionRect = { x: minX, y: minY, width: w, height: h }
        setSelectionRect(newRect)
        drawMarquee(newRect)
        showNotice(
          locale === 'pl'
            ? `Zaznaczono: ${w}×${h}px (Ctrl+C aby skopiować)`
            : `Selected: ${w}×${h}px (Ctrl+C to copy)`
        )
      } else {
        clearSelection()
      }
      return
    }

    // If active tool was a shape, commit it to main canvas
    if (
      currentTool === 'line' ||
      currentTool === 'arrow' ||
      currentTool === 'rectangle' ||
      currentTool === 'rounded-rect' ||
      currentTool === 'ellipse' ||
      currentTool === 'triangle'
    ) {
      drawShape(
        ctx,
        currentTool,
        startPointRef.current,
        coords,
        primaryColor,
        secondaryColor,
        shapeStrokeWidth,
        shapeFillMode
      )
      pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    }

    pushHistory()
  }

  return (
    <FullBleedLayout className="paint-fullbleed-root">
      <div className="paint-workspace" data-eink={isEink ? 'true' : undefined} data-theme={activeTheme}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* ─── Top Ribbon Toolbar ─── */}
        <header className="paint-ribbon" role="toolbar" aria-label={t.toolName}>
          <div className="paint-ribbon-content">
            {/* Section: File Menu Button (Opens Anchored Popover) */}
            <div className="paint-file-container">
              <Button
                variant="primary"
                className={`paint-file-btn ${isFileDialogOpen ? 'active' : ''}`}
                onClick={handleOpenFilePopover}
                title={t.fileMenu.button}
                aria-haspopup="dialog"
                aria-expanded={isFileDialogOpen}
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                }
              >
                {t.fileMenu.button}
              </Button>
            </div>

            {/* Section: Clipboard */}
            <div className="paint-section">
              <div className="paint-section-content">
                <button
                  className="paint-btn paint-btn-large"
                  onClick={() => {
                    navigator.clipboard
                      ?.read()
                      .then((items) => {
                        for (const item of items) {
                          const imgType = item.types.find((type) => type.startsWith('image/'))
                          if (imgType) {
                            item.getType(imgType).then((blob) => {
                              const reader = new FileReader()
                              reader.onload = (e) => {
                                const img = new Image()
                                img.onload = () => drawImageOntoCanvas(img)
                                img.src = e.target?.result as string
                              }
                              reader.readAsDataURL(blob)
                            })
                            break
                          }
                        }
                      })
                      .catch(() => {
                        alert(t.status.pasteHint)
                      })
                  }}
                  title={t.actions.paste}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  <span>{t.sections.clipboard}</span>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button
                    className="paint-btn"
                    disabled={!canUndo}
                    onClick={undo}
                    title={t.actions.undo}
                    style={{ opacity: canUndo ? 1 : 0.4 }}
                  >
                    <IconUndo size={14} /> {t.actions.undo.split(' ')[0]}
                  </button>
                  <button
                    className="paint-btn"
                    disabled={!canRedo}
                    onClick={redo}
                    title={t.actions.redo}
                    style={{ opacity: canRedo ? 1 : 0.4 }}
                  >
                    <IconRedo size={14} /> {t.actions.redo.split(' ')[0]}
                  </button>
                </div>
              </div>
              <span className="paint-section-title">{t.sections.clipboard}</span>
            </div>

            {/* Section: Classic Drawing Tools */}
            <div className="paint-section">
              <div className="paint-section-content">
                <div className="paint-grid-2x4">
                  <button
                    className={`paint-btn ${currentTool === 'select' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('select')}
                    title={t.tools.select}
                    aria-label={t.tools.select}
                  >
                    <IconSelect size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'pencil' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('pencil')}
                    title={t.tools.pencil}
                    aria-label={t.tools.pencil}
                  >
                    <IconPencil size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'brush' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('brush')}
                    title={t.tools.brush}
                    aria-label={t.tools.brush}
                  >
                    <IconBrush size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('eraser')}
                    title={t.tools.eraser}
                    aria-label={t.tools.eraser}
                  >
                    <IconEraser size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'bucket' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('bucket')}
                    title={t.tools.bucket}
                    aria-label={t.tools.bucket}
                  >
                    <IconBucket size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'eyedropper' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('eyedropper')}
                    title={t.tools.eyedropper}
                    aria-label={t.tools.eyedropper}
                  >
                    <IconPipette size={18} />
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'text' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('text')}
                    title={t.tools.text}
                    aria-label={t.tools.text}
                  >
                    <IconType size={18} />
                  </button>
                </div>
              </div>
              <span className="paint-section-title">{t.sections.tools}</span>
            </div>

            {/* Section: Shapes */}
            <div className="paint-section">
              <div className="paint-section-content">
                <div className="paint-grid-2x3">
                  <button
                    className={`paint-btn ${currentTool === 'line' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('line')}
                    title={t.tools.line}
                    aria-label={t.tools.line}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="4" y1="20" x2="20" y2="4" />
                    </svg>
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'arrow' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('arrow')}
                    title={t.tools.arrow}
                    aria-label={t.tools.arrow}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <polyline points="14 6 20 12 14 18" />
                    </svg>
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('rectangle')}
                    title={t.tools.rectangle}
                    aria-label={t.tools.rectangle}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="5" width="18" height="14" rx="0" />
                    </svg>
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'rounded-rect' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('rounded-rect')}
                    title={t.tools.roundedRect}
                    aria-label={t.tools.roundedRect}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="5" width="18" height="14" rx="4" />
                    </svg>
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'ellipse' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('ellipse')}
                    title={t.tools.ellipse}
                    aria-label={t.tools.ellipse}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <ellipse cx="12" cy="12" rx="9" ry="6" />
                    </svg>
                  </button>
                  <button
                    className={`paint-btn ${currentTool === 'triangle' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('triangle')}
                    title={t.tools.triangle}
                    aria-label={t.tools.triangle}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                      <polygon points="12 4 21 20 3 20" />
                    </svg>
                  </button>
                </div>
              </div>
              <span className="paint-section-title">{t.sections.shapes}</span>
            </div>

            {/* Section: Dynamic Properties for Current Tool (Unified Fixed Width) */}
            <div className="paint-section paint-dynamic-section">
              <div className="paint-section-content">
                {/* Case 0: Select */}
                {currentTool === 'select' && (
                  <div className="paint-dynamic-box paint-dynamic-box--select">
                    <div className="paint-grid-2x2">
                      <button
                        className="paint-btn"
                        onClick={handleSelectAll}
                        title={`${t.actions.selectAll} (Ctrl+A)`}
                        aria-label={t.actions.selectAll}
                      >
                        <IconSelectAll size={18} />
                      </button>
                      <button
                        className="paint-btn"
                        onClick={handleCopy}
                        title={`${t.actions.copyImage} (Ctrl+C)`}
                        aria-label={t.actions.copyImage}
                      >
                        <IconCopy size={18} />
                      </button>
                      <button
                        className="paint-btn"
                        onClick={handleCut}
                        title={`${t.actions.cut} (Ctrl+X)`}
                        aria-label={t.actions.cut}
                      >
                        <IconScissors size={18} />
                      </button>
                      <button
                        className="paint-btn"
                        onClick={handleDeleteSelection}
                        disabled={!selectionRect}
                        title={`${t.actions.deleteSelection} (Del)`}
                        aria-label={t.actions.deleteSelection}
                        style={{
                          opacity: selectionRect ? 1 : 0.4,
                          color: selectionRect ? 'var(--all-danger, #ef4444)' : undefined,
                        }}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>

                    <div className="paint-select-info-box">
                      <span className="paint-select-info-dims">
                        {selectionRect ? `${selectionRect.width} × ${selectionRect.height}` : '0 × 0'}
                      </span>
                      <span className="paint-select-info-label">
                        {selectionRect ? (locale === 'pl' ? 'zaznaczone' : 'selected') : (locale === 'pl' ? 'brak zazn.' : 'none')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Case 1: Brush */}
                {currentTool === 'brush' && (
                  <div className="paint-dynamic-box paint-dynamic-box--size">
                    <div className="paint-size-presets-col">
                      {[2, 6, 12, 24].map((s) => (
                        <button
                          key={s}
                          className={`paint-size-preset-btn ${brushSize === s ? 'active' : ''}`}
                          onClick={() => {
                            setBrushSize(s)
                            showNotice(`${t.dynamicProps.brushTitle}: ${s}px`)
                          }}
                          title={`${s}px`}
                        >
                          <div className="paint-size-preset-line-wrap">
                            <div
                              className="paint-size-preset-line"
                              style={{
                                height: Math.min(10, Math.max(1, s > 12 ? 8 : s > 4 ? 4 : s)),
                                backgroundColor: activeColorSlot === 1 ? color1 : color2,
                              }}
                            />
                          </div>
                          <span className="paint-size-preset-val">{s}px</span>
                        </button>
                      ))}
                    </div>

                    <div className="paint-size-custom-wrap">
                      <button
                        type="button"
                        className={`paint-size-custom-trigger ${isCustomSizeOpen ? 'active' : ''}`}
                        onClick={handleOpenSizePopover}
                        title={t.dynamicProps.customSize}
                        aria-label={t.dynamicProps.customSize}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        <span className="paint-size-custom-badge">{brushSize}px</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 2: Eraser */}
                {currentTool === 'eraser' && (
                  <div className="paint-dynamic-box paint-dynamic-box--size">
                    <div className="paint-size-presets-col">
                      {[4, 8, 16, 24].map((s) => (
                        <button
                          key={s}
                          className={`paint-size-preset-btn ${eraserSize === s ? 'active' : ''}`}
                          onClick={() => {
                            setEraserSize(s)
                            showNotice(`${t.dynamicProps.eraserTitle}: ${s}px`)
                          }}
                          title={`${s}px`}
                        >
                          <div className="paint-size-preset-square-wrap">
                            <div
                              className="paint-size-preset-square"
                              style={{
                                width: Math.min(12, Math.max(3, s / 2)),
                                height: Math.min(12, Math.max(3, s / 2)),
                                backgroundColor: color2,
                              }}
                            />
                          </div>
                          <span className="paint-size-preset-val">{s}px</span>
                        </button>
                      ))}
                    </div>

                    <div className="paint-size-custom-wrap">
                      <button
                        type="button"
                        className={`paint-size-custom-trigger ${isCustomSizeOpen ? 'active' : ''}`}
                        onClick={handleOpenSizePopover}
                        title={t.dynamicProps.customSize}
                        aria-label={t.dynamicProps.customSize}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        <span className="paint-size-custom-badge">{eraserSize}px</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 3: Pencil */}
                {currentTool === 'pencil' && (
                  <div className="paint-dynamic-box paint-dynamic-box--size">
                    <div className="paint-size-presets-col">
                      {[1, 2, 4, 8].map((s) => (
                        <button
                          key={s}
                          className={`paint-size-preset-btn ${pencilSize === s ? 'active' : ''}`}
                          onClick={() => {
                            setPencilSize(s)
                            showNotice(`${t.dynamicProps.pencilTitle}: ${s}px`)
                          }}
                          title={`${s}px`}
                        >
                          <div className="paint-size-preset-line-wrap">
                            <div
                              className="paint-size-preset-line"
                              style={{
                                height: Math.min(8, Math.max(1, s)),
                                backgroundColor: activeColorSlot === 1 ? color1 : color2,
                              }}
                            />
                          </div>
                          <span className="paint-size-preset-val">{s}px</span>
                        </button>
                      ))}
                    </div>

                    <div className="paint-size-custom-wrap">
                      <button
                        type="button"
                        className={`paint-size-custom-trigger ${isCustomSizeOpen ? 'active' : ''}`}
                        onClick={handleOpenSizePopover}
                        title={t.dynamicProps.customSize}
                        aria-label={t.dynamicProps.customSize}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        <span className="paint-size-custom-badge">{pencilSize}px</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 4: Shapes */}
                {['line', 'arrow', 'rectangle', 'rounded-rect', 'ellipse', 'triangle'].includes(currentTool) && (
                  <div className="paint-dynamic-box paint-dynamic-box--shapes">
                    <div className="paint-size-presets-col paint-size-presets-col--shapes">
                      {[1, 2, 4, 8].map((s) => (
                        <button
                          key={s}
                          className={`paint-size-preset-btn ${shapeStrokeWidth === s ? 'active' : ''}`}
                          onClick={() => {
                            setShapeStrokeWidth(s)
                            showNotice(`${t.dynamicProps.shapeTitle}: ${s}px`)
                          }}
                          title={`${s}px`}
                        >
                          <div className="paint-size-preset-line-wrap">
                            <div
                              className="paint-size-preset-line"
                              style={{
                                height: Math.min(8, Math.max(1, s)),
                                backgroundColor: activeColorSlot === 1 ? color1 : color2,
                              }}
                            />
                          </div>
                          <span className="paint-size-preset-val">{s}px</span>
                        </button>
                      ))}
                    </div>

                    <div className="paint-size-custom-wrap">
                      <button
                        type="button"
                        className={`paint-size-custom-trigger paint-size-custom-trigger--shapes ${isCustomSizeOpen ? 'active' : ''}`}
                        onClick={handleOpenSizePopover}
                        title={t.dynamicProps.customSize}
                        aria-label={t.dynamicProps.customSize}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        <span className="paint-size-custom-badge">{shapeStrokeWidth}px</span>
                      </button>
                    </div>

                    <div className="paint-shape-fill-toggles">
                      <button
                        type="button"
                        className={`paint-pill-btn ${shapeFillMode === 'outline' ? 'active' : ''}`}
                        onClick={() => setShapeFillMode('outline')}
                        title={t.actions.strokeOnly}
                      >
                        {t.actions.strokeOnly}
                      </button>
                      <button
                        type="button"
                        className={`paint-pill-btn ${shapeFillMode === 'fill' ? 'active' : ''}`}
                        onClick={() => setShapeFillMode('fill')}
                        title={t.actions.fillOnly}
                      >
                        {t.actions.fillOnly}
                      </button>
                      <button
                        type="button"
                        className={`paint-pill-btn ${shapeFillMode === 'both' ? 'active' : ''}`}
                        onClick={() => setShapeFillMode('both')}
                        title={t.actions.both}
                      >
                        {t.actions.both}
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 5: Text */}
                {currentTool === 'text' && (
                  <div className="paint-dynamic-box paint-dynamic-box--text">
                    <div className="paint-typography-row">
                      <select
                        className="paint-select paint-select--font"
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as any)}
                        title={t.textTool.fontFamily}
                      >
                        <option value="sans-serif">Inter</option>
                        <option value="monospace">JetBrains</option>
                        <option value="serif">Serif</option>
                        <option value="cursive">Cursive</option>
                      </select>
                      <select
                        className="paint-select paint-select--size"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        title={t.textTool.fontSize}
                      >
                        {[12, 16, 20, 24, 32, 40, 48, 64, 72].map((s) => (
                          <option key={s} value={s}>
                            {s}px
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="paint-typography-row">
                      <button
                        type="button"
                        className={`paint-btn paint-text-btn-toggle ${isBold ? 'active' : ''}`}
                        onClick={() => setIsBold((b) => !b)}
                        title={t.textTool.bold}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className={`paint-btn paint-text-btn-toggle ${isItalic ? 'active' : ''}`}
                        onClick={() => setIsItalic((i) => !i)}
                        title={t.textTool.italic}
                        style={{ fontStyle: 'italic' }}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        className={`paint-btn paint-text-btn-toggle ${isUnderline ? 'active' : ''}`}
                        onClick={() => setIsUnderline((u) => !u)}
                        title={t.textTool.underline}
                        style={{ textDecoration: 'underline' }}
                      >
                        U
                      </button>
                      <button
                        type="button"
                        className={`paint-btn paint-text-btn-toggle ${isSolidBg ? 'active' : ''}`}
                        onClick={() => setIsSolidBg((bg) => !bg)}
                        title={t.textTool.background}
                        style={{ fontSize: 10 }}
                      >
                        BG
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 6: Bucket */}
                {currentTool === 'bucket' && (
                  <div className="paint-dynamic-box paint-dynamic-box--bucket">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: activeColorSlot === 1 ? color1 : color2,
                          border: '1.5px solid var(--all-border-2)',
                          borderRadius: 3,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--all-text)' }}>
                        {activeColorSlot === 1 ? t.actions.color1.split(' ')[0] : t.actions.color2.split(' ')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--all-text-muted)', lineHeight: 1.2, textAlign: 'center' }}>
                      {t.dynamicProps.bucketHint}
                    </span>
                  </div>
                )}

                {/* Case 7: Eyedropper */}
                {currentTool === 'eyedropper' && (
                  <div className="paint-dynamic-box paint-dynamic-box--eyedropper">
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--all-text)' }}>
                      {t.dynamicProps.eyedropperTitle}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--all-text-muted)', lineHeight: 1.2, textAlign: 'center' }}>
                      {t.dynamicProps.eyedropperHint}
                    </span>
                  </div>
                )}
              </div>
              <span className="paint-section-title">
                {currentTool === 'select'
                  ? t.dynamicProps.selectTitle
                  : currentTool === 'brush'
                  ? t.dynamicProps.brushTitle
                  : currentTool === 'eraser'
                  ? t.dynamicProps.eraserTitle
                  : currentTool === 'pencil'
                  ? t.dynamicProps.pencilTitle
                  : currentTool === 'text'
                  ? t.dynamicProps.textTitle
                  : currentTool === 'bucket'
                  ? t.dynamicProps.bucketTitle
                  : currentTool === 'eyedropper'
                  ? t.dynamicProps.eyedropperTitle
                  : t.dynamicProps.shapeTitle}
              </span>
            </div>

            {/* Section: Colors */}
            <div className="paint-section">
              <div className="paint-section-content">
                {/* Primary & Secondary Color Boxes */}
                <div className="paint-color-boxes">
                  <div
                    className={`paint-color-box-slot ${activeColorSlot === 1 ? 'active' : ''}`}
                    onClick={() => setActiveColorSlot(1)}
                    title={t.actions.color1}
                  >
                    <div className="paint-color-box-preview" style={{ backgroundColor: color1 }} />
                    <span className="paint-color-box-label">1</span>
                  </div>
                  <div
                    className={`paint-color-box-slot ${activeColorSlot === 2 ? 'active' : ''}`}
                    onClick={() => setActiveColorSlot(2)}
                    title={t.actions.color2}
                  >
                    <div className="paint-color-box-preview" style={{ backgroundColor: color2 }} />
                    <span className="paint-color-box-label">2</span>
                  </div>
                </div>

                {/* Quick Swatch Palette */}
                <div className="paint-swatches">
                  {SWATCH_PALETTE.map((hex) => (
                    <div
                      key={hex}
                      className="paint-swatch"
                      style={{ backgroundColor: hex }}
                      onClick={() => {
                        if (activeColorSlot === 1) setColor1(hex)
                        else setColor2(hex)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setColor2(hex)
                      }}
                    />
                  ))}
                </div>

                {/* Custom Color Button */}
                <button
                  type="button"
                  className={`paint-btn paint-custom-color-btn ${isCustomColorOpen ? 'active' : ''}`}
                  onClick={handleOpenColorPopover}
                  title={t.actions.customColor}
                  aria-label={t.actions.customColor}
                >
                  <input
                    type="color"
                    ref={colorPickerRef}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="paint-hidden-color-input"
                    style={{ display: 'none' }}
                    value={activeColorSlot === 1 ? color1 : color2}
                    onChange={(e) => {
                      if (activeColorSlot === 1) setColor1(e.target.value)
                      else setColor2(e.target.value)
                    }}
                  />
                  <div className="paint-color-wheel-icon" aria-hidden="true" />
                  <span>{t.actions.customColor}</span>
                </button>
              </div>
              <span className="paint-section-title">{t.sections.colors}</span>
            </div>
          </div>
        </header>

        {/* ─── Canvas Viewport (Center) ─── */}
        <main
          className="paint-canvas-viewport"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div
            className="paint-canvas-wrapper"
            style={{
              width: canvasDim.width * zoom,
              height: canvasDim.height * zoom,
            }}
          >
            <canvas
              ref={canvasRef}
              className="paint-canvas"
              style={{
                width: canvasDim.width * zoom,
                height: canvasDim.height * zoom,
                imageRendering: zoom > 1 ? 'pixelated' : 'auto',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <canvas
              ref={previewCanvasRef}
              className="paint-preview-canvas"
              style={{
                width: canvasDim.width * zoom,
                height: canvasDim.height * zoom,
                imageRendering: zoom > 1 ? 'pixelated' : 'auto',
              }}
            />

            {/* Interactive MS Paint-style On-Canvas Text Selection Box */}
            {activeTextOverlay && (
              <div
                className="paint-text-inline-overlay paint-canvas-text-box"
                style={{
                  position: 'absolute',
                  left: `${activeTextOverlay.x * zoom}px`,
                  top: `${activeTextOverlay.y * zoom}px`,
                  zIndex: 50,
                }}
              >
                {/* Drag bar / header with grip & quick action buttons */}
                <div
                  className="paint-text-box-drag-handle"
                  onPointerDown={handleTextDragStart}
                  title={locale === 'pl' ? 'Przeciągnij, aby przesunąć pole tekstowe' : 'Drag to reposition text box'}
                >
                  <div className="paint-text-box-grip">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="9" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="19" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="19" r="1.5" fill="currentColor" />
                    </svg>
                    <span>
                      {activeTextOverlay.x}, {activeTextOverlay.y}
                    </span>
                  </div>

                  <div className="paint-text-box-actions">
                    <button
                      type="button"
                      className="paint-text-box-btn paint-text-box-btn--commit"
                      onClick={handleCommitText}
                      title={locale === 'pl' ? 'Zatwierdź tekst (Enter)' : 'Commit text (Enter)'}
                      aria-label="Commit text"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="paint-text-box-btn paint-text-box-btn--cancel"
                      onClick={() => setActiveTextOverlay(null)}
                      title={locale === 'pl' ? 'Anuluj (Esc)' : 'Cancel (Esc)'}
                      aria-label="Cancel text"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Direct On-Canvas Text Input */}
                <input
                  ref={textInputRef}
                  className="paint-text-box-input"
                  placeholder={locale === 'pl' ? 'Wpisz tekst...' : 'Type text...'}
                  value={activeTextOverlay.text}
                  style={{
                    fontFamily,
                    fontSize: `${fontSize * zoom}px`,
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    textDecoration: isUnderline ? 'underline' : 'none',
                    color: color1,
                    backgroundColor: isSolidBg ? color2 : 'transparent',
                    caretColor: color1,
                  }}
                  onChange={(e) =>
                    setActiveTextOverlay({
                      ...activeTextOverlay,
                      text: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCommitText()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setActiveTextOverlay(null)
                    }
                  }}
                />
              </div>
            )}
          </div>
        </main>

        {/* ─── Bottom Status Bar ─── */}
        <footer className="paint-status-bar">
          <div className="paint-status-item">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconCrosshair size={13} aria-hidden="true" />
              {t.status.cursor}:
            </span>
            <strong>
              {cursorPos.x}, {cursorPos.y} px
            </strong>
          </div>

          <div className="paint-status-item">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconMaximize2 size={13} aria-hidden="true" />
              {t.status.canvasSize}:
            </span>
            <strong>
              {canvasDim.width} × {canvasDim.height} px
            </strong>
          </div>

          {statusMessage && (
            <div
              className="paint-status-item"
              style={{
                color: 'var(--all-accent)',
                fontWeight: 600,
                backgroundColor: 'var(--all-surface-2)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {statusMessage}
            </div>
          )}

          <div className="paint-status-zoom">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconZoomIn size={13} aria-hidden="true" />
              {t.status.zoom}:
            </span>
            <button
              className="paint-zoom-btn"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              title={t.actions.zoomOut}
            >
              -
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="paint-zoom-btn"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              title={t.actions.zoomIn}
            >
              +
            </button>
            <button className="paint-zoom-btn" onClick={() => setZoom(1)} title={t.actions.zoomReset}>
              100%
            </button>
          </div>
        </footer>

        {/* ─── Anchored File Menu Popover ─── */}
        {isFileDialogOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={filePopoverRef}
              className="paint-anchored-popover paint-file-popover"
              role="dialog"
              aria-label={t.fileMenu.button}
              style={{
                top: `${filePopoverPos.top}px`,
                left: `${filePopoverPos.left}px`,
              }}
            >
              <div className="paint-anchored-popover-header">
                <span className="paint-popover-title all-dialog__title">
                  {t.fileMenu.button}
                </span>
                <button
                  type="button"
                  className="paint-popover-close-btn"
                  onClick={() => setIsFileDialogOpen(false)}
                  title={t.textTool.cancelBtn}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="paint-anchored-popover-body">
                <div className="paint-file-dialog-list">
                  <button
                    className="paint-file-dialog-item"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      setTempWidth(canvasDim.width)
                      setTempHeight(canvasDim.height)
                      setIsNewCanvasDialogOpen(true)
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconFile size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.newCanvas}</strong>
                      <span>{t.dialogs.newCanvasDesc}</span>
                    </div>
                  </button>
                  <button
                    className="paint-file-dialog-item"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      fileInputRef.current?.click()
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconFolderOpen size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.openImage}</strong>
                      <span>PNG, JPG, WebP, SVG</span>
                    </div>
                  </button>
                  <button
                    className="paint-file-dialog-item"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      setIsExportDialogOpen(true)
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconDownload size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.exportImage}</strong>
                      <span>{t.dialogs.exportDesc}</span>
                    </div>
                  </button>
                  <button
                    className="paint-file-dialog-item"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      setTempWidth(canvasDim.width)
                      setTempHeight(canvasDim.height)
                      setIsResizeDialogOpen(true)
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconMaximize2 size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.resizeCanvas}</strong>
                      <span>{t.dialogs.resizeDesc}</span>
                    </div>
                  </button>
                  <button
                    className="paint-file-dialog-item"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      handleCopy()
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconCopy size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.copyImage}</strong>
                      <span>{t.actions.copiedNotice}</span>
                    </div>
                  </button>
                  <button
                    className="paint-file-dialog-item paint-file-dialog-item--danger"
                    onClick={() => {
                      setIsFileDialogOpen(false)
                      handleClear()
                    }}
                  >
                    <span className="paint-file-dialog-icon">
                      <IconTrash size={18} aria-hidden="true" />
                    </span>
                    <div className="paint-file-dialog-info">
                      <strong>{t.fileMenu.clearCanvas}</strong>
                      <span>{t.actions.clearConfirm}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ─── New Canvas Dialog ─── */}
        <Dialog
          isOpen={isNewCanvasDialogOpen}
          onClose={() => setIsNewCanvasDialogOpen(false)}
          title={t.dialogs.newCanvasTitle}
          description={t.dialogs.newCanvasDesc}
        >
          <div className="paint-dialog-body">
            <span style={{ fontSize: 12, fontWeight: 600 }}>{t.dialogs.presets}:</span>
            <div className="paint-presets-grid">
              {PRESET_RESOLUTIONS.map((preset) => (
                <button
                  key={preset.label}
                  className="paint-preset-btn"
                  onClick={() => {
                    setTempWidth(preset.width)
                    setTempHeight(preset.height)
                  }}
                >
                  <strong>{preset.width} × {preset.height}</strong>
                  <span>{preset.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            <div className="paint-dialog-row">
              <div className="paint-dialog-field">
                <label>{t.dialogs.width}</label>
                <input
                  type="number"
                  className="paint-dialog-input"
                  value={tempWidth}
                  min={100}
                  max={4096}
                  onChange={(e) => setTempWidth(Math.max(100, Math.min(4096, Number(e.target.value))))}
                />
              </div>
              <div className="paint-dialog-field">
                <label>{t.dialogs.height}</label>
                <input
                  type="number"
                  className="paint-dialog-input"
                  value={tempHeight}
                  min={100}
                  max={4096}
                  onChange={(e) => setTempHeight(Math.max(100, Math.min(4096, Number(e.target.value))))}
                />
              </div>
            </div>

            <div className="paint-dialog-footer">
              <Button variant="ghost" onClick={() => setIsNewCanvasDialogOpen(false)}>
                {t.dialogs.cancelBtn}
              </Button>
              <Button variant="primary" onClick={handleCreateNewCanvas}>
                {t.dialogs.createBtn}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* ─── Resize Canvas Dialog ─── */}
        <Dialog
          isOpen={isResizeDialogOpen}
          onClose={() => setIsResizeDialogOpen(false)}
          title={t.dialogs.resizeTitle}
          description={t.dialogs.resizeDesc}
        >
          <div className="paint-dialog-body">
            <span style={{ fontSize: 12, fontWeight: 600 }}>{t.dialogs.presets}:</span>
            <div className="paint-presets-grid">
              {PRESET_RESOLUTIONS.map((preset) => (
                <button
                  key={preset.label}
                  className="paint-preset-btn"
                  onClick={() => {
                    setTempWidth(preset.width)
                    setTempHeight(preset.height)
                  }}
                >
                  <strong>{preset.width} × {preset.height}</strong>
                  <span>{preset.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            <div className="paint-dialog-row">
              <div className="paint-dialog-field">
                <label>{t.dialogs.width}</label>
                <input
                  type="number"
                  className="paint-dialog-input"
                  value={tempWidth}
                  min={100}
                  max={4096}
                  onChange={(e) => setTempWidth(Math.max(100, Math.min(4096, Number(e.target.value))))}
                />
              </div>
              <div className="paint-dialog-field">
                <label>{t.dialogs.height}</label>
                <input
                  type="number"
                  className="paint-dialog-input"
                  value={tempHeight}
                  min={100}
                  max={4096}
                  onChange={(e) => setTempHeight(Math.max(100, Math.min(4096, Number(e.target.value))))}
                />
              </div>
            </div>

            <div className="paint-dialog-footer">
              <Button variant="ghost" onClick={() => setIsResizeDialogOpen(false)}>
                {t.dialogs.cancelBtn}
              </Button>
              <Button variant="primary" onClick={handleApplyResize}>
                {t.dialogs.resizeBtn}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* ─── Export / Save As Dialog ─── */}
        <Dialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          title={t.dialogs.exportTitle}
          description={t.dialogs.exportDesc}
        >
          <div className="paint-dialog-body">
            <div className="paint-dialog-row">
              <div className="paint-dialog-field">
                <label>{t.dialogs.format}</label>
                <select
                  className="paint-dialog-input"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                >
                  <option value="image/png">PNG (Lossless)</option>
                  <option value="image/jpeg">JPG (Compressed)</option>
                  <option value="image/webp">WebP (Modern Web)</option>
                </select>
              </div>

              {exportFormat === 'image/jpeg' && (
                <div className="paint-dialog-field">
                  <label>{t.dialogs.quality}: {exportQuality}%</label>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--all-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconMaximize2 size={14} aria-hidden="true" />
              {canvasDim.width} × {canvasDim.height} px
            </div>

            <div className="paint-dialog-footer">
              <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>
                {t.dialogs.cancelBtn}
              </Button>
              <Button variant="secondary" onClick={handleCopy} icon={<IconCopy size={16} />}>
                {t.dialogs.copyBtn}
              </Button>
              <Button variant="primary" onClick={handleDownloadExport} icon={<IconDownload size={16} />}>
                {t.dialogs.downloadBtn}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* ─── Anchored Tool Size Settings Popover ─── */}
        {isCustomSizeOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={sizePopoverRef}
              className="paint-anchored-popover"
              role="dialog"
              aria-label={getSizeDialogTitle()}
              style={{
                top: `${sizePopoverPos.top}px`,
                left: `${sizePopoverPos.left}px`,
              }}
            >
              <div className="paint-anchored-popover-header">
                <span className="paint-popover-title all-dialog__title">
                  {getSizeDialogTitle()}
                </span>
                <button
                  type="button"
                  className="paint-popover-close-btn"
                  onClick={() => setIsCustomSizeOpen(false)}
                  title={t.textTool.cancelBtn}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="paint-anchored-popover-body">
                {/* Visual Size Preview */}
                <div className="paint-size-dialog-preview">
                  <div
                    className="paint-size-dialog-dot"
                    style={{
                      width: Math.min(56, Math.max(2, getCurrentToolSize())),
                      height: Math.min(56, Math.max(2, getCurrentToolSize())),
                      backgroundColor:
                        currentTool === 'eraser'
                          ? color2
                          : activeColorSlot === 1
                          ? color1
                          : color2,
                      borderRadius: currentTool === 'eraser' ? 2 : '50%',
                      border:
                        currentTool === 'eraser'
                          ? '1px solid var(--all-border-2)'
                          : undefined,
                    }}
                  />
                  <span className="paint-size-dialog-value">
                    {getCurrentToolSize()} px
                  </span>
                </div>

                {/* Slider */}
                <Slider
                  value={getCurrentToolSize()}
                  min={currentTool === 'eraser' ? 2 : 1}
                  max={
                    [
                      'line',
                      'arrow',
                      'rectangle',
                      'rounded-rect',
                      'ellipse',
                      'triangle',
                    ].includes(currentTool)
                      ? 48
                      : 64
                  }
                  valueDisplay={`${getCurrentToolSize()} px`}
                  onChange={(v) => setCurrentToolSize(v)}
                />

                {/* Preset Buttons Grid */}
                <div className="paint-size-dialog-presets">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--all-text-muted)',
                    }}
                  >
                    {t.dialogs.presets}:
                  </span>
                  <div className="paint-size-dialog-chips">
                    {(currentTool === 'pencil'
                      ? [1, 2, 4, 8, 12, 16, 24]
                      : currentTool === 'eraser'
                      ? [4, 8, 12, 16, 24, 32, 48, 64]
                      : [
                          'line',
                          'arrow',
                          'rectangle',
                          'rounded-rect',
                          'ellipse',
                          'triangle',
                        ].includes(currentTool)
                      ? [1, 2, 4, 6, 8, 12, 16, 24, 32, 48]
                      : [1, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64]
                    ).map((sz) => (
                      <Button
                        key={sz}
                        variant={
                          getCurrentToolSize() === sz ? 'primary' : 'secondary'
                        }
                        size="sm"
                        shape="pill"
                        onClick={() => setCurrentToolSize(sz)}
                      >
                        {sz}px
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="paint-anchored-popover-footer">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCustomSizeOpen(false)}
                >
                  {locale === 'pl' ? 'Gotowe' : 'Done'}
                </Button>
              </div>
            </div>,
            document.body
          )}

        {/* ─── Anchored Custom Color Popover ─── */}
        {isCustomColorOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={colorPopoverRef}
              className="paint-anchored-popover paint-color-popover"
              role="dialog"
              aria-label={t.actions.customColor}
              style={{
                top: `${colorPopoverPos.top}px`,
                left: `${colorPopoverPos.left}px`,
              }}
            >
              <div className="paint-anchored-popover-header">
                <span className="paint-popover-title all-dialog__title">
                  {t.actions.customColor} (
                  {activeColorSlot === 1
                    ? t.actions.color1.split(' ')[0]
                    : t.actions.color2.split(' ')[0]}
                  )
                </span>
                <button
                  type="button"
                  className="paint-popover-close-btn"
                  onClick={() => setIsCustomColorOpen(false)}
                  title={t.textTool.cancelBtn}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="paint-anchored-popover-body">
                {/* Active Color Preview & Hex input */}
                <div className="paint-color-popover-preview-row">
                  <div
                    className="paint-color-popover-swatch-large"
                    style={{ backgroundColor: activeColor }}
                  />
                  <div className="paint-color-popover-hex-input-wrap">
                    <label
                      htmlFor="paint-color-hex-input"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--all-text-muted)',
                      }}
                    >
                      HEX
                    </label>
                    <input
                      id="paint-color-hex-input"
                      type="text"
                      className="paint-dialog-input"
                      value={activeColor.toUpperCase()}
                      maxLength={7}
                      style={{
                        height: 32,
                        fontSize: 13,
                        fontFamily: 'var(--all-font-mono, monospace)',
                        padding: '4px 8px',
                      }}
                      onChange={(e) => {
                        let val = e.target.value
                        if (!val.startsWith('#')) val = '#' + val
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          handleHexInputChange(val)
                        }
                      }}
                    />
                  </div>
                </div>

                {/* RGB Sliders using @all/ui Slider */}
                <div className="paint-color-popover-sliders">
                  <div className="paint-color-slider-row">
                    <Slider
                      value={currentColorRgb.r}
                      min={0}
                      max={255}
                      valueDisplay={`R: ${currentColorRgb.r}`}
                      onChange={(v) =>
                        handleRgbChange(v, currentColorRgb.g, currentColorRgb.b)
                      }
                    />
                  </div>
                  <div className="paint-color-slider-row">
                    <Slider
                      value={currentColorRgb.g}
                      min={0}
                      max={255}
                      valueDisplay={`G: ${currentColorRgb.g}`}
                      onChange={(v) =>
                        handleRgbChange(currentColorRgb.r, v, currentColorRgb.b)
                      }
                    />
                  </div>
                  <div className="paint-color-slider-row">
                    <Slider
                      value={currentColorRgb.b}
                      min={0}
                      max={255}
                      valueDisplay={`B: ${currentColorRgb.b}`}
                      onChange={(v) =>
                        handleRgbChange(currentColorRgb.r, currentColorRgb.g, v)
                      }
                    />
                  </div>
                </div>

                {/* Quick Swatches in Popover */}
                <div className="paint-color-popover-swatches">
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--all-text-muted)',
                    }}
                  >
                    {t.dialogs.presets}:
                  </span>
                  <div className="paint-swatches" style={{ margin: '0 auto' }}>
                    {SWATCH_PALETTE.map((hex) => (
                      <div
                        key={hex}
                        className={`paint-swatch ${
                          activeColor.toLowerCase() === hex.toLowerCase()
                            ? 'active'
                            : ''
                        }`}
                        style={{
                          backgroundColor: hex,
                          outline:
                            activeColor.toLowerCase() === hex.toLowerCase()
                              ? '2px solid var(--all-accent)'
                              : undefined,
                          outlineOffset: 1,
                        }}
                        onClick={() => handleHexInputChange(hex)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="paint-anchored-popover-footer"
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    variant={activeColorSlot === 1 ? 'primary' : 'secondary'}
                    size="sm"
                    shape="pill"
                    onClick={() => setActiveColorSlot(1)}
                  >
                    1
                  </Button>
                  <Button
                    variant={activeColorSlot === 2 ? 'primary' : 'secondary'}
                    size="sm"
                    shape="pill"
                    onClick={() => setActiveColorSlot(2)}
                  >
                    2
                  </Button>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCustomColorOpen(false)}
                >
                  {locale === 'pl' ? 'Gotowe' : 'Done'}
                </Button>
              </div>
            </div>,
            document.body
          )}
      </div>
    </FullBleedLayout>
  )
}
