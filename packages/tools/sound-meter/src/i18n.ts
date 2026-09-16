export interface SoundMeterTranslations {
  title: string
  readyToMeasure: string
  startMicrophone: string
  permissionRequired: string
  permissionHelp: string
  current: string
  peak: string
  avg: string
  filter: string
  min: string
  maxPeak: string
  average: string
  meter: string
  settings: string
  frequencyWeighting: string
  humanEar: string
  flat: string
  offsetCalibration: string
  start: string
  pause: string
  reset: string
  resetTooltip: string
  now: string
  close: string
  einkStaticNotice?: string
}

export const soundMeterTranslations: Record<'en' | 'pl', SoundMeterTranslations> = {
  en: {
    title: 'SOUND LEVEL METER',
    readyToMeasure: 'Ready to measure',
    startMicrophone: 'Start microphone to measure noise levels',
    permissionRequired: 'Microphone Permission Required',
    permissionHelp: 'Please allow microphone access in your browser settings to measure noise.',
    current: 'CURRENT',
    peak: 'PEAK',
    avg: 'AVG',
    filter: 'FILTER',
    min: 'Min',
    maxPeak: 'Max / Peak',
    average: 'Average',
    meter: 'Meter',
    settings: 'Settings',
    frequencyWeighting: 'Frequency Weighting:',
    humanEar: 'dBA (Human Ear)',
    flat: 'dBZ (Flat)',
    offsetCalibration: 'Offset Calibration:',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    resetTooltip: 'Reset metrics',
    now: 'Now',
    close: 'Done',
    einkStaticNotice: 'E-Ink mode active (low-frequency redraw)',
  },
  pl: {
    title: 'DECYBELOMIERZ',
    readyToMeasure: 'Gotowy do pomiaru',
    startMicrophone: 'Uruchom mikrofon, aby rozpocząć pomiar',
    permissionRequired: 'Brak dostępu do mikrofonu',
    permissionHelp: 'Zezwól przeglądarce na dostęp do mikrofonu, aby korzystać z decybelomierza.',
    current: 'BIEŻĄCY',
    peak: 'SZCZYT',
    avg: 'ŚREDNIA',
    filter: 'FILTR',
    min: 'Minimum',
    maxPeak: 'Szczyt',
    average: 'Średnia',
    meter: 'Miernik',
    settings: 'Kalibracja',
    frequencyWeighting: 'Krzywa ważenia:',
    humanEar: 'dBA (Ucho)',
    flat: 'dBZ (Płaski)',
    offsetCalibration: 'Kompensacja mikrofonu:',
    start: 'Start',
    pause: 'Pauza',
    reset: 'Reset',
    resetTooltip: 'Zresetuj statystyki',
    now: 'Teraz',
    close: 'Gotowe',
    einkStaticNotice: 'Tryb E-Ink aktywny (zredukowane odświeżanie)',
  },
}
