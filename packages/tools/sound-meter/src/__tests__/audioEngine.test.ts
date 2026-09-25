import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { REFERENCE_LEVELS, getSoundReference, DecibelMeterEngine } from '../utils/audioEngine'
import { soundMeterTranslations } from '../i18n'

describe('sound-meter / audioEngine', () => {
  it('correctly maps decibel ranges to human references in English', () => {
    expect(getSoundReference(25, 'en')).toEqual({
      label: 'Quiet Room / Whisper',
      severity: 'calm',
    })
    expect(getSoundReference(45, 'en')).toEqual({
      label: 'Library / Moderate Room',
      severity: 'calm',
    })
    expect(getSoundReference(65, 'en')).toEqual({
      label: 'Normal Conversation / Office',
      severity: 'normal',
    })
    expect(getSoundReference(80, 'en')).toEqual({
      label: 'Street Traffic / Loud Music',
      severity: 'loud',
    })
    expect(getSoundReference(95, 'en')).toEqual({
      label: 'Heavy Machinery / Warning Level',
      severity: 'warning',
    })
    expect(getSoundReference(115, 'en')).toEqual({
      label: 'Siren / Hearing Damage Risk',
      severity: 'danger',
    })
  })

  it('correctly maps decibel ranges to human references in Polish', () => {
    expect(getSoundReference(25, 'pl')).toEqual({
      label: 'Cichy pokój / Szept',
      severity: 'calm',
    })
    expect(getSoundReference(65, 'pl')).toEqual({
      label: 'Normalna rozmowa / Biuro',
      severity: 'normal',
    })
    expect(getSoundReference(115, 'pl')).toEqual({
      label: 'Syreny alarmowe / Zagrożenie słuchu',
      severity: 'danger',
    })
  })

  it('handles edge cases beyond defined scale gracefully', () => {
    // Under minimum
    const under = getSoundReference(-10, 'en')
    expect(under.severity).toBe('danger') // fallback to last or clamped range

    // Over maximum
    const over = getSoundReference(180, 'en')
    expect(over.severity).toBe('danger')
  })

  it('provides complete translations for both en and pl', () => {
    expect(soundMeterTranslations.en.start).toBe('Start')
    expect(soundMeterTranslations.pl.start).toBe('Start')
    expect(soundMeterTranslations.en.pause).toBe('Pause')
    expect(soundMeterTranslations.pl.pause).toBe('Pauza')
    expect(soundMeterTranslations.en.meter).toBe('Meter')
    expect(soundMeterTranslations.pl.meter).toBe('Miernik')
  })

  describe('DecibelMeterEngine initial state', () => {
    let engine: DecibelMeterEngine

    beforeEach(() => {
      engine = new DecibelMeterEngine()
    })

    afterEach(() => {
      engine.stop()
    })

    it('returns 0 decibels when not running', () => {
      expect(engine.getCurrentDecibels()).toBe(0)
    })

    it('initializes with default weighting and 0 calibration', () => {
      expect(engine.weighting).toBe('dBA')
      expect(engine.calibrationOffset).toBe(0)
    })
  })
})
