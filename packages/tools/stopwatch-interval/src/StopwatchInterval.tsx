import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react'
import {
  BoardLayout,
  PillGroup,
  StatsHeader,
  Button,
  ControlsBar,
  Dialog,
  TrashIcon,
  formatStopwatchTime,
  formatTimerSeconds,
} from '@all/ui'
import type { ToolComponentProps, Lap, Mode, Phase, Preset, IntervalStep } from './types'
import {
  getPresetConfig,
  computeLapsStats,
  recordNewLap,
  calculateIntervalTick,
  calculateTotalSets,
  computeCumulativeSetNumber,
  transitionIntervalPhase,
  CIRCLE_CIRCUMFERENCE,
} from './utils/timerMath'
import { stopwatchTranslations } from './i18n'
import './styles/stopwatch-interval.css'

interface NumberStepperProps {
  id?: string
  label: string
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

function NumberStepper({
  id: explicitId,
  label,
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  unit,
}: NumberStepperProps) {
  const generatedId = useId()
  const id = explicitId || generatedId
  const [draft, setDraft] = useState<string>(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const handleDecrement = () => {
    const next = Math.max(min, value - step)
    onChange(next)
    setDraft(String(next))
  }

  const handleIncrement = () => {
    const next = Math.min(max, value + step)
    onChange(next)
    setDraft(String(next))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
  }

  const handleBlur = () => {
    const parsed = parseInt(draft, 10)
    if (isNaN(parsed) || parsed < min) {
      onChange(min)
      setDraft(String(min))
    } else if (parsed > max) {
      onChange(max)
      setDraft(String(max))
    } else {
      onChange(parsed)
      setDraft(String(parsed))
    }
  }

  return (
    <div className="interval-stepper-field">
      <label htmlFor={id} className="interval-stepper-label">
        {label}
      </label>
      <div className="interval-stepper-control">
        <button
          type="button"
          className="interval-stepper-btn interval-stepper-btn--dec"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <div className="interval-stepper-input-wrapper">
          <input
            id={id}
            type="number"
            className="interval-stepper-input"
            value={draft}
            onChange={handleInputChange}
            onBlur={handleBlur}
            min={min}
            max={max}
            step={step}
            aria-label={label}
          />
          {unit && <span className="interval-stepper-unit">{unit}</span>}
        </div>
        <button
          type="button"
          className="interval-stepper-btn interval-stepper-btn--inc"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function StopwatchInterval({
  locale = 'en',
  isEink = false,
  setHeader,
}: ToolComponentProps) {
  const [activeMode, setActiveMode] = useState<Mode>('stopwatch')

  // ─── Stopwatch state ───
  const [swRunning, setSwRunning] = useState<boolean>(false)
  const [elapsedMs, setElapsedMs] = useState<number>(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const swStartRef = useRef<number>(0)
  const swAnimRef = useRef<number | null>(null)
  const lastLapTotalRef = useRef<number>(0)
  const lapsContainerRef = useRef<HTMLDivElement | null>(null)

  // ─── Custom Interval State & LocalStorage ───
  const [customSteps, setCustomSteps] = useState<IntervalStep[]>(() => {
    try {
      const saved = localStorage.getItem('alltools:interval:customSteps')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      // Backward compatibility with previous single custom values
      const oldWork = localStorage.getItem('alltools:interval:customWorkSec')
      const oldRest = localStorage.getItem('alltools:interval:customRestSec')
      const oldSets = localStorage.getItem('alltools:interval:customSetsTotal')
      if (oldWork || oldRest || oldSets) {
        return [
          {
            id: 'step-1',
            cycles: 1,
            sets: oldSets ? parseInt(oldSets, 10) : 5,
            workSec: oldWork ? parseInt(oldWork, 10) : 30,
            restSec: oldRest ? parseInt(oldRest, 10) : 15,
          },
        ]
      }
    } catch {}
    return [
      { id: 'step-1', cycles: 2, sets: 8, workSec: 30, restSec: 15 },
      { id: 'step-2', cycles: 1, sets: 5, workSec: 20, restSec: 10 },
    ]
  })

  // ─── Interval timer state ───
  const [preset, setPreset] = useState<Preset>(() => {
    try {
      return (localStorage.getItem('alltools:interval:preset') as Preset) || 'tabata'
    } catch {
      return 'tabata'
    }
  })

  const activeSteps: IntervalStep[] = useMemo(() => {
    if (preset === 'custom') {
      return customSteps.length > 0
        ? customSteps
        : [{ id: 'step-1', cycles: 1, sets: 5, workSec: 30, restSec: 15 }]
    }
    const config = getPresetConfig(preset)
    return [
      {
        id: preset,
        cycles: 1,
        sets: config.setsTotal,
        workSec: config.workSec,
        restSec: config.restSec,
      },
    ]
  }, [preset, customSteps])

  const totalWorkoutSets = useMemo(() => calculateTotalSets(activeSteps), [activeSteps])

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [currentCycle, setCurrentCycle] = useState<number>(1)
  const [currentSet, setCurrentSet] = useState<number>(1)
  const [phase, setPhase] = useState<Phase>('idle')

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0] || {
    cycles: 1,
    sets: 5,
    workSec: 30,
    restSec: 15,
  }

  const cumulativeSet = useMemo(
    () => computeCumulativeSetNumber(currentStepIndex, currentCycle, currentSet, activeSteps),
    [currentStepIndex, currentCycle, currentSet, activeSteps]
  )

  const [timeRemaining, setTimeRemaining] = useState<number>(activeSteps[0]?.workSec ?? 20)
  const [dashOffset, setDashOffset] = useState<number>(0)
  const [intRunning, setIntRunning] = useState<boolean>(false)

  // Custom interval dialog state
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState<boolean>(false)
  const [formSteps, setFormSteps] = useState<IntervalStep[]>([])

  // Persist interval settings
  useEffect(() => {
    try {
      localStorage.setItem('alltools:interval:preset', preset)
      localStorage.setItem('alltools:interval:customSteps', JSON.stringify(customSteps))
    } catch {
      // Ignore
    }
  }, [preset, customSteps])

  // Audio cues
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playBeep = useCallback((freq: number, duration: number = 0.15) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()

      const osc = audioCtxRef.current.createOscillator()
      const gain = audioCtxRef.current.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime)
      gain.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration)
      osc.connect(gain)
      gain.connect(audioCtxRef.current.destination)
      osc.start()
      osc.stop(audioCtxRef.current.currentTime + duration)
    } catch {
      // Audio not available
    }
  }, [])

