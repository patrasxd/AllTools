import { test, expect } from '@playwright/test'
import { registerCatalogTests } from '../AllUI/browser-tests/catalog.mjs'
registerCatalogTests(test, expect, {
  appName: 'AllTools',
  cardSelector: '.tool-card',
  count: 13,
  representative: { card: '#tool-card-calc-converter', path: '/tools/calc-converter' },
})
