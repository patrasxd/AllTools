export type DevVaultMode = 'password' | 'network' | 'encoder' | 'hash' | 'uuid'

export interface PasswordConfig {
  length: number
  includeUpper: boolean
  includeLower: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeAmbiguous: boolean // 0, O, l, 1, I
  mode: 'chars' | 'passphrase'
  passphraseWords: number
  passphraseSeparator: string
}

export interface PasswordStrength {
  entropy: number // bits
  score: number // 0 - 100
  labelEn: string
  labelPl: string
  crackTimeEn: string
  crackTimePl: string
}

export interface SubnetInfo {
  ip: string
  cidr: number
  netmask: string
  wildcard: string
  networkAddress: string
  broadcastAddress: string
  firstHost: string
  lastHost: string
  usableHosts: number
  ipTypeEn: string
  ipTypePl: string
  binaryIp: string
  binaryMask: string
}

export type EncoderFormat = 'base64' | 'url' | 'html' | 'jwt' | 'hex'
export type HashAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-1' | 'MD5'
