import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ToolButton,
  IconPlay,
  IconPause,
  IconRotateCcw,
  IconCopy,
  IconCheck,
  formatStopwatchTime,
} from '@alltools/ui'

export interface StopwatchProps {
  locale: 'en' | 'pl'
}

export interface Lap {
  id: number
  lapTime: number
  totalTime: number
}

export const Stopwatch: React.FC<StopwatchProps> = ({ locale }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [elapsedMs, setElapsedMs] = useState<number>(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const [copied, setCopied] = useState<boolean>(false)

  const startTimeRef = useRef<number>(0)
  const animFrameRef = useRef<number | null>(null)
  const lastLapTotalRef = useRef<number>(0)

  const updateTimer = useCallback(() => {
    const now = performance.now()
    setElapsedMs(now - startTimeRef.current)
    animFrameRef.current = requestAnimationFrame(updateTimer)
  }, [])

  const start = () => {
    if (!isRunning) {
      startTimeRef.current = performance.now() - elapsedMs
      setIsRunning(true)
      animFrameRef.current = requestAnimationFrame(updateTimer)
    }
  }

  const pause = () => {
    if (isRunning && animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
      setIsRunning(false)
    }
  }

  const reset = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setIsRunning(false)
    setElapsedMs(0)
    setLaps([])
    lastLapTotalRef.current = 0
  }

  const recordLap = () => {
    if (!isRunning) return
    const currentTotal = elapsedMs
    const lapDuration = currentTotal - lastLapTotalRef.current
    lastLapTotalRef.current = currentTotal

    const newLap: Lap = {
      id: laps.length + 1,
      lapTime: lapDuration,
      totalTime: currentTotal,
    }
    setLaps((prev) => [newLap, ...prev])
  }

  const copyLaps = () => {
    if (laps.length === 0) return
    const text = laps
      .map(
        (l) =>
          `Lap ${l.id}: ${formatStopwatchTime(l.lapTime)} (Total: ${formatStopwatchTime(l.totalTime)})`
      )
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Identify best (fastest) and worst (slowest) laps
  let bestLapId = -1
  let worstLapId = -1
  if (laps.length >= 2) {
    let minTime = Infinity
    let maxTime = -Infinity
    laps.forEach((l) => {
      if (l.lapTime < minTime) {
        minTime = l.lapTime
        bestLapId = l.id
      }
      if (l.lapTime > maxTime) {
        maxTime = l.lapTime
        worstLapId = l.id
      }
    })
  }

  const t = {
    start: locale === 'pl' ? 'Start' : 'Start',
    pause: locale === 'pl' ? 'Pauza' : 'Pause',
    reset: locale === 'pl' ? 'Zeruj' : 'Reset',
    lap: locale === 'pl' ? 'Okrążenie' : 'Lap',
    copyLaps: locale === 'pl' ? 'Kopiuj listę okrążeń' : 'Copy Laps',
    copied: locale === 'pl' ? 'Skopiowano!' : 'Copied!',
    lapHeader: locale === 'pl' ? 'Okrążenie' : 'Lap #',
    lapTime: locale === 'pl' ? 'Czas okrążenia' : 'Lap Time',
    totalTime: locale === 'pl' ? 'Łączny czas' : 'Overall',
    fastest: locale === 'pl' ? 'Najszybsze' : 'Fastest',
    slowest: locale === 'pl' ? 'Najwolniejsze' : 'Slowest',
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto select-none">
      {/* Huge Digits Display */}
      <div className="flex flex-col items-center justify-center p-6 w-full rounded-lg bg-surface-2 border border-border">
        <div className="font-mono text-5xl md:text-6xl font-bold tracking-tight text-text">
          {formatStopwatchTime(elapsedMs)}
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
          variant="secondary"
          size="lg"
          onClick={recordLap}
          disabled={!isRunning}
        >
          {t.lap}
        </ToolButton>

        <ToolButton
          variant="ghost"
          size="lg"
          onClick={reset}
          disabled={elapsedMs === 0}
          icon={<IconRotateCcw size={18} />}
        >
          {t.reset}
        </ToolButton>
      </div>

      {/* Laps Table */}
      {laps.length > 0 && (
        <div className="w-full flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">
              {locale === 'pl' ? 'Historia okrążeń' : 'Lap History'} ({laps.length})
            </span>
            <button
              onClick={copyLaps}
              className="text-[11px] text-text-muted hover:text-text flex items-center gap-1"
            >
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              {copied ? t.copied : t.copyLaps}
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
            {laps.map((lap) => {
              const isBest = lap.id === bestLapId
              const isWorst = lap.id === worstLapId

              return (
                <div
                  key={lap.id}
                  className={`flex items-center justify-between p-2.5 rounded border text-xs font-mono transition-all ${
                    isBest
                      ? 'border-text bg-surface text-text font-semibold'
                      : isWorst
                      ? 'border-border bg-surface text-text-dim'
                      : 'border-border bg-surface text-text'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-dim">#{String(lap.id).padStart(2, '0')}</span>
                    {isBest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-text text-bg uppercase font-bold">
                        {t.fastest}
                      </span>
                    )}
                    {isWorst && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] border border-border text-text-muted uppercase">
                        {t.slowest}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <span className="font-bold">{formatStopwatchTime(lap.lapTime)}</span>
                    <span className="text-text-muted">{formatStopwatchTime(lap.totalTime)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
