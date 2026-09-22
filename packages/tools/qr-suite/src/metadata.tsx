import React from 'react'
import { QrCodeIcon } from '@all/ui'

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
  icon: <QrCodeIcon width={24} height={24} strokeWidth={1.5} />,
  category: 'utility' as const,
  tags: {
    en: ['Camera', 'Code'],
    pl: ['Kamera', 'Kod'],
  },
}
