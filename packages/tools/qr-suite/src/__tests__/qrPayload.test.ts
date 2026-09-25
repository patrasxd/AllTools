import { describe, it, expect } from 'vitest'
import { generatePayload, formatCameraName, clampZoom, isWebUrl } from '../utils/qrPayload'
import type { CameraLabels } from '../types'

const mockCameraLabels: CameraLabels = {
  frontCamera: 'Front Camera',
  ultraWide: 'Ultra Wide',
  telephoto: 'Telephoto',
  mainCamera: 'Main Camera',
  cameraLabel: 'Camera',
  cameraIndex: (n: number) => `Camera ${n}`,
}

describe('qrPayload pure utilities', () => {
  describe('generatePayload', () => {
    it('generates trimmed url payload', () => {
      expect(generatePayload('url', { urlValue: '  https://antigravity.dev  ' })).toBe('https://antigravity.dev')
    })

    it('generates plain text payload', () => {
      expect(generatePayload('text', { textValue: 'Hello world!' })).toBe('Hello world!')
    })

    it('generates standard Wi-Fi payload', () => {
      const payload = generatePayload('wifi', {
        wifiSsid: 'MyOfficeNet',
        wifiPass: 'secretPass123',
        wifiAuth: 'WPA',
      })
      expect(payload).toBe('WIFI:T:WPA;S:MyOfficeNet;P:secretPass123;;')
    })

    it('defaults wifi auth to WPA if not specified', () => {
      const payload = generatePayload('wifi', {
        wifiSsid: 'GuestNet',
        wifiPass: 'pass',
      })
      expect(payload).toBe('WIFI:T:WPA;S:GuestNet;P:pass;;')
    })

    it('generates vCard payload with name and phone', () => {
      const payload = generatePayload('contact', {
        contactName: 'Jane Doe',
        contactPhone: '+1 555 123 4567',
      })
      expect(payload).toBe('BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nTEL:+1 555 123 4567\nEND:VCARD')
    })

    it('generates vCard payload with email when provided', () => {
      const payload = generatePayload('contact', {
        contactName: 'Jane Doe',
        contactPhone: '+1 555 123 4567',
        contactEmail: 'jane@example.com',
      })
      expect(payload).toBe(
        'BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nTEL:+1 555 123 4567\nEMAIL:jane@example.com\nEND:VCARD',
      )
    })
  })

  describe('formatCameraName', () => {
    it('detects front camera from label', () => {
      expect(formatCameraName({ label: 'Front Facing Camera 0' }, 0, mockCameraLabels)).toBe('Front Camera')
    })

    it('detects ultrawide camera from label', () => {
      expect(formatCameraName({ label: '0.5x Ultra Wide Camera' }, 1, mockCameraLabels)).toBe('Ultra Wide')
    })

    it('detects telephoto camera from label', () => {
      expect(formatCameraName({ label: '3x Telephoto Optical' }, 2, mockCameraLabels)).toBe('Telephoto')
    })

    it('detects main camera from label', () => {
      expect(formatCameraName({ label: 'Back 0 Main Camera (1x)' }, 0, mockCameraLabels)).toBe('Main Camera')
    })

    it('cleans parenthetical details from generic device labels', () => {
      expect(formatCameraName({ label: 'Logitech C920 (046d:082d)' }, 0, mockCameraLabels)).toBe('Logitech C920')
    })

    it('falls back to indexed name when label is empty', () => {
      expect(formatCameraName({ label: '' }, 2, mockCameraLabels)).toBe('Camera 3')
    })
  })

  describe('clampZoom', () => {
    it('clamps zoom value within range', () => {
      expect(clampZoom(2.5, 1, 5)).toBe(2.5)
      expect(clampZoom(0.5, 1, 5)).toBe(1)
      expect(clampZoom(8, 1, 5)).toBe(5)
    })

    it('handles NaN gracefully', () => {
      expect(clampZoom(NaN, 1, 5)).toBe(1)
    })
  })

  describe('isWebUrl', () => {
    it('detects valid http and https urls', () => {
      expect(isWebUrl('https://example.com')).toBe(true)
      expect(isWebUrl('http://localhost:3000')).toBe(true)
      expect(isWebUrl('  https://test.pl  ')).toBe(true)
    })

    it('returns false for plain text or phone numbers', () => {
      expect(isWebUrl('Just some text')).toBe(false)
      expect(isWebUrl('+48 123 456 789')).toBe(false)
      expect(isWebUrl('')).toBe(false)
    })
  })
})
