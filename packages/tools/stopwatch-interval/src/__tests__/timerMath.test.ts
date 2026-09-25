import { describe, it, expect } from 'vitest'
import {
  getPresetConfig,
  computeLapsStats,
  recordNewLap,
  calculateIntervalTick,
  calculateTotalSets,
  computeCumulativeSetNumber,
  transitionIntervalPhase,
  CIRCLE_CIRCUMFERENCE,
} from '../utils/timerMath'
import type { Lap } from '../types'

describe('timerMath', () => {
  describe('getPresetConfig', () => {
    it('returns tabata configuration by default or explicitly', () => {
      const tabata = getPresetConfig('tabata')
      expect(tabata.workSec).toBe(20)
      expect(tabata.restSec).toBe(10)
      expect(tabata.setsTotal).toBe(8)
    })

    it('returns hiit configuration', () => {
      const hiit = getPresetConfig('hiit')
      expect(hiit.workSec).toBe(45)
      expect(hiit.restSec).toBe(15)
      expect(hiit.setsTotal).toBe(6)
    })

    it('returns pomodoro configuration', () => {
      const pomodoro = getPresetConfig('pomodoro')
      expect(pomodoro.workSec).toBe(1500)
      expect(pomodoro.restSec).toBe(300)
      expect(pomodoro.setsTotal).toBe(4)
    })
  })

  describe('computeLapsStats', () => {
    it('handles empty or single lap stats without highlighting best/worst', () => {
      expect(computeLapsStats([])).toEqual({
        bestLapId: null,
        worstLapId: null,
        sortedLaps: [],
      })

      const singleLap: Lap[] = [{ id: 1, lapTime: 5000, totalTime: 5000 }]
      expect(computeLapsStats(singleLap)).toEqual({
        bestLapId: null,
        worstLapId: null,
        sortedLaps: singleLap,
      })
    })

    it('identifies best and worst laps correctly for multiple laps', () => {
      const laps: Lap[] = [
        { id: 1, lapTime: 12000, totalTime: 12000 },
        { id: 2, lapTime: 8500, totalTime: 20500 }, // best (fastest)
        { id: 3, lapTime: 15400, totalTime: 35900 }, // worst (slowest)
      ]

      const stats = computeLapsStats(laps)
      expect(stats.bestLapId).toBe(2)
      expect(stats.worstLapId).toBe(3)
      expect(stats.sortedLaps.map((l) => l.id)).toEqual([2, 1, 3])
    })
  })

  describe('recordNewLap', () => {
    it('calculates lap duration and prepends new lap', () => {
      const initial: Lap[] = []
      const res1 = recordNewLap(initial, 4000, 0)
      expect(res1.lap).toEqual({ id: 1, lapTime: 4000, totalTime: 4000 })
      expect(res1.updatedLaps).toHaveLength(1)

      const res2 = recordNewLap(res1.updatedLaps, 9500, 4000)
      expect(res2.lap).toEqual({ id: 2, lapTime: 5500, totalTime: 9500 })
      expect(res2.updatedLaps).toHaveLength(2)
      expect(res2.updatedLaps[0].id).toBe(2)
      expect(res2.updatedLaps[1].id).toBe(1)
    })
  })

  describe('calculateIntervalTick', () => {
    it('calculates remaining seconds and progress accurately at start', () => {
      const start = 1000
      const tick = calculateIntervalTick(start, 20, 1000) // 0ms elapsed
      expect(tick.remainingSec).toBe(20)
      expect(tick.progress).toBe(1)
      expect(tick.dashOffset).toBeCloseTo(0, 1)
      expect(tick.isExpired).toBe(false)
    })

    it('calculates remaining seconds mid-phase without accumulating drift', () => {
      const start = 1000
      // 5500ms elapsed out of 20000ms -> remaining = 14500ms -> ceil = 15s
      const tick = calculateIntervalTick(start, 20, 6500)
      expect(tick.remainingSec).toBe(15)
      expect(tick.progress).toBeCloseTo(14500 / 20000, 2)
      expect(tick.dashOffset).toBeCloseTo(CIRCLE_CIRCUMFERENCE * (1 - 14500 / 20000), 1)
      expect(tick.isExpired).toBe(false)
    })

    it('flags expiration when elapsed time exceeds phase duration', () => {
      const start = 1000
      const tick = calculateIntervalTick(start, 20, 21500) // 20500ms elapsed
      expect(tick.remainingSec).toBe(0)
      expect(tick.progress).toBe(0)
      expect(tick.dashOffset).toBeCloseTo(CIRCLE_CIRCUMFERENCE, 1)
      expect(tick.isExpired).toBe(true)
    })
  })

  describe('multi-step and loop interval math', () => {
    const steps = [
      { id: '1', cycles: 2, sets: 8, workSec: 30, restSec: 15 }, // 2 x 8 = 16 sets
      { id: '2', cycles: 1, sets: 5, workSec: 20, restSec: 10 }, // 1 x 5 = 5 sets
    ]

    it('calculates total sets across all steps and loops (2x8 + 1x5 = 21 sets)', () => {
      const total = calculateTotalSets(steps)
      expect(total).toBe(21)
    })

    it('calculates cumulative set number accurately', () => {
      // Step 1, cycle 1, set 1 -> 1
      expect(computeCumulativeSetNumber(0, 1, 1, steps)).toBe(1)
      // Step 1, cycle 1, set 8 -> 8
      expect(computeCumulativeSetNumber(0, 1, 8, steps)).toBe(8)
      // Step 1, cycle 2, set 1 -> 9
      expect(computeCumulativeSetNumber(0, 2, 1, steps)).toBe(9)
      // Step 1, cycle 2, set 8 -> 16
      expect(computeCumulativeSetNumber(0, 2, 8, steps)).toBe(16)
      // Step 2, cycle 1, set 1 -> 17
      expect(computeCumulativeSetNumber(1, 1, 1, steps)).toBe(17)
      // Step 2, cycle 1, set 5 -> 21
      expect(computeCumulativeSetNumber(1, 1, 5, steps)).toBe(21)
    })

    it('transitions correctly between sets, cycles, and steps', () => {
      // Set 1 Work expires -> goes to rest
      const t1 = transitionIntervalPhase(0, 1, 1, 'work', steps)
      expect(t1.phase).toBe('rest')
      expect(t1.set).toBe(1)
      expect(t1.durationSec).toBe(15)

      // Set 1 Rest expires -> goes to Set 2 Work
      const t2 = transitionIntervalPhase(0, 1, 1, 'rest', steps)
      expect(t2.phase).toBe('work')
      expect(t2.set).toBe(2)
      expect(t2.durationSec).toBe(30)

      // Cycle 1 Set 8 Rest expires -> transitions to Cycle 2 Set 1 Work
      const tCycle = transitionIntervalPhase(0, 1, 8, 'rest', steps)
      expect(tCycle.stepIndex).toBe(0)
      expect(tCycle.cycle).toBe(2)
      expect(tCycle.set).toBe(1)
      expect(tCycle.phase).toBe('work')

      // Cycle 2 Set 8 Rest expires -> transitions to Step 2 Cycle 1 Set 1 Work
      const tStep = transitionIntervalPhase(0, 2, 8, 'rest', steps)
      expect(tStep.stepIndex).toBe(1)
      expect(tStep.cycle).toBe(1)
      expect(tStep.set).toBe(1)
      expect(tStep.phase).toBe('work')
      expect(tStep.durationSec).toBe(20)

      // Final step Set 5 Rest expires -> finished
      const tDone = transitionIntervalPhase(1, 1, 5, 'work', steps)
      expect(tDone.phase).toBe('finished')
      expect(tDone.isFinished).toBe(true)
    })
  })
})