  const t = stopwatchTranslations[locale] || stopwatchTranslations.en

  // ─── Stopwatch loop (drift-free via performance.now) ───
  const updateSw = useCallback(() => {
    setElapsedMs(performance.now() - swStartRef.current)
    swAnimRef.current = requestAnimationFrame(updateSw)
  }, [])

  const startSw = () => {
    if (!swRunning) {
      swStartRef.current = performance.now() - elapsedMs
      setSwRunning(true)
      swAnimRef.current = requestAnimationFrame(updateSw)
    }
  }

  const pauseSw = () => {
    if (swRunning && swAnimRef.current) {
      cancelAnimationFrame(swAnimRef.current)
      swAnimRef.current = null
      setSwRunning(false)
    }
  }

  const resetSw = () => {
    if (swAnimRef.current) cancelAnimationFrame(swAnimRef.current)
    setSwRunning(false)
    setElapsedMs(0)
    setLaps([])
    lastLapTotalRef.current = 0
  }

  const recordLap = () => {
    if (!swRunning) return
    const cur = elapsedMs
    const { updatedLaps } = recordNewLap(laps, cur, lastLapTotalRef.current)
    lastLapTotalRef.current = cur
    setLaps(updatedLaps)
  }


  useEffect(() => {
    if (lapsContainerRef.current) {
      lapsContainerRef.current.scrollTop = 0
    }
  }, [laps.length])

  // ─── Interval loop (drift-free via reference timestamps) ───
  const phaseStartRef = useRef<number>(0)
  const phaseDurationRef = useRef<number>(activeSteps[0]?.workSec ?? 20)
  const remainingSecAtPauseRef = useRef<number>(activeSteps[0]?.workSec ?? 20)
  const lastBeepSecRef = useRef<number>(-1)
  const intTimerRef = useRef<number | null>(null)

