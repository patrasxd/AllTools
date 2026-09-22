export interface DevVaultTranslations {
  // Modes
  modePassword: string
  modeSubnet: string
  modeEncoder: string
  modeHash: string
  modeUuid: string

  // Status Titles
  statusPassword: string
  statusSubnet: string
  statusEncoder: string
  statusHash: string
  statusUuid: string

  // Top Stats Header
  headerPassword: string
  headerSubnet: string
  headerEncoder: string
  headerHash: string
  headerUuid: string
  labelLength: string
  labelEntropy: string
  labelBits: string
  labelHosts: string
  labelFormat: string
  labelSize: string
  labelAlgo: string

  // Actions
  copy: string
  copied: string
  clickToCopy: string
  regenerate: string
  newUuid: string
  decodeInput: string

  // Password Generator
  strength: string
  crackTime: string
  charsLength: string
  charsCount: string
  upper: string
  lower: string
  digits: string
  symbols: string
  noAmbiguous: string

  // Subnet Calculator
  ipCidrLabel: string
  ipPlaceholder: string
  invalidIpNotice: string
  networkAddress: string
  broadcastAddress: string
  firstHost: string
  lastHost: string
  netmask: string
  usableHosts: string
  classification: string

  // Encoder / Decoder
  enterInputPlaceholder: string
  encodedResultPlaceholder: string

  // Hash
  enterHashPlaceholder: string
  sha256: string
  sha512: string
  sha1: string
  md5: string

  // UUID & Epoch
  uuidV4: string
  unixEpochSeconds: string
  unixEpochMillis: string
  iso8601Utc: string
}

