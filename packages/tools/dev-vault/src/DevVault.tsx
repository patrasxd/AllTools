import React, { useState, useEffect, useMemo, useId, useCallback } from 'react'
import {
  BoardLayout,
  Button,
  PillGroup,
  StatsHeader,
  ControlsBar,
  CopyIcon,
  CheckIcon,
  RestartIcon,
} from '@all/ui'
import type {
  DevVaultMode,
  PasswordConfig,
  EncoderFormat,
  HashAlgorithm,
} from './types'
import { devVaultTranslations, getStrengthLabel, getIpTypeLabel } from './i18n'
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
  theme?: string
  onSave?: (data: unknown) => void
}

export function DevVault({ locale = 'en', setHeader, isEink = false }: ToolComponentProps) {
  const t = devVaultTranslations[locale] || devVaultTranslations.en
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

  const regeneratePassword = useCallback(() => {
    const pwd = generateSecurePassword(pwdConfig, locale)
    setGeneratedPassword(pwd)
  }, [pwdConfig, locale])

  useEffect(() => {
    regeneratePassword()
  }, [regeneratePassword])

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
    let headerTitle = t.headerPassword

    if (activeMode === 'password') {
      headerTitle = t.headerPassword
      items = [
        { key: 'len', label: t.labelLength, value: pwdConfig.length },
        { key: 'ent', label: t.labelEntropy, value: `${strength.entropy} ${t.labelBits}` },
      ]
    } else if (activeMode === 'network') {
      headerTitle = t.headerSubnet
      items = [
        { key: 'cidr', label: 'CIDR', value: subnetInfo ? `/${subnetInfo.cidr}` : '--' },
        { key: 'hosts', label: t.labelHosts, value: subnetInfo ? subnetInfo.usableHosts.toLocaleString() : '--' },
      ]
    } else if (activeMode === 'encoder') {
      headerTitle = t.headerEncoder
      items = [
        { key: 'fmt', label: t.labelFormat, value: encoderFmt.toUpperCase() },
        { key: 'len', label: t.labelSize, value: `${codecOutput.length} B` },
      ]
    } else if (activeMode === 'hash') {
      headerTitle = t.headerHash
      items = [
        { key: 'algo', label: t.labelAlgo, value: hashAlgo },
        { key: 'len', label: 'BITS', value: hashAlgo === 'SHA-512' ? '512' : hashAlgo === 'SHA-256' ? '256' : '128' },
      ]
    } else {
      headerTitle = t.headerUuid
      items = [
        { key: 'uuid', label: 'UUID', value: 'v4' },
        { key: 'epoch', label: 'EPOCH', value: epochNow.s },
      ]
    }

    setHeader(
      <StatsHeader
        label={headerTitle}
        items={items}
      />
    )

    return () => {
      setHeader(null)
    }
  }, [setHeader, t, activeMode, pwdConfig, strength, subnetInfo, encoderFmt, codecOutput, hashAlgo, epochNow])

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modeOptions = [
    { value: 'password' as const, label: t.modePassword, id: 'mode-opt-password' },
    { value: 'network' as const, label: t.modeSubnet, id: 'mode-opt-subnet' },
    { value: 'encoder' as const, label: t.modeEncoder, id: 'mode-opt-encoder' },
    { value: 'hash' as const, label: t.modeHash, id: 'mode-opt-hash' },
    { value: 'uuid' as const, label: t.modeUuid, id: 'mode-opt-uuid' },
  ]

  const statusTitle = useMemo(() => {
    switch (activeMode) {
      case 'password':
        return t.statusPassword
      case 'network':
        return t.statusSubnet
      case 'encoder':
        return t.statusEncoder
      case 'hash':
        return t.statusHash
      case 'uuid':
        return t.statusUuid
      default:
        return ''
    }
  }, [activeMode, t])

  return (
    <div className={`vault-root ${isEink ? 'is-eink' : ''}`.trim()}>
      <BoardLayout
        variant="wide"
        align="center"
        board={
          <div className="vault-stage">
            {/* Status / Title Tag */}
            <div className="vault-badge-row">
              <span className="vault-status-badge">{statusTitle}</span>
            </div>

            {/* Active Mode Card */}
            <div className="vault-card">
              {/* ─── MODE: PASSWORD GENERATOR ─── */}
              {activeMode === 'password' && (
                <>
                  <div
                    className="vault-screen"
                    onClick={() => copyToClipboard(generatedPassword)}
                    title={t.clickToCopy}
                  >
                    <span className="vault-screen-val">{generatedPassword}</span>
                    <Button
                      id="vault-screen-copy-pwd"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(generatedPassword)
                      }}
                      icon={copied ? <CheckIcon /> : <CopyIcon />}
                    >
                      {copied ? t.copied : t.copy}
                    </Button>
                  </div>

                  {/* Entropy & Strength */}
                  <div className="vault-strength-box">
                    <div className="vault-strength-meta">
                      <span>
                        {t.strength}{' '}
                        <span
                          className="vault-strength-badge"
                          style={
                            isEink
                              ? undefined
                              : {
                                  color: strength.color,
                                  borderColor: `${strength.color}66`,
                                  backgroundColor: `${strength.color}15`,
                                }
                          }
                        >
                          {getStrengthLabel(strength, locale)}
                        </span>{' '}
                        ({strength.entropy} {t.labelBits})
                      </span>
                    </div>
                    <div className="vault-strength-track">
                      <div
                        className="vault-strength-bar"
                        style={{
                          width: `${strength.score}%`,
                          backgroundColor: isEink ? 'var(--all-text)' : strength.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Length Slider */}
                  <div className="vault-control-row">
                    <label htmlFor={sliderId}>
                      {t.charsLength} <strong>{pwdConfig.length}</strong> {t.charsCount}
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

                  {/* Character toggles */}
                  <div className="vault-chips-grid">
                    <Button
                      id="pwd-toggle-upper"
                      variant={pwdConfig.includeUpper ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPwdConfig((p) => ({ ...p, includeUpper: !p.includeUpper }))}
                    >
                      A-Z {t.upper}
                    </Button>

                    <Button
                      id="pwd-toggle-lower"
                      variant={pwdConfig.includeLower ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPwdConfig((p) => ({ ...p, includeLower: !p.includeLower }))}
                    >
                      a-z {t.lower}
                    </Button>

                    <Button
                      id="pwd-toggle-digits"
                      variant={pwdConfig.includeNumbers ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPwdConfig((p) => ({ ...p, includeNumbers: !p.includeNumbers }))}
                    >
                      0-9 {t.digits}
                    </Button>

                    <Button
                      id="pwd-toggle-symbols"
                      variant={pwdConfig.includeSymbols ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPwdConfig((p) => ({ ...p, includeSymbols: !p.includeSymbols }))}
                    >
                      !@# {t.symbols}
                    </Button>

                    <Button
                      id="pwd-toggle-ambiguous"
                      variant={pwdConfig.excludeAmbiguous ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPwdConfig((p) => ({ ...p, excludeAmbiguous: !p.excludeAmbiguous }))}
                    >
                      Ø {t.noAmbiguous}
                    </Button>
                  </div>
                </>
              )}

              {/* ─── MODE: SUBNET CALCULATOR ─── */}
              {activeMode === 'network' && (
                <>
                  <div className="vault-input-wrap">
                    <label htmlFor={ipInputId} className="vault-field-label">
                      {t.ipCidrLabel}
                    </label>
                    <input
                      id={ipInputId}
                      type="text"
                      className="vault-text-field"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      placeholder={t.ipPlaceholder}
                    />
                  </div>

                  {subnetInfo ? (
                    <div className="vault-subnet-grid">
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.networkAddress}</span>
                        <span className="vault-cell-value">{subnetInfo.networkAddress}</span>
                      </div>
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.broadcastAddress}</span>
                        <span className="vault-cell-value">{subnetInfo.broadcastAddress}</span>
                      </div>
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.firstHost}</span>
                        <span className="vault-cell-value">{subnetInfo.firstHost}</span>
                      </div>
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.lastHost}</span>
                        <span className="vault-cell-value">{subnetInfo.lastHost}</span>
                      </div>
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.netmask}</span>
                        <span className="vault-cell-value">{subnetInfo.netmask}</span>
                      </div>
                      <div className="vault-grid-cell">
                        <span className="vault-cell-title">{t.usableHosts}</span>
                        <span className="vault-cell-value">{subnetInfo.usableHosts.toLocaleString()}</span>
                      </div>
                      <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                        <span className="vault-cell-title">{t.classification}</span>
                        <span className="vault-cell-value">
                          {getIpTypeLabel(subnetInfo, locale)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--all-text-muted, var(--text-muted))', textAlign: 'center', padding: '1rem' }}>
                      {t.invalidIpNotice}
                    </div>
                  )}
                </>
              )}

              {/* ─── MODE: ENCODER / DECODER ─── */}
              {activeMode === 'encoder' && (
                <div className="vault-dual-pane">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <PillGroup<EncoderFormat>
                      size="sm"
                      options={[
                        { value: 'base64', label: 'Base64', id: 'enc-fmt-base64' },
                        { value: 'url', label: 'URL', id: 'enc-fmt-url' },
                        { value: 'html', label: 'HTML', id: 'enc-fmt-html' },
                        { value: 'jwt', label: 'JWT', id: 'enc-fmt-jwt' },
                      ]}
                      value={encoderFmt}
                      onChange={(fmt) => setEncoderFmt(fmt)}
                    />
                    <Button
                      id="enc-decode-btn"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (encoderFmt === 'base64') setCodecInput(decodeBase64(codecInput))
                        else if (encoderFmt === 'url') setCodecInput(decodeUrl(codecInput))
                        else if (encoderFmt === 'html') setCodecInput(decodeHtml(codecInput))
                      }}
                    >
                      {t.decodeInput}
                    </Button>
                  </div>

                  <textarea
                    id={codecInputId}
                    className="vault-textarea-styled"
                    value={codecInput}
                    onChange={(e) => setCodecInput(e.target.value)}
                    placeholder={t.enterInputPlaceholder}
                  />

                  <textarea
                    readOnly
                    className="vault-textarea-styled"
                    value={codecOutput}
                    placeholder={t.encodedResultPlaceholder}
                    style={{ background: 'var(--all-surface, var(--surface))' }}
                  />
                </div>
              )}

              {/* ─── MODE: HASH CHECKSUMS ─── */}
              {activeMode === 'hash' && (
                <div className="vault-dual-pane">
                  <PillGroup<HashAlgorithm>
                    size="sm"
                    options={[
                      { value: 'SHA-256', label: t.sha256, id: 'hash-sha256' },
                      { value: 'SHA-512', label: t.sha512, id: 'hash-sha512' },
                      { value: 'SHA-1', label: t.sha1, id: 'hash-sha1' },
                      { value: 'MD5', label: t.md5, id: 'hash-md5' },
                    ]}
                    value={hashAlgo}
                    onChange={(algo) => setHashAlgo(algo)}
                  />

                  <textarea
                    id={hashInputId}
                    className="vault-textarea-styled"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder={t.enterHashPlaceholder}
                  />

                  <div
                    className="vault-screen"
                    onClick={() => copyToClipboard(hashOutput)}
                    title={t.clickToCopy}
                  >
                    <span className="vault-screen-val" style={{ fontSize: '0.8125rem' }}>
                      {hashOutput}
                    </span>
                    <Button
                      id="hash-copy-output"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(hashOutput)
                      }}
                      icon={copied ? <CheckIcon /> : <CopyIcon />}
                    >
                      {copied ? t.copied : t.copy}
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── MODE: UUID / EPOCH ─── */}
              {activeMode === 'uuid' && (
                <div className="vault-subnet-grid">
                  <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                    <span className="vault-cell-title">{t.uuidV4}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span className="vault-cell-value" style={{ fontSize: '0.95rem' }}>
                        {uuid}
                      </span>
                      <Button
                        id="uuid-copy-btn"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(uuid)}
                        icon={copied ? <CheckIcon /> : <CopyIcon />}
                      >
                        {copied ? t.copied : t.copy}
                      </Button>
                    </div>
                  </div>

                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{t.unixEpochSeconds}</span>
                    <span className="vault-cell-value">{epochNow.s}</span>
                  </div>

                  <div className="vault-grid-cell">
                    <span className="vault-cell-title">{t.unixEpochMillis}</span>
                    <span className="vault-cell-value">{epochNow.ms}</span>
                  </div>

                  <div className="vault-grid-cell" style={{ gridColumn: 'span 2' }}>
                    <span className="vault-cell-title">{t.iso8601Utc}</span>
                    <span className="vault-cell-value">{epochNow.iso}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
        controls={
          <ControlsBar className="vault-controls">
            {/* Functional buttons row above navigation */}
            {(activeMode === 'password' || activeMode === 'uuid') && (
              <div className="vault-controls-row">
                {activeMode === 'password' && (
                  <>
                    <Button
                      id="vault-ctrl-copy-pwd"
                      variant="primary"
                      size="sm"
                      onClick={() => copyToClipboard(generatedPassword)}
                      icon={copied ? <CheckIcon /> : <CopyIcon />}
                    >
                      {copied ? t.copied : t.copy}
                    </Button>
                    <Button
                      id="vault-ctrl-regen-pwd"
                      variant="secondary"
                      size="sm"
                      onClick={regeneratePassword}
                      icon={<RestartIcon />}
                      title={t.regenerate}
                    >
                      {t.regenerate}
                    </Button>
                  </>
                )}

                {activeMode === 'uuid' && (
                  <Button
                    id="vault-ctrl-regen-uuid"
                    variant="secondary"
                    size="sm"
                    onClick={() => setUuid(generateUuid())}
                    icon={<RestartIcon />}
                    title={t.newUuid}
                  >
                    {t.newUuid}
                  </Button>
                )}
              </div>
            )}

            {/* Navigation pills at the bottom */}
            <div className="vault-controls-nav">
              <PillGroup<DevVaultMode>
                size="sm"
                options={modeOptions}
                value={activeMode}
                onChange={(m) => setActiveMode(m)}
              />
            </div>
          </ControlsBar>
        }
      />
    </div>
  )
}
export default DevVault
