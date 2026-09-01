import React from 'react'
import { IconKey } from '@alltools/ui'

export interface ToolMetadata {
  slug: string
  name: {
    en: string
    pl: string
  }
  category: 'audio' | 'measurement' | 'productivity' | 'time'
  description: {
    en: string
    pl: string
  }
  tags: {
    en: string[]
    pl: string[]
  }
  icon: React.ReactNode
  version: string
}

export const metadata: ToolMetadata = {
  slug: 'dev-vault',
  name: {
    en: 'DevVault & Crypto',
    pl: 'DevVault & Hasła',
  },
  category: 'productivity',
  description: {
    en: 'CSPRNG password & passphrase generator, IPv4/CIDR subnet calculator, Base64/JWT encoder, and SHA hashes.',
    pl: 'Kryptograficzny generator haseł CSPRNG, kalkulator podsieci IPv4/CIDR, enkoder Base64/JWT oraz hasze SHA.',
  },
  tags: {
    en: ['Password', 'Crypto', 'CIDR', 'Subnet', 'Base64', 'JWT', 'Hash', 'UUID'],
    pl: ['Hasła', 'Krypto', 'CIDR', 'Podsieci', 'Base64', 'JWT', 'Hasze', 'UUID'],
  },
  icon: <IconKey size={24} />,
  version: '1.0.0',
}
