import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BoardLayout,
  Card,
  PillGroup,
  StatsHeader,
  Button,
  ControlsBar,
  formatStopwatchTime,
  formatTimerSeconds,
} from '@all/ui'
import type { ToolComponentProps, Lap, Mode, Phase, Preset } from './types'
import {
  getPresetConfig,
  computeLapsStats,
  recordNewLap,
  calculateIntervalTick,
  CIRCLE_CIRCUMFERENCE,
} from './utils/timerMath'
import { stopwatchTranslations } from './i18n'
import './styles/stopwatch-interval.css'

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

  // ─── Interval timer state ───
  const [preset, setPreset] = useState<Preset>(() => {
    try {
      return (localStorage.getItem('alltools:interval:preset') as Preset) || 'tabata'
    } catch {
      return 'tabata'
    }
  })
  const [workSec, setWorkSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:interval:workSec')
      return saved ? parseInt(saved, 10) : 20
    } catch {
      return 20
    }
  })
  const [restSec, setRestSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:interval:restSec')
      return saved ? parseInt(saved, 10) : 10
    } catch {
      return 10
    }
  })
  const [setsTotal, setSetsTotal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:interval:setsTotal')
      return saved ? parseInt(saved, 10) : 8
    } catch {
      return 8
    }
  })
  const [currentSet, setCurrentSet] = useState<number>(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [timeRemaining, setTimeRemaining] = useState<number>(20)
  const [dashOffset, setDashOffset] = useState<number>(0)
  const [intRunning, setIntRunning] = useState<boolean>(false)

  // Persist interval settings
  useEffect(() => {
    try {
      localStorage.setItem('alltools:interval:preset', preset)
      localStorage.setItem('alltools:interval:workSec', String(workSec))
      localStorage.setItem('alltools:interval:restSec', String(restSec))
      localStorage.setItem('alltools:interval:setsTotal', String(setsTotal))
    } catch {
      // Ignore
    }
  }, [preset, workSec, restSec, setsTotal])

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
  const phaseDurationRef = useRef<number>(workSec)
  const remainingSecAtPauseRef = useRef<number>(workSec)
  const lastBeepSecRef = useRef<number>(-1)
  const intTimerRef = useRef<number | null>(null)

  // Start / Resume interval
  const startInterval = () => {
    const isNew = phase === 'idle' || phase === 'finished'
    const newPhase: Phase = isNew ? 'work' : phase
    const newSet = isNew ? 1 : currentSet
    const targetDurationSec = isNew ? workSec : remainingSecAtPauseRef.current

    setPhase(newPhase)
    setCurrentSet(newSet)
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
    setCurrentSet(1)
    setTimeRemaining(workSec)
    setDashOffset(0)
    remainingSecAtPauseRef.current = workSec
    lastBeepSecRef.current = -1
  }

  const applyPreset = (p: Preset) => {
    resetInterval()
    setPreset(p)
    const config = getPresetConfig(p)
    setWorkSec(config.workSec)
    setRestSec(config.restSec)
    setSetsTotal(config.setsTotal)
    setTimeRemaining(config.workSec)
    remainingSecAtPauseRef.current = config.workSec
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
      if (tick.remainingSec <= 3 && tick.remainingSec >= 1 && tick.remainingSec !== lastBeepSecRef.current) {
        lastBeepSecRef.current = tick.remainingSec
        playBeep(520, 0.08)
      }

      if (tick.isExpired) {
        lastBeepSecRef.current = -1
        if (phase === 'work') {
          if (currentSet < setsTotal) {
            setPhase('rest')
            phaseDurationRef.current = restSec
            phaseStartRef.current = performance.now()
            playBeep(440, 0.2)
          } else {
            setPhase('finished')
            setIntRunning(false)
            playBeep(880, 0.25)
          }
        } else if (phase === 'rest') {
          setCurrentSet((s) => s + 1)
          setPhase('work')
          phaseDurationRef.current = workSec
          phaseStartRef.current = performance.now()
          playBeep(880, 0.25)
        }
      }
    }, 50)

    return () => {
      if (intTimerRef.current) clearInterval(intTimerRef.current)
    }
  }, [intRunning, phase, currentSet, setsTotal, workSec, restSec, playBeep])

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
            { key: 'set', label: t.set, value: `${currentSet}/${setsTotal}` },
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
  }, [setHeader, activeMode, laps, t, currentSet, setsTotal, phase, timeRemaining])

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
    { value: 'tabata' as const, label: 'Tabata (20/10)' },
    { value: 'hiit' as const, label: 'HIIT (45/15)' },
    { value: 'pomodoro' as const, label: 'Pomodoro (25/5)' },
  ]

  const { bestLapId, worstLapId } = computeLapsStats(laps)
  const isStopwatchActive = swRunning || elapsedMs > 0 || laps.length > 0

  return (
    <div className="stopwatch-root">
      <BoardLayout
        variant="wide"
        align="center"
        hud={
          <AnimatePresence mode="wait">
            <motion.div
              className="stopwatch-status"
              key={`${activeMode}-${phase}-${currentSet}-${locale}`}
              initial={!isEink ? { opacity: 0, y: 4 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={!isEink ? { opacity: 0, y: -4 } : undefined}
              transition={{ duration: isEink ? 0 : 0.15 }}
            >
              {activeMode === 'stopwatch' ? (
                <>
                  <div className="stopwatch-status-text">
                    {swRunning
                      ? t.timingInProgress
                      : elapsedMs > 0
                      ? t.paused
                      : t.readyToStart}
                  </div>
                  {laps.length > 0 && (
                    <div className="stopwatch-status-sub">
                      {t.recordedLaps(laps.length)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="stopwatch-status-text">
                    {phase === 'work'
                      ? t.workPhase
                      : phase === 'rest'
                      ? t.restPhase
                      : phase === 'finished'
                      ? t.workoutCompleted
                      : t.intervalTraining}
                  </div>
                  <div className="stopwatch-status-sub">
                    {preset.toUpperCase()} · {t.setOf(currentSet, setsTotal)}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        }
        board={
          <Card variant="outlined" className="stopwatch-card">
            {activeMode === 'stopwatch' ? (
              <div className="stopwatch-display-content">
                <div className="stopwatch-digits">
                  {formatStopwatchTime(elapsedMs)}
                </div>

                {isStopwatchActive && (
                  <div className="stopwatch-laps-container" ref={lapsContainerRef}>
                    <div className="stopwatch-laps-header">
                      <span>#</span>
                      <span>{t.lapTime}</span>
                      <span>{t.totalTime}</span>
                    </div>
                    {laps.length > 0 ? (
                      laps.map((lap) => {
                        const isBest = lap.id === bestLapId
                        const isWorst = lap.id === worstLapId
                        return (
                          <div
                            key={lap.id}
                            className={`stopwatch-lap-row ${
                              isBest ? 'stopwatch-lap-row--best' : ''
                            } ${isWorst ? 'stopwatch-lap-row--worst' : ''}`}
                          >
                            <span className="stopwatch-lap-id">
                              #{lap.id} {isBest ? '★' : ''}
                            </span>
                            <span className="stopwatch-lap-time">
                              {formatStopwatchTime(lap.lapTime)}
                            </span>
                            <span className="stopwatch-lap-total">
                              {formatStopwatchTime(lap.totalTime)}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="stopwatch-lap-empty">{t.lapHint}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="interval-ring-wrap">
                <svg viewBox="0 0 160 160" className="interval-ring-svg">
                  <circle
                    cx="80"
                    cy="80"
                    r="75"
                    fill="var(--all-surface, #ffffff)"
                    stroke="var(--all-border, #e5e7eb)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="75"
                    fill="none"
                    stroke="var(--all-text, #111827)"
                    strokeWidth="4"
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
                    {t.setLabel} {currentSet}/{setsTotal}
                  </span>
                </div>
              </div>
            )}
          </Card>
        }
        controls={
          <ControlsBar className="stopwatch-controls">
            {activeMode === 'stopwatch' ? (
              <>
                {!swRunning ? (
                  <Button variant="primary" size="sm" onClick={startSw}>
                    {t.start}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={pauseSw}>
                    {t.pause}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={recordLap}
                  disabled={!swRunning}
                >
                  {t.lap}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSw}
                  disabled={elapsedMs === 0}
                >
                  {t.reset}
                </Button>
                <PillGroup
                  options={modeOptions}
                  value={activeMode}
                  onChange={setActiveMode}
                  size="sm"
                />
              </>
            ) : (
              <>
                {!intRunning ? (
                  <Button variant="primary" size="sm" onClick={startInterval}>
                    {t.start}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={pauseInterval}>
                    {t.pause}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={resetInterval}>
                  {t.reset}
                </Button>
                <PillGroup
                  options={presetOptions}
                  value={preset}
                  onChange={applyPreset}
                  size="sm"
                />
                <PillGroup
                  options={modeOptions}
                  value={activeMode}
                  onChange={setActiveMode}
                  size="sm"
                />
              </>
            )}
          </ControlsBar>
        }
      />
    </div>
  )
}

export default StopwatchInterval
