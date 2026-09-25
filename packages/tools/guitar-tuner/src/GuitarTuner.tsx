import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react'
import {
  BoardLayout,
  Button,
  ControlsBar,
  PillGroup,
  StatsHeader,
  Dialog,
  SettingsGroup,
  Slider,
  PlayIcon,
  PauseIcon,
  SettingsIcon,
  VolumeIcon,
} from '@all/ui'
import {
  freqToNote,
  autoCorrelate,
  TUNING_PRESETS,
  DEFAULT_A4,
  NOISE_GATE_THRESHOLDS,
  getCalibratedStrings,
  playReferenceTone,
  stopReferenceTone,
  releaseGlobalAudio,
} from './audio/pitchDetection'
import { NeedleGauge } from './components/NeedleGauge'
import type { ToolComponentProps, NoiseGateLevel } from './types'
import { tunerTranslations } from './i18n'
import './styles/tuner.css'

export function GuitarTuner({ setHeader, locale = 'en', isEink = false, theme }: ToolComponentProps) {
  const isDark = theme
    ? theme.includes('dark')
    : typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme')?.includes('dark') ?? true)
      : true

  const t = tunerTranslations[locale] || tunerTranslations.en
  const a4SliderId = useId()

  // ─── Settings & Presets State ───
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('alltools:tuner:preset') || 'guitar-std'
    } catch {
      return 'guitar-std'
    }
  })

  const [a4Calibration, setA4Calibration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:tuner:a4')
      if (saved) {
        const val = parseInt(saved, 10)
        if (Number.isFinite(val) && val >= 420 && val <= 460) return val
      }
    } catch {}
    return DEFAULT_A4
  })

  const [noiseGate, setNoiseGate] = useState<NoiseGateLevel>(() => {
    try {
      const saved = localStorage.getItem('alltools:tuner:gate') as NoiseGateLevel
      if (saved && (saved === 'low' || saved === 'medium' || saved === 'high')) return saved
    } catch {}
    return 'medium'
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false)
  const [playingToneFreq, setPlayingToneFreq] = useState<number | null>(null)

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem('alltools:tuner:preset', selectedPresetId)
    } catch {}
  }, [selectedPresetId])

  useEffect(() => {
    try {
      localStorage.setItem('alltools:tuner:a4', String(a4Calibration))
    } catch {}
  }, [a4Calibration])

  useEffect(() => {
    try {
      localStorage.setItem('alltools:tuner:gate', noiseGate)
    } catch {}
  }, [noiseGate])

  // ─── Detected Pitch State ───
  const [detectedPitch, setDetectedPitch] = useState<{
    note: string
    octave: number
    freq: number
    targetFreq: number
    cents: number
    hasAudio: boolean
  }>({
    note: '-',
    octave: 0,
    freq: 0,
    targetFreq: 0,
    cents: 0,
    hasAudio: false,
  })

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const pitchHistoryRef = useRef<number[]>([])

  const currentPreset = useMemo(() => {
    return TUNING_PRESETS.find((p) => p.id === selectedPresetId) || TUNING_PRESETS[0]
  }, [selectedPresetId])

  const calibratedStrings = useMemo(() => {
    return getCalibratedStrings(currentPreset.strings, a4Calibration)
  }, [currentPreset, a4Calibration])

  const isInTune = detectedPitch.hasAudio && Math.abs(detectedPitch.cents) <= 4

  // ─── Stats Header Integration (top bar readout) ───
  const renderHeader = useCallback(() => {
    if (!setHeader) return
    setHeader(
      <StatsHeader
        label={t.statsLabel}
        items={[
          {
            key: 'freq',
            label: 'HZ',
            value: detectedPitch.hasAudio ? Math.round(detectedPitch.freq) : '—',
          },
          {
            key: 'cents',
            label: t.cents,
            value: detectedPitch.hasAudio
              ? detectedPitch.cents > 0
                ? `+${detectedPitch.cents}`
                : `${detectedPitch.cents}`
              : '0',
          },
        ]}
      />,
    )
  }, [setHeader, detectedPitch, t.statsLabel, t.cents])

  useEffect(() => {
    renderHeader()
  }, [renderHeader])

  useEffect(() => {
    return () => setHeader?.(null)
  }, [setHeader])

  // ─── Audio Analysis Loop (Archetype 1 Safe Teardown) ───
  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setIsListening(false)
    setDetectedPitch({
      note: '-',
      octave: 0,
      freq: 0,
      targetFreq: 0,
      cents: 0,
      hasAudio: false,
    })
    pitchHistoryRef.current = []
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      })
      mediaStreamRef.current = stream

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioContextClass()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      setIsListening(true)
      setPermissionDenied(false)

      const buffer = new Float32Array(analyser.fftSize)
      const threshold = NOISE_GATE_THRESHOLDS[noiseGate] || NOISE_GATE_THRESHOLDS.medium

      const updatePitch = () => {
        if (!analyserRef.current || !audioCtxRef.current) return
        analyserRef.current.getFloatTimeDomainData(buffer)
        const freq = autoCorrelate(buffer, audioCtxRef.current.sampleRate, threshold)

        if (freq !== -1 && freq >= 30 && freq <= 2200) {
          pitchHistoryRef.current.push(freq)
          if (pitchHistoryRef.current.length > 5) pitchHistoryRef.current.shift()
          const smoothedFreq = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length
          const noteInfo = freqToNote(smoothedFreq, a4Calibration)
          setDetectedPitch({
            note: noteInfo.note,
            octave: noteInfo.octave,
            freq: smoothedFreq,
            targetFreq: noteInfo.targetFreq,
            cents: noteInfo.cents,
            hasAudio: true,
          })
        } else {
          setDetectedPitch((prev) => ({ ...prev, hasAudio: false }))
        }
        animFrameRef.current = requestAnimationFrame(updatePitch)
      }
      updatePitch()
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err)
      setPermissionDenied(true)
      setIsListening(false)
    }
  }

  // Complete cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      stopReferenceTone()
      releaseGlobalAudio()
    }
  }, [stopListening])

  // Reference tone playback
  const toggleTone = (freq: number) => {
    if (playingToneFreq === freq) {
      stopReferenceTone()
      setPlayingToneFreq(null)
    } else {
      playReferenceTone(freq)
      setPlayingToneFreq(freq)
    }
  }

  const presetPills = useMemo(
    () => [
      { value: 'guitar-std', label: t.presets.guitarStd, id: 'tuner-preset-guitar-std' },
      { value: 'guitar-drop-d', label: t.presets.guitarDropD, id: 'tuner-preset-drop-d' },
      { value: 'bass-4', label: t.presets.bass, id: 'tuner-preset-bass' },
      { value: 'ukulele', label: t.presets.ukulele, id: 'tuner-preset-ukulele' },
      { value: 'chromatic', label: t.presets.chromatic, id: 'tuner-preset-chromatic' },
    ],
    [t.presets],
  )

  const sensitivityPills = useMemo(
    () => [
      { value: 'low' as NoiseGateLevel, label: t.sensitivityLow, id: 'gate-low' },
      { value: 'medium' as NoiseGateLevel, label: t.sensitivityMedium, id: 'gate-medium' },
      { value: 'high' as NoiseGateLevel, label: t.sensitivityHigh, id: 'gate-high' },
    ],
    [t.sensitivityLow, t.sensitivityMedium, t.sensitivityHigh],
  )

  return (
    <div className={`tuner-container ${isEink ? 'tuner-container--eink' : ''}`}>
      <BoardLayout
        variant="wide"
        align="center"
        allowDpadToggle={false}
        board={
          <div className="tuner-stage">
            {permissionDenied && (
              <div className="tuner-permission-banner" role="alert">
                <p className="tuner-permission-title">{t.permissionDenied}</p>
                <p className="tuner-permission-desc">{t.permissionHelp}</p>
              </div>
            )}

            {/* Note & Frequency Readout */}
            <div className="tuner-note-display" aria-live="polite">
              <div className="tuner-note-text">
                {detectedPitch.hasAudio ? detectedPitch.note : '-'}
                {detectedPitch.hasAudio && <span className="tuner-note-octave">{detectedPitch.octave}</span>}
              </div>
              <div className="tuner-note-sub">
                {detectedPitch.hasAudio
                  ? `${Math.round(detectedPitch.freq)} Hz · ${t.target} ${Math.round(
                      detectedPitch.targetFreq,
                    )} Hz (${a4Calibration} Hz A4)`
                  : isListening
                    ? t.listeningNoSignal
                    : t.readyToTune}
              </div>
            </div>

            {/* Needle Gauge Display */}
            <NeedleGauge
              cents={detectedPitch.cents}
              isInTune={isInTune}
              hasAudio={detectedPitch.hasAudio}
              isEink={isEink}
              flatLabel={t.flat}
              sharpLabel={t.sharp}
              inTuneLabel={t.inTune}
              waitingLabel={isListening ? t.listeningNoSignal : t.readyToTune}
            />

            {/* String Reference Buttons */}
            {calibratedStrings.length > 0 && (
              <div className="tuner-strings-container" role="group" aria-label={t.referenceTone}>
                {calibratedStrings.map((str, idx) => {
                  const isPlaying = playingToneFreq === str.freq
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`tuner-string-btn ${isPlaying ? 'tuner-string-btn--playing' : ''}`}
                      onClick={() => toggleTone(str.freq)}
                      title={`${t.referenceTone}: ${str.note}${str.octave} (${str.freq} Hz)`}
                      aria-pressed={isPlaying}
                    >
                      <span className="tuner-string-note">
                        {str.note}
                        <span className="tuner-string-octave">{str.octave}</span>
                      </span>
                      <span className="tuner-string-freq">
                        {isPlaying ? <VolumeIcon /> : `${Math.round(str.freq)}Hz`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        }
        controls={
          <ControlsBar>
            <Button
              id="tuner-toggle-btn"
              variant="primary"
              size="sm"
              onClick={isListening ? stopListening : startListening}
              icon={isListening ? <PauseIcon /> : <PlayIcon />}
            >
              {isListening ? t.stopTuner : t.startTuner}
            </Button>

            <PillGroup
              size="sm"
              options={presetPills}
              value={selectedPresetId}
              onChange={(val) => {
                setSelectedPresetId(val)
                stopReferenceTone()
                setPlayingToneFreq(null)
              }}
            />

            <Button
              id="tuner-settings-btn"
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              icon={<SettingsIcon />}
              title={t.settings}
              aria-label={t.settings}
            >
              {t.settings}
            </Button>
          </ControlsBar>
        }
      />

      {/* Tuner Calibration & Settings Modal */}
      <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t.settings} maxWidth="sm">
        <div className="tuner-dialog-content">
          {/* Reference Pitch (A4) Calibration */}
          <SettingsGroup label={`${t.calibrationA4} (${a4Calibration} Hz)`}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Slider
                id={a4SliderId}
                min={420}
                max={450}
                step={1}
                value={a4Calibration}
                onChange={(val) => setA4Calibration(val)}
                aria-label={t.calibrationA4}
              />
              <div style={{ display: 'flex', gap: 'var(--all-space-2, 0.5rem)', width: '100%' }}>
                <Button
                  variant={a4Calibration === 432 ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth
                  onClick={() => setA4Calibration(432)}
                >
                  432 Hz
                </Button>
                <Button
                  variant={a4Calibration === 440 ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth
                  onClick={() => setA4Calibration(440)}
                >
                  440 Hz (Default)
                </Button>
                <Button
                  variant={a4Calibration === 442 ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth
                  onClick={() => setA4Calibration(442)}
                >
                  442 Hz
                </Button>
              </div>
            </div>
          </SettingsGroup>
          <p className="tuner-dialog-hint">{t.calibrationDesc}</p>

          {/* Noise Gate & Sensitivity */}
          <SettingsGroup label={t.noiseGate}>
            <PillGroup<NoiseGateLevel>
              size="sm"
              options={sensitivityPills}
              value={noiseGate}
              onChange={(gate) => setNoiseGate(gate)}
            />
          </SettingsGroup>
          <p className="tuner-dialog-hint">{t.noiseGateDesc}</p>
          <p className="tuner-dialog-help-text">{t.sensitivityHelp[noiseGate]}</p>

          <div className="tuner-dialog-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setA4Calibration(DEFAULT_A4)
                setNoiseGate('medium')
              }}
            >
              {t.resetDefaults}
            </Button>
            <Button id="tuner-dialog-close-btn" variant="primary" size="sm" onClick={() => setIsSettingsOpen(false)}>
              {t.close}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default GuitarTuner
