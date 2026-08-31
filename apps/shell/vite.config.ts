import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/AllTools/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'AllTools',
        short_name: 'AllTools',
        description: 'Clean, minimalist utility suite: Guitar Tuner, Level, Protractor, Screen Ruler, QR Studio, Stopwatch & Notes',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/AllTools/',
        start_url: '/AllTools/',
        orientation: 'portrait-primary',
        categories: ['utilities', 'productivity', 'tools'],
        icons: [
          {
            src: '/AllTools/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/AllTools/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@alltools/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@alltools/calc-converter': path.resolve(__dirname, '../../packages/tools/calc-converter/src'),
      '@alltools/guitar-tuner': path.resolve(__dirname, '../../packages/tools/guitar-tuner/src'),
      '@alltools/level-protractor': path.resolve(__dirname, '../../packages/tools/level-protractor/src'),
      '@alltools/qr-suite': path.resolve(__dirname, '../../packages/tools/qr-suite/src'),
      '@alltools/stopwatch-interval': path.resolve(__dirname, '../../packages/tools/stopwatch-interval/src'),
      '@alltools/quick-notes': path.resolve(__dirname, '../../packages/tools/quick-notes/src'),
      '@alltools/screen-ruler': path.resolve(__dirname, '../../packages/tools/screen-ruler/src'),
    },
  },
  server: {
    port: 5174,
  },
})
