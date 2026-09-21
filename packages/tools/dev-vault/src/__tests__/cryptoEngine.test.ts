import { describe, it, expect } from 'vitest'
import {
  generateSecurePassword,
  calculatePasswordStrength,
  calculateSubnet,
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
  encodeHtml,
  decodeHtml,
  decodeJwt,
  calculateHash,
  generateUuid,
} from '../utils/cryptoEngine'

describe('DevVault cryptoEngine', () => {
  describe('Password Generator', () => {
    it('generates a password with specified length', () => {
      const pwd = generateSecurePassword({
        length: 24,
        includeUpper: true,
        includeLower: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: false,
        mode: 'chars',
        passphraseWords: 4,
        passphraseSeparator: '-',
      })
      expect(pwd.length).toBe(24)
    })

    it('generates a passphrase with requested word count and separator', () => {
      const passphraseEn = generateSecurePassword(
        {
          length: 16,
          includeUpper: true,
          includeLower: true,
          includeNumbers: true,
          includeSymbols: true,
          excludeAmbiguous: false,
          mode: 'passphrase',
          passphraseWords: 4,
          passphraseSeparator: '.',
        },
        'en'
      )
      const partsEn = passphraseEn.split('.')
      expect(partsEn.length).toBe(4)

      const passphrasePl = generateSecurePassword(
        {
          length: 16,
          includeUpper: true,
          includeLower: true,
          includeNumbers: true,
          includeSymbols: true,
          excludeAmbiguous: false,
          mode: 'passphrase',
          passphraseWords: 5,
          passphraseSeparator: '_',
        },
        'pl'
      )
      const partsPl = passphrasePl.split('_')
      expect(partsPl.length).toBe(5)
    })

    it('excludes ambiguous characters when flag is set', () => {
      for (let i = 0; i < 20; i++) {
        const pwd = generateSecurePassword({
          length: 32,
          includeUpper: true,
          includeLower: true,
          includeNumbers: true,
          includeSymbols: false,
          excludeAmbiguous: true,
          mode: 'chars',
          passphraseWords: 4,
          passphraseSeparator: '-',
        })
        expect(pwd).not.toMatch(/[0OIl1]/)
      }
    })
  })

  describe('Password Strength Calculator', () => {
    it('evaluates weak passwords correctly', () => {
      const result = calculatePasswordStrength('12345')
      expect(result.entropy).toBeLessThan(35)
      expect(result.score).toBeLessThanOrEqual(25)
      expect(result.labelEn).toBe('Weak')
    })

    it('evaluates strong diverse passwords correctly', () => {
      const result = calculatePasswordStrength('Kx9#mQ2$vL8!zW4@')
      expect(result.entropy).toBeGreaterThan(60)
      expect(result.score).toBeGreaterThanOrEqual(60)
    })
  })

  describe('Subnet Calculator', () => {
    it('calculates standard /24 subnet accurately', () => {
      const res = calculateSubnet('192.168.1.50/24')
      expect(res).not.toBeNull()
      expect(res?.networkAddress).toBe('192.168.1.0')
      expect(res?.broadcastAddress).toBe('192.168.1.255')
      expect(res?.firstHost).toBe('192.168.1.1')
      expect(res?.lastHost).toBe('192.168.1.254')
      expect(res?.netmask).toBe('255.255.255.0')
      expect(res?.usableHosts).toBe(254)
      expect(res?.cidr).toBe(24)
      expect(res?.ipTypeEn).toContain('RFC 1918')
    })

    it('handles /32 host route correctly', () => {
      const res = calculateSubnet('10.0.0.1/32')
      expect(res).not.toBeNull()
      expect(res?.usableHosts).toBe(1)
      expect(res?.firstHost).toBe('10.0.0.1')
      expect(res?.lastHost).toBe('10.0.0.1')
    })

    it('returns null for invalid IP inputs', () => {
      expect(calculateSubnet('invalid-ip')).toBeNull()
      expect(calculateSubnet('999.999.999.999/24')).toBeNull()
      expect(calculateSubnet('192.168.1')).toBeNull()
      expect(calculateSubnet('')).toBeNull()
    })
  })

  describe('Encoders and Decoders', () => {
    it('encodes and decodes Base64 roundtrip', () => {
      const text = 'Antigravity Workspace AllTools 2026'
      const encoded = encodeBase64(text)
      expect(encoded).not.toBe(text)
      const decoded = decodeBase64(encoded)
      expect(decoded).toBe(text)
    })

    it('encodes and decodes URL components', () => {
      const urlText = 'param=hello world & symbol=+'
      const encoded = encodeUrl(urlText)
      expect(encoded).toContain('%20')
      const decoded = decodeUrl(encoded)
      expect(decoded).toBe(urlText)
    })

    it('encodes and decodes HTML entities', () => {
      const rawHtml = '<div class="test">"Quote" & \'Apostrophe\'</div>'
      const encoded = encodeHtml(rawHtml)
      expect(encoded).toContain('&lt;div')
      expect(encoded).toContain('&quot;Quote&quot;')
      const decoded = decodeHtml(encoded)
      expect(decoded).toBe(rawHtml)
    })

    it('decodes JWT header and payload correctly', () => {
      // Standard mock JWT token
      const headerB64 = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payloadB64 = btoa(JSON.stringify({ sub: '1234567890', name: 'John Doe', admin: true }))
      const jwtToken = `${headerB64}.${payloadB64}.fakeSignatureHere`

      const res = decodeJwt(jwtToken)
      expect(res.isValid).toBe(true)
      expect(res.header).toContain('HS256')
      expect(res.payload).toContain('John Doe')
      expect(res.payload).toContain('admin')
    })

    it('handles malformed JWT gracefully', () => {
      const resWithoutDots = decodeJwt('not-a-valid-jwt')
      expect(resWithoutDots.isValid).toBe(false)

      const resWithDots = decodeJwt('invalid.jwt.token')
      expect(resWithDots.isValid).toBe(false)
      expect(resWithDots.payload).toContain('Invalid or malformed')
    })
  })

  describe('Hash Calculations', () => {
    it('computes SHA-256 hash', async () => {
      const hash = await calculateHash('hello world', 'SHA-256')
      // Known sha256 of "hello world"
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
    })

    it('computes MD5 checksum', async () => {
      const md5 = await calculateHash('hello world', 'MD5')
      // Known md5 of "hello world"
      expect(md5).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3')
    })
  })

  describe('UUID Generator', () => {
    it('generates compliant UUID v4 string', () => {
      const uuid = generateUuid()
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })
})
