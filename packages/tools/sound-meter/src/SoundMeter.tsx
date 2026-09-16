import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react'
import {
  BoardLayout,
  Button,
  PillGroup,
  StatsHeader,
  ControlsBar,
  Dialog,
  PlayIcon,
  PauseIcon,
  RestartIcon,
  SettingsIcon,
} from '@all/ui'
import type { SoundWeighting } from './types'
import { soundMeterTranslations } from './i18n'
import {
  DecibelMeterEngine,
  getSoundReference,
} from './utils/audioEngine'
import './styles/sound-meter.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
}

export function SoundMeter({ locale = 'en', setHeader, isEink = false }: ToolComponentProps) {
  const isPl = locale === 'pl'
  const t = soundMeterTranslations[locale] || soundMeterTranslations.en
  const calSliderId = useId()

  const [isActive, setIsActive] = useState<boolean>(false)
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)

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

  useEffect(() => {
    setHeader?.(null)
    return () => setHeader?.(null)
  }, [setHeader])

  const lastSampleTimeRef = useRef<number>(0)
  const lastEinkDrawRef = useRef<number>(0)
  const MAX_SAMPLES = 300 // 300 samples * 200ms = 60 seconds (1 minute)

  // ─── Audio Measurement Loop (Archetype 1 Safe Teardown) ──────
  const startMeasurement = async () => {
    try {
      if (!engineRef.current) {
        engineRef.current = new DecibelMeterEngine()
      }
      await engineRef.current.start(calibration, weighting)
      setIsActive(true)
      setPermissionDenied(false)
      lastSampleTimeRef.current = performance.now()
      lastEinkDrawRef.current = performance.now()

      const loop = () => {
        if (!engineRef.current) return
        const val = engineRef.current.getCurrentDecibels()

        setCurrentDb(val)
        setMinDb((prev) => (val < prev ? val : prev))
        setMaxDb((prev) => (val > prev ? val : prev))
        setSumDb((prev) => prev + val)
        setSampleCount((prev) => prev + 1)

        const now = performance.now()
        if (now - lastSampleTimeRef.current >= 200) {
          lastSampleTimeRef.current = now
          historyRef.current.push(val)
          if (historyRef.current.length > MAX_SAMPLES) {
            historyRef.current.shift()
          }
        }

        // On E-Ink, throttle canvas rendering to conserve screen refresh
        if (isEink) {
          if (now - lastEinkDrawRef.current >= 1000) {
            lastEinkDrawRef.current = now
            drawCanvas()
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

  const stopMeasurement = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    setIsActive(false)
  }, [])

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
  }, [stopMeasurement])

  // Sync calibration & weighting live
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.calibrationOffset = calibration
      engineRef.current.weighting = weighting
    }
  }, [calibration, weighting])

  // ─── Live Waveform Canvas ────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const bottomPadding = 16

    ctx.clearRect(0, 0, width, height)

    // Decibel Horizontal Grid lines (30dB, 60dB, 90dB, 120dB)
    ctx.strokeStyle = isEink ? '#000000' : 'rgba(128, 128, 128, 0.18)'
    ctx.lineWidth = isEink ? 1.5 : 1
    const levels = [30, 60, 90, 120]
    ctx.font = '9px monospace'
    ctx.fillStyle = isEink ? '#000000' : 'rgba(128, 128, 128, 0.5)'

    levels.forEach((lvl) => {
      const usableH = height - bottomPadding
      const y = usableH - ((lvl - 20) / 100) * usableH
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      ctx.fillText(`${lvl} dB`, 6, y - 3)
    })

    // Vertical Time Grid lines
    const timeMarkers = [
      { label: '-60s', pos: 0 },
      { label: '-45s', pos: 0.25 },
      { label: '-30s', pos: 0.5 },
      { label: '-15s', pos: 0.75 },
      { label: t.now, pos: 1 },
    ]

    timeMarkers.forEach((tm) => {
      const x = tm.pos * width
      ctx.beginPath()
      ctx.strokeStyle = isEink ? '#000000' : 'rgba(128, 128, 128, 0.12)'
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height - bottomPadding)
      ctx.stroke()

      ctx.fillStyle = isEink ? '#000000' : 'rgba(128, 128, 128, 0.6)'
      const textX = tm.pos === 1 ? x - 26 : tm.pos === 0 ? x + 4 : x - 10
      ctx.fillText(tm.label, textX, height - 3)
    })

    // Noise level history curve
    const history = historyRef.current
    if (history.length < 2) return

    const usableH = height - bottomPadding
    ctx.beginPath()
    ctx.strokeStyle = isEink ? '#000000' : '#ffffff'
    ctx.lineWidth = isEink ? 2.5 : 2
    ctx.lineJoin = 'round'

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
  }, [isEink, t.now])

  useEffect(() => {
    if (!isEink) {
      drawCanvas()
    }
  }, [currentDb, isEink, drawCanvas])

  return (
    <div className={`sound-root ${isEink ? 'is-eink' : ''}`.trim()}>
      <BoardLayout
        variant="wide"
        align="center"
        board={
          <div className="sound-stage">
            {permissionDenied && (
              <div className="sound-permission-denied">
                <p className="sound-permission-title">{t.permissionRequired}</p>
                <p className="sound-permission-desc">{t.permissionHelp}</p>
              </div>
            )}

            {!permissionDenied && (
              <div className="sound-instrument">
                {/* Acoustic Classification Tag */}
                <div className="sound-badge-row">
                  <span className="sound-status-badge">
                    {isActive
                      ? reference.label
                      : isEink && t.einkStaticNotice
                      ? t.einkStaticNotice
                      : t.startMicrophone}
                  </span>
                </div>

                {/* Digital Decibel Gauge Display */}
                <div className="sound-gauge">
                  <div className="sound-db-value-row">
                    <span className="sound-db-number">
                      {isActive ? currentDb.toFixed(1) : '--.-'}
                    </span>
                    <span className="sound-db-unit">{weighting}</span>
                  </div>
                  <div className="sound-reference-tag">
                    {isActive ? reference.label : t.readyToMeasure}
                  </div>
                  <div className="sound-level-track">
                    <div
                      className="sound-level-fill"
                      style={{ width: `${Math.min(100, Math.max(0, ((currentDb - 20) / 100) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* 3-Column Metrics Row (MIN / AVG / PEAK) */}
                <div className="sound-metrics-grid">
                  <div className="sound-metric-cell">
                    <span className="sound-metric-label">{t.min}</span>
                    <span className="sound-metric-val">{minDb < 999 ? `${minDb.toFixed(1)} dB` : '--'}</span>
                  </div>
                  <div className="sound-metric-cell">
                    <span className="sound-metric-label">{t.average}</span>
                    <span className="sound-metric-val">{avgDb > 0 ? `${avgDb.toFixed(1)} dB` : '--'}</span>
                  </div>
                  <div className="sound-metric-cell">
                    <span className="sound-metric-label">{t.maxPeak}</span>
                    <span className="sound-metric-val">{maxDb > 0 ? `${maxDb.toFixed(1)} dB` : '--'}</span>
                  </div>
                </div>

                {/* 60-Second Real-Time Live Waveform Canvas */}
                <div className="sound-canvas-container">
                  <canvas ref={canvasRef} className="sound-canvas-elem" />
                </div>
              </div>
            )}
          </div>
        }
        controls={
          <ControlsBar>
            <Button
              id="sound-start-pause-btn"
              variant="primary"
              size="sm"
              onClick={isActive ? stopMeasurement : startMeasurement}
              icon={isActive ? <PauseIcon /> : <PlayIcon />}
            >
              {isActive ? t.pause : t.start}
            </Button>

            <Button
              id="sound-reset-btn"
              variant="secondary"
              size="sm"
              onClick={resetMetrics}
              icon={<RestartIcon />}
              title={t.resetTooltip}
            >
              {t.reset}
            </Button>

            <PillGroup<SoundWeighting>
              size="sm"
              options={[
                { value: 'dBA', label: 'dBA', id: 'sound-filter-dba' },
                { value: 'dBZ', label: 'dBZ', id: 'sound-filter-dbz' },
              ]}
              value={weighting}
              onChange={(w) => setWeighting(w)}
            />

            <Button
              id="sound-settings-btn"
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              icon={<SettingsIcon />}
              title={t.settings}
            >
              {t.settings}
            </Button>
          </ControlsBar>
        }
      />

      {/* Calibration & Settings Dialog Modal */}
      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t.settings}
        maxWidth="sm"
      >
        <div className="sound-dialog-content">
          <div className="sound-dialog-group">
            <label className="sound-dialog-label">{t.frequencyWeighting}</label>
            <PillGroup<SoundWeighting>
              size="sm"
              options={[
                { value: 'dBA', label: t.humanEar, id: 'settings-weighting-dba' },
                { value: 'dBZ', label: t.flat, id: 'settings-weighting-dbz' },
              ]}
              value={weighting}
              onChange={(w) => setWeighting(w)}
            />
          </div>

          <div className="sound-dialog-group">
            <div className="sound-dialog-label-row">
              <label htmlFor={calSliderId} className="sound-dialog-label">
                {t.offsetCalibration}
              </label>
              <span className="sound-dialog-badge">
                {calibration > 0 ? `+${calibration}` : calibration} dB
              </span>
            </div>
            <input
              id={calSliderId}
              type="range"
              min="-20"
              max="20"
              value={calibration}
              onChange={(e) => setCalibration(parseInt(e.target.value, 10))}
              className="sound-slider"
            />
            <div className="sound-slider-hints">
              <span>-20 dB</span>
              <button
                type="button"
                className="sound-reset-cal-link"
                onClick={() => setCalibration(0)}
              >
                0 dB (Default)
              </button>
              <span>+20 dB</span>
            </div>
          </div>

          <div className="sound-dialog-footer">
            <Button
              id="sound-dialog-close-btn"
              variant="primary"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              {t.close}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
export default SoundMeter