  // Start / Resume interval
  const startInterval = () => {
    const isNew = phase === 'idle' || phase === 'finished'
    const newPhase: Phase = isNew ? 'work' : phase
    const targetDurationSec = isNew ? currentStep.workSec : remainingSecAtPauseRef.current

    if (isNew) {
      setCurrentStepIndex(0)
      setCurrentCycle(1)
      setCurrentSet(1)
    }

    setPhase(newPhase)
    phaseStartRef.current = performance.now()
    phaseDurationRef.current = targetDurationSec
    lastBeepSecRef.current = -1
    setIntRunning(true)
    playBeep(660, 0.1)
  }

  const pauseInterval = () => {
    if (intTimerRef.current) {
      clearInterval(intTimerRef.current)
      intTimerRef.current = null
    }
    setIntRunning(false)
    remainingSecAtPauseRef.current = timeRemaining
  }

  const resetInterval = () => {
    if (intTimerRef.current) {
      clearInterval(intTimerRef.current)
      intTimerRef.current = null
    }
    setIntRunning(false)
    setPhase('idle')
    setCurrentStepIndex(0)
    setCurrentCycle(1)
    setCurrentSet(1)
    const initialDuration = activeSteps[0]?.workSec ?? 20
    setTimeRemaining(initialDuration)
    setDashOffset(0)
    remainingSecAtPauseRef.current = initialDuration
    lastBeepSecRef.current = -1
  }

  const applyPreset = (p: Preset) => {
    resetInterval()
    setPreset(p)
  }

  const openCustomDialog = () => {
    setFormSteps(
      customSteps.length > 0
        ? JSON.parse(JSON.stringify(customSteps))
        : [
            { id: 'step-1', cycles: 2, sets: 8, workSec: 30, restSec: 15 },
            { id: 'step-2', cycles: 1, sets: 5, workSec: 20, restSec: 10 },
          ]
    )
    setIsCustomDialogOpen(true)
  }

