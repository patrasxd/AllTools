import React from 'react'

export interface ToolComponentProps {
  /** Current language code ('en' | 'pl') */
  locale: 'en' | 'pl'
  /** Flag for E-Ink high-contrast zero-motion mode */
  isEink?: boolean
  /** Current active theme ('dark' | 'light' | 'e-ink-light' | 'e-ink-dark') */
  theme?: string
  /** Optional callback to render custom actions/widgets into the top shell header */
  setHeader?: (content: React.ReactNode) => void
  /** Optional callback for persisting arbitrary data */
  onSave?: (data: unknown) => void
}

export type SketchTool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'text'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'rounded-rect'
  | 'ellipse'
  | 'triangle'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export type ShapeFillMode = 'outline' | 'fill' | 'both'

export interface Point {
  x: number
  y: number
}

export interface CanvasDimensions {
  width: number
  height: number
}

export interface HistoryStep {
  imageData: ImageData
  width: number
  height: number
}

export interface PlacedImageOverlay {
  img: HTMLImageElement
  src: string
  x: number
  y: number
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

