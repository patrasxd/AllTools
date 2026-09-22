import type { Lap, LapsStats, Preset, PresetConfig } from '../types'

export const PRESET_CONFIGS: Record<Preset, PresetConfig> = {
  tabata: {
    workSec: 20,
    restSec: 10,
    setsTotal: 8,
  },
  hiit: {
    workSec: 45,
    restSec: 15,
    setsTotal: 6,
  },
  pomodoro: {
    workSec: 1500,
    restSec: 300,
    setsTotal: 4,
  },
}

export function getPresetConfig(preset: Preset): PresetConfig {
  return PRESET_CONFIGS[preset] || PRESET_CONFIGS.tabata
}

export function computeLapsStats(laps: Lap[]): LapsStats {
  if (laps.length <= 1) {
    return {
      bestLapId: null,
      worstLapId: null,
      sortedLaps: [...laps],
    }
  }

  const sortedLaps = [...laps].sort((a, b) => a.lapTime - b.lapTime)
  return {
    bestLapId: sortedLaps[0].id,
    worstLapId: sortedLaps[sortedLaps.length - 1].id,
    sortedLaps,
  }
}

export function recordNewLap(
  currentLaps: Lap[],
  currentElapsedMs: number,
  lastLapTotalMs: number
): { lap: Lap; updatedLaps: Lap[] } {
  const lapDuration = Math.max(0, currentElapsedMs - lastLapTotalMs)
  const lap: Lap = {
    id: currentLaps.length + 1,
    lapTime: lapDuration,
    totalTime: currentElapsedMs,
  }
  return {
    lap,
    updatedLaps: [lap, ...currentLaps],
  }
}

export const CIRCLE_CIRCUMFERENCE = 471.2

export interface IntervalTickResult {
  remainingSec: number
  progress: number
  dashOffset: number
  isExpired: boolean
}

export function calculateIntervalTick(
  phaseStartMs: number,
  phaseDurationSec: number,
  nowMs: number
): IntervalTickResult {
  const phaseDurationMs = Math.max(1, phaseDurationSec * 1000)
  const elapsedMs = Math.max(0, nowMs - phaseStartMs)
  const remainingMs = Math.max(0, phaseDurationMs - elapsedMs)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const progress = Math.min(1, Math.max(0, remainingMs / phaseDurationMs))
  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - progress)
  const isExpired = remainingMs <= 0

  return {
    remainingSec,
    progress,
    dashOffset,
    isExpired,
  }
}
