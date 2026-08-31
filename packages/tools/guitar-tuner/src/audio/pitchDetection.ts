export interface NoteInfo {
  name: string
  octave: number
  frequency: number
  midi: number
}

export interface TuningPreset {
  id: string
  name: { en: string; pl: string }
  strings: { note: string; octave: number; freq: number }[]
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const A4_FREQ = 440

/** Calculate frequency from MIDI note number (69 = A4 = 440Hz) */
export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - 69) / 12)
}

/** Convert frequency to closest MIDI note and cents offset */
export function freqToNote(freq: number): { note: string; octave: number; midi: number; targetFreq: number; cents: number } {
  if (freq <= 0) return { note: '-', octave: 0, midi: 0, targetFreq: 0, cents: 0 }
  
  const midiFraction = 69 + 12 * Math.log2(freq / A4_FREQ)
  const midi = Math.round(midiFraction)
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const targetFreq = midiToFreq(midi)
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

/**
 * Autocorrelation algorithm with parabolic interpolation
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length
  let sumOfSquares = 0
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i]
    sumOfSquares += val * val
  }
  const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE)

  // Noise gate threshold: ignore quiet sounds
  if (rootMeanSquare < 0.012) {
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
  const c = new Array(trimmed.length).fill(0)
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i]
    }
  }

  let d = 0
  while (c[d] > c[d + 1]) d++
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

export function playReferenceTone(freq: number, onStop?: () => void) {
  stopReferenceTone()
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContextClass()
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume()
    }

    const osc = globalAudioCtx.createOscillator()
    const gain = globalAudioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime)

    gain.gain.setValueAtTime(0.001, globalAudioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, globalAudioCtx.currentTime + 0.05)

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
  if (activeGain && globalAudioCtx) {
    try {
      activeGain.gain.setValueAtTime(activeGain.gain.value, globalAudioCtx.currentTime)
      activeGain.gain.exponentialRampToValueAtTime(0.0001, globalAudioCtx.currentTime + 0.05)
      setTimeout(() => {
        if (activeOscillator) {
          activeOscillator.stop()
          activeOscillator.disconnect()
          activeOscillator = null
        }
      }, 60)
    } catch {
      if (activeOscillator) {
        activeOscillator.stop()
        activeOscillator = null
      }
    }
  }
}
