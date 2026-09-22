import type { PayloadType, CameraLabels } from '../types'

export interface PayloadData {
  urlValue?: string
  textValue?: string
  wifiSsid?: string
  wifiPass?: string
  wifiAuth?: 'WPA' | 'WEP' | 'nopass'
  contactName?: string
  contactPhone?: string
  contactEmail?: string
}

/**
 * Generate standard QR code payload string based on payload type
 */
export function generatePayload(type: PayloadType, data: PayloadData): string {
  switch (type) {
    case 'url':
      return (data.urlValue || '').trim()
    case 'text':
      return data.textValue || ''
    case 'wifi': {
      const ssid = (data.wifiSsid || '').trim()
      const pass = data.wifiPass || ''
      const auth = data.wifiAuth || 'WPA'
      return `WIFI:T:${auth};S:${ssid};P:${pass};;`
    }
    case 'contact': {
      const name = (data.contactName || '').trim()
      const phone = (data.contactPhone || '').trim()
      const email = (data.contactEmail || '').trim()
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}`
      if (email) {
        vcard += `\nEMAIL:${email}`
      }
      vcard += '\nEND:VCARD'
      return vcard
    }
    default:
      return (data.urlValue || '').trim()
  }
}

/**
 * Format camera device name using readable heuristics
 */
export function formatCameraName(
  dev: { label?: string },
  index: number,
  labels: CameraLabels
): string {
  const label = (dev.label || '').toLowerCase()
  if (
    label.includes('front') ||
    label.includes('przedni') ||
    label.includes('user') ||
    label.includes('facing front')
  ) {
    return labels.frontCamera
  }
  if (
    label.includes('ultra') ||
    label.includes('0.5') ||
    label.includes('szerok')
  ) {
    return labels.ultraWide
  }
  if (
    label.includes('tele') ||
    label.includes('2x') ||
    label.includes('3x') ||
    label.includes('zoom')
  ) {
    return labels.telephoto
  }
  if (
    label.includes('main') ||
    label.includes('główny') ||
    label.includes('1x') ||
    label.includes('wide') ||
    label.includes('camera2 0') ||
    label.includes('back 0')
  ) {
    return labels.mainCamera
  }
  if (dev.label) {
    const cleaned = dev.label.replace(/\(.*\)/, '').trim()
    return cleaned || dev.label
  }
  return labels.cameraIndex(index + 1)
}

/**
 * Clamp camera zoom level to hardware capabilities
 */
export function clampZoom(zoom: number, min: number, max: number): number {
  if (isNaN(zoom)) return min
  return Math.min(Math.max(zoom, min), max)
}

/**
 * Check whether a string is a clickable web link
 */
export function isWebUrl(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ftp://')
  )
}
