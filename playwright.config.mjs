import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4182/AllTools/',
    locale: 'en-US',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: 'npm run dev -w @alltools/shell -- --host 127.0.0.1 --port 4182',
    url: 'http://127.0.0.1:4182/AllTools/',
    reuseExistingServer: !process.env.CI,
  },
})