  const handleUpdateStep = (
    index: number,
    field: keyof IntervalStep,
    value: number
  ) => {
    setFormSteps((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleAddStep = () => {
    setFormSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        cycles: 1,
        sets: 5,
        workSec: 30,
        restSec: 15,
      },
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (formSteps.length <= 1) return
    setFormSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveCustom = (e?: React.FormEvent) => {
    e?.preventDefault()
    const cleaned: IntervalStep[] = formSteps.map((s, idx) => ({
      id: s.id || `step-${idx + 1}`,
      cycles: Math.max(1, Math.min(99, Number(s.cycles) || 1)),
      sets: Math.max(1, Math.min(99, Number(s.sets) || 1)),
      workSec: Math.max(1, Math.min(3600, Number(s.workSec) || 30)),
      restSec: Math.max(0, Math.min(1800, Number(s.restSec) || 0)),
    }))

    setCustomSteps(cleaned)
    try {
      localStorage.setItem('alltools:interval:customSteps', JSON.stringify(cleaned))
      if (cleaned[0]) {
        localStorage.setItem('alltools:interval:customWorkSec', String(cleaned[0].workSec))
        localStorage.setItem('alltools:interval:customRestSec', String(cleaned[0].restSec))
        localStorage.setItem('alltools:interval:customSetsTotal', String(cleaned[0].sets))
      }
    } catch {}

    setIsCustomDialogOpen(false)
    resetInterval()
    setPreset('custom')
  }

  useEffect(() => {
    if (!intRunning) {
      if (intTimerRef.current) clearInterval(intTimerRef.current)
      return
    }

    intTimerRef.current = window.setInterval(() => {
      const now = performance.now()
      const tick = calculateIntervalTick(
        phaseStartRef.current,
        phaseDurationRef.current,
        now
      )

      setTimeRemaining(tick.remainingSec)
      setDashOffset(tick.dashOffset)

      // Audio beeps for final 3, 2, 1 countdown
      if (
        tick.remainingSec <= 3 &&
        tick.remainingSec >= 1 &&
        tick.remainingSec !== lastBeepSecRef.current
      ) {
        lastBeepSecRef.current = tick.remainingSec
        playBeep(520, 0.08)
      }

      if (tick.isExpired) {
        lastBeepSecRef.current = -1
        const next = transitionIntervalPhase(
          currentStepIndex,
          currentCycle,
          currentSet,
          phase as 'work' | 'rest',
          activeSteps
        )

        setCurrentStepIndex(next.stepIndex)
        setCurrentCycle(next.cycle)
        setCurrentSet(next.set)
        setPhase(next.phase)

        if (next.isFinished) {
          setIntRunning(false)
          playBeep(880, 0.3)
        } else {
          phaseDurationRef.current = next.durationSec
          phaseStartRef.current = performance.now()
          playBeep(next.phase === 'work' ? 880 : 440, 0.2)
        }
      }
    }, 50)

    return () => {
      if (intTimerRef.current) clearInterval(intTimerRef.current)
    }
  }, [
    intRunning,
    phase,
    currentStepIndex,
    currentCycle,
    currentSet,
    activeSteps,
    playBeep,
  ])

  // ─── Header Stats Injection ───
  const renderHeader = useCallback(() => {
    if (!setHeader) return
    if (activeMode === 'stopwatch') {
      const { bestLapId, sortedLaps } = computeLapsStats(laps)
      const bestLap = bestLapId ? sortedLaps[0] : null
      setHeader(
        <StatsHeader
          items={[
            { key: 'laps', label: t.laps, value: laps.length },
            {
              key: 'best',
              label: t.best,
              value: bestLap ? formatStopwatchTime(bestLap.lapTime) : '—',
            },
          ]}
          onReset={laps.length > 0 ? resetSw : undefined}
          resetAriaLabel={t.resetStopwatchAria}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          items={[
            {
              key: 'set',
              label: t.set,
              value: `${cumulativeSet}/${totalWorkoutSets}`,
            },
            {
              key: 'phase',
              label:
                phase === 'work'
                  ? t.phaseWork
                  : phase === 'rest'
                  ? t.phaseRest
                  : t.phaseReady,
              value:
                phase === 'finished' ? '—' : formatTimerSeconds(timeRemaining),
            },
          ]}
          onReset={resetInterval}
          resetAriaLabel={t.resetIntervalsAria}
        />
      )
    }
  }, [
    setHeader,
    activeMode,
    laps,
    t,
    cumulativeSet,
    totalWorkoutSets,
    phase,
    timeRemaining,
  ])

  useEffect(() => {
    renderHeader()
  }, [renderHeader])

  useEffect(() => {
    return () => setHeader?.(null)
  }, [setHeader])

  const modeOptions = [
    { value: 'stopwatch' as const, label: t.stopwatch },
    { value: 'interval' as const, label: t.intervals },
  ]

  const presetOptions = [
    { value: 'tabata' as const, label: 'Tabata' },
    { value: 'hiit' as const, label: 'HIIT' },
    { value: 'pomodoro' as const, label: 'Pomodoro' },
    { value: 'custom' as const, label: t.custom },
  ]

  const { bestLapId, worstLapId } = computeLapsStats(laps)

  return (
    <div className="stopwatch-root">
      <BoardLayout
        variant="stacked"
        align="top"
        hud={
          <div className="stopwatch-status">
            <div className="stopwatch-status-text">
              {activeMode === 'stopwatch' ? (
                swRunning
                  ? t.timingInProgress
                  : elapsedMs > 0
                  ? t.paused
                  : t.readyToStart
              ) : (
                `${
                  phase === 'work'
                    ? t.workPhase
                    : phase === 'rest'
                    ? t.restPhase
                    : phase === 'finished'
                    ? t.workoutCompleted
                    : t.intervalTraining
                } · ${
                  activeSteps.length > 1 || (activeSteps[0]?.cycles ?? 1) > 1
                    ? `${activeSteps.length > 1 ? `${t.step} ${currentStepIndex + 1}/${activeSteps.length} · ` : ''}${
                        (currentStep.cycles || 1) > 1
                          ? `${(t as any).cycle || (t as any).loop || 'Loop'} ${currentCycle}/${currentStep.cycles || 1} · `
                          : ''
                      }${t.set} ${currentSet}/${currentStep.sets}`
                    : t.setOf(currentSet, totalWorkoutSets)
                }`
              )}
            </div>
          </div>
        }
        board={
          <div className="stopwatch-board">
            {activeMode === 'stopwatch' ? (
              <>
                {/* Digits Display - Always at the top */}
                <div className="stopwatch-display">
                  <div className="stopwatch-digits" aria-live="off">
                    {formatStopwatchTime(elapsedMs)}
                  </div>
                </div>

                {/* Laps List - Appears once a lap is recorded */}
                {laps.length > 0 && (
                  <div className="stopwatch-laps-wrapper" ref={lapsContainerRef}>
                    <div className="stopwatch-laps-header">
                      <span className="stopwatch-lap-col-id">#</span>
                      <span className="stopwatch-lap-col-time">{t.lapTime}</span>
                      <span className="stopwatch-lap-col-total">{t.totalTime}</span>
                    </div>
                    <div className="stopwatch-laps-list">
                      {laps.map((lap) => {
                        const isBest = lap.id === bestLapId
                        const isWorst = lap.id === worstLapId
                        return (
                          <div
                            key={lap.id}
                            className={`stopwatch-lap-row ${
                              isBest ? 'stopwatch-lap-row--best' : ''
                            } ${isWorst ? 'stopwatch-lap-row--worst' : ''}`}
                          >
                            <span className="stopwatch-lap-col-id">
                              #{lap.id} {isBest ? '★' : ''}
                            </span>
                            <span className="stopwatch-lap-col-time">
                              {formatStopwatchTime(lap.lapTime)}
                            </span>
                            <span className="stopwatch-lap-col-total">
                              {formatStopwatchTime(lap.totalTime)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Two Big Circular Action Buttons directly above bottom ControlsBar */}
                <div className="stopwatch-primary-actions">
                  {!swRunning ? (
                    <Button
                      variant={elapsedMs > 0 ? 'outline' : 'secondary'}
                      size="xl"
                      shape="circle"
                      onClick={elapsedMs > 0 ? resetSw : recordLap}
                      disabled={elapsedMs === 0}
                      aria-label={elapsedMs > 0 ? t.reset : t.lap}
                    >
                      {elapsedMs > 0 ? t.reset : t.lap}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="xl"
                      shape="circle"
                      onClick={recordLap}
                      aria-label={t.lap}
                    >
                      {t.lap}
                    </Button>
                  )}

                  {!swRunning ? (
                    <Button
                      variant="success"
                      size="xl"
                      shape="circle"
                      onClick={startSw}
                      aria-label={t.start}
                    >
                      {t.start}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="xl"
                      shape="circle"
                      onClick={pauseSw}
                      aria-label={t.pause}
                    >
                      {t.pause}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Interval Countdown Ring */}
                <div className="interval-display">
                  <div className="interval-ring-wrap">
                    <svg viewBox="0 0 160 160" className="interval-ring-svg">
                      <circle
                        cx="80"
                        cy="80"
                        r="75"
                        fill="var(--all-surface, #141414)"
                        stroke="var(--all-border, #262626)"
                        strokeWidth="5"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="75"
                        fill="none"
                        stroke={
                          phase === 'work'
                            ? 'var(--all-success, #34d399)'
                            : phase === 'rest'
                            ? 'var(--all-warning, #fbbf24)'
                            : 'var(--all-text, #efefef)'
                        }
                        strokeWidth="5"
                        strokeDasharray={CIRCLE_CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        style={{
                          transition:
                            intRunning && !isEink
                              ? 'stroke-dashoffset 80ms linear'
                              : 'none',
                        }}
                      />
                    </svg>

                    <div className="interval-ring-center">
                      <span className="interval-phase-label">
                        {phase === 'work'
                          ? t.work
                          : phase === 'rest'
                          ? t.rest
                          : t.ready}
                      </span>
                      <span className="interval-time-digits">
                        {formatTimerSeconds(timeRemaining)}
                      </span>
                      <span className="interval-set-badge">
                        {activeSteps.length > 1 || (activeSteps[0]?.cycles ?? 1) > 1
                          ? `${t.stepNumber(currentStepIndex + 1)} · ${t.setLabel} ${currentSet}/${currentStep.sets}`
                          : `${t.setLabel} ${currentSet}/${totalWorkoutSets}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interval Summary Card with Configure Button */}
                <div className="interval-summary-card">
                  <span>
                    {preset === 'custom' && activeSteps.length > 1
                      ? activeSteps
                          .map((s) => `${s.cycles}×${s.sets} (${s.workSec}s/${s.restSec}s)`)
                          .join(' + ')
                      : `${activeSteps[0]?.workSec ?? 30}s ${t.work} · ${activeSteps[0]?.restSec ?? 15}s ${t.rest} · ${totalWorkoutSets} ${t.round}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="interval-edit-btn"
                    onClick={openCustomDialog}
                  >
                    {t.editCustom}
                  </Button>
                </div>

                {/* Two Big Circular Action Buttons directly above bottom ControlsBar */}
                <div className="stopwatch-primary-actions">
                  <Button
                    variant="outline"
                    size="xl"
                    shape="circle"
                    onClick={resetInterval}
                    disabled={!intRunning && phase === 'idle'}
                    aria-label={t.reset}
                  >
                    {t.reset}
                  </Button>

                  {!intRunning ? (
                    <Button
                      variant="success"
                      size="xl"
                      shape="circle"
                      onClick={startInterval}
                      aria-label={t.start}
                    >
                      {t.start}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="xl"
                      shape="circle"
                      onClick={pauseInterval}
                      aria-label={t.pause}
                    >
                      {t.pause}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        }
        controls={
          <ControlsBar className="stopwatch-controls">
            {/* Secondary actions & presets row (above nav) */}
            {activeMode === 'interval' && (
              <div className="stopwatch-controls-row">
                <PillGroup
                  options={presetOptions}
                  value={preset}
                  onChange={applyPreset}
                  size="sm"
                />
              </div>
            )}

            {/* Bottom-most row: Mode nav switcher (always the last item) */}
            <div className="stopwatch-controls-nav">
              <PillGroup
                options={modeOptions}
                value={activeMode}
                onChange={setActiveMode}
                size="sm"
              />
            </div>
          </ControlsBar>
        }
      />

      {/* Custom Interval Configuration Dialog */}
      <Dialog
        open={isCustomDialogOpen}
        onClose={() => setIsCustomDialogOpen(false)}
        title={t.customInterval}
        maxWidth="sm"
      >
        <form className="custom-interval-form" onSubmit={handleSaveCustom}>
          <div className="custom-steps-list">
            {formSteps.map((step, idx) => {
              const stepTotalSets = (step.cycles || 1) * (step.sets || 1)
              return (
                <div key={step.id || idx} className="custom-step-card">
                  <div className="custom-step-header">
                    <span className="custom-step-title">{t.stepNumber(idx + 1)}</span>
                    {formSteps.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={<TrashIcon width={14} height={14} />}
                        onClick={() => handleRemoveStep(idx)}
                      >
                        {t.removeStep}
                      </Button>
                    )}
                  </div>

                  <div className="custom-step-grid">
                    <NumberStepper
                      label={t.loops}
                      value={step.cycles}
                      onChange={(val) => handleUpdateStep(idx, 'cycles', val)}
                      min={1}
                      max={99}
                      step={1}
                    />
                    <NumberStepper
                      label={t.setsPerLoop}
                      value={step.sets}
                      onChange={(val) => handleUpdateStep(idx, 'sets', val)}
                      min={1}
                      max={99}
                      step={1}
                    />
                    <NumberStepper
                      label={t.workDuration}
                      value={step.workSec}
                      onChange={(val) => handleUpdateStep(idx, 'workSec', val)}
                      min={1}
                      max={3600}
                      step={5}
                      unit="s"
                    />
                    <NumberStepper
                      label={t.restDuration}
                      value={step.restSec}
                      onChange={(val) => handleUpdateStep(idx, 'restSec', val)}
                      min={0}
                      max={1800}
                      step={5}
                      unit="s"
                    />
                  </div>

                  <div className="custom-step-summary-pill">
                    {t.stepSummary(step.cycles || 1, step.sets || 1, stepTotalSets)}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>
              + {t.addStep}
            </Button>
          </div>

          {/* Overall Routine Summary */}
          <div className="custom-interval-routine-summary">
            <span>{t.totalRoutine}</span>
            <span>{t.routineSets(formSteps.length, calculateTotalSets(formSteps))}</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--all-space-2, 0.5rem)',
              justifyContent: 'flex-end',
              marginTop: '0.5rem',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomDialogOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              onClick={handleSaveCustom}
            >
              {t.save}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export default StopwatchInterval
