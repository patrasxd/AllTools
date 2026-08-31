import React from 'react'
import { IconQrCode } from '@alltools/ui'

export const metadata = {
  slug: 'qr-suite',
  name: {
    en: 'QR Generator & Scanner',
    pl: 'Generator & Skaner QR',
  },
  description: {
    en: 'Generate customizable QR codes (URLs, Wi-Fi, vCard) and scan from camera or file.',
    pl: 'Generuj kody QR dla stron, sieci Wi-Fi, kontaktów vCard i skanuj kamerą lub z pliku.',
  },
  icon: <IconQrCode size={24} strokeWidth={1.5} />,
  category: 'utility' as const,
  tags: {
    en: ['qr', 'generator', 'scanner', 'code', 'wifi', 'vcard', 'camera'],
    pl: ['qr', 'generator', 'skaner', 'kod', 'wifi', 'kontakt', 'kamera'],
  },
}
