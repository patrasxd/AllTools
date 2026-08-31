/**
 * Format milliseconds into MM:SS.ss
 */
export function formatStopwatchTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const hundredths = Math.floor((ms % 1000) / 10)

  const mStr = String(minutes).padStart(2, '0')
  const sStr = String(seconds).padStart(2, '0')
  const hStr = String(hundredths).padStart(2, '0')

  return `${mStr}:${sStr}.${hStr}`
}

/**
 * Format seconds into MM:SS
 */
export function formatTimerSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

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
