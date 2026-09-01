import type { PasswordConfig, PasswordStrength, SubnetInfo, HashAlgorithm } from '../types'

// ─── 1. CSPRNG Random Utility with Unbiased Rejection Sampling ───
function getRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0
  const maxUint32 = 0xffffffff
  const limit = maxUint32 - (maxUint32 % maxExclusive)
  const buffer = new Uint32Array(1)

  while (true) {
    window.crypto.getRandomValues(buffer)
    if (buffer[0] < limit) {
      return buffer[0] % maxExclusive
    }
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1)
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

// ─── 2. Password Generator ─────────────────────────────────────
const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const CHARS_NUMBERS = '0123456789'
const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

const AMBIGUOUS = /[0OIl1]/g

const PASSPHRASE_WORDS_EN = [
  'alpha', 'beacon', 'breeze', 'canyon', 'castle', 'cherry', 'cipher', 'comet',
  'crater', 'crystal', 'delta', 'dragon', 'echo', 'ember', 'falcon', 'feather',
  'flame', 'forest', 'frost', 'galaxy', 'glacier', 'gravity', 'haven', 'horizon',
  'island', 'jaguar', 'jungle', 'jupiter', 'knight', 'lagoon', 'lantern', 'laser',
  'legend', 'lunar', 'magnet', 'matrix', 'meadow', 'meteor', 'monarch', 'nebula',
  'ninja', 'nomad', 'oasis', 'ocean', 'orbit', 'orchid', 'panther', 'phoenix',
  'planet', 'prism', 'pulse', 'pyramid', 'quantum', 'radar', 'raptor', 'raven',
  'rocket', 'ruby', 'safari', 'sailor', 'saturn', 'shadow', 'shield', 'siren',
  'solar', 'sphinx', 'spirit', 'spring', 'stream', 'summit', 'sunburst', 'tempest',
  'thunder', 'timber', 'titan', 'topaz', 'torrent', 'tower', 'tsunami', 'tundra',
  'twilight', 'typhoon', 'unicorn', 'valley', 'vector', 'velvet', 'vessel', 'viper',
  'vortex', 'voyage', 'vulcan', 'walrus', 'warrior', 'whirlpool', 'willow', 'wizard',
  'zenith', 'zephyr', 'zodiac'
]

const PASSPHRASE_WORDS_PL = [
  'bizon', 'brama', 'burza', 'chmura', 'cisza', 'diament', 'dolina', 'droga',
  'drzewo', 'delfin', 'ekran', 'fala', 'flota', 'forteca', 'gad', 'galaktyka',
  'gazela', 'gora', 'gwiazda', 'haslo', 'horyzont', 'iskra', 'jaskinia', 'jastrzab',
  'jezioro', 'kamien', 'kanion', 'koral', 'korona', 'kotwica', 'krysztal', 'ksiezyc',
  'las', 'lawina', 'lider', 'lucznik', 'magia', 'maszt', 'miecz', 'mistrz',
  'morze', 'motyl', 'namiot', 'nawias', 'ocean', 'ogniwo', 'orzel', 'palma',
  'pantera', 'piasek', 'piorun', 'planeta', 'plotka', 'podroz', 'potok', 'promien',
  'przystan', 'rakieta', 'rycerz', 'rzeka', 'safari', 'sokol', 'sosna', 'straznik',
  'strzala', 'szmaragd', 'szczyt', 'sztorm', 'tarcza', 'tygrys', 'topaz', 'torpeda',
  'twierdza', 'wiatr', 'widok', 'wiosna', 'woda', 'wodospad', 'wulkan', 'wyspa',
  'zamek', 'zatoka', 'zegar', 'zrodlo', 'zorza', 'zwyciestwo', 'zywiol'
]

