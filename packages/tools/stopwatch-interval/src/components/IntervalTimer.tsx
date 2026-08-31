import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ToolButton,
  PillGroup,
  IconPlay,
  IconPause,
  IconRotateCcw,
  IconVolume,
  IconVolumeMute,
  formatTimerSeconds,
} from '@alltools/ui'

export interface IntervalTimerProps {
  locale: 'en' | 'pl'
}

type Phase = 'idle' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'finished'

interface IntervalPreset {
  id: string
  name: { en: string; pl: string }
  work: number
  rest: number
  sets: number
  warmup?: number
}

const PRESETS: IntervalPreset[] = [
  {
    id: 'tabata',
    name: { en: 'Tabata (20/10)', pl: 'Tabata (20/10)' },
    work: 20,
    rest: 10,
    sets: 8,
    warmup: 5,
  },
  {
    id: 'hiit',
    name: { en: 'HIIT (45/15)', pl: 'HIIT (45/15)' },
    work: 45,
    rest: 15,
    sets: 6,
    warmup: 10,
  },
  {
    id: 'boxing',
    name: { en: 'Boxing (3m/1m)', pl: 'Boks (3m/1m)' },
    work: 180,
    rest: 60,
    sets: 4,
    warmup: 10,
  },
  {
    id: 'pomodoro',
    name: { en: 'Pomodoro (25/5)', pl: 'Pomodoro (25/5)' },
    work: 1500,
    rest: 300,
    sets: 4,
    warmup: 0,
  },
  {
    id: 'custom',
    name: { en: 'Custom', pl: 'Własny' },
    work: 30,
    rest: 15,
    sets: 5,
    warmup: 5,
  },
]

