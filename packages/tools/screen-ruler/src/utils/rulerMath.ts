import type { CaliperPosition, WorkspaceDimensions, MeasurementResult, MeasurementUnit, TickMark } from '../types'

// ISO/IEC 7810 ID-1 standard dimensions in millimeters
export const CARD_LONG_MM = 85.6
export const CARD_SHORT_MM = 53.98

export const DEFAULT_PPM_DESKTOP = 3.78 // ~96 DPI standard CSS pixel
export const DEFAULT_PPM_MOBILE = 5.5 // ~140 DPI mobile viewport approximation

export const RULER_STORAGE_KEY_PPM = 'alltools:ruler:ppm'
export const RULER_STORAGE_KEY_CALIBRATED = 'alltools:ruler:calibrated'

/**
 * Returns initial pixels per millimeter from localStorage or viewport heuristic.
 */
export function getInitialPpm(isMobile?: boolean): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(RULER_STORAGE_KEY_PPM)
      if (saved) {
        const parsed = parseFloat(saved)
        if (Number.isFinite(parsed) && parsed >= 2.0 && parsed <= 8.0) return parsed
      }
    }
  } catch {
    // Ignore storage access errors
  }

  const mobile = isMobile ?? (typeof window !== 'undefined' && window.innerWidth < 640)
  return mobile ? DEFAULT_PPM_MOBILE : DEFAULT_PPM_DESKTOP
}

/**
 * Calculate pixels per millimeter from calibrated on-screen card width.
 */
export function calculatePpm(cardWidthPx: number, targetWidthMm: number): number {
  if (targetWidthMm <= 0 || cardWidthPx <= 0) return 0
  return cardWidthPx / targetWidthMm
}

/**
 * Calculate proportional card height in pixels given card width and aspect ratio.
 */
export function calculateCardHeightPx(cardWidthPx: number, targetWidthMm: number, targetHeightMm: number): number {
  if (targetWidthMm <= 0 || cardWidthPx <= 0) return 0
  return Math.round(cardWidthPx * (targetHeightMm / targetWidthMm))
}

/**
 * Calculate estimated dots per inch (DPI) from pixels per millimeter.
 */
export function calculateDpi(ppm: number): number {
  if (ppm <= 0) return 0
  return Math.round(ppm * 25.4)
}

/**
 * Compute all 2D measurement readouts given caliper position and PPM.
 */
export function calculateMeasurements(caliperPx: CaliperPosition, ppm: number): MeasurementResult {
  const safePpm = ppm > 0 ? ppm : DEFAULT_PPM_DESKTOP

  const mmX = safePpm > 0 ? Math.max(0, caliperPx.x) / safePpm : 0
  const mmY = safePpm > 0 ? Math.max(0, caliperPx.y) / safePpm : 0

  const cmX = mmX / 10
  const cmY = mmY / 10

  const inX = mmX / 25.4
  const inY = mmY / 25.4

  const diagMm = Math.sqrt(mmX * mmX + mmY * mmY)
  const diagCm = diagMm / 10
  const diagIn = diagMm / 25.4

  const estimatedDpi = calculateDpi(safePpm)

  return {
    mmX,
    mmY,
    cmX,
    cmY,
    inX,
    inY,
    diagMm,
    diagCm,
    diagIn,
    estimatedDpi,
  }
}

/**
 * Formats a measurement number according to unit (cm or inch).
 */
export function formatMeasurement(value: number, unit: MeasurementUnit): string {
  const formatted = value.toFixed(2)
  return unit === 'cm' ? `${formatted} CM` : `${formatted} IN`
}

/**
 * Clamps pointer coordinate within bounding rect to relative bottom-right distance.
 */
export function clampPointer(
  clientX: number,
  clientY: number,
  rect: { width: number; height: number; right: number; bottom: number },
): CaliperPosition {
  const distRight = Math.max(0, Math.min(rect.width, rect.right - clientX))
  const distBottom = Math.max(0, Math.min(rect.height, rect.bottom - clientY))
  return { x: distRight, y: distBottom }
}

/**
 * Computes laser crosshair position in SVG viewport coordinates.
 */
export function clampLaser(
  caliperPx: CaliperPosition,
  dims: WorkspaceDimensions,
  rulerSize: number,
): { laserX: number; laserY: number } {
  const laserX = Math.max(0, Math.min(dims.width - rulerSize, dims.width - caliperPx.x))
  const laserY = Math.max(0, Math.min(dims.height - rulerSize, dims.height - caliperPx.y))
  return { laserX, laserY }
}

/**
 * Generates ruler tick graduation marks along an axis.
 */
export function generateTickMarks(maxMm: number, currentPpm: number, rulerSize: number, totalSpan: number): TickMark[] {
  if (maxMm <= 0 || currentPpm <= 0) return []

  const ticks: TickMark[] = []

  for (let mm = 0; mm <= maxMm; mm++) {
    const coord = totalSpan - rulerSize - mm * currentPpm
    if (coord < 0) continue

    const isCm = mm % 10 === 0
    const isHalfCm = mm % 5 === 0
    const tickLength = isCm ? 28 : isHalfCm ? 18 : 10

    ticks.push({
      mm,
      coord,
      isCm,
      isHalfCm,
      tickLength,
      label: isCm ? String(mm / 10) : undefined,
    })
  }

  return ticks
}
