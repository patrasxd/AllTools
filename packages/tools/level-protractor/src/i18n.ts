export type Locale = 'en' | 'pl'

export interface LevelProtractorTranslations {
  tabs: {
    level: string
    protractor: string
    compass: string
  }
  headers: {
    levelTitle: string
    protractorTitle: string
    compassTitle: string
    roll: string
    pitch: string
    status: string
    levelStatus: string
    tiltStatus: string
    angle: string
    rad: string
    supplementary: string
    heading: string
    direction: string
    type: string
    magnetic: string
  }
  status: {
    perfectLevel: string
    tiltDetected: string
    angleLocked: string
    headingLocked: string
    acuteAngle: string
    rightAngle: string
    obtuseAngle: string
    magneticNorth: string
    magneticHeading: string
  }
  cardinals: {
    N: string
    NE: string
    E: string
    SE: string
    S: string
    SW: string
    W: string
    NW: string
  }
  controls: {
    calibrate: string
    resetZero: string
    lock: string
    unlock: string
    reset45: string
    manualDial: string
    manualDialNoSensor: string
    settings: string
  }
  permission: {
    title: string
    description: string
    grantButton: string
    notNow: string
    reopen: string
  }
  settings: {
    title: string
    sensitivity: string
    sensitivityDesc: string
    toleranceHigh: string
    toleranceNormal: string
    toleranceCoarse: string
    tolerancePrecisionHelp: string
    toleranceNormalHelp: string
    toleranceCoarseHelp: string
    calibration: string
    calibrationDesc: string
    offsetLabel: string
    close: string
    resetDefaults: string
  }
}

