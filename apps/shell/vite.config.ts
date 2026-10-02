import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const cspPlugin = (): Plugin => ({
  name: 'production-csp',
  apply: 'build',
  transformIndexHtml() {
    return [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: [
            "default-src 'self'",
            // 'unsafe-eval' is strictly required by heic2any (libheif Emscripten runtime creates dynamic function wrappers via new Function in embind).
            // Zero external hosts allowed: connect-src remains strictly 'self' blob: data: with no network egress.
            "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "media-src 'self' blob: mediastream:",
            "font-src 'self' data:",
            "connect-src 'self' blob: data:",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'none'",
            "frame-src 'none'",
          ].join('; '),
        },
        injectTo: 'head-prepend',
      },
    ]
  },
})

export default defineConfig({
  base: '/AllTools/',
  plugins: [
    cspPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons/*.svg', '**/*.wasm'],
      manifest: {
        name: 'AllTools',
        short_name: 'AllTools',
        description: 'Essential browser utilities. No registration, no ads. All your data stays on this device.',
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@alltools/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@alltools/dev-vault': path.resolve(__dirname, '../../packages/tools/dev-vault/src'),
      '@alltools/image-studio': path.resolve(__dirname, '../../packages/tools/image-studio/src'),
      '@alltools/pdf-suite': path.resolve(__dirname, '../../packages/tools/pdf-suite/src'),
      '@alltools/calc-converter': path.resolve(__dirname, '../../packages/tools/calc-converter/src'),
      '@alltools/guitar-tuner': path.resolve(__dirname, '../../packages/tools/guitar-tuner/src'),
      '@alltools/level-protractor': path.resolve(__dirname, '../../packages/tools/level-protractor/src'),
      '@alltools/qr-suite': path.resolve(__dirname, '../../packages/tools/qr-suite/src'),
      '@alltools/stopwatch-interval': path.resolve(__dirname, '../../packages/tools/stopwatch-interval/src'),
      '@alltools/quick-notes': path.resolve(__dirname, '../../packages/tools/quick-notes/src'),
      '@alltools/screen-ruler': path.resolve(__dirname, '../../packages/tools/screen-ruler/src'),
      '@alltools/sound-meter': path.resolve(__dirname, '../../packages/tools/sound-meter/src'),
      '@alltools/sketch-suite': path.resolve(__dirname, '../../packages/tools/sketch-suite/src'),
    },
  },
  server: {
    port: 5174,
  },
})
