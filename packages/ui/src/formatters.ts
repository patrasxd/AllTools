import { formatStopwatchTime, formatTime } from '@all/ui'

export { formatStopwatchTime }
export const formatTimerSeconds = formatTime

/**
 * Format angle in degrees
 */
export function formatAngle(deg: number, decimals: number = 1): string {
  return `${deg.toFixed(decimals)}°`
}

/**
 * Format frequency in Hz
 */
export function formatHz(hz: number, decimals: number = 1): string {
  return `${hz.toFixed(decimals)} Hz`
}
