import React, { useState, useEffect, useRef, useId, useMemo } from 'react'
import {
  GameButton,
  PillGroup,
  StatsHeader,
  ControlsBar,
  IconPlay,
  IconPause,
  IconRotateCcw,
  IconMic,
} from '@alltools/ui'
import type { SoundMeterMode, SoundWeighting } from './types'
import {
  DecibelMeterEngine,
  getSoundReference,
} from './utils/audioEngine'
import './styles/sound-meter.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  onSave?: (data: unknown) => void
}

export function SoundMeter({ locale = 'en', setHeader }: ToolComponentProps) {
  const isPl = locale === 'pl'
  const calSliderId = useId()

  const [activeMode, setActiveMode] = useState<SoundMeterMode>('meter')
  const [isActive, setIsActive] = useState<boolean>(false)
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false)

  // Metrics
  const [currentDb, setCurrentDb] = useState<number>(30.0)
  const [minDb, setMinDb] = useState<number>(999)
  const [maxDb, setMaxDb] = useState<number>(0)
  const [sumDb, setSumDb] = useState<number>(0)
  const [sampleCount, setSampleCount] = useState<number>(0)

  // Settings
  const [calibration, setCalibration] = useState<number>(0)
  const [weighting, setWeighting] = useState<SoundWeighting>('dBA')

  const engineRef = useRef<DecibelMeterEngine | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const historyRef = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const avgDb = useMemo(() => {
    if (sampleCount === 0) return 0
    return Math.round((sumDb / sampleCount) * 10) / 10
  }, [sumDb, sampleCount])

  const reference = useMemo(() => {
    return getSoundReference(currentDb, locale)
  }, [currentDb, locale])

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return

    setHeader(
      <StatsHeader
        label={isPl ? 'DECYBELOMIERZ' : 'SOUND LEVEL METER'}
        items={[
          { key: 'cur', label: 'BIEŻĄCY', value: `${currentDb.toFixed(1)} dB` },
          { key: 'peak', label: isPl ? 'SZCZYT' : 'PEAK', value: maxDb > 0 ? `${maxDb.toFixed(1)} dB` : '--' },
          { key: 'avg', label: isPl ? 'ŚREDNIA' : 'AVG', value: avgDb > 0 ? `${avgDb.toFixed(1)} dB` : '--' },
          { key: 'filter', label: 'FILTR', value: weighting },
        ]}
      />
    )
  }, [setHeader, isPl, currentDb, maxDb, avgDb, weighting])

  const lastSampleTimeRef = useRef<number>(0)
  const MAX_SAMPLES = 300 // 300 samples * 200ms = 60 seconds (1 minute)

  // ─── Audio Measurement Loop ─────────────────────────────────
  const startMeasurement = async () => {
    try {
      if (!engineRef.current) {
        engineRef.current = new DecibelMeterEngine()
      }
      await engineRef.current.start(calibration, weighting)
      setIsActive(true)
      setPermissionDenied(false)
      lastSampleTimeRef.current = performance.now()

      const loop = () => {
        if (!engineRef.current) return
        const val = engineRef.current.getCurrentDecibels()

        setCurrentDb(val)
        setMinDb((prev) => (val < prev ? val : prev))
        setMaxDb((prev) => (val > prev ? val : prev))
        setSumDb((prev) => prev + val)
        setSampleCount((prev) => prev + 1)

        // Sample history at stable 200ms interval for exact 60-second window
        const now = performance.now()
        if (now - lastSampleTimeRef.current >= 200) {
          lastSampleTimeRef.current = now
          historyRef.current.push(val)
          if (historyRef.current.length > MAX_SAMPLES) {
            historyRef.current.shift()
          }
        }

        animFrameRef.current = requestAnimationFrame(loop)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    } catch (err) {
      console.error('Microphone access failed:', err)
      setPermissionDenied(true)
      setIsActive(false)
    }
  }

  const stopMeasurement = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    setIsActive(false)
  }

  const resetMetrics = () => {
    setMinDb(999)
    setMaxDb(0)
    setSumDb(0)
    setSampleCount(0)
    historyRef.current = []
  }

  useEffect(() => {
    return () => {
      stopMeasurement()
    }
  }, [])

  // Sync calibration & weighting live
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.calibrationOffset = calibration
      engineRef.current.weighting = weighting
    }
  }, [calibration, weighting])

  // ─── Live Canvas Rendering for Chart ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const bottomPadding = 18 // space for time labels

    ctx.clearRect(0, 0, width, height)

    // Decibel Horizontal Grid lines (30dB, 60dB, 90dB, 120dB)
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.15)'
    ctx.lineWidth = 1
    const levels = [30, 60, 90, 120]
    ctx.font = '9px monospace'
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'

    levels.forEach((lvl) => {
      const usableH = height - bottomPadding
      const y = usableH - ((lvl - 20) / 100) * usableH
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      ctx.fillText(`${lvl} dB`, 6, y - 3)
    })

    // Vertical Time Grid lines (-60s, -45s, -30s, -15s, 0s)
    const timeMarkers = [
      { label: '-60s', pos: 0 },
      { label: '-45s', pos: 0.25 },
      { label: '-30s', pos: 0.5 },
      { label: '-15s', pos: 0.75 },
      { label: isPl ? 'Teraz' : 'Now', pos: 1 },
    ]

    timeMarkers.forEach((tm) => {
      const x = tm.pos * width
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.1)'
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height - bottomPadding)
      ctx.stroke()

      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)'
      const textX = tm.pos === 1 ? x - 26 : tm.pos === 0 ? x + 4 : x - 10
      ctx.fillText(tm.label, textX, height - 4)
    })

    // Noise level history curve
    const history = historyRef.current
    if (history.length < 2) return

    const usableH = height - bottomPadding
    ctx.beginPath()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'

    // Step across full 60s window (300 points)
    const step = width / (MAX_SAMPLES - 1)
    const offsetIndex = MAX_SAMPLES - history.length

    history.forEach((val, i) => {
      const x = (offsetIndex + i) * step
      const normalized = Math.max(0, Math.min(1, (val - 20) / 100))
      const y = usableH - normalized * usableH

      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [currentDb, activeMode, isPl])

  const modeOptions = [
    { value: 'meter' as const, label: isPl ? 'Miernik' : 'Meter' },
    { value: 'chart' as const, label: isPl ? 'Wykres' : 'Chart' },
    { value: 'settings' as const, label: isPl ? 'Kalibracja' : 'Calibrate' },
  ]

  return (
    <div className="sound-root">
      {/* 1. Header Title */}
      <div className="sound-status">
        <div className="sound-status-text">
          {isActive
            ? reference.label
            : isPl
            ? 'Uruchom mikrofon, aby rozpocząć pomiar'
            : 'Start microphone to measure noise levels'}
        </div>
      </div>

      {/* 2. Main Center Viewport */}
      <div className="sound-center-area">
        <div className="sound-card">
          {/* Permission Error State */}
          {permissionDenied && (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>
                {isPl ? 'Brak dostępu do mikrofonu' : 'Microphone Permission Required'}
              </p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {isPl
                  ? 'Zezwól przeglądarce na dostęp do mikrofonu, aby korzystać z decybelomierza.'
                  : 'Please allow microphone access in your browser settings to measure noise.'}
              </p>
            </div>
          )}

          {!permissionDenied && (
            <>
              {/* ─── Big Digital Decibel Screen ─── */}
              <div className="sound-display-gauge">
                <div className="sound-db-value-row">
                  <span className="sound-db-number">
                    {isActive ? currentDb.toFixed(1) : '--.-'}
                  </span>
                  <span className="sound-db-unit">{weighting}</span>
                </div>
                <div className="sound-reference-tag">
                  {isActive ? reference.label : (isPl ? 'Gotowy do pomiaru' : 'Ready to measure')}
                </div>
                <div className="sound-level-track">
                  <div
                    className="sound-level-fill"
                    style={{ width: `${Math.min(100, Math.max(0, ((currentDb - 20) / 100) * 100))}%` }}
                  />
                </div>
              </div>

              {/* ─── Metric Cells (MIN / AVG / MAX) ─── */}
              <div className="sound-metrics-grid">
                <div className="sound-metric-cell">
                  <span className="sound-metric-label">{isPl ? 'Minimum' : 'Min'}</span>
                  <span className="sound-metric-val">{minDb < 999 ? `${minDb.toFixed(1)} dB` : '--'}</span>
                </div>
                <div className="sound-metric-cell">
                  <span className="sound-metric-label">{isPl ? 'Średnia' : 'Average'}</span>
                  <span className="sound-metric-val">{avgDb > 0 ? `${avgDb.toFixed(1)} dB` : '--'}</span>
                </div>
                <div className="sound-metric-cell">
                  <span className="sound-metric-label">{isPl ? 'Szczyt' : 'Max / Peak'}</span>
                  <span className="sound-metric-val">{maxDb > 0 ? `${maxDb.toFixed(1)} dB` : '--'}</span>
                </div>
              </div>

              {/* ─── MODE: LIVE ROLLING CHART ─── */}
              {activeMode === 'chart' && (
                <div className="sound-canvas-container">
                  <canvas ref={canvasRef} className="sound-canvas-elem" />
                </div>
              )}

              {/* ─── MODE: CALIBRATION & FILTER SETTINGS ─── */}
              {activeMode === 'settings' && (
                <div className="sound-calibration-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                      {isPl ? 'Krzywa ważenia:' : 'Frequency Weighting:'}
                    </span>
                    <PillGroup
                      options={[
                        { value: 'dBA', label: 'dBA (Ucho)' },
                        { value: 'dBZ', label: 'dBZ (Płaski)' },
                      ]}
                      value={weighting}
                      onChange={(w) => setWeighting(w as SoundWeighting)}
                    />
                  </div>

                  <div className="sound-slider-row" style={{ marginTop: '0.5rem' }}>
                    <label htmlFor={calSliderId}>
                      {isPl ? 'Kompensacja mikrofonu:' : 'Offset Calibration:'}{' '}
                      <strong>{calibration > 0 ? `+${calibration}` : calibration} dB</strong>
                    </label>
                    <input
                      id={calSliderId}
                      type="range"
                      min="-20"
                      max="20"
                      value={calibration}
                      onChange={(e) => setCalibration(parseInt(e.target.value, 10))}
                      className="sound-slider"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="sound-controls-container">
        <ControlsBar>
          <PillGroup
            options={modeOptions}
            value={activeMode}
            onChange={(m) => setActiveMode(m)}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isActive ? (
              <GameButton
                variant="primary"
                size="md"
                onClick={startMeasurement}
                icon={<IconPlay size={14} />}
              >
                {isPl ? 'Start' : 'Start'}
              </GameButton>
            ) : (
              <GameButton
                variant="secondary"
                size="md"
                onClick={stopMeasurement}
                icon={<IconPause size={14} />}
              >
                {isPl ? 'Pauza' : 'Pause'}
              </GameButton>
            )}

            <GameButton
              variant="ghost"
              size="md"
              onClick={resetMetrics}
              icon={<IconRotateCcw size={14} />}
              title={isPl ? 'Zresetuj statystyki' : 'Reset metrics'}
            >
              {isPl ? 'Reset' : 'Reset'}
            </GameButton>
          </div>
        </ControlsBar>
      </div>
    </div>
  )
}
