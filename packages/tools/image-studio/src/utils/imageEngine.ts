import heic2any from 'heic2any'
import type { ImageFormat, ResizeConfig, WatermarkConfig } from '../types'

/**
 * Loads a File into an HTMLImageElement, automatically decoding HEIC/HEIF if needed.
 */
export async function loadFileToImage(
  file: File
): Promise<{ image: HTMLImageElement; file: File; sizeBytes: number }> {
  let workingBlob: Blob = file

  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)

  if (isHeic) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      })
      workingBlob = Array.isArray(converted) ? converted[0] : converted
    } catch (err) {
      console.warn('HEIC decoding failed, trying native load:', err)
    }
  }

  const objectUrl = URL.createObjectURL(workingBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        image: img,
        file,
        sizeBytes: file.size,
      })
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

/**
 * Calculates target canvas width and height based on resize config, pan offset, and zoom.
 */
export function calculateDimensions(
  origW: number,
  origH: number,
  resize: ResizeConfig
): { targetW: number; targetH: number; srcX: number; srcY: number; srcW: number; srcH: number } {
  const crop = resize.crop || { offsetX: 0, offsetY: 0, zoom: 1, showPassportGuide: false }
  const zoom = Math.max(1, Math.min(4, crop.zoom || 1))

  let targetRatio: number | null = null

  switch (resize.preset) {
    case 'id-photo':
      targetRatio = 7 / 9 // 35mm x 45mm standard photo ID ratio
      break
    case '1:1':
      targetRatio = 1
      break
    case '4:3':
      targetRatio = 4 / 3
      break
    case '16:9':
      targetRatio = 16 / 9
      break
    case '3:2':
      targetRatio = 3 / 2
      break
    case '9:16':
      targetRatio = 9 / 16
      break
    case 'custom':
      if (resize.customWidth > 0 && resize.customHeight > 0) {
        targetRatio = resize.customWidth / resize.customHeight
      }
      break
    case 'original':
    default:
      targetRatio = origW / origH
      break
  }

  if (targetRatio === null) {
    targetRatio = origW / origH
  }

  const origRatio = origW / origH
  let baseCropW = origW
  let baseCropH = origH

  if (origRatio > targetRatio) {
    baseCropH = origH
    baseCropW = origH * targetRatio
  } else {
    baseCropW = origW
    baseCropH = origW / targetRatio
  }

  // Apply zoom to shrink sampled rectangle
  const srcW = baseCropW / zoom
  const srcH = baseCropH / zoom

  // Allow panning within bounds
  const centerX = (origW - srcW) / 2
  const centerY = (origH - srcH) / 2
  const maxShiftX = Math.max(0, (origW - srcW) / 2)
  const maxShiftY = Math.max(0, (origH - srcH) / 2)

  const srcX = maxShiftX > 0 ? Math.max(0, Math.min(origW - srcW, centerX + crop.offsetX * maxShiftX)) : 0
  const srcY = maxShiftY > 0 ? Math.max(0, Math.min(origH - srcH, centerY + crop.offsetY * maxShiftY)) : 0

  let targetW = Math.round(baseCropW)
  let targetH = Math.round(baseCropH)

  if (resize.preset === 'custom' && resize.customWidth > 0 && resize.customHeight > 0) {
    targetW = resize.customWidth
    targetH = resize.customHeight
  }

  return { targetW, targetH, srcX, srcY, srcW, srcH }
}

/**
 * Renders the image with cropping/resizing and watermark onto an offscreen canvas.
 */
export function renderProcessedCanvas(
  img: HTMLImageElement,
  resize: ResizeConfig,
  watermark: WatermarkConfig
): HTMLCanvasElement {
  const { targetW, targetH, srcX, srcY, srcW, srcH } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    resize
  )

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, targetW)
  canvas.height = Math.max(1, targetH)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Enable high quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw base image (with crop/scale)
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH)

  // Draw Watermark if enabled
  if (watermark.enabled && watermark.text.trim()) {
    ctx.save()
    ctx.globalAlpha = Math.max(0.05, Math.min(1, watermark.opacity))
    ctx.fillStyle = watermark.color || '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = Math.max(1, Math.round(watermark.fontSize / 14))

    const scaledFontSize = Math.round(
      (watermark.fontSize / 400) * Math.min(targetW, targetH) + 14
    )
    ctx.font = `bold ${scaledFontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (watermark.mode === 'diagonal-single') {
      // Single large center diagonal watermark
      ctx.translate(targetW / 2, targetH / 2)
      ctx.rotate(-0.6) // ~-35 degrees
      ctx.strokeText(watermark.text, 0, 0)
      ctx.fillText(watermark.text, 0, 0)
    } else if (watermark.mode === 'diagonal-repeat') {
      // Diagonal repeating grid across the whole image
      ctx.rotate(-0.55)
      const textMetrics = ctx.measureText(watermark.text)
      const stepX = Math.max(120, textMetrics.width + scaledFontSize * 2)
      const stepY = Math.max(80, scaledFontSize * 3.5)

      const diag = Math.hypot(targetW, targetH)
      for (let y = -diag; y < diag * 1.5; y += stepY) {
        for (let x = -diag; x < diag * 1.5; x += stepX) {
          ctx.strokeText(watermark.text, x, y)
          ctx.fillText(watermark.text, x, y)
        }
      }
    } else {
      // Bottom-right corner stamp
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      const pad = Math.max(12, Math.round(targetW * 0.03))
      ctx.strokeText(watermark.text, targetW - pad, targetH - pad)
      ctx.fillText(watermark.text, targetW - pad, targetH - pad)
    }

    ctx.restore()
  }

  return canvas
}

/**
 * Compresses and converts the canvas to a Blob and DataURL.
 * Supports target max KB limit via binary search approximation.
 */
export async function exportCompressedBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  qualityPercent: number,
  targetMaxKb: number | null
): Promise<{ blob: Blob; sizeBytes: number; dataUrl: string }> {
  const normalizedQuality = Math.max(0.01, Math.min(1, qualityPercent / 100))

  const toBlobPromise = (q: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas export failed'))
        },
        format,
        format === 'image/png' ? undefined : q
      )
    })

  let finalBlob: Blob

  if (targetMaxKb && targetMaxKb > 0 && format !== 'image/png') {
    const targetBytes = targetMaxKb * 1024
    let low = 0.05
    let high = 0.98
    let bestBlob: Blob | null = null

    // Binary search up to 6 iterations for fastest quality convergence
    for (let i = 0; i < 6; i++) {
      const mid = (low + high) / 2
      const candidateBlob = await toBlobPromise(mid)

      if (candidateBlob.size <= targetBytes) {
        bestBlob = candidateBlob
        low = mid // try higher quality while staying below limit
      } else {
        high = mid // too big, decrease quality
      }
    }

    finalBlob = bestBlob || (await toBlobPromise(0.05))
  } else {
    finalBlob = await toBlobPromise(normalizedQuality)
  }

  const dataUrl = URL.createObjectURL(finalBlob)
  return {
    blob: finalBlob,
    sizeBytes: finalBlob.size,
    dataUrl,
  }
}