export function generateSecurePassword(config: PasswordConfig, locale: 'en' | 'pl' = 'en'): string {
  if (config.mode === 'passphrase') {
    const wordList = locale === 'pl' ? PASSPHRASE_WORDS_PL : PASSPHRASE_WORDS_EN
    const words: string[] = []
    for (let i = 0; i < config.passphraseWords; i++) {
      const idx = getRandomInt(wordList.length)
      words.push(wordList[idx])
    }
    return words.join(config.passphraseSeparator || '-')
  }

  let upper = CHARS_UPPER
  let lower = CHARS_LOWER
  let numbers = CHARS_NUMBERS
  let symbols = CHARS_SYMBOLS

  if (config.excludeAmbiguous) {
    upper = upper.replace(AMBIGUOUS, '')
    lower = lower.replace(AMBIGUOUS, '')
    numbers = numbers.replace(AMBIGUOUS, '')
  }

  const activePools: string[] = []
  if (config.includeUpper) activePools.push(upper)
  if (config.includeLower) activePools.push(lower)
  if (config.includeNumbers) activePools.push(numbers)
  if (config.includeSymbols) activePools.push(symbols)

  if (activePools.length === 0) {
    activePools.push(lower)
  }

  const passwordChars: string[] = []

  // Ensure at least one character from each selected class
  for (const pool of activePools) {
    passwordChars.push(pool[getRandomInt(pool.length)])
  }

  // Combined charset for remaining length
  const combined = activePools.join('')
  while (passwordChars.length < config.length) {
    passwordChars.push(combined[getRandomInt(combined.length)])
  }

  // Cryptographically shuffle to prevent class-order predictability
  return shuffleArray(passwordChars).join('')
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      entropy: 0,
      score: 0,
      labelEn: 'Empty',
      labelPl: 'Puste',
      crackTimeEn: 'Instant',
      crackTimePl: 'Natychmiast',
      color: '#ef4444',
    }
  }

  let poolSize = 0
  if (/[a-z]/.test(password)) poolSize += 26
  if (/[A-Z]/.test(password)) poolSize += 26
  if (/[0-9]/.test(password)) poolSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32

  if (poolSize === 0) poolSize = 26

  const entropy = Math.round(password.length * Math.log2(poolSize))
  const score = Math.min(100, Math.round((entropy / 100) * 100))

  let labelEn = 'Weak'
  let labelPl = 'Słabe'
  let crackTimeEn = 'Seconds'
  let crackTimePl = 'Sekundy'
  let color = '#ef4444' // Red

  if (entropy >= 80) {
    labelEn = 'Military Grade'
    labelPl = 'Bardzo silne'
    crackTimeEn = 'Centuries'
    crackTimePl = 'Stulecia'
    color = '#10b981' // Green
  } else if (entropy >= 60) {
    labelEn = 'Strong'
    labelPl = 'Silne'
    crackTimeEn = 'Years'
    crackTimePl = 'Lata'
    color = '#84cc16' // Light green / Lime
  } else if (entropy >= 40) {
    labelEn = 'Medium'
    labelPl = 'Średnie'
    crackTimeEn = 'Days'
    crackTimePl = 'Dni'
    color = '#f59e0b' // Amber / Orange
  } else {
    labelEn = 'Weak'
    labelPl = 'Słabe'
    crackTimeEn = 'Minutes'
    crackTimePl = 'Minuty'
    color = '#ef4444' // Red
  }

  return { entropy, score, labelEn, labelPl, crackTimeEn, crackTimePl, color }
}

// ─── 3. IPv4 Subnet / CIDR Calculator ─────────────────────────
function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.')
}

function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0)
}

function toBinaryStr(int: number): string {
  return [
    ((int >>> 24) & 255).toString(2).padStart(8, '0'),
    ((int >>> 16) & 255).toString(2).padStart(8, '0'),
    ((int >>> 8) & 255).toString(2).padStart(8, '0'),
    (int & 255).toString(2).padStart(8, '0'),
  ].join('.')
}

