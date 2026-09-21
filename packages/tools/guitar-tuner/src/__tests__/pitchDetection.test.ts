import { describe, it, expect } from 'vitest'
import {
  midiToFreq,
  freqToNote,
  autoCorrelate,
  TUNING_PRESETS,
  DEFAULT_A4,
  NOISE_GATE_THRESHOLDS,
  getCalibratedStrings,
} from '../audio/pitchDetection'

describe('Pitch Detection Engine', () => {
  describe('midiToFreq', () => {
    it('calculates standard concert A4 (MIDI 69) as 440 Hz', () => {
      expect(midiToFreq(69)).toBe(440)
    })

    it('calculates octave intervals accurately', () => {
      // A3 (MIDI 57) is exactly one octave down: 220 Hz
      expect(midiToFreq(57)).toBe(220)
      // A5 (MIDI 81) is exactly one octave up: 880 Hz
      expect(midiToFreq(81)).toBe(880)
    })

    it('calculates guitar low E2 (MIDI 40) approximately 82.41 Hz', () => {
      const e2 = midiToFreq(40)
      expect(e2).toBeCloseTo(82.41, 1)
    })

    it('respects custom A4 standard frequency (e.g. 432 Hz)', () => {
      expect(midiToFreq(69, 432)).toBe(432)
      expect(midiToFreq(57, 432)).toBe(216)
    })
  })

  describe('freqToNote', () => {
    it('accurately identifies concert A4 at 440 Hz with 0 cents offset', () => {
      const result = freqToNote(440)
      expect(result.note).toBe('A')
      expect(result.octave).toBe(4)
      expect(result.targetFreq).toBe(440)
      expect(result.cents).toBe(0)
    })

    it('detects sharp pitch (+cents)', () => {
      const result = freqToNote(445)
      expect(result.note).toBe('A')
      expect(result.octave).toBe(4)
      expect(result.cents).toBeGreaterThan(0)
      expect(result.cents).toBeLessThanOrEqual(50)
    })

    it('detects flat pitch (-cents)', () => {
      const result = freqToNote(435)
      expect(result.note).toBe('A')
      expect(result.octave).toBe(4)
      expect(result.cents).toBeLessThan(0)
      expect(result.cents).toBeGreaterThanOrEqual(-50)
    })

    it('identifies guitar open strings', () => {
      // Low E2: ~82.41 Hz
      expect(freqToNote(82.41).note).toBe('E')
      expect(freqToNote(82.41).octave).toBe(2)

      // D3: ~146.83 Hz
      expect(freqToNote(146.83).note).toBe('D')
      expect(freqToNote(146.83).octave).toBe(3)

      // High E4: ~329.63 Hz
      expect(freqToNote(329.63).note).toBe('E')
      expect(freqToNote(329.63).octave).toBe(4)
    })

    it('handles zero or invalid frequencies gracefully', () => {
      expect(freqToNote(0).note).toBe('-')
      expect(freqToNote(-100).note).toBe('-')
      expect(freqToNote(NaN).note).toBe('-')
    })

    it('supports custom A4 standard in freqToNote', () => {
      // When A4 is calibrated to 432 Hz, 432 Hz should be A4 with 0 cents offset
      const result = freqToNote(432, 432)
      expect(result.note).toBe('A')
      expect(result.octave).toBe(4)
      expect(result.cents).toBe(0)
    })
  })

  describe('autoCorrelate', () => {
    const sampleRate = 44100

    it('returns -1 for silent audio', () => {
      const silence = new Float32Array(2048).fill(0)
      expect(autoCorrelate(silence, sampleRate)).toBe(-1)
    })

    it('returns -1 for very quiet noise below threshold', () => {
      const quietNoise = new Float32Array(2048)
      for (let i = 0; i < quietNoise.length; i++) {
        quietNoise[i] = (Math.random() - 0.5) * 0.005
      }
      expect(autoCorrelate(quietNoise, sampleRate, NOISE_GATE_THRESHOLDS.medium)).toBe(-1)
    })

    it('accurately detects a synthetic 440 Hz sine wave', () => {
      const buffer = new Float32Array(2048)
      const targetFreq = 440
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate) * 0.8
      }

      const detected = autoCorrelate(buffer, sampleRate)
      expect(detected).toBeGreaterThan(0)
      expect(Math.abs(detected - 440)).toBeLessThan(1.5)
    })

    it('accurately detects a synthetic 110 Hz sine wave (A2)', () => {
      const buffer = new Float32Array(2048)
      const targetFreq = 110
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate) * 0.8
      }

      const detected = autoCorrelate(buffer, sampleRate)
      expect(detected).toBeGreaterThan(0)
      expect(Math.abs(detected - 110)).toBeLessThan(1.5)
    })
  })

  describe('Tuning Presets and Calibration', () => {
    it('contains standard instruments presets', () => {
      const presetIds = TUNING_PRESETS.map((p) => p.id)
      expect(presetIds).toContain('guitar-std')
      expect(presetIds).toContain('guitar-drop-d')
      expect(presetIds).toContain('bass-4')
      expect(presetIds).toContain('ukulele')
      expect(presetIds).toContain('chromatic')
    })

    it('defines standard guitar strings accurately', () => {
      const guitar = TUNING_PRESETS.find((p) => p.id === 'guitar-std')!
      expect(guitar.strings).toHaveLength(6)
      expect(guitar.strings.map((s) => s.note)).toEqual(['E', 'A', 'D', 'G', 'B', 'E'])
    })

    it('calibrates preset strings proportionally to custom A4', () => {
      const guitar = TUNING_PRESETS.find((p) => p.id === 'guitar-std')!
      const calibrated = getCalibratedStrings(guitar.strings, 432)

      expect(calibrated).toHaveLength(guitar.strings.length)
      // A2 was 110.00 Hz at 440 -> at 432 it should be 110 * (432/440) = 108.00 Hz
      const aString = calibrated.find((s) => s.note === 'A')!
      expect(aString.freq).toBe(108)
    })
  })
})
