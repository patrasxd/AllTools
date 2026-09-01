import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  freqToNote,
  autoCorrelate,
  TUNING_PRESETS,
  playReferenceTone,
  stopReferenceTone,
} from './audio/pitchDetection'
import { NeedleGauge } from './components/NeedleGauge'
import type { GameComponentProps } from './types'
import { tunerTranslations, type Locale } from './i18n'
import { StatsHeader, GameButton, ControlsBar, PillGroup } from '@alltools/ui'
import './styles/tuner.css'

export function GuitarTuner({ setHeader, locale = 'en', isEink = false }: GameComponentProps) {
  const [isListening, setIsListening] = useState<boolean>(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('alltools:tuner:preset') || 'guitar-std'
    } catch {
      return 'guitar-std'
    }
  })
  const [playingToneFreq, setPlayingToneFreq] = useState<number | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('alltools:tuner:preset', selectedPresetId)
    } catch {
      // Ignore
    }
  }, [selectedPresetId])
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

  const t = tunerTranslations[locale] || tunerTranslations.en
  const currentPreset = TUNING_PRESETS.find((p) => p.id === selectedPresetId) || TUNING_PRESETS[0]
  const isInTune = detectedPitch.hasAudio && Math.abs(detectedPitch.cents) <= 4

  // ── Stats header (injected into page header, like TicTacToe) ──
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
            label: 'CENTS',
            value: detectedPitch.hasAudio
              ? (detectedPitch.cents > 0 ? `+${detectedPitch.cents}` : `${detectedPitch.cents}`)
              : '0',
          },
        ]}
      />
    )
  }, [setHeader, detectedPitch, t.statsLabel])

  useEffect(() => {
    renderHeader()
  }, [renderHeader])

  useEffect(() => {
    return () => setHeader?.(null)
  }, [setHeader])

  // ── Audio logic ──
  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setIsListening(false)
    setDetectedPitch({
      note: '-', octave: 0, freq: 0, targetFreq: 0, cents: 0, hasAudio: false,
    })
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      })
      mediaStreamRef.current = stream

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioContextClass()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      setIsListening(true)

      const buffer = new Float32Array(analyser.fftSize)
      const updatePitch = () => {
        if (!analyserRef.current || !audioCtxRef.current) return
        analyserRef.current.getFloatTimeDomainData(buffer)
        const freq = autoCorrelate(buffer, audioCtxRef.current.sampleRate)

        if (freq !== -1 && freq >= 30 && freq <= 2000) {
          pitchHistoryRef.current.push(freq)
          if (pitchHistoryRef.current.length > 5) pitchHistoryRef.current.shift()
          const smoothedFreq = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length
          const noteInfo = freqToNote(smoothedFreq)
          setDetectedPitch({
            note: noteInfo.note, octave: noteInfo.octave, freq: smoothedFreq,
            targetFreq: noteInfo.targetFreq, cents: noteInfo.cents, hasAudio: true,
          })
        } else {
          setDetectedPitch((prev) => ({ ...prev, hasAudio: false }))
        }
        animFrameRef.current = requestAnimationFrame(updatePitch)
      }
      updatePitch()
    } catch {
      setIsListening(false)
    }
  }

  useEffect(() => {
    return () => {
      stopListening()
      stopReferenceTone()
    }
  }, [stopListening])

  const toggleTone = (freq: number) => {
    if (playingToneFreq === freq) {
      stopReferenceTone()
      setPlayingToneFreq(null)
    } else {
      playReferenceTone(freq)
      setPlayingToneFreq(freq)
    }
  }

  const presetPills = [
    { value: 'guitar-std', label: locale === 'pl' ? 'Gitara' : 'Guitar' },
    { value: 'guitar-drop-d', label: 'Drop D' },
    { value: 'bass-4', label: locale === 'pl' ? 'Bas' : 'Bass' },
    { value: 'ukulele', label: 'Ukulele' },
    { value: 'chromatic', label: locale === 'pl' ? 'Chromatyczny' : 'Chromatic' },
  ]

  return (
    <div className="tuner-root">
      {/* ── Status: detected note ── */}
      <AnimatePresence mode="wait">
        <motion.div
          className="tuner-note-display"
          key={`${detectedPitch.note}-${detectedPitch.hasAudio}-${locale}`}
          initial={!isEink ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={!isEink ? { opacity: 0, y: -6 } : undefined}
          transition={{ duration: 0.18 }}
        >
          <div className="tuner-note-text">
            {detectedPitch.hasAudio ? detectedPitch.note : '-'}
            {detectedPitch.hasAudio && (
              <span className="tuner-note-octave">{detectedPitch.octave}</span>
            )}
          </div>
          <div className="tuner-note-sub">
            {detectedPitch.hasAudio
              ? `${Math.round(detectedPitch.freq)} Hz · ${t.target} ${Math.round(detectedPitch.targetFreq)} Hz`
              : isListening ? t.listeningNoSignal : t.readyToTune
            }
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Needle gauge (like TicTacToe board) ── */}
      <NeedleGauge
        cents={detectedPitch.cents}
        isInTune={isInTune}
        hasAudio={detectedPitch.hasAudio}
      />

      {/* ── String reference tones ── */}
      {currentPreset.strings.length > 0 && (
        <div className="tuner-strings">
          {currentPreset.strings.map((str, idx) => {
            const isPlaying = playingToneFreq === str.freq
            return (
              <button
                key={idx}
                type="button"
                className={`tuner-string-btn ${isPlaying ? 'tuner-string-btn--playing' : ''}`}
                onClick={() => toggleTone(str.freq)}
                title={`${str.note}${str.octave} (${str.freq}Hz)`}
              >
                <span className="tuner-string-note">
                  {str.note}<span className="tuner-string-octave">{str.octave}</span>
                </span>
                <span className="tuner-string-freq">
                  {isPlaying ? '♪' : `${Math.round(str.freq)}Hz`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Controls (like TicTacToe controls bar) ── */}
      <ControlsBar>
        <GameButton
          id="tuner-toggle-btn"
          variant="primary"
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? t.stopTuner : t.startTuner}
        </GameButton>

        <PillGroup
          label={t.tuningLabel}
          options={presetPills}
          value={selectedPresetId}
          onChange={(val) => {
            setSelectedPresetId(val)
            stopReferenceTone()
            setPlayingToneFreq(null)
          }}
        />
      </ControlsBar>
    </div>
  )
}

export default GuitarTuner