export const devVaultTranslations: Record<'en' | 'pl', DevVaultTranslations> = {
  en: {
    modePassword: 'Password',
    modeSubnet: 'Subnet',
    modeEncoder: 'Encoder',
    modeHash: 'Hashes',
    modeUuid: 'UUID',

    statusPassword: 'CSPRNG Password Generator',
    statusSubnet: 'IPv4 & CIDR Subnet Calculator',
    statusEncoder: 'Data Encoder & Decoder',
    statusHash: 'Cryptographic Hash Checksums',
    statusUuid: 'UUID v4 & Unix Epoch Generator',

    headerPassword: 'PASSWORD GENERATOR',
    headerSubnet: 'SUBNET CALCULATOR',
    headerEncoder: 'ENCODER & DECODER',
    headerHash: 'HASH CHECKSUM',
    headerUuid: 'UUID & EPOCH',
    labelLength: 'LENGTH',
    labelEntropy: 'ENTROPY',
    labelBits: 'bits',
    labelHosts: 'HOSTS',
    labelFormat: 'FORMAT',
    labelSize: 'SIZE',
    labelAlgo: 'ALGO',

    copy: 'Copy',
    copied: 'Copied',
    clickToCopy: 'Click to copy',
    regenerate: 'Regenerate',
    newUuid: 'New UUID',
    decodeInput: '↺ Decode input',

    strength: 'Strength:',
    crackTime: 'Difficulty:',
    charsLength: 'Length:',
    charsCount: 'chars',
    upper: 'Upper',
    lower: 'Lower',
    digits: 'Digits',
    symbols: 'Symbols',
    noAmbiguous: 'No ambiguous',

    ipCidrLabel: 'IPv4 Address & CIDR Prefix (e.g. 192.168.1.1/24)',
    ipPlaceholder: '192.168.1.1/24',
    invalidIpNotice: 'Enter valid IPv4 with CIDR (e.g. 10.0.0.1/16)',
    networkAddress: 'Network',
    broadcastAddress: 'Broadcast',
    firstHost: 'First Host',
    lastHost: 'Last Host',
    netmask: 'Netmask',
    usableHosts: 'Usable Hosts',
    classification: 'Classification',

    enterInputPlaceholder: 'Enter input text...',
    encodedResultPlaceholder: 'Encoded result...',

    enterHashPlaceholder: 'Enter string to hash...',
    sha256: 'SHA-256',
    sha512: 'SHA-512',
    sha1: 'SHA-1',
    md5: 'MD5',

    uuidV4: 'UUID v4',
    unixEpochSeconds: 'Unix Epoch (Seconds)',
    unixEpochMillis: 'Unix Epoch (Milliseconds)',
    iso8601Utc: 'ISO 8601 UTC',
  },
  pl: {
    modePassword: 'Hasła',
    modeSubnet: 'Podsieć',
    modeEncoder: 'Enkoder',
    modeHash: 'Hasze',
    modeUuid: 'UUID',

    statusPassword: 'Generator haseł CSPRNG',
    statusSubnet: 'Kalkulator podsieci IPv4 & CIDR',
    statusEncoder: 'Enkoder i dekoder danych',
    statusHash: 'Kryptograficzne sumy kontrolne',
    statusUuid: 'Generator UUID v4 i czas Unix',

    headerPassword: 'GENERATOR HASEŁ',
    headerSubnet: 'KALKULATOR PODSIECI',
    headerEncoder: 'ENKODER & DEKODER',
    headerHash: 'SUMY HASH',
    headerUuid: 'IDENTYFIKATORY',
    labelLength: 'DŁUGOŚĆ',
    labelEntropy: 'ENTROPIA',
    labelBits: 'bitów',
    labelHosts: 'HOSTY',
    labelFormat: 'FORMAT',
    labelSize: 'ROZMIAR',
    labelAlgo: 'ALGO',

    copy: 'Kopiuj',
    copied: 'Skopiowano',
    clickToCopy: 'Kliknij, aby skopiować',
    regenerate: 'Losuj',
    newUuid: 'Nowy UUID',
    decodeInput: '↺ Dekoduj wprost',

    strength: 'Siła:',
    crackTime: 'Trudność:',
    charsLength: 'Długość:',
    charsCount: 'znaków',
    upper: 'Wielkie',
    lower: 'Małe',
    digits: 'Cyfry',
    symbols: 'Symbole',
    noAmbiguous: 'Bez mylących',

    ipCidrLabel: 'Adres IPv4 i prefiks CIDR (np. 192.168.1.1/24)',
    ipPlaceholder: '192.168.1.1/24',
    invalidIpNotice: 'Wprowadź poprawny adres IPv4 z CIDR (np. 10.0.0.1/16)',
    networkAddress: 'Adres sieci',
    broadcastAddress: 'Broadcast',
    firstHost: 'Pierwszy host',
    lastHost: 'Ostatni host',
    netmask: 'Maska dziesiętna',
    usableHosts: 'Użyteczne hosty',
    classification: 'Klasyfikacja i typ',

    enterInputPlaceholder: 'Wprowadź tekst wejściowy...',
    encodedResultPlaceholder: 'Zakodowany wynik...',

    enterHashPlaceholder: 'Wprowadź tekst do obliczenia hasza...',
    sha256: 'SHA-256',
    sha512: 'SHA-512',
    sha1: 'SHA-1',
    md5: 'MD5',

    uuidV4: 'UUID v4',
    unixEpochSeconds: 'Unix Epoch (Sekundy)',
    unixEpochMillis: 'Unix Epoch (Milisekundy)',
    iso8601Utc: 'ISO 8601 UTC',
  },
}

export function getStrengthLabel(strength: { labelEn: string; labelPl: string }, locale: 'en' | 'pl'): string {
  const map: Record<'en' | 'pl', string> = {
    en: strength.labelEn,
    pl: strength.labelPl,
  }
  return map[locale] || map.en
}

export function getIpTypeLabel(subnet: { ipTypeEn: string; ipTypePl: string }, locale: 'en' | 'pl'): string {
  const map: Record<'en' | 'pl', string> = {
    en: subnet.ipTypeEn,
    pl: subnet.ipTypePl,
  }
  return map[locale] || map.en
}