export function calculateSubnet(input: string): SubnetInfo | null {
  const clean = input.trim()
  const parts = clean.split('/')
  const ipPart = parts[0].trim()
  let cidr = parts.length > 1 ? parseInt(parts[1], 10) : 24

  if (isNaN(cidr) || cidr < 0 || cidr > 32) cidr = 24

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ipPart.match(ipRegex)
  if (!match) return null

  const octets = match.slice(1, 5).map((o) => parseInt(o, 10))
  if (octets.some((o) => o < 0 || o > 255)) return null

  const ipInt = ipToInt(ipPart)
  const maskInt = cidr === 0 ? 0 : (((0xffffffff << (32 - cidr)) >>> 0))
  const wildcardInt = ~maskInt >>> 0

  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0

  let firstHostInt = networkInt + 1
  let lastHostInt = broadcastInt - 1
  let usableHosts = cidr >= 31 ? 0 : Math.pow(2, 32 - cidr) - 2

  if (cidr === 31) {
    firstHostInt = networkInt
    lastHostInt = broadcastInt
    usableHosts = 2
  } else if (cidr === 32) {
    firstHostInt = networkInt
    lastHostInt = networkInt
    usableHosts = 1
  }

  // Detect IP classification
  const firstOctet = octets[0]
  let ipTypeEn = 'Public IP'
  let ipTypePl = 'Publiczny IP'

  if (firstOctet === 10 || (firstOctet === 172 && octets[1] >= 16 && octets[1] <= 31) || (firstOctet === 192 && octets[1] === 168)) {
    ipTypeEn = 'Private (RFC 1918)'
    ipTypePl = 'Prywatny (RFC 1918)'
  } else if (firstOctet === 127) {
    ipTypeEn = 'Loopback (Localhost)'
    ipTypePl = 'Pętla zwrotna (Localhost)'
  } else if (firstOctet >= 224 && firstOctet <= 239) {
    ipTypeEn = 'Multicast'
    ipTypePl = 'Multicast'
  }

  return {
    ip: ipPart,
    cidr,
    netmask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    usableHosts,
    ipTypeEn,
    ipTypePl,
    binaryIp: toBinaryStr(ipInt),
    binaryMask: toBinaryStr(maskInt),
  }
}

// ─── 4. Encoders & Decoders ───────────────────────────────────
export function encodeBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    ))
  } catch {
    return ''
  }
}

export function decodeBase64(b64: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return 'Invalid Base64 string'
  }
}

export function encodeUrl(str: string): string {
  return encodeURIComponent(str)
}

export function decodeUrl(str: string): string {
  try {
    return decodeURIComponent(str)
  } catch {
    return 'Invalid URL encoded string'
  }
}

export function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function decodeHtml(str: string): string {
  const doc = new DOMParser().parseFromString(str, 'text/html')
  return doc.documentElement.textContent || ''
}

export function decodeJwt(token: string): { header: string; payload: string; isValid: boolean } {
  try {
    const parts = token.trim().split('.')
    if (parts.length < 2) return { header: '', payload: '', isValid: false }

    const header = JSON.stringify(JSON.parse(decodeBase64(parts[0])), null, 2)
    const payload = JSON.stringify(JSON.parse(decodeBase64(parts[1])), null, 2)
    return { header, payload, isValid: true }
  } catch {
    return { header: '', payload: 'Invalid or malformed JWT token', isValid: false }
  }
}

// ─── 5. Hashes (Web Crypto & MD5) ─────────────────────────────
export async function calculateHash(text: string, algo: HashAlgorithm): Promise<string> {
  if (algo === 'MD5') {
    return md5(text)
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await window.crypto.subtle.digest(algo, data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Lightweight pure JS MD5 implementation
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }
  function addUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000
    const lY4 = lY & 0x40000000
    const lX8 = lX & 0x80000000
    const lY8 = lY & 0x80000000
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8
    } else {
      return lResult ^ lX8 ^ lY8
    }
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z) }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z) }
  function H(x: number, y: number, z: number) { return x ^ y ^ z }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z) }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(string: string) {
    let lWordCount
    const lMessageLength = string.length
    const lNumberOfWordsTempOne = lMessageLength + 8
    const lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64
    const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16
    const lWordArray = Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition))
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }

  function wordToHex(lValue: number) {
    let WordToHexValue = '', WordToHexValueTemp = '', lByte, lCount
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      WordToHexValueTemp = '0' + lByte.toString(16)
      WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2)
    }
    return WordToHexValue
  }

  const x = convertToWordArray(string)
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478); d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756)
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db); b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee)
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf); d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a)
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501)
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8); d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af)
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1); b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be)
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122); d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193)
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e); b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821)

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562); d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340)
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51); b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa)
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d); d = GG(d, a, b, c, x[k + 10], S22, 0x2441453)
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681); b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8)
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6); d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6)
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87); b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed)
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905); d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8)
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9); b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a)

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681)
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122); b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c)
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44); d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9)
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60); b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70)
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6); d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa)
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085); b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05)
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039); d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5)
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8); b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665)

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432aff97)
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7); b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039)
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3); d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92)
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d); b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1)
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f); d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0)
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1)
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82); d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235)
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb); b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391)

    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD)
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

// ─── 6. UUID v4 Generator ─────────────────────────────────────
export function generateUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const buf = new Uint8Array(16)
  window.crypto.getRandomValues(buf)
  buf[6] = (buf[6] & 0x0f) | 0x40
  buf[8] = (buf[8] & 0x3f) | 0x80
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
