import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import {
  ToolButton,
  PillGroup,
  IconDownload,
  IconCopy,
  IconCheck,
} from '@alltools/ui'

export interface QrGeneratorProps {
  locale: 'en' | 'pl'
}

type QrType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'sms'

export const QrGenerator: React.FC<QrGeneratorProps> = ({ locale }) => {
  const [type, setType] = useState<QrType>('url')
  const [copied, setCopied] = useState<boolean>(false)

  // Form states
  const [urlValue, setUrlValue] = useState<string>('https://')
  const [textValue, setTextValue] = useState<string>('')
  const [wifiSsid, setWifiSsid] = useState<string>('')
  const [wifiPass, setWifiPass] = useState<string>('')
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [wifiHidden, setWifiHidden] = useState<boolean>(false)

  // vCard
  const [vcardName, setVcardName] = useState<string>('')
  const [vcardPhone, setVcardPhone] = useState<string>('')
  const [vcardEmail, setVcardEmail] = useState<string>('')
  const [vcardOrg, setVcardOrg] = useState<string>('')

  // Email
  const [emailTo, setEmailTo] = useState<string>('')
  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailBody, setEmailBody] = useState<string>('')

  // SMS
  const [smsPhone, setSmsPhone] = useState<string>('')
  const [smsBody, setSmsBody] = useState<string>('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Compute raw payload string based on type
  const getPayload = (): string => {
    switch (type) {
      case 'url':
        return urlValue.trim()
      case 'text':
        return textValue
      case 'wifi':
        return `WIFI:T:${wifiAuth};S:${wifiSsid};P:${wifiPass};H:${wifiHidden ? 'true' : 'false'};;`
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nFN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nORG:${vcardOrg}\nEND:VCARD`
      case 'email':
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      case 'sms':
        return `smsto:${smsPhone}:${smsBody}`
      default:
        return ''
    }
  }

  const payload = getPayload()

  // Generate QR Canvas
  useEffect(() => {
    if (!canvasRef.current || !payload) return

    QRCode.toCanvas(
      canvasRef.current,
      payload,
      {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('QR Render error:', err)
      }
    )
  }, [payload])

  const downloadPng = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qrcode-${type}-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const copyToClipboard = async () => {
    try {
      if (canvasRef.current) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ])
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }
        })
      }
    } catch {
      // Fallback copy text
      navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const t = {
    typeUrl: 'URL',
    typeText: locale === 'pl' ? 'Tekst' : 'Plain Text',
    typeWifi: 'Wi-Fi',
    typeVcard: 'vCard (Kontakt)',
    typeEmail: 'E-mail',
    typeSms: 'SMS',
    enterUrl: locale === 'pl' ? 'Wpisz adres strony WWW' : 'Enter website URL',
    enterText: locale === 'pl' ? 'Wpisz dowolny tekst lub notatkę' : 'Enter any text content',
    downloadPng: locale === 'pl' ? 'Pobierz PNG' : 'Download PNG',
    copyQr: locale === 'pl' ? 'Kopiuj obraz' : 'Copy Image',
    copied: locale === 'pl' ? 'Skopiowano!' : 'Copied!',
    ssid: locale === 'pl' ? 'Nazwa sieci (SSID)' : 'Network Name (SSID)',
    password: locale === 'pl' ? 'Hasło' : 'Password',
    encryption: locale === 'pl' ? 'Zabezpieczenia' : 'Encryption',
    hidden: locale === 'pl' ? 'Sieć ukryta' : 'Hidden network',
    name: locale === 'pl' ? 'Imię i nazwisko' : 'Full Name',
    phone: locale === 'pl' ? 'Telefon' : 'Phone Number',
    email: locale === 'pl' ? 'Adres e-mail' : 'Email Address',
    company: locale === 'pl' ? 'Firma / Organizacja' : 'Company / Organization',
    subject: locale === 'pl' ? 'Temat' : 'Subject',
    message: locale === 'pl' ? 'Treść wiadomości' : 'Message Body',
  }

  const typeOptions = [
    { value: 'url' as const, label: t.typeUrl },
    { value: 'text' as const, label: t.typeText },
    { value: 'wifi' as const, label: t.typeWifi },
    { value: 'vcard' as const, label: t.typeVcard },
    { value: 'email' as const, label: t.typeEmail },
    { value: 'sms' as const, label: t.typeSms },
  ]

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full items-start justify-center">
      {/* Left Form Column */}
      <div className="flex-1 flex flex-col gap-4 w-full">
        <PillGroup
          options={typeOptions}
          value={type}
          onChange={setType}
          size="sm"
          className="flex-wrap"
        />

        {/* Input Forms */}
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-surface-2 text-xs">
          {type === 'url' && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-text-dim">{t.enterUrl}</label>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
            </div>
          )}

          {type === 'text' && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-text-dim">{t.enterText}</label>
              <textarea
                rows={4}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Wpisz dowolny tekst..."
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none resize-none"
              />
            </div>
          )}

          {type === 'wifi' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-text-dim">{t.ssid}</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="MyHomeWifi"
                  className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-text-dim">{t.password}</label>
                <input
                  type="password"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="••••••••"
                  className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="wifi-auth"
                    checked={wifiAuth === 'WPA'}
                    onChange={() => setWifiAuth('WPA')}
                    className="accent-text"
                  />
                  <span>WPA/WPA2/WPA3</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="wifi-auth"
                    checked={wifiAuth === 'nopass'}
                    onChange={() => setWifiAuth('nopass')}
                    className="accent-text"
                  />
                  <span>Open / None</span>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={wifiHidden}
                  onChange={(e) => setWifiHidden(e.target.checked)}
                  className="accent-text"
                />
                <span>{t.hidden}</span>
              </label>
            </div>
          )}

          {type === 'vcard' && (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={vcardName}
                onChange={(e) => setVcardName(e.target.value)}
                placeholder={t.name}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <input
                type="tel"
                value={vcardPhone}
                onChange={(e) => setVcardPhone(e.target.value)}
                placeholder={t.phone}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <input
                type="email"
                value={vcardEmail}
                onChange={(e) => setVcardEmail(e.target.value)}
                placeholder={t.email}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <input
                type="text"
                value={vcardOrg}
                onChange={(e) => setVcardOrg(e.target.value)}
                placeholder={t.company}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
            </div>
          )}

          {type === 'email' && (
            <div className="flex flex-col gap-2">
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder={t.email}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={t.subject}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <textarea
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder={t.message}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none resize-none"
              />
            </div>
          )}

          {type === 'sms' && (
            <div className="flex flex-col gap-2">
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder={t.phone}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none"
              />
              <textarea
                rows={3}
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder={t.message}
                className="p-2 rounded border border-border bg-surface text-text font-sans text-sm focus:border-text outline-none resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right QR Preview & Action Column */}
      <div className="flex flex-col items-center gap-4 w-full md:w-64">
        {/* QR Code Canvas Card */}
        <div className="p-4 bg-white rounded-lg border-2 border-border shadow-md flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-[200px] max-h-[200px]" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <ToolButton
            variant="primary"
            size="md"
            fullWidth
            onClick={downloadPng}
            icon={<IconDownload size={16} />}
          >
            {t.downloadPng}
          </ToolButton>
          <ToolButton
            variant="secondary"
            size="md"
            fullWidth
            onClick={copyToClipboard}
            icon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          >
            {copied ? t.copied : t.copyQr}
          </ToolButton>
        </div>
      </div>
    </div>
  )
}
