export interface TiltResult {
  pitch: number
  roll: number
  isLevel: boolean
}

export interface ProtractorAngleResult {
  angle: number
  rad: number
  supplementary: number
}

export const CARDINALS = [
  { deg: 0, code: 'N', en: 'North', pl: 'Północ' },
  { deg: 45, code: 'NE', en: 'North-East', pl: 'Północny wschód' },
  { deg: 90, code: 'E', en: 'East', pl: 'Wschód' },
  { deg: 135, code: 'SE', en: 'South-East', pl: 'Południowy wschód' },
  { deg: 180, code: 'S', en: 'South', pl: 'Południe' },
  { deg: 225, code: 'SW', en: 'South-West', pl: 'Południowy zachód' },
  { deg: 270, code: 'W', en: 'West', pl: 'Zachód' },
  { deg: 315, code: 'NW', en: 'North-West', pl: 'Północny zachód' },
] as const

/** Checks if the current browser environment requires iOS DeviceOrientation permission call */
export function requiresOrientationPermission(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent !== 'undefined' &&
    typeof (window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission === 'function'
  )
}

/** Triggers permission request for DeviceOrientation (must be called inside user event handler) */
export async function requestOrientationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported'

  const devOrient = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
  if (devOrient && typeof devOrient.requestPermission === 'function') {
    try {
      const state = await devOrient.requestPermission()
      return state === 'granted' ? 'granted' : 'denied'
    } catch (err) {
      console.warn('DeviceOrientationEvent.requestPermission error:', err)
      return 'denied'
    }
  }

  return 'granted'
}

/** Calculates effective tilt angles taking calibration into account */
export function calculateCalibratedTilt(
  pitch: number,
  roll: number,
  calibratedPitch: number,
  calibratedRoll: number,
  tolerance: number = 0.5
): TiltResult {
  const effectivePitch = pitch - calibratedPitch
  const effectiveRoll = roll - calibratedRoll
  const isLevel = Math.abs(effectivePitch) < tolerance && Math.abs(effectiveRoll) < tolerance

  return {
    pitch: Math.round(effectivePitch * 10) / 10,
    roll: Math.round(effectiveRoll * 10) / 10,
    isLevel,
  }
}

/** Calculates minimal angle between two protractor arms, radians, and supplementary angle */
export function calculateAngleBetween(arm1: number, arm2: number): ProtractorAngleResult {
  const a1 = ((arm1 % 360) + 360) % 360
  const a2 = ((arm2 % 360) + 360) % 360
  const rawDiff = Math.abs(a2 - a1) % 360
  const angle = rawDiff > 180 ? 360 - rawDiff : rawDiff
  const rad = Math.round(((angle * Math.PI) / 180) * 1000) / 1000
  const supplementary = 180 - angle

  return {
    angle: Math.round(angle * 10) / 10,
    rad,
    supplementary: Math.round(supplementary * 10) / 10,
  }
}

/** Normalizes degree to 0-359 range */
export function normalizeHeading(deg: number): number {
  const rounded = Math.round(deg)
  return ((rounded % 360) + 360) % 360
}

/** Resolves cardinal direction label and code for a given heading */
export function getCardinalDirection(deg: number): { code: string; en: string; pl: string } {
  const normalized = normalizeHeading(deg)
  const index = Math.round(normalized / 45) % 8
  const match = CARDINALS[index]
  return {
    code: match.code,
    en: match.en,
    pl: match.pl,
  }
}
