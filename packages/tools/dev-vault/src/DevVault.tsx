import React, { useState, useEffect, useMemo, useId } from 'react'
import {
  GameButton,
  PillGroup,
  StatsHeader,
  ControlsBar,
  IconCopy,
  IconCheck,
  IconRotateCw,
} from '@alltools/ui'
import type {
  DevVaultMode,
  PasswordConfig,
  EncoderFormat,
  HashAlgorithm,
} from './types'
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
} from './utils/cryptoEngine'
import './styles/dev-vault.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  onSave?: (data: unknown) => void
}

export function DevVault({ locale = 'en', setHeader }: ToolComponentProps) {
  const isPl = locale === 'pl'
  const sliderId = useId()
  const ipInputId = useId()
  const codecInputId = useId()
  const hashInputId = useId()

  const [activeMode, setActiveMode] = useState<DevVaultMode>('password')
  const [copied, setCopied] = useState<boolean>(false)

  // ─── 1. Password State ───
  const [pwdConfig, setPwdConfig] = useState<PasswordConfig>({
    length: 16,
    includeUpper: true,
    includeLower: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: true,
    mode: 'chars',
    passphraseWords: 4,
    passphraseSeparator: '-',
  })
  const [generatedPassword, setGeneratedPassword] = useState<string>('')

  const regeneratePassword = () => {
    const pwd = generateSecurePassword(pwdConfig, locale)
    setGeneratedPassword(pwd)
  }

  useEffect(() => {
    regeneratePassword()
  }, [pwdConfig, locale])

  const strength = useMemo(() => {
    return calculatePasswordStrength(generatedPassword)
  }, [generatedPassword])

  // ─── 2. Subnet Calculator State ───
  const [ipInput, setIpInput] = useState<string>('192.168.1.1/24')
  const subnetInfo = useMemo(() => {
    return calculateSubnet(ipInput)
  }, [ipInput])

  // ─── 3. Encoder / Decoder State ───
  const [encoderFmt, setEncoderFmt] = useState<EncoderFormat>('base64')
  const [codecInput, setCodecInput] = useState<string>('Hello AllTools!')
  const [codecOutput, setCodecOutput] = useState<string>('')

  useEffect(() => {
    if (!codecInput) {
      setCodecOutput('')
      return
    }
    if (encoderFmt === 'base64') {
      setCodecOutput(encodeBase64(codecInput))
    } else if (encoderFmt === 'url') {
      setCodecOutput(encodeUrl(codecInput))
    } else if (encoderFmt === 'html') {
      setCodecOutput(encodeHtml(codecInput))
    } else if (encoderFmt === 'jwt') {
      const { header, payload, isValid } = decodeJwt(codecInput)
      if (isValid) {
        setCodecOutput(`// HEADER\n${header}\n\n// PAYLOAD\n${payload}`)
      } else {
        setCodecOutput(payload)
      }
    }
  }, [codecInput, encoderFmt])

  // ─── 4. Hash Calculator State ───
  const [hashAlgo, setHashAlgo] = useState<HashAlgorithm>('SHA-256')
  const [hashInput, setHashInput] = useState<string>('AllTools Secure Hash')
  const [hashOutput, setHashOutput] = useState<string>('')

  useEffect(() => {
    let isCurrent = true
    calculateHash(hashInput, hashAlgo).then((res) => {
      if (isCurrent) setHashOutput(res)
    })
    return () => {
      isCurrent = false
    }
  }, [hashInput, hashAlgo])

  // ─── 5. UUID / Epoch State ───
  const [uuid, setUuid] = useState<string>('')
  const [epochNow, setEpochNow] = useState<{ ms: number; s: number; iso: string }>({
    ms: Date.now(),
    s: Math.floor(Date.now() / 1000),
    iso: new Date().toISOString(),
  })

  useEffect(() => {
    setUuid(generateUuid())
    const interval = setInterval(() => {
      const now = Date.now()
      setEpochNow({
        ms: now,
        s: Math.floor(now / 1000),
        iso: new Date().toISOString(),
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return

    let items: { key: string; label: string; value: string | number }[] = []

    if (activeMode === 'password') {
      items = [
        { key: 'len', label: isPl ? 'DŁUGOŚĆ' : 'LENGTH', value: pwdConfig.length },
        { key: 'ent', label: isPl ? 'ENTROPIA' : 'ENTROPY', value: `${strength.entropy} ${isPl ? 'bitów' : 'bits'}` },
      ]
    } else if (activeMode === 'network') {
      items = [
        { key: 'cidr', label: 'CIDR', value: subnetInfo ? `/${subnetInfo.cidr}` : '--' },
        { key: 'hosts', label: isPl ? 'HOSTY' : 'HOSTS', value: subnetInfo ? subnetInfo.usableHosts.toLocaleString() : '--' },
      ]
    } else if (activeMode === 'encoder') {
      items = [
        { key: 'fmt', label: isPl ? 'FORMAT' : 'FORMAT', value: encoderFmt.toUpperCase() },
        { key: 'len', label: isPl ? 'ROZMIAR' : 'SIZE', value: `${codecOutput.length} B` },
      ]
    } else if (activeMode === 'hash') {
      items = [
        { key: 'algo', label: 'ALGO', value: hashAlgo },
        { key: 'len', label: 'BITS', value: hashAlgo === 'SHA-512' ? '512' : hashAlgo === 'SHA-256' ? '256' : '128' },
      ]
    } else {
      items = [
        { key: 'uuid', label: 'UUID', value: 'v4' },
        { key: 'epoch', label: 'EPOCH', value: epochNow.s },
      ]
    }

    setHeader(
      <StatsHeader
        label={
          activeMode === 'password'
            ? (isPl ? 'GENERATOR HASEŁ' : 'PASSWORD GENERATOR')
            : activeMode === 'network'
            ? (isPl ? 'KALKULATOR PODSIECI' : 'SUBNET CALCULATOR')
            : activeMode === 'encoder'
            ? (isPl ? 'ENKODER & DEKODER' : 'ENCODER & DECODER')
            : activeMode === 'hash'
            ? (isPl ? 'SUMY HASH' : 'HASH CHECKSUM')
            : (isPl ? 'IDENTYFIKATORY' : 'UUID & EPOCH')
        }
        items={items}
      />
    )
  }, [setHeader, isPl, activeMode, pwdConfig, strength, subnetInfo, encoderFmt, codecOutput, hashAlgo, epochNow])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modeOptions = [
    { value: 'password' as const, label: isPl ? 'Hasła' : 'Password' },
    { value: 'network' as const, label: isPl ? 'Podsieć' : 'Subnet' },
    { value: 'encoder' as const, label: isPl ? 'Enkoder' : 'Encoder' },
    { value: 'hash' as const, label: isPl ? 'Hasze' : 'Hashes' },
    { value: 'uuid' as const, label: 'UUID' },
  ]

  return (
    <div className="vault-root">
      {/* 1. Header Title */}
      <div className="vault-status">
        <div className="vault-status-text">
          {activeMode === 'password'
            ? (isPl ? 'Generator haseł CSPRNG' : 'CSPRNG Password Generator')
            : activeMode === 'network'
            ? (isPl ? 'Kalkulator podsieci IPv4 & CIDR' : 'IPv4 & CIDR Subnet Calculator')
            : activeMode === 'encoder'
            ? (isPl ? 'Enkoder i dekoder danych' : 'Data Encoder & Decoder')
            : activeMode === 'hash'
            ? (isPl ? 'Kryptograficzne sumy kontrolne' : 'Cryptographic Hash Checksums')
            : (isPl ? 'Generator UUID v4 i czas Unix' : 'UUID v4 & Unix Epoch Generator')}
        </div>
      </div>

      {/* 2. Main Center Viewport */}
      <div className="vault-center-area">
        <div className="vault-card">
          {/* ─── MODE: PASSWORD GENERATOR ─── */}
          {activeMode === 'password' && (
            <>
              {/* Full Width Monospace Display Screen */}
              <div
                className="vault-screen"
                onClick={() => copyToClipboard(generatedPassword)}
                title={isPl ? 'Kliknij, aby skopiować' : 'Click to copy'}
              >
                <span className="vault-screen-val">{generatedPassword}</span>
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(generatedPassword)
                  }}
                  icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                >
                  {copied ? (isPl ? 'Skopiowano' : 'Copied') : (isPl ? 'Kopiuj' : 'Copy')}
                </GameButton>
              </div>

              {/* Entropy & Strength with Dynamic Colors */}
              <div className="vault-strength-box">
                <div className="vault-strength-meta">
                  <span>
                    {isPl ? 'Siła:' : 'Strength:'}{' '}
                    <span
                      className="vault-strength-badge"
                      style={{
                        color: strength.color,
                        borderColor: `${strength.color}66`,
                        backgroundColor: `${strength.color}15`,
                      }}
                    >
                      {isPl ? strength.labelPl : strength.labelEn}
                    </span>{' '}
                    ({strength.entropy} {isPl ? 'bitów' : 'bits'})
                  </span>
                  <span>
                    {isPl ? 'Czas złamania:' : 'Crack time:'}{' '}
                    <strong>{isPl ? strength.crackTimePl : strength.crackTimeEn}</strong>
                  </span>
                </div>
                <div className="vault-strength-track">
                  <div
                    className="vault-strength-bar"
                    style={{
                      width: `${strength.score}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
              </div>

              {/* Length Slider */}
              <div className="vault-control-row">
                <label htmlFor={sliderId}>
                  {isPl ? 'Długość:' : 'Length:'} <strong>{pwdConfig.length}</strong> {isPl ? 'znaków' : 'chars'}
                </label>
                <input
                  id={sliderId}
                  type="range"
                  min="8"
                  max="48"
                  value={pwdConfig.length}
                  onChange={(e) =>
                    setPwdConfig((p) => ({ ...p, length: parseInt(e.target.value, 10) }))
                  }
                  className="vault-slider"
                />
              </div>

              {/* Reusable GameButtons for character toggles (DRY & consistent hover/theme styles) */}
              <div className="vault-chips-grid">
                <GameButton
                  variant={pwdConfig.includeUpper ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPwdConfig((p) => ({ ...p, includeUpper: !p.includeUpper }))}
                >
                  A-Z {isPl ? 'Wielkie' : 'Upper'}
                </GameButton>

                <GameButton
                  variant={pwdConfig.includeLower ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPwdConfig((p) => ({ ...p, includeLower: !p.includeLower }))}
                >
                  a-z {isPl ? 'Małe' : 'Lower'}
                </GameButton>

                <GameButton
                  variant={pwdConfig.includeNumbers ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPwdConfig((p) => ({ ...p, includeNumbers: !p.includeNumbers }))}
                >
                  0-9 {isPl ? 'Cyfry' : 'Digits'}
                </GameButton>

                <GameButton
                  variant={pwdConfig.includeSymbols ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPwdConfig((p) => ({ ...p, includeSymbols: !p.includeSymbols }))}
                >
                  !@# {isPl ? 'Symbole' : 'Symbols'}
                </GameButton>

                <GameButton
                  variant={pwdConfig.excludeAmbiguous ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPwdConfig((p) => ({ ...p, excludeAmbiguous: !p.excludeAmbiguous }))}
                >
                  Ø {isPl ? 'Bez mylących' : 'No ambiguous'}
                </GameButton>
              </div>
            </>
          )}

          {/* ─── MODE: SUBNET CALCULATOR ─── */}
          {activeMode === 'network' && (
            <>
              <div className="vault-input-wrap">
                <label htmlFor={ipInputId} className="vault-field-label">
                  {isPl ? 'Adres IPv4 i prefiks CIDR (np. 192.168.1.1/24)' : 'IPv4 Address & CIDR Prefix (e.g. 192.168.1.1/24)'}
                </label>
                <input
                  id={ipInputId}
                  type="text"
                  className="vault-text-field"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="192.168.1.1/24"
                />
              </div>

              {subnetInfo ? (
                <div className="vault-subnet-grid">
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Adres sieci' : 'Network'}</span>
                    <span className="vault-cell-value">{subnetInfo.networkAddress}</span>
                  </div>
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Broadcast' : 'Broadcast'}</span>
                    <span className="vault-cell-value">{subnetInfo.broadcastAddress}</span>
                  </div>
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Pierwszy host' : 'First Host'}</span>
                    <span className="vault-cell-value">{subnetInfo.firstHost}</span>
                  </div>
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Ostatni host' : 'Last Host'}</span>
                    <span className="vault-cell-value">{subnetInfo.lastHost}</span>
                  </div>
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Maska dziesiętna' : 'Netmask'}</span>
                    <span className="vault-cell-value">{subnetInfo.netmask}</span>
                  </div>
                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{isPl ? 'Użyteczne hosty' : 'Usable Hosts'}</span>
                    <span className="vault-cell-value">{subnetInfo.usableHosts.toLocaleString()}</span>
                  </div>
                  <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                    <span className="vault-cell-title">{isPl ? 'Typ i klasyfikacja' : 'Classification'}</span>
                    <span className="vault-cell-value">{isPl ? subnetInfo.ipTypePl : subnetInfo.ipTypeEn}</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>
                  {isPl ? 'Wprowadź poprawny adres IPv4 (np. 10.0.0.1/16)' : 'Enter valid IPv4 (e.g. 10.0.0.1/16)'}
                </div>
              )}
            </>
          )}

          {/* ─── MODE: ENCODER / DECODER ─── */}
          {activeMode === 'encoder' && (
            <div className="vault-dual-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <PillGroup
                  options={[
                    { value: 'base64', label: 'Base64' },
                    { value: 'url', label: 'URL' },
                    { value: 'html', label: 'HTML' },
                    { value: 'jwt', label: 'JWT' },
                  ]}
                  value={encoderFmt}
                  onChange={(fmt) => setEncoderFmt(fmt as EncoderFormat)}
                />
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (encoderFmt === 'base64') setCodecInput(decodeBase64(codecInput))
                    else if (encoderFmt === 'url') setCodecInput(decodeUrl(codecInput))
                    else if (encoderFmt === 'html') setCodecInput(decodeHtml(codecInput))
                  }}
                >
                  {isPl ? '↺ Dekoduj wprost' : '↺ Decode input'}
                </GameButton>
              </div>

              <textarea
                id={codecInputId}
                className="vault-textarea-styled"
                value={codecInput}
                onChange={(e) => setCodecInput(e.target.value)}
                placeholder="Enter input text..."
              />

              <textarea
                readOnly
                className="vault-textarea-styled"
                value={codecOutput}
                placeholder="Encoded result..."
                style={{ background: 'var(--surface)' }}
              />
            </div>
          )}

          {/* ─── MODE: HASH CHECKSUMS ─── */}
          {activeMode === 'hash' && (
            <div className="vault-dual-pane">
              <PillGroup
                options={[
                  { value: 'SHA-256', label: 'SHA-256' },
                  { value: 'SHA-512', label: 'SHA-512' },
                  { value: 'SHA-1', label: 'SHA-1' },
                  { value: 'MD5', label: 'MD5' },
                ]}
                value={hashAlgo}
                onChange={(algo) => setHashAlgo(algo as HashAlgorithm)}
              />

              <textarea
                id={hashInputId}
                className="vault-textarea-styled"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Enter string to hash..."
              />

              <div
                className="vault-screen"
                onClick={() => copyToClipboard(hashOutput)}
                title={isPl ? 'Kliknij, aby skopiować' : 'Click to copy'}
              >
                <span className="vault-screen-val" style={{ fontSize: '0.8125rem' }}>{hashOutput}</span>
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(hashOutput)
                  }}
                  icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                >
                  {copied ? (isPl ? 'Skopiowano' : 'Copied') : (isPl ? 'Kopiuj' : 'Copy')}
                </GameButton>
              </div>
            </div>
          )}

          {/* ─── MODE: UUID / EPOCH ─── */}
          {activeMode === 'uuid' && (
            <div className="vault-subnet-grid">
              <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="vault-cell-title">UUID v4</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span className="vault-cell-value" style={{ fontSize: '1rem' }}>{uuid}</span>
                  <GameButton
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(uuid)}
                    icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  >
                    {copied ? (isPl ? 'Skopiowano' : 'Copied') : (isPl ? 'Kopiuj' : 'Copy')}
                  </GameButton>
                </div>
              </div>

              <div className="vault-grid-cell">
                <span className="vault-cell-title">Unix Epoch (Seconds)</span>
                <span className="vault-cell-value">{epochNow.s}</span>
              </div>

              <div className="vault-grid-cell">
                <span className="vault-cell-title">Unix Epoch (Milliseconds)</span>
                <span className="vault-cell-value">{epochNow.ms}</span>
              </div>

              <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="vault-cell-title">ISO 8601 UTC</span>
                <span className="vault-cell-value">{epochNow.iso}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="vault-controls-container">
        <ControlsBar>
          <PillGroup
            options={modeOptions}
            value={activeMode}
            onChange={(m) => setActiveMode(m)}
          />

          {activeMode === 'password' && (
            <>
              <GameButton
                variant="primary"
                size="md"
                onClick={() => copyToClipboard(generatedPassword)}
                icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? (isPl ? 'Skopiowano' : 'Copied') : (isPl ? 'Kopiuj' : 'Copy')}
              </GameButton>
              <GameButton
                variant="secondary"
                size="md"
                onClick={regeneratePassword}
                icon={<IconRotateCw size={14} />}
              >
                {isPl ? 'Losuj' : 'Regenerate'}
              </GameButton>
            </>
          )}

          {activeMode === 'uuid' && (
            <GameButton
              variant="secondary"
              size="md"
              onClick={() => setUuid(generateUuid())}
              icon={<IconRotateCw size={14} />}
            >
              {isPl ? 'Nowy UUID' : 'New UUID'}
            </GameButton>
          )}
        </ControlsBar>
      </div>
    </div>
  )
}
