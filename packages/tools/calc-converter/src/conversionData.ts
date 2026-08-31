import { UnitCategory } from './types'

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'weight',
    name: { en: 'Weight & Mass', pl: 'Masa / Waga' },
    baseUnit: 'kg',
    units: [
      { id: 'kg', name: { en: 'Kilogram', pl: 'Kilogram' }, symbol: 'kg', factor: 1, keywords: ['kilo', 'kilogramy'] },
      { id: 'g', name: { en: 'Gram', pl: 'Gram' }, symbol: 'g', factor: 0.001, keywords: ['gramy'] },
      { id: 'mg', name: { en: 'Milligram', pl: 'Miligram' }, symbol: 'mg', factor: 0.000001, keywords: ['miligramy'] },
      { id: 't', name: { en: 'Tonne', pl: 'Tona' }, symbol: 't', factor: 1000, keywords: ['tony'] },
      { id: 'lb', name: { en: 'Pound', pl: 'Funt' }, symbol: 'lb', factor: 0.45359237, keywords: ['funty', 'lbs', 'pounds'] },
      { id: 'oz', name: { en: 'Ounce', pl: 'Uncja' }, symbol: 'oz', factor: 0.028349523125, keywords: ['uncje', 'ounces'] },
      { id: 'st', name: { en: 'Stone', pl: 'Kamień' }, symbol: 'st', factor: 6.35029318, keywords: ['kamienie', 'stones'] },
    ],
  },
  {
    id: 'length',
    name: { en: 'Length & Distance', pl: 'Długość' },
    baseUnit: 'm',
    units: [
      { id: 'm', name: { en: 'Meter', pl: 'Metr' }, symbol: 'm', factor: 1, keywords: ['metry'] },
      { id: 'km', name: { en: 'Kilometer', pl: 'Kilometr' }, symbol: 'km', factor: 1000, keywords: ['kilometry'] },
      { id: 'cm', name: { en: 'Centimeter', pl: 'Centymetr' }, symbol: 'cm', factor: 0.01, keywords: ['centymetry'] },
      { id: 'mm', name: { en: 'Millimeter', pl: 'Milimetr' }, symbol: 'mm', factor: 0.001, keywords: ['milimetry'] },
      { id: 'in', name: { en: 'Inch', pl: 'Cal' }, symbol: 'in', factor: 0.0254, keywords: ['cale', 'inches', '"'] },
      { id: 'ft', name: { en: 'Foot', pl: 'Stopa' }, symbol: 'ft', factor: 0.3048, keywords: ['stopy', 'feet', "'"] },
      { id: 'yd', name: { en: 'Yard', pl: 'Jard' }, symbol: 'yd', factor: 0.9144, keywords: ['jardy', 'yards'] },
      { id: 'mi', name: { en: 'Mile', pl: 'Mila lądowa' }, symbol: 'mi', factor: 1609.344, keywords: ['mile', 'miles'] },
      { id: 'nm', name: { en: 'Nautical Mile', pl: 'Mila morska' }, symbol: 'NM', factor: 1852, keywords: ['mila morska', 'nautical miles'] },
    ],
  },
  {
    id: 'volume',
    name: { en: 'Volume & Kitchen', pl: 'Objętość & Kuchnia' },
    baseUnit: 'ml',
    units: [
      { id: 'ml', name: { en: 'Milliliter', pl: 'Mililitr' }, symbol: 'ml', factor: 1, keywords: ['mililitry'] },
      { id: 'l', name: { en: 'Liter', pl: 'Litr' }, symbol: 'l', factor: 1000, keywords: ['litry'] },
      { id: 'cup_pl', name: { en: 'Glass (250 ml)', pl: 'Szklanka (250 ml)' }, symbol: 'szklanka', factor: 250, keywords: ['szklanki', 'kubek'] },
      { id: 'cup_us', name: { en: 'US Cup (240 ml)', pl: 'US Cup (240 ml)' }, symbol: 'cup', factor: 236.5882365, keywords: ['cups', 'amerykanska'] },
      { id: 'tbsp', name: { en: 'Tablespoon (15 ml)', pl: 'Łyżka stołowa (15 ml)' }, symbol: 'tbsp', factor: 15, keywords: ['lyzka', 'lyzki', 'tablespoon'] },
      { id: 'tsp', name: { en: 'Teaspoon (5 ml)', pl: 'Łyżeczka (5 ml)' }, symbol: 'tsp', factor: 5, keywords: ['lyzeczka', 'lyzeczki', 'teaspoon'] },
      { id: 'fl_oz', name: { en: 'US Fluid Ounce', pl: 'Uncja płynu (US)' }, symbol: 'fl oz', factor: 29.5735296, keywords: ['fluid ounce', 'uncja plynu'] },
      { id: 'gal_us', name: { en: 'US Gallon', pl: 'Galon US' }, symbol: 'gal (US)', factor: 3785.411784, keywords: ['galon', 'galony', 'gallon'] },
      { id: 'pt_us', name: { en: 'US Pint', pl: 'Pinta US' }, symbol: 'pt', factor: 473.176473, keywords: ['pinta', 'pint'] },
    ],
  },
  {
    id: 'speed',
    name: { en: 'Speed', pl: 'Prędkość' },
    baseUnit: 'kmh',
    units: [
      { id: 'kmh', name: { en: 'Kilometers per hour', pl: 'Kilometry na godzinę' }, symbol: 'km/h', factor: 1, keywords: ['km/h', 'kph'] },
      { id: 'mph', name: { en: 'Miles per hour', pl: 'Mile na godzinę' }, symbol: 'mph', factor: 1.609344, keywords: ['mph', 'mile/h'] },
      { id: 'kn', name: { en: 'Knots', pl: 'Węzły' }, symbol: 'kn', factor: 1.852, keywords: ['wezly', 'knots', 'kt'] },
      { id: 'ms', name: { en: 'Meters per second', pl: 'Metry na sekundę' }, symbol: 'm/s', factor: 3.6, keywords: ['m/s'] },
      { id: 'mach', name: { en: 'Mach (at 15°C)', pl: 'Mach (15°C)' }, symbol: 'Ma', factor: 1225.044, keywords: ['mach'] },
    ],
  },
  {
    id: 'temperature',
    name: { en: 'Temperature', pl: 'Temperatura' },
    baseUnit: 'c',
    units: [
      {
        id: 'c',
        name: { en: 'Celsius', pl: 'Celsjusz' },
        symbol: '°C',
        toBase: (v) => v,
        fromBase: (v) => v,
        keywords: ['celsjusz', 'stopnie c'],
      },
      {
        id: 'f',
        name: { en: 'Fahrenheit', pl: 'Fahrenheit' },
        symbol: '°F',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
        keywords: ['fahrenheit', 'stopnie f'],
      },
      {
        id: 'k',
        name: { en: 'Kelvin', pl: 'Kelvin' },
        symbol: 'K',
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
        keywords: ['kelvin', 'kelwin'],
      },
    ],
  },
  {
    id: 'fuel',
    name: { en: 'Fuel Economy', pl: 'Spalanie paliwa' },
    baseUnit: 'l100km',
    units: [
      {
        id: 'l100km',
        name: { en: 'Liters per 100 km', pl: 'Litry na 100 km' },
        symbol: 'l/100km',
        toBase: (v) => v,
        fromBase: (v) => v,
        keywords: ['spalanie', 'l/100km', 'litry'],
      },
      {
        id: 'mpg_us',
        name: { en: 'Miles per Gallon (US)', pl: 'Mile na galon (US)' },
        symbol: 'MPG (US)',
        toBase: (v) => (v > 0 ? 235.214583 / v : 0),
        fromBase: (v) => (v > 0 ? 235.214583 / v : 0),
        keywords: ['mpg', 'mpg us', 'mile na galon'],
      },
      {
        id: 'mpg_uk',
        name: { en: 'Miles per Gallon (UK)', pl: 'Mile na galon (UK)' },
        symbol: 'MPG (UK)',
        toBase: (v) => (v > 0 ? 282.481 / v : 0),
        fromBase: (v) => (v > 0 ? 282.481 / v : 0),
        keywords: ['mpg uk', 'brytyjskie mpg'],
      },
      {
        id: 'kml',
        name: { en: 'Kilometers per Liter', pl: 'Kilometry na litr' },
        symbol: 'km/l',
        toBase: (v) => (v > 0 ? 100 / v : 0),
        fromBase: (v) => (v > 0 ? 100 / v : 0),
        keywords: ['km/l', 'kilometry na litr'],
      },
    ],
  },
  {
    id: 'pressure',
    name: { en: 'Pressure', pl: 'Ciśnienie' },
    baseUnit: 'bar',
    units: [
      { id: 'bar', name: { en: 'Bar', pl: 'Bar' }, symbol: 'bar', factor: 1, keywords: ['bary', 'opony'] },
      { id: 'psi', name: { en: 'Pound per Square Inch', pl: 'PSI (funt/cal²)' }, symbol: 'PSI', factor: 0.0689475729, keywords: ['psi', 'kola', 'opona'] },
      { id: 'kpa', name: { en: 'Kilopascal', pl: 'Kilopaskal' }, symbol: 'kPa', factor: 0.01, keywords: ['kpa', 'paskale'] },
      { id: 'mpa', name: { en: 'Megapascal', pl: 'Megapaskal' }, symbol: 'MPa', factor: 10, keywords: ['mpa'] },
      { id: 'atm', name: { en: 'Standard Atmosphere', pl: 'Atmosfera' }, symbol: 'atm', factor: 1.01325, keywords: ['atmosfera'] },
      { id: 'mmhg', name: { en: 'Millimeters of Mercury', pl: 'mmHg (Tor)' }, symbol: 'mmHg', factor: 0.00133322387, keywords: ['mmhg', 'cisnienie krwi', 'torr'] },
    ],
  },
  {
    id: 'area',
    name: { en: 'Area', pl: 'Powierzchnia' },
    baseUnit: 'm2',
    units: [
      { id: 'm2', name: { en: 'Square Meter', pl: 'Metr kwadratowy' }, symbol: 'm²', factor: 1, keywords: ['m2', 'metry kwadratowe', 'mieszkanie'] },
      { id: 'ha', name: { en: 'Hectare', pl: 'Hektar' }, symbol: 'ha', factor: 10000, keywords: ['hektary', 'dzialka'] },
      { id: 'a', name: { en: 'Are', pl: 'Ar' }, symbol: 'a', factor: 100, keywords: ['ary'] },
      { id: 'sq_ft', name: { en: 'Square Foot', pl: 'Stopa kwadratowa' }, symbol: 'sq ft', factor: 0.09290304, keywords: ['sq ft', 'ft2', 'stopy kwadratowe'] },
      { id: 'acre', name: { en: 'Acre', pl: 'Akr' }, symbol: 'acre', factor: 4046.8564224, keywords: ['akry', 'acres'] },
      { id: 'km2', name: { en: 'Square Kilometer', pl: 'Kilometr kwadratowy' }, symbol: 'km²', factor: 1000000, keywords: ['km2'] },
    ],
  },
  {
    id: 'data',
    name: { en: 'Data & Memory', pl: 'Dane & Pamięć' },
    baseUnit: 'B',
    units: [
      { id: 'b', name: { en: 'Bit', pl: 'Bit' }, symbol: 'b', factor: 0.125, keywords: ['bity', 'bits'] },
      { id: 'B', name: { en: 'Byte', pl: 'Bajt' }, symbol: 'B', factor: 1, keywords: ['bajty', 'bytes'] },
      { id: 'KB', name: { en: 'Kilobyte (1000 B)', pl: 'Kilobajt (1000 B)' }, symbol: 'KB', factor: 1000, keywords: ['kb', 'kilobajty'] },
      { id: 'MB', name: { en: 'Megabyte (1000 KB)', pl: 'Megabajt (1000 KB)' }, symbol: 'MB', factor: 1000000, keywords: ['mb', 'megabajty'] },
      { id: 'GB', name: { en: 'Gigabyte (1000 MB)', pl: 'Gigabajt (1000 MB)' }, symbol: 'GB', factor: 1000000000, keywords: ['gb', 'gigabajty'] },
      { id: 'TB', name: { en: 'Terabyte (1000 GB)', pl: 'Terabajt (1000 GB)' }, symbol: 'TB', factor: 1000000000000, keywords: ['tb', 'terabajty'] },
      { id: 'KiB', name: { en: 'Kibibyte (1024 B)', pl: 'Kibibajt (1024 B)' }, symbol: 'KiB', factor: 1024, keywords: ['kib'] },
      { id: 'MiB', name: { en: 'Mebibyte (1024 KiB)', pl: 'Mebibajt (1024 KiB)' }, symbol: 'MiB', factor: 1048576, keywords: ['mib'] },
      { id: 'GiB', name: { en: 'Gibibyte (1024 MiB)', pl: 'Gibibajt (1024 MiB)' }, symbol: 'GiB', factor: 1073741824, keywords: ['gib'] },
    ],
  },
  {
    id: 'radix',
    name: { en: 'Number Systems', pl: 'Systemy liczbowe' },
    baseUnit: 'dec',
    units: [
      { id: 'dec', name: { en: 'Decimal (Base 10)', pl: 'Dziesiętny (DEC)' }, symbol: 'DEC', keywords: ['dec', 'dziesietny', '10'] },
      { id: 'hex', name: { en: 'Hexadecimal (Base 16)', pl: 'Szesnastkowy (HEX)' }, symbol: 'HEX', keywords: ['hex', 'szesnastkowy', '16'] },
      { id: 'bin', name: { en: 'Binary (Base 2)', pl: 'Binarny / Dwójkowy (BIN)' }, symbol: 'BIN', keywords: ['bin', 'binarny', 'dwojkowy', '2', '01'] },
      { id: 'oct', name: { en: 'Octal (Base 8)', pl: 'Ósemkowy (OCT)' }, symbol: 'OCT', keywords: ['oct', 'osemkowy', '8'] },
      { id: 'ascii', name: { en: 'ASCII Text', pl: 'Tekst ASCII' }, symbol: 'ASCII', keywords: ['ascii', 'znaki', 'kod'] },
    ],
  },
  {
    id: 'time',
    name: { en: 'Time', pl: 'Czas' },
    baseUnit: 's',
    units: [
      { id: 'ms', name: { en: 'Millisecond', pl: 'Milisekunda' }, symbol: 'ms', factor: 0.001, keywords: ['milisekundy'] },
      { id: 's', name: { en: 'Second', pl: 'Sekunda' }, symbol: 's', factor: 1, keywords: ['sekundy'] },
      { id: 'min', name: { en: 'Minute', pl: 'Minuta' }, symbol: 'min', factor: 60, keywords: ['minuty'] },
      { id: 'h', name: { en: 'Hour', pl: 'Godzina' }, symbol: 'h', factor: 3600, keywords: ['godziny'] },
      { id: 'd', name: { en: 'Day', pl: 'Dzień' }, symbol: 'd', factor: 86400, keywords: ['dni', 'doba'] },
      { id: 'wk', name: { en: 'Week', pl: 'Tydzień' }, symbol: 'wk', factor: 604800, keywords: ['tygodnie'] },
      { id: 'yr', name: { en: 'Year (365d)', pl: 'Rok (365 dni)' }, symbol: 'yr', factor: 31536000, keywords: ['lata', 'rok'] },
    ],
  },
]

