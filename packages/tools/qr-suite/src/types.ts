import React from 'react'

export type Locale = 'en' | 'pl'

export interface ToolComponentProps {
  locale?: Locale
  setHeader?: (content: React.ReactNode) => void
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
}

export type QrMode = 'generate' | 'scan'

export type PayloadType = 'url' | 'wifi' | 'text' | 'contact'

export interface QrGeneratorState {
  payloadType: PayloadType
  urlValue: string
  textValue: string
  wifiSsid: string
  wifiPass: string
  contactName: string
  contactPhone: string
}

export interface CameraLabels {
  frontCamera: string
  ultraWide: string
  telephoto: string
  mainCamera: string
  cameraLabel: string
  cameraIndex: (n: number) => string
}

export interface ZoomCapabilities {
  min: number
  max: number
  step: number
}