export const levelTranslations: Record<Locale, LevelProtractorTranslations> = {
  en: {
    tabs: {
      level: 'Level',
      protractor: 'Protractor',
      compass: 'Compass',
    },
    headers: {
      levelTitle: '2D BUBBLE LEVEL',
      protractorTitle: 'PROTRACTOR',
      compassTitle: 'DIGITAL COMPASS',
      roll: 'ROLL',
      pitch: 'PITCH',
      status: 'STATUS',
      levelStatus: 'LEVEL',
      tiltStatus: 'TILT',
      angle: 'ANGLE',
      rad: 'RAD',
      supplementary: '180°-θ',
      heading: 'HEADING',
      direction: 'DIRECTION',
      type: 'TYPE',
      magnetic: 'MAGN.',
    },
    status: {
      perfectLevel: 'Perfect level (0.0°)',
      tiltDetected: 'Tilt detected',
      angleLocked: 'Angle locked',
      headingLocked: 'Heading locked',
      acuteAngle: 'Acute angle',
      rightAngle: 'Right angle',
      obtuseAngle: 'Obtuse angle',
      magneticNorth: 'Magnetic North',
      magneticHeading: 'Magnetic Heading',
    },
    cardinals: {
      N: 'North',
      NE: 'North-East',
      E: 'East',
      SE: 'South-East',
      S: 'South',
      SW: 'South-West',
      W: 'West',
      NW: 'North-West',
    },
    controls: {
      calibrate: 'Calibrate',
      resetZero: 'Reset Zero',
      lock: 'Lock',
      unlock: 'Unlock',
      reset45: 'Reset (45°)',
      manualDial: 'Manual Dial (Sensor unavailable):',
      manualDialNoSensor: 'Manual Dial (No sensor):',
      settings: 'Settings',
    },
    permission: {
      title: 'Motion Sensors Permission',
      description: 'Device orientation permissions are required on iOS Safari for live gyroscope and compass tracking.',
      grantButton: 'Enable Motion Sensors',
      notNow: 'Not Now',
      reopen: 'Sensors',
    },
    settings: {
      title: 'Sensor & Tool Settings',
      sensitivity: 'Level Sensitivity (Tolerance)',
      sensitivityDesc: 'Adjust how strictly the bubble must align with center to trigger the level state.',
      toleranceHigh: '0.2° (Precision)',
      toleranceNormal: '0.5° (Normal)',
      toleranceCoarse: '1.0° (Coarse)',
      tolerancePrecisionHelp: 'Precision: requires exact alignment for precision leveling.',
      toleranceNormalHelp: 'Standard tolerance: balanced for everyday carpentry and mounting.',
      toleranceCoarseHelp: 'Coarse tolerance: relaxed margin for quick alignment on uneven surfaces.',
      calibration: 'Zero Level Calibration',
      calibrationDesc: 'Zero out the bubble on an uneven surface.',
      offsetLabel: 'Offset',
      close: 'Close',
      resetDefaults: 'Reset Defaults',
    },
  },
  pl: {
    tabs: {
      level: 'Poziomica',
      protractor: 'Kątomierz',
      compass: 'Kompas',
    },
    headers: {
      levelTitle: 'POZIOMICA 2D',
      protractorTitle: 'KĄTOMIERZ',
      compassTitle: 'KOMPAS CYFROWY',
      roll: 'PRZECHYŁ BOK',
      pitch: 'PRZECHYŁ PRZÓD',
      status: 'STATUS',
      levelStatus: 'POZIOM',
      tiltStatus: 'PRZECHYŁ',
      angle: 'KĄT',
      rad: 'RAD',
      supplementary: '180°-θ',
      heading: 'AZYMUT',
      direction: 'KIERUNEK',
      type: 'TYP',
      magnetic: 'MAGN.',
    },
    status: {
      perfectLevel: 'Idealny poziom (0.0°)',
      tiltDetected: 'Wykryto nachylenie',
      angleLocked: 'Kąt zablokowany',
      headingLocked: 'Azymut zablokowany',
      acuteAngle: 'Kąt ostry',
      rightAngle: 'Kąt prosty',
      obtuseAngle: 'Kąt rozwarty',
      magneticNorth: 'Północ magnetyczna',
      magneticHeading: 'Kierunek magnetyczny',
    },
    cardinals: {
      N: 'Północ',
      NE: 'Północny wschód',
      E: 'Wschód',
      SE: 'Południowy wschód',
      S: 'Południe',
      SW: 'Południowy zachód',
      W: 'Zachód',
      NW: 'Północny zachód',
    },
    controls: {
      calibrate: 'Wyzeruj',
      resetZero: 'Resetuj zero',
      lock: 'Zablokuj',
      unlock: 'Odblokuj',
      reset45: 'Reset (45°)',
      manualDial: 'Ręczny obrót (brak czujnika):',
      manualDialNoSensor: 'Ręczny obrót (brak czujnika):',
      settings: 'Ustawienia',
    },
    permission: {
      title: 'Dostęp do czujników ruchu',
      description: 'W przeglądarce iOS Safari wymagana jest jednorazowa zgoda na dostęp do żyroskopu i kompasu.',
      grantButton: 'Włącz czujniki ruchu',
      notNow: 'Nie teraz',
      reopen: 'Czujniki',
    },
    settings: {
      title: 'Ustawienia czujników i narzędzia',
      sensitivity: 'Czułość poziomicy (Tolerancja)',
      sensitivityDesc: 'Dostosuj precyzję, z jaką pęcherzyk musi znaleźć się w centrum, aby wskazać poziom.',
      toleranceHigh: '0.2° (Precyzyjna)',
      toleranceNormal: '0.5° (Normalna)',
      toleranceCoarse: '1.0° (Zgrubna)',
      tolerancePrecisionHelp: 'Precyzja: wymaga dokładnego wypoziomowania pęcherzyka.',
      toleranceNormalHelp: 'Standardowa tolerancja: wyważona do codziennych pomiarów.',
      toleranceCoarseHelp: 'Zgrubna tolerancja: luźniejszy margines na nierównych powierzchniach.',
      calibration: 'Kalibracja poziomu zerowego',
      calibrationDesc: 'Wyzeruj poziomicę na dowolnej nierównej płaszczyźnie.',
      offsetLabel: 'Przesunięcie',
      close: 'Zamknij',
      resetDefaults: 'Przywróć domyślne',
    },
  },
}
