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
  custom: {
    workSec: 30,
    restSec: 15,
    setsTotal: 5,
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

import type { IntervalStep } from '../types'

export function calculateTotalSets(steps: IntervalStep[]): number {
  return steps.reduce(
    (acc, step) => acc + Math.max(1, step.cycles || 1) * Math.max(1, step.sets || 1),
    0
  )
}

export function computeCumulativeSetNumber(
  stepIndex: number,
  cycle: number,
  set: number,
  steps: IntervalStep[]
): number {
  let count = 0
  for (let i = 0; i < stepIndex; i++) {
    const s = steps[i]
    count += Math.max(1, s.cycles || 1) * Math.max(1, s.sets || 1)
  }
  const curStep = steps[stepIndex]
  if (curStep) {
    count += (cycle - 1) * Math.max(1, curStep.sets || 1) + set
  }
  return count
}

export interface IntervalTransitionResult {
  stepIndex: number
  cycle: number
  set: number
  phase: 'work' | 'rest' | 'finished'
  durationSec: number
  isFinished: boolean
}

export function transitionIntervalPhase(
  stepIndex: number,
  cycle: number,
  set: number,
  phase: 'work' | 'rest',
  steps: IntervalStep[]
): IntervalTransitionResult {
  if (steps.length === 0) {
    return { stepIndex: 0, cycle: 1, set: 1, phase: 'finished', durationSec: 0, isFinished: true }
  }

  const currentStep = steps[stepIndex] || steps[0]
  const stepCycles = Math.max(1, currentStep.cycles || 1)
  const stepSets = Math.max(1, currentStep.sets || 1)

  if (phase === 'work') {
    if (set < stepSets) {
      return {
        stepIndex,
        cycle,
        set,
        phase: 'rest',
        durationSec: currentStep.restSec,
        isFinished: false,
      }
    } else if (cycle < stepCycles) {
      return {
        stepIndex,
        cycle,
        set,
        phase: 'rest',
        durationSec: currentStep.restSec,
        isFinished: false,
      }
    } else if (stepIndex < steps.length - 1) {
      return {
        stepIndex,
        cycle,
        set,
        phase: 'rest',
        durationSec: currentStep.restSec > 0 ? currentStep.restSec : steps[stepIndex + 1].restSec,
        isFinished: false,
      }
    } else {
      return {
        stepIndex,
        cycle,
        set,
        phase: 'finished',
        durationSec: 0,
        isFinished: true,
      }
    }
  } else {
    // Current phase was 'rest', transition to next 'work'
    if (set < stepSets) {
      return {
        stepIndex,
        cycle,
        set: set + 1,
        phase: 'work',
        durationSec: currentStep.workSec,
        isFinished: false,
      }
    } else if (cycle < stepCycles) {
      return {
        stepIndex,
        cycle: cycle + 1,
        set: 1,
        phase: 'work',
        durationSec: currentStep.workSec,
        isFinished: false,
      }
    } else if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1]
      return {
        stepIndex: stepIndex + 1,
        cycle: 1,
        set: 1,
        phase: 'work',
        durationSec: nextStep.workSec,
        isFinished: false,
      }
    } else {
      return {
        stepIndex,
        cycle,
        set,
        phase: 'finished',
        durationSec: 0,
        isFinished: true,
      }
    }
  }
}