export const IntervalTimer: React.FC<IntervalTimerProps> = ({ locale }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tabata')
  const [workSec, setWorkSec] = useState<number>(20)
  const [restSec, setRestSec] = useState<number>(10)
  const [setsTotal, setSetsTotal] = useState<number>(8)
  const [warmupSec, setWarmupSec] = useState<number>(5)

  const [phase, setPhase] = useState<Phase>('idle')
  const [currentSet, setCurrentSet] = useState<number>(1)
  const [timeRemaining, setTimeRemaining] = useState<number>(20)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  // Apply preset
  const applyPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId)
    if (!p) return
    setSelectedPresetId(presetId)
    setWorkSec(p.work)
    setRestSec(p.rest)
    setSetsTotal(p.sets)
    setWarmupSec(p.warmup || 0)
    reset()
  }

  // Audio beeps synthesizer
  const playBeep = useCallback((freq: number, duration: number = 0.15, count: number = 1) => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }

      for (let i = 0; i < count; i++) {
        const osc = audioCtxRef.current.createOscillator()
        const gain = audioCtxRef.current.createGain()
        const start = audioCtxRef.current.currentTime + i * (duration + 0.05)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.2, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

        osc.connect(gain)
        gain.connect(audioCtxRef.current.destination)

        osc.start(start)
        osc.stop(start + duration)
      }
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled])

  // Timer Tick handler
  useEffect(() => {
    if (!isRunning) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      return
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        // Countdown sound cues at 3, 2, 1
        if (prev <= 4 && prev > 1) {
          playBeep(520, 0.08)
        }

        if (prev <= 1) {
          // Transition phase
          if (phase === 'warmup') {
            setPhase('work')
            playBeep(880, 0.25, 2)
            return workSec
          } else if (phase === 'work') {
            if (currentSet < setsTotal) {
              setPhase('rest')
              playBeep(440, 0.2)
              return restSec
            } else {
              setPhase('finished')
              setIsRunning(false)
              playBeep(880, 0.15, 3)
              return 0
            }
          } else if (phase === 'rest') {
            setCurrentSet((s) => s + 1)
            setPhase('work')
            playBeep(880, 0.25, 2)
            return workSec
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isRunning, phase, currentSet, setsTotal, workSec, restSec, playBeep])

  const start = () => {
    if (phase === 'idle' || phase === 'finished') {
      if (warmupSec > 0) {
        setPhase('warmup')
        setTimeRemaining(warmupSec)
      } else {
        setPhase('work')
        setTimeRemaining(workSec)
      }
      setCurrentSet(1)
    }
    setIsRunning(true)
    playBeep(660, 0.1)
  }

  const pause = () => {
    setIsRunning(false)
  }

  const reset = () => {
    setIsRunning(false)
    setPhase('idle')
    setCurrentSet(1)
    setTimeRemaining(warmupSec > 0 ? warmupSec : workSec)
  }

  // Calculate phase total duration for progress ring
  const currentPhaseTotal =
    phase === 'warmup'
      ? warmupSec
      : phase === 'work'
      ? workSec
      : phase === 'rest'
      ? restSec
      : workSec

  const progress = currentPhaseTotal > 0 ? (timeRemaining / currentPhaseTotal) : 0
  const strokeDashoffset = 565.48 * (1 - progress)

  const t = {
    start: locale === 'pl' ? 'Start' : 'Start',
    pause: locale === 'pl' ? 'Pauza' : 'Pause',
    reset: locale === 'pl' ? 'Zeruj' : 'Reset',
    round: locale === 'pl' ? 'Seria' : 'Set',
    of: locale === 'pl' ? 'z' : 'of',
    warmup: locale === 'pl' ? 'ROZGRZEWKA' : 'WARMUP',
    work: locale === 'pl' ? 'ĆWICZENIE' : 'WORK',
    rest: locale === 'pl' ? 'PRZERWA' : 'REST',
    finished: locale === 'pl' ? 'UKOŃCZONO!' : 'FINISHED!',
    idle: locale === 'pl' ? 'GOTOWY' : 'READY',
    workDuration: locale === 'pl' ? 'Czas pracy (s)' : 'Work time (s)',
    restDuration: locale === 'pl' ? 'Czas odpoczynku (s)' : 'Rest time (s)',
    roundsCount: locale === 'pl' ? 'Liczba serii' : 'Number of sets',
    sound: locale === 'pl' ? 'Dźwięk' : 'Sound',
  }

  const getPhaseName = () => {
    switch (phase) {
      case 'warmup':
        return t.warmup
      case 'work':
        return t.work
      case 'rest':
        return t.rest
      case 'finished':
        return t.finished
      default:
        return t.idle
    }
  }

  const presetOptions = PRESETS.map((p) => ({
    value: p.id,
    label: p.name[locale],
  }))

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto select-none">
      {/* Preset Pill Selector */}
      <div className="w-full flex justify-center">
        <PillGroup
          options={presetOptions}
          value={selectedPresetId}
          onChange={applyPreset}
          size="sm"
          className="flex-wrap"
        />
      </div>

      {/* Main Circular Timer Dial */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="8"
          />
          {/* Animated Countdown Progress Ring */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="var(--text)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="565.48"
            strokeDashoffset={strokeDashoffset}
            style={{ transition: isRunning ? 'stroke-dashoffset 900ms linear' : 'none' }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase border mb-1 ${
            phase === 'work'
              ? 'bg-text text-bg border-text font-bold'
              : phase === 'rest'
              ? 'border-border text-text-dim'
              : 'border-border text-text-muted'
          }`}>
            {getPhaseName()}
          </span>

          <div className="font-mono text-4xl font-bold tracking-tight text-text">
            {formatTimerSeconds(timeRemaining)}
          </div>

          <div className="text-xs font-mono text-text-dim mt-1">
            {t.round} {currentSet} {t.of} {setsTotal}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3 w-full justify-center">
        {!isRunning ? (
          <ToolButton
            variant="primary"
            size="lg"
            onClick={start}
            icon={<IconPlay size={18} />}
          >
            {t.start}
          </ToolButton>
        ) : (
          <ToolButton
            variant="secondary"
            size="lg"
            onClick={pause}
            icon={<IconPause size={18} />}
          >
            {t.pause}
          </ToolButton>
        )}

        <ToolButton
          variant="ghost"
          size="lg"
          onClick={reset}
          icon={<IconRotateCcw size={18} />}
        >
          {t.reset}
        </ToolButton>

        <ToolButton
          variant={soundEnabled ? 'secondary' : 'ghost'}
          size="lg"
          onClick={() => setSoundEnabled(!soundEnabled)}
          icon={soundEnabled ? <IconVolume size={18} /> : <IconVolumeMute size={18} />}
          title={t.sound}
        />
      </div>

      {/* Custom Duration Adjusters (when Custom preset is selected) */}
      {selectedPresetId === 'custom' && !isRunning && phase === 'idle' && (
        <div className="w-full p-4 rounded-lg border border-border bg-surface-2 grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="flex flex-col gap-1">
            <label className="text-text-dim">{t.workDuration}</label>
            <input
              type="number"
              min="5"
              max="600"
              step="5"
              value={workSec}
              onChange={(e) => {
                const v = Math.max(5, parseInt(e.target.value) || 5)
                setWorkSec(v)
                setTimeRemaining(v)
              }}
              className="p-1.5 rounded border border-border bg-surface text-text"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-dim">{t.restDuration}</label>
            <input
              type="number"
              min="5"
              max="300"
              step="5"
              value={restSec}
              onChange={(e) => setRestSec(Math.max(5, parseInt(e.target.value) || 5))}
              className="p-1.5 rounded border border-border bg-surface text-text"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-dim">{t.roundsCount}</label>
            <input
              type="number"
              min="1"
              max="50"
              value={setsTotal}
              onChange={(e) => setSetsTotal(Math.max(1, parseInt(e.target.value) || 1))}
              className="p-1.5 rounded border border-border bg-surface text-text"
            />
          </div>
        </div>
      )}
    </div>
  )
}