/**
 * Converts a numeric value between units in a category
 */
export function convertValue(
  value: number,
  fromUnitId: string,
  toUnitId: string,
  category: UnitCategory
): number {
  if (fromUnitId === toUnitId) return value
  if (isNaN(value)) return 0

  const fromUnit = category.units.find((u) => u.id === fromUnitId)
  const toUnit = category.units.find((u) => u.id === toUnitId)
  if (!fromUnit || !toUnit) return 0

  // 1. Convert `fromUnit` -> `baseUnit`
  let baseVal: number
  if (fromUnit.toBase) {
    baseVal = fromUnit.toBase(value)
  } else if (fromUnit.factor !== undefined) {
    baseVal = value * fromUnit.factor
  } else {
    baseVal = value
  }

  // 2. Convert `baseUnit` -> `toUnit`
  let resultVal: number
  if (toUnit.fromBase) {
    resultVal = toUnit.fromBase(baseVal)
  } else if (toUnit.factor !== undefined) {
    resultVal = baseVal / toUnit.factor
  } else {
    resultVal = baseVal
  }

  return resultVal
}

/**
 * Handles Radix / Number system conversion (DEC, HEX, BIN, OCT, ASCII)
 */
export function convertRadix(
  rawInput: string,
  fromUnitId: string,
  toUnitId: string
): string {
  const input = rawInput.trim()
  if (!input) return ''

  let decNum: bigint | null = null

  try {
    if (fromUnitId === 'dec') {
      const clean = input.replace(/\s+/g, '')
      if (/^-?\d+$/.test(clean)) decNum = BigInt(clean)
    } else if (fromUnitId === 'hex') {
      const clean = input.replace(/^(0x|#)/i, '').replace(/\s+/g, '')
      if (/^[0-9a-fA-F]+$/.test(clean)) decNum = BigInt(`0x${clean}`)
    } else if (fromUnitId === 'bin') {
      const clean = input.replace(/^(0b)/i, '').replace(/\s+/g, '')
      if (/^[01]+$/.test(clean)) decNum = BigInt(`0b${clean}`)
    } else if (fromUnitId === 'oct') {
      const clean = input.replace(/^(0o)/i, '').replace(/\s+/g, '')
      if (/^[0-7]+$/.test(clean)) decNum = BigInt(`0o${clean}`)
    } else if (fromUnitId === 'ascii') {
      if (input.length > 0) {
        let val = BigInt(0)
        for (let i = 0; i < input.length; i++) {
          val = (val << BigInt(8)) + BigInt(input.charCodeAt(i))
        }
        decNum = val
      }
    }
  } catch {
    return 'Invalid'
  }

  if (decNum === null) return '—'

  try {
    if (toUnitId === 'dec') return decNum.toString(10)
    if (toUnitId === 'hex') return decNum.toString(16).toUpperCase()
    if (toUnitId === 'bin') return decNum.toString(2)
    if (toUnitId === 'oct') return decNum.toString(8)
    if (toUnitId === 'ascii') {
      let hex = decNum.toString(16)
      if (hex.length % 2 !== 0) hex = '0' + hex
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16)
        if (code >= 32 && code <= 126) {
          str += String.fromCharCode(code)
        } else {
          str += '·'
        }
      }
      return str || '—'
    }
  } catch {
    return '—'
  }

  return '—'
}

/**
 * Format converted number cleanly (avoid ugly floating precision like 0.00000000000001 or 12.3000000000004)
 */
export function formatFormattedValue(val: number): string {
  if (isNaN(val)) return '0'
  if (!isFinite(val)) return '∞'

  const abs = Math.abs(val)
  if (abs === 0) return '0'

  if (abs >= 1e12 || (abs < 1e-6 && abs > 0)) {
    return val.toExponential(4).replace(/\.0+e/, 'e')
  }

  // Round to up to 6 significant fractional digits
  const str = val.toLocaleString('en-US', {
    maximumFractionDigits: 6,
    useGrouping: false,
  })
  return str
}
