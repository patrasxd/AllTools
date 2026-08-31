# AllTools — Minimalist PWA Utilities Suite

> A clean, sketch-styled collection of browser-based utilities: tuner, level, protractor, QR tools, stopwatch, and quick notes. Minimalist black-and-white ink aesthetic, dark/light/e-ink modes, English and Polish language support, and offline-ready PWA behavior. Everything runs in the browser and keeps data on-device.

---

## 🎯 Architecture & Monorepo Structure

The project is organized as an autonomous **npm workspaces monorepo**:

```
AllTools/
├── package.json                   # Root workspace configuration
├── README.md                      # Project documentation
│
├── apps/
│   └── shell/                     # Main host application (Vite + React + TS + PWA)
│       ├── src/
│       │   ├── i18n/              # Shell translations & language settings (EN/PL)
│       │   ├── types/             # Tool contracts (ToolMetadata, ToolComponentProps)
│       │   ├── hooks/             # Theme, local storage, and PWA utilities
│       │   ├── tools/             # Tool registry and lazy component loading
│       │   ├── components/        # Layout, header menu, tool cards, shared shell UI
│       │   ├── pages/             # HomePage, ToolPage, route-level loading states
│       │   ├── styles/            # Design tokens and shell-level styling
│       │   ├── App.tsx            # Animated routes and layout composition
│       │   └── main.tsx           # React application bootstrapping
│       ├── public/
│       │   ├── manifest.webmanifest
│       │   └── icons/
│       └── vite.config.ts         # Vite configuration with PWA plugin
│
└── packages/
    ├── ui/                        # Shared UI primitives (@alltools/ui)
    └── tools/
        ├── guitar-tuner/          # Chromatic & guitar tuning utility
        ├── level-protractor/      # Bubble level and angle measurement tool
        ├── qr-suite/              # QR generation and scanning utility
        ├── stopwatch-interval/    # Stopwatch, laps, and interval timer
        └── quick-notes/           # Keep-style notes and checklist tool
```

---

## 🔌 Tool API Contract

Every tool module in `packages/tools/*` exports a standard metadata object and a `ToolComponent` from `src/index.ts`:

```ts
import type { ToolMetadata, ToolComponentProps } from '../../../apps/shell/src/types/tool'

export const metadata: ToolMetadata = {
  slug: 'guitar-tuner',
  name: {
    en: 'Guitar Tuner',
    pl: 'Tuner Gitarowy'
  },
  description: {
    en: 'Chromatic and guitar tuner with real-time frequency analysis and reference tones.',
    pl: 'Tuner chromatyczny i gitarowy z analizą częstotliwości w czasie rzeczywistym.'
  },
  icon: '🎸',
  category: 'audio',
  tags: {
    en: ['tuner', 'guitar', 'pitch', 'audio'],
    pl: ['tuner', 'gitara', 'dźwięk', 'audio']
  }
}

export { GuitarTuner as ToolComponent } from './GuitarTuner'
```

---

## 🚀 Getting Started

```bash
# Navigate to AllTools
cd AllTools

# Install monorepo dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview locally
npm run preview
```

---

## ✅ Product direction

AllTools follows the same shell discipline as AllGames, but keeps its own identity as a collection of offline utilities:

- tool-first routing and metadata model
- app shell shared across utilities
- local-only persistence
- layout designed for utility workflows, not game sessions
- consistent multilingual UX and device-first behavior

---

*License: MIT*
