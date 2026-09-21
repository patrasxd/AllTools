export interface NoteInfo {
  name: string
  octave: number
  frequency: number
  midi: number
}

export interface TuningString {
  note: string
  octave: number
  freq: number
}

export interface TuningPreset {
  id: string
  name: { en: string; pl: string }
  strings: TuningString[]
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
export const DEFAULT_A4 = 440

export const NOISE_GATE_THRESHOLDS = {
  low: 0.006,
  medium: 0.012,
  high: 0.025,
} as const

/** Calculate frequency from MIDI note number with customizable A4 standard */
export function midiToFreq(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

/** Convert frequency to closest MIDI note and cents offset with customizable A4 standard */
export function freqToNote(
  freq: number,
  a4: number = DEFAULT_A4
): { note: string; octave: number; midi: number; targetFreq: number; cents: number } {
  if (freq <= 0 || !Number.isFinite(freq)) {
    return { note: '-', octave: 0, midi: 0, targetFreq: 0, cents: 0 }
  }

  const midiFraction = 69 + 12 * Math.log2(freq / a4)
  const midi = Math.round(midiFraction)
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const targetFreq = midiToFreq(midi, a4)
  const cents = Math.floor(1200 * Math.log2(freq / targetFreq))

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    midi,
    targetFreq,
    cents: Math.max(-50, Math.min(50, cents)),
  }
}

export const TUNING_PRESETS: TuningPreset[] = [
  {
    id: 'guitar-std',
    name: { en: 'Guitar (Standard)', pl: 'Gitara (Standardowa)' },
    strings: [
      { note: 'E', octave: 2, freq: 82.41 },
      { note: 'A', octave: 2, freq: 110.00 },
      { note: 'D', octave: 3, freq: 146.83 },
      { note: 'G', octave: 3, freq: 196.00 },
      { note: 'B', octave: 3, freq: 246.94 },
      { note: 'E', octave: 4, freq: 329.63 },
    ],
  },
  {
    id: 'guitar-drop-d',
    name: { en: 'Guitar (Drop D)', pl: 'Gitara (Drop D)' },
    strings: [
      { note: 'D', octave: 2, freq: 73.42 },
      { note: 'A', octave: 2, freq: 110.00 },
      { note: 'D', octave: 3, freq: 146.83 },
      { note: 'G', octave: 3, freq: 196.00 },
      { note: 'B', octave: 3, freq: 246.94 },
      { note: 'E', octave: 4, freq: 329.63 },
    ],
  },
  {
    id: 'bass-4',
    name: { en: 'Bass (4-String)', pl: 'Bas (4-strunowy)' },
    strings: [
      { note: 'E', octave: 1, freq: 41.20 },
      { note: 'A', octave: 1, freq: 55.00 },
      { note: 'D', octave: 2, freq: 73.42 },
      { note: 'G', octave: 2, freq: 98.00 },
    ],
  },
  {
    id: 'ukulele',
    name: { en: 'Ukulele (Standard)', pl: 'Ukulele (GCEA)' },
    strings: [
      { note: 'G', octave: 4, freq: 392.00 },
      { note: 'C', octave: 4, freq: 261.63 },
      { note: 'E', octave: 4, freq: 329.63 },
      { note: 'A', octave: 4, freq: 440.00 },
    ],
  },
  {
    id: 'chromatic',
    name: { en: 'Chromatic', pl: 'Chromatyczny' },
    strings: [],
  },
]

/** Returns calibrated string frequencies for the given preset based on A4 reference */
export function getCalibratedStrings(strings: TuningString[], a4: number = DEFAULT_A4): TuningString[] {
  if (a4 === DEFAULT_A4) return strings
  const ratio = a4 / DEFAULT_A4
  return strings.map((s) => ({
    ...s,
    freq: Math.round(s.freq * ratio * 100) / 100,
  }))
}

/**
 * Autocorrelation algorithm with parabolic interpolation
 */
export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
  noiseGateThreshold: number = NOISE_GATE_THRESHOLDS.medium
): number {
  const SIZE = buffer.length
  if (SIZE < 4) return -1

  let sumOfSquares = 0
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i]
    sumOfSquares += val * val
  }
  const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE)

  // Noise gate threshold: ignore quiet sounds
  if (rootMeanSquare < noiseGateThreshold) {
    return -1
  }

  // Trim silence at buffer edges
  let r1 = 0
  let r2 = SIZE - 1
  const thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i
      break
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i
      break
    }
  }

  const trimmed = buffer.slice(r1, r2)
  if (trimmed.length < 4) return -1

  const c = new Array(trimmed.length).fill(0)
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i]
    }
  }

  let d = 0
  while (d < trimmed.length - 1 && c[d] > c[d + 1]) {
    d++
  }
  let maxval = -1
  let maxpos = -1
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i]
      maxpos = i
    }
  }

  let T0 = maxpos
  if (T0 < 1 || T0 >= trimmed.length - 1) return -1

  // Parabolic interpolation for sub-sample accuracy
  const x1 = c[T0 - 1]
  const x2 = c[T0]
  const x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) {
    T0 = T0 - b / (2 * a)
  }

  return sampleRate / T0
}

/** Tone generator for reference pitch */
let globalAudioCtx: AudioContext | null = null
let activeOscillator: OscillatorNode | null = null
let activeGain: GainNode | null = null

export function playReferenceTone(freq: number) {
  stopReferenceTone()
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass()
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {})
    }

    const osc = globalAudioCtx.createOscillator()
    const gain = globalAudioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime)

    gain.gain.setValueAtTime(0.001, globalAudioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, globalAudioCtx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(globalAudioCtx.destination)

    osc.start()
    activeOscillator = osc
    activeGain = gain
  } catch (err) {
    console.error('Tone generation failed:', err)
  }
}

export function stopReferenceTone() {
  if (activeGain && globalAudioCtx && globalAudioCtx.state !== 'closed') {
    try {
      activeGain.gain.setValueAtTime(activeGain.gain.value, globalAudioCtx.currentTime)
      activeGain.gain.exponentialRampToValueAtTime(0.0001, globalAudioCtx.currentTime + 0.05)
      const currentOsc = activeOscillator
      setTimeout(() => {
        try {
          if (currentOsc) {
            currentOsc.stop()
            currentOsc.disconnect()
          }
        } catch {
          // Ignore
        }
      }, 60)
    } catch {
      if (activeOscillator) {
        try {
          activeOscillator.stop()
        } catch {
          // Ignore
        }
      }
    }
  } else if (activeOscillator) {
    try {
      activeOscillator.stop()
    } catch {
      // Ignore
    }
  }
  activeOscillator = null
  activeGain = null
}

/** Cleanly closes tone generator audio context when tool unmounts */
export function releaseGlobalAudio() {
  stopReferenceTone()
  if (globalAudioCtx && globalAudioCtx.state !== 'closed') {
    globalAudioCtx.close().catch(() => {})
    globalAudioCtx = null
  }
}
