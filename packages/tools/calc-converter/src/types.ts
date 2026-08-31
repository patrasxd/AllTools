import React from 'react'

export type Locale = 'en' | 'pl'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

export type ToolMode = 'calc' | 'convert'
export type CalcMode = 'standard' | 'scientific'

export interface UnitDefinition {
  id: string
  name: {
    en: string
    pl: string
  }
  symbol: string
  // Conversion factor relative to a base unit (e.g. 1 base unit = factor * this unit, or toBase / fromBase functions)
  toBase?: (val: number) => number
  fromBase?: (val: number) => number
  factor?: number // if linear, valueInBase = val * factor (or / factor depending on convention)
  keywords?: string[]
}

export interface UnitCategory {
  id: string
  name: {
    en: string
    pl: string
  }
  iconName?: string
  baseUnit: string
  units: UnitDefinition[]
  customConverter?: (inputVal: number | string, fromUnitId: string, toUnitId: string) => number | string
}

export interface CalcHistoryItem {
  id: string
  expression: string
  result: string
  timestamp: number
}
