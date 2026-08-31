import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
  formatStopwatchTime,
  formatTimerSeconds,
} from '@alltools/ui'
import './styles/stopwatch-interval.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  isEink?: boolean
  onSave?: (data: unknown) => void
  setHeader?: (content: React.ReactNode) => void
}

interface Lap {
  id: number
  lapTime: number
  totalTime: number
}

type Mode = 'stopwatch' | 'interval'
type Phase = 'idle' | 'work' | 'rest' | 'finished'
type Preset = 'tabata' | 'hiit' | 'pomodoro'

export function StopwatchInterval({ locale = 'en', isEink = false, setHeader }: ToolComponentProps) {
  const [activeMode, setActiveMode] = useState<Mode>('stopwatch')

  // Stopwatch state
  const [swRunning, setSwRunning] = useState<boolean>(false)
  const [elapsedMs, setElapsedMs] = useState<number>(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const swStartRef = useRef<number>(0)
  const swAnimRef = useRef<number | null>(null)
  const lastLapTotalRef = useRef<number>(0)
  const lapsContainerRef = useRef<HTMLDivElement | null>(null)

  // Interval timer state
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
  const [intRunning, setIntRunning] = useState<boolean>(false)

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

  const audioCtxRef = useRef<AudioContext | null>(null)
  const intTimerRef = useRef<number | null>(null)

  const isPl = locale === 'pl'

  // Stopwatch loop
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
    const lapDuration = cur - lastLapTotalRef.current
    lastLapTotalRef.current = cur
    setLaps((prev) => [{ id: prev.length + 1, lapTime: lapDuration, totalTime: cur }, ...prev])
  }

  // Scroll to top of laps table when a new lap is added
  useEffect(() => {
    if (lapsContainerRef.current) {
      lapsContainerRef.current.scrollTop = 0
    }
  }, [laps.length])

  // Audio beeps for intervals
  const playBeep = useCallback((freq: number, duration: number = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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

  // Interval timer tick
  useEffect(() => {
    if (!intRunning) {
      if (intTimerRef.current) clearInterval(intTimerRef.current)
      return
    }

    intTimerRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 4 && prev > 1) playBeep(520, 0.08)
        if (prev <= 1) {
          if (phase === 'work') {
            if (currentSet < setsTotal) {
              setPhase('rest')
              playBeep(440, 0.2)
              return restSec
            } else {
              setPhase('finished')
              setIntRunning(false)
              playBeep(880, 0.25)
              return 0
            }
          } else if (phase === 'rest') {
            setCurrentSet((s) => s + 1)
            setPhase('work')
            playBeep(880, 0.25)
            return workSec
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intTimerRef.current) clearInterval(intTimerRef.current)
    }
  }, [intRunning, phase, currentSet, setsTotal, workSec, restSec, playBeep])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    setIntRunning(false)
    setPhase('idle')
    setCurrentSet(1)
    if (p === 'tabata') { setWorkSec(20); setRestSec(10); setSetsTotal(8); setTimeRemaining(20) }
    if (p === 'hiit') { setWorkSec(45); setRestSec(15); setSetsTotal(6); setTimeRemaining(45) }
    if (p === 'pomodoro') { setWorkSec(1500); setRestSec(300); setSetsTotal(4); setTimeRemaining(1500) }
  }

  // Header stats injection
  const renderHeader = useCallback(() => {
    if (!setHeader) return
    if (activeMode === 'stopwatch') {
      const bestLap = laps.length > 1 ? [...laps].sort((a, b) => a.lapTime - b.lapTime)[0] : null
      setHeader(
        <StatsHeader
          label={isPl ? 'Stoper' : 'Stopwatch'}
          items={[
            { key: 'laps', label: isPl ? 'Okrążenia' : 'Laps', value: laps.length },
            { key: 'best', label: isPl ? 'Najlepsze' : 'Best', value: bestLap ? formatStopwatchTime(bestLap.lapTime) : '—' },
          ]}
          onReset={laps.length > 0 ? resetSw : undefined}
          resetAriaLabel={isPl ? 'Resetuj stoper' : 'Reset stopwatch'}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={isPl ? 'Interwały' : 'Intervals'}
          items={[
            { key: 'set', label: isPl ? 'Seria' : 'Set', value: `${currentSet}/${setsTotal}` },
            { key: 'phase', label: phase === 'work' ? (isPl ? 'Praca' : 'Work') : phase === 'rest' ? (isPl ? 'Przerwa' : 'Rest') : (isPl ? 'Gotowy' : 'Ready'), value: phase === 'finished' ? '—' : formatTimerSeconds(timeRemaining) },
          ]}
          onReset={() => {
            setIntRunning(false)
            setPhase('idle')
            setCurrentSet(1)
            setTimeRemaining(workSec)
          }}
          resetAriaLabel={isPl ? 'Resetuj interwały' : 'Reset intervals'}
        />
      )
    }
  }, [setHeader, activeMode, laps, isPl, currentSet, setsTotal, phase, timeRemaining, workSec])

  useEffect(() => {
    renderHeader()
  }, [renderHeader])

  useEffect(() => {
    return () => setHeader?.(null)
  }, [setHeader])

  const modeOptions = [
    { value: 'stopwatch' as const, label: isPl ? 'Stoper' : 'Stopwatch' },
    { value: 'interval' as const, label: isPl ? 'Interwały' : 'Intervals' },
  ]

  const presetOptions = [
    { value: 'tabata' as const, label: 'Tabata (20/10)' },
    { value: 'hiit' as const, label: 'HIIT (45/15)' },
    { value: 'pomodoro' as const, label: 'Pomodoro (25/5)' },
  ]

  const currentPhaseTotal = phase === 'rest' ? restSec : workSec
  const progress = currentPhaseTotal > 0 ? timeRemaining / currentPhaseTotal : 0
  const dashOffset = 471.2 * (1 - progress)

  const sortedLaps = laps.length > 1 ? [...laps].sort((a, b) => a.lapTime - b.lapTime) : []
  const bestLapId = sortedLaps.length > 1 ? sortedLaps[0].id : null
  const worstLapId = sortedLaps.length > 1 ? sortedLaps[sortedLaps.length - 1].id : null

  const isStopwatchActive = swRunning || elapsedMs > 0 || laps.length > 0

  return (
    <div className="stopwatch-root">
      {/* ── Status indicator (matching TicTacToe .ttt-status) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          className="stopwatch-status"
          key={`${activeMode}-${phase}-${currentSet}-${isPl}`}
          initial={!isEink ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={!isEink ? { opacity: 0, y: -6 } : undefined}
          transition={{ duration: 0.18 }}
        >
          {activeMode === 'stopwatch' ? (
            <>
              <div className="stopwatch-status-text">
                {swRunning ? (isPl ? 'Pomiar czasu w toku' : 'Timing in progress') : (elapsedMs > 0 ? (isPl ? 'Zatrzymany' : 'Paused') : (isPl ? 'Gotowy do startu' : 'Ready to start'))}
              </div>
              {laps.length > 0 && (
                <div className="stopwatch-status-sub">
                  {isPl ? `${laps.length} zarejestrowanych okrążeń` : `${laps.length} recorded laps`}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="stopwatch-status-text">
                {phase === 'work' ? (isPl ? 'Faza ćwiczenia' : 'Work phase') : phase === 'rest' ? (isPl ? 'Faza odpoczynku' : 'Rest phase') : phase === 'finished' ? (isPl ? 'Trening zakończony' : 'Workout completed') : (isPl ? 'Trening interwałowy' : 'Interval training')}
              </div>
              <div className="stopwatch-status-sub">
                {preset.toUpperCase()} · {isPl ? `Seria ${currentSet} z ${setsTotal}` : `Set ${currentSet} of ${setsTotal}`}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Center Display Area ── */}
      <div className="stopwatch-center-area">
        {activeMode === 'stopwatch' ? (
          <>
            <div className="stopwatch-digits">
              {formatStopwatchTime(elapsedMs)}
            </div>

            {isStopwatchActive && (
              <div className="stopwatch-laps-container" ref={lapsContainerRef}>
                <div className="stopwatch-laps-header">
                  <span>#</span>
                  <span>{isPl ? 'Czas okrążenia' : 'Lap time'}</span>
                  <span>{isPl ? 'Łączny czas' : 'Total time'}</span>
                </div>
                {laps.length > 0 ? (
                  laps.map((lap) => {
                    const isBest = lap.id === bestLapId
                    const isWorst = lap.id === worstLapId
                    return (
                      <div
                        key={lap.id}
                        className={`stopwatch-lap-row ${isBest ? 'stopwatch-lap-row--best' : ''} ${isWorst ? 'stopwatch-lap-row--worst' : ''}`}
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
                  <div className="stopwatch-lap-empty">
                    {isPl ? 'Kliknij „Okrążenie” podczas pomiaru' : 'Press "Lap" during timing'}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="interval-ring-wrap">
            <svg viewBox="0 0 160 160" className="interval-ring-svg">
              <circle cx="80" cy="80" r="75" fill="var(--surface)" stroke="var(--border)" strokeWidth="4" />
              <circle
                cx="80"
                cy="80"
                r="75"
                fill="none"
                stroke="var(--text)"
                strokeWidth="4"
                strokeDasharray="471.2"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: intRunning ? 'stroke-dashoffset 900ms linear' : 'none' }}
              />
            </svg>

            <div className="interval-ring-center">
              <span className="interval-phase-label">
                {phase === 'work' ? (isPl ? 'PRACA' : 'WORK') : phase === 'rest' ? (isPl ? 'PRZERWA' : 'REST') : (isPl ? 'GOTOWY' : 'READY')}
              </span>
              <span className="interval-time-digits">
                {formatTimerSeconds(timeRemaining)}
              </span>
              <span className="interval-set-badge">
                {isPl ? 'SERIA' : 'SET'} {currentSet}/{setsTotal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls Bar (Same width 460px as table) ── */}
      <ControlsBar className="stopwatch-controls">
        {activeMode === 'stopwatch' ? (
          <>
            {!swRunning ? (
              <GameButton variant="primary" onClick={startSw}>
                {isPl ? 'Start' : 'Start'}
              </GameButton>
            ) : (
              <GameButton variant="secondary" onClick={pauseSw}>
                {isPl ? 'Pauza' : 'Pause'}
              </GameButton>
            )}
            <GameButton variant="secondary" onClick={recordLap} disabled={!swRunning}>
              {isPl ? 'Okrążenie' : 'Lap'}
            </GameButton>
            <GameButton variant="ghost" onClick={resetSw} disabled={elapsedMs === 0}>
              {isPl ? 'Reset' : 'Reset'}
            </GameButton>
            <PillGroup
              options={modeOptions}
              value={activeMode}
              onChange={setActiveMode}
            />
          </>
        ) : (
          <>
            {!intRunning ? (
              <GameButton
                variant="primary"
                onClick={() => {
                  if (phase === 'idle' || phase === 'finished') {
                    setPhase('work')
                    setTimeRemaining(workSec)
                    setCurrentSet(1)
                  }
                  setIntRunning(true)
                  playBeep(660, 0.1)
                }}
              >
                {isPl ? 'Start' : 'Start'}
              </GameButton>
            ) : (
              <GameButton variant="secondary" onClick={() => setIntRunning(false)}>
                {isPl ? 'Pauza' : 'Pause'}
              </GameButton>
            )}
            <GameButton
              variant="ghost"
              onClick={() => {
                setIntRunning(false)
                setPhase('idle')
                setCurrentSet(1)
                setTimeRemaining(workSec)
              }}
            >
              {isPl ? 'Reset' : 'Reset'}
            </GameButton>
            <PillGroup
              options={presetOptions}
              value={preset}
              onChange={applyPreset}
            />
            <PillGroup
              options={modeOptions}
              value={activeMode}
              onChange={setActiveMode}
            />
          </>
        )}
      </ControlsBar>
    </div>
  )
}

export default StopwatchInterval
