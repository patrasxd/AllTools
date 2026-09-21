export type Locale = 'en' | 'pl'

export interface TunerTranslations {
  statsLabel: string
  startTuner: string
  stopTuner: string
  tuningLabel: string
  target: string
  listeningNoSignal: string
  readyToTune: string
  inTune: string
  flat: string
  sharp: string
  cents: string
  referenceTone: string
  settings: string
  calibrationA4: string
  calibrationDesc: string
  noiseGate: string
  noiseGateDesc: string
  sensitivityLow: string
  sensitivityMedium: string
  sensitivityHigh: string
  sensitivityHelp: {
    low: string
    medium: string
    high: string
  }
  close: string
  resetDefaults: string
  permissionDenied: string
  permissionHelp: string
  presets: {
    guitarStd: string
    guitarDropD: string
    bass: string
    ukulele: string
    chromatic: string
  }
}

export const tunerTranslations: Record<Locale, TunerTranslations> = {
  en: {
    statsLabel: 'Pitch Readout',
    startTuner: 'Start Tuner',
    stopTuner: 'Stop Tuner',
    tuningLabel: 'Tuning',
    target: 'target',
    listeningNoSignal: 'Listening… play a note',
    readyToTune: 'Press Start Tuner to begin',
    inTune: '✦ IN TUNE ✦',
    flat: '♭ FLAT',
    sharp: 'SHARP ♯',
    cents: 'CENTS',
    referenceTone: 'Reference Tone',
    settings: 'Tuner Settings',
    calibrationA4: 'Reference Pitch (A4)',
    calibrationDesc: 'Standard concert pitch is 440 Hz (scientific pitch is 432 Hz).',
    noiseGate: 'Sensitivity / Noise Filter',
    noiseGateDesc: 'Adjust sensitivity to match your environment and instrument volume.',
    sensitivityLow: 'High (Quiet)',
    sensitivityMedium: 'Normal',
    sensitivityHigh: 'Noise Filter',
    sensitivityHelp: {
      low: 'High sensitivity: picks up subtle acoustic resonance and quieter instruments.',
      medium: 'Standard sensitivity: balanced for typical acoustic and electric instruments.',
      high: 'Noise filter: suppresses ambient room noise, chatter, and interference.',
    },
    close: 'Close',
    resetDefaults: 'Reset Defaults',
    permissionDenied: 'Microphone Permission Needed',
    permissionHelp: 'Please grant microphone access in your browser to analyze acoustic pitch.',
    presets: {
      guitarStd: 'Guitar',
      guitarDropD: 'Drop D',
      bass: 'Bass',
      ukulele: 'Ukulele',
      chromatic: 'Chromatic',
    },
  },
  pl: {
    statsLabel: 'Odczyt częstotliwości',
    startTuner: 'Włącz Tuner',
    stopTuner: 'Wyłącz Tuner',
    tuningLabel: 'Strój',
    target: 'wzorzec',
    listeningNoSignal: 'Nasłuchiwanie… zagraj dźwięk',
    readyToTune: 'Naciśnij „Włącz Tuner", aby zacząć',
    inTune: '✦ NASTROJONE ✦',
    flat: '♭ ZA NISKO',
    sharp: 'ZA WYSOKO ♯',
    cents: 'CENTY',
    referenceTone: 'Dźwięk wzorcowy',
    settings: 'Ustawienia tunera',
    calibrationA4: 'Częstotliwość bazowa (A4)',
    calibrationDesc: 'Standard stroju koncertowego to 440 Hz (strój naukowy 432 Hz).',
    noiseGate: 'Czułość / Filtr szumów',
    noiseGateDesc: 'Dostosuj czułość mikrofonu do głośności instrumentu i otoczenia.',
    sensitivityLow: 'Wysoka (cicho)',
    sensitivityMedium: 'Normalna',
    sensitivityHigh: 'Filtr szumów',
    sensitivityHelp: {
      low: 'Wysoka czułość: wykrywa cichsze dźwięki i subtelne wybrzmienia.',
      medium: 'Normalna czułość: zrównoważona dla standardowych instrumentów.',
      high: 'Filtr szumów: tłumi hałasy otoczenia i rozmowy w tle.',
    },
    close: 'Zamknij',
    resetDefaults: 'Przywróć domyślne',
    permissionDenied: 'Wymagany dostęp do mikrofonu',
    permissionHelp: 'Zezwól na dostęp do mikrofonu w przeglądarce, aby umożliwić analizę dźwięku.',
    presets: {
      guitarStd: 'Gitara',
      guitarDropD: 'Drop D',
      bass: 'Bas',
      ukulele: 'Ukulele',
      chromatic: 'Chromatyczny',
    },
  },
}
