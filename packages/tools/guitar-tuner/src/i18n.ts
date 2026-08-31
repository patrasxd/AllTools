export type Locale = 'en' | 'pl'

export interface TunerTranslations {
  statsLabel: string
  startTuner: string
  stopTuner: string
  tuningLabel: string
  target: string
  listeningNoSignal: string
  readyToTune: string
}

export const tunerTranslations: Record<Locale, TunerTranslations> = {
  en: {
    statsLabel: 'Pitch Readout',
    startTuner: 'Start Tuner',
    stopTuner: 'Stop Tuner',
    tuningLabel: 'Tuning',
    target: 'target',
    listeningNoSignal: 'Listening… no signal',
    readyToTune: 'Press Start Tuner to begin',
  },
  pl: {
    statsLabel: 'Odczyt częstotliwości',
    startTuner: 'Włącz Tuner',
    stopTuner: 'Wyłącz Tuner',
    tuningLabel: 'Strój',
    target: 'cel',
    listeningNoSignal: 'Nasłuchiwanie… brak sygnału',
    readyToTune: 'Naciśnij „Włącz Tuner" aby zacząć',
  },
}
