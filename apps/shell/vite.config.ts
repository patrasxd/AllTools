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
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'AllTools — Minimalist PWA Utilities',
        short_name: 'AllTools',
        description: 'Clean, sketch-styled utility suite: Guitar Tuner, Level, Protractor, QR Studio, Stopwatch & Notes',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/AllTools/',
        start_url: '/AllTools/',
        orientation: 'portrait',
        icons: [
          {
            src: '/AllTools/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/AllTools/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@alltools/ui': path.resolve(__dirname, '../../packages/ui/src'),
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
