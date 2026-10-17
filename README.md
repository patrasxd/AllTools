# AllTools

<p align="center">
  <strong>A minimalist sketch-and-ink suite of browser-based utilities and daily tools.</strong><br>
  No servers, no tracking, no accounts — 100% client-side, offline-ready Progressive Web App (PWA).<br>
  Available in English and Polish.
</p>

<p align="center">
  <a href="https://github.com/patrasxd/AllTools/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/React-18.3-blue.svg" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue.svg" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/PWA-Offline--First-brightgreen.svg" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/Vitest-363%20passed-success.svg" alt="Vitest Tests" />
</p>

<p align="center">
  <a href="https://patrasxd.github.io/AllTools/"><img src="apps/shell/public/og-image.png" alt="AllTools: free browser tools that work offline" width="640" /></a>
</p>

<p align="center">
  <a href="https://patrasxd.github.io/AllTools/"><strong>Open AllTools online</strong></a> · installable as an offline app (PWA) · no sign-up
</p>

---

## Table of Contents

- [Overview](#overview)
- [Why AllTools](#why-alltools)
- [Key Features](#key-features)
- [Tools Catalog](#tools-catalog)
- [Architecture & Monorepo](#architecture--monorepo)
- [Responsive Layout Templates](#responsive-layout-templates)
- [Design System & Themes](#design-system--themes)
- [Tool API Contract](#tool-api-contract)
- [Getting Started](#getting-started)
- [Adding a New Tool](#adding-a-new-tool)
- [Storage & Privacy](#storage--privacy)
- [AI-assisted Development](#ai-assisted-development)
- [License](#license)

---

## Overview

**AllTools** is an open-source collection of fast, private browser utilities designed for everyday productivity, hardware measurements, media manipulation, and calculations. Every tool runs entirely within your browser engine — your files, audio inputs, microphone feeds, and notes never leave your machine.

Packaged as an npm workspaces monorepo and styled with a tactile ink-and-paper aesthetic, AllTools combines the instant access of web applications with the security and offline reliability of native desktop software.

---

## Why AllTools

Every now and then I need to merge or sign a PDF, make a QR code, turn a raster image into a vector, or put a quick watermark on a photo before sending it somewhere. It usually ended in one of three ways: an app that sat on my phone afterwards, full of ads and collecting data, several apps for one job because each did only a tiny part of it, or a random "free online" site where I had to upload my files. AllTools puts these tools in one place, runs them entirely in your browser, and keeps your files on your device.

---

## Key Features

- 🔒 **100% Client-Side Privacy**: Zero analytics, zero telemetric beacons, zero cloud dependencies. Your files and sensor feeds remain on your device.
- 📴 **Offline PWA Capability**: Precached with Service Workers for complete functionality even without internet connectivity.
- 📐 **Calibrated Viewport Allocation**: Built on reusable `@all/ui` responsive templates (`SplitWorkspaceLayout`, `CenteredUtilityLayout`, `FullBleedLayout`) preventing awkward page scrolling.
- 🌓 **4 Visual Themes**: Light, Dark, E-Ink Light (pure black-and-white, zero drop-shadows, crisp contrast for e-readers), and E-Ink Dark.
- 🎬 **Dedicated Motion Infrastructure**: Fine-tuned Framer Motion animations with instant OS `prefers-reduced-motion` compliance and forced zero-motion in E-Ink modes.
- 🌐 **Instant Bilingual Support**: Full English and Polish localizations toggleable at runtime.
- 🧪 **High Test Reliability**: Exhaustive Vitest suites covering audio DSP, sensor math, PDF manipulation, and cryptographic primitives.

---

## Tools Catalog

AllTools currently provides **13 high-utility tools**:

| Tool                     | Slug                 | Category         | Template                | Key Capabilities                                                                                                                                                                                                                                                                                                                                                                                   |
| :----------------------- | :------------------- | :--------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sound Meter**          | `sound-meter`        | Audio / Sensor   | `FullBleedLayout`       | Real-time acoustic noise meter via microphone input with dBA/dBZ frequency weighting, peak hold, and live audio oscilloscope.                                                                                                                                                                                                                                                                      |
| **Dev Vault**            | `dev-vault`          | Utility / Dev    | `SplitWorkspaceLayout`  | CSPRNG password & passphrase generator, UUIDv4, SHA/MD5 hashing, Base64 encoder/decoder, JWT payload inspector, and IPv4/CIDR subnet calculator.                                                                                                                                                                                                                                                   |
| **Code Studio**          | `code-studio`        | Utility / Dev    | `SplitWorkspaceLayout`  | Offline multi-tab code and text editor (CodeMirror 6): syntax highlighting for 18 languages, find & replace with regex, syntax error underlining with a Problems panel, Prettier/SQL formatting, JSON minify, Markdown live preview with a syntax toolbar, code-to-image (PNG/SVG/clipboard), LF/CRLF handling, drag & drop import, export to any file extension, and automatic local persistence. |
| **PDF Suite**            | `pdf-suite`          | Documents        | `SplitWorkspaceLayout`  | In-browser PDF toolkit powered by `pdf-lib` & `pdfjs-dist`: merge documents, extract/split pages, rotate orientations, sign documents (drawn or typed signature), and convert images into PDF.                                                                                                                                                                                                     |
| **Image Studio**         | `image-studio`       | Media / Graphics | `CenteredUtilityLayout` | Client-side image editor: crop, resize, text/image watermarking, quality compression, format conversion (PNG/JPEG/WebP/HEIC), and raster-to-SVG vectorization (B&W via VTracer WASM `vectortracer`, color via `imagetracerjs`; a single Smoothness slider drives pre-trace upscale + blur and curve fitting).                                                                                      |
| **Calc & Converter**     | `calc-converter`     | Math / Utility   | `CenteredUtilityLayout` | Dual-mode calculator (Standard & Scientific) paired with multi-unit converter across Length, Mass, Temperature, Speed, Time, and Digital Storage.                                                                                                                                                                                                                                                  |
| **Guitar Tuner**         | `guitar-tuner`       | Audio            | `FullBleedLayout`       | High-precision chromatic and guitar tuner using real-time Web Audio FFT pitch detection, note frequency gauge, and reference tone generator.                                                                                                                                                                                                                                                       |
| **Level & Protractor**   | `level-protractor`   | Measurement      | `FullBleedLayout`       | Dual-axis bubble level using DeviceOrientation API, calibrated tubular spirit level, interactive touch-canvas protractor with angle lock, and digital magnetic compass.                                                                                                                                                                                                                            |
| **Screen Ruler**         | `screen-ruler`       | Measurement      | `FullBleedLayout`       | Screen-calibrated on-screen ruler supporting millimeters, centimeters, and inches with standard credit-card PPI calibration and dual-axis calipers.                                                                                                                                                                                                                                                |
| **QR Suite**             | `qr-suite`           | Utility          | `SplitWorkspaceLayout`  | Offline QR Code generator (URL, text, WiFi credentials, vCard) with custom sizing and error correction, paired with live camera & file QR scanner.                                                                                                                                                                                                                                                 |
| **Stopwatch & Interval** | `stopwatch-interval` | Time             | `CenteredUtilityLayout` | Precision stopwatch with millisecond timing, lap recordings, split differences, and customizable interval HIIT workout timer with audio beeps.                                                                                                                                                                                                                                                     |
| **Quick Notes**          | `quick-notes`        | Productivity     | `SplitWorkspaceLayout`  | Minimalist offline scratchpad and checklist with markdown support, color tags, live text search, and automatic local persistence.                                                                                                                                                                                                                                                                  |
| **Sketch Suite**         | `sketch-suite`       | Media / Graphics | `FullBleedLayout`       | Retro sketch & drawing suite with shapes, flood fill bucket, image clipboard paste (Ctrl+V) & editing, and custom palettes.                                                                                                                                                                                                                                                                        |

---

## Architecture & Monorepo

AllTools is architected as an **npm workspaces monorepo** driven by Vite and TypeScript, consuming the shared neutral UI system (`@all/ui`):

```mermaid
graph TD
    SharedUI["@all/ui (Shared Design System & Templates)"]
    Shell["apps/shell (Host Application)"]
    ToolsUI["packages/ui (@alltools/ui Primitives)"]
    Tools["packages/tools/* (13 Autonomous Tool Packages)"]

    SharedUI --> Shell
    SharedUI --> ToolsUI
    SharedUI --> Tools
    ToolsUI --> Tools
    Tools --> Shell
```

### Directory Tree

```
AllTools/
├── package.json                   # Root monorepo configuration & scripts
├── README.md                      # Project documentation
│
├── apps/
│   └── shell/                     # Host application (Vite + React + TS + PWA)
│       ├── src/
│       │   ├── tools/             # Eager metadata registry & dynamic tool loaders
│       │   ├── i18n/              # Shell translations & context (EN / PL)
│       │   ├── components/        # AppHeader, ToolCard, Navigation
│       │   ├── pages/             # HomePage, ToolPage (zero-scroll container)
│       │   ├── styles/            # Shell tokens & layout CSS
│       │   ├── types/             # ToolMetadata & ToolComponentProps contracts
│       │   ├── App.tsx            # Routes & animated transitions
│       │   └── main.tsx           # ThemeProvider, MotionProvider, React root
│       ├── public/
│       │   ├── manifest.webmanifest # PWA manifest
│       │   └── icons/             # Application icons & SVG favicon
│       └── vite.config.ts         # Vite configuration with PWA plugin
│
├── packages/
│   ├── ui/                        # Tool-specific UI wrappers (@alltools/ui)
│   └── tools/                     # 13 Standalone Tool Packages
│       ├── calc-converter/
│       ├── code-studio/
│       ├── dev-vault/
│       ├── guitar-tuner/
│       ├── image-studio/
│       ├── level-protractor/
│       ├── pdf-suite/
│       ├── qr-suite/
│       ├── quick-notes/
│       ├── screen-ruler/
│       ├── sketch-suite/
│       ├── sound-meter/
│       └── stopwatch-interval/
│
└── AllUI/                         # Git Submodule referencing @all/ui design system
```

---

## Responsive Layout Templates

Rather than arbitrary layout sizing, every tool in AllTools is built upon reusable responsive templates from `@all/ui`:

1. **`SplitWorkspaceLayout`**:
   - Ideal for workbench workflows where input/controls live on the left (or top on mobile) and live output/preview occupies the right (or bottom on mobile).
   - Used by: `code-studio`, `dev-vault`, `pdf-suite`, `qr-suite`, `quick-notes`.
2. **`CenteredUtilityLayout`**:
   - Ideal for focused card utilities, converters, and timers requiring clean vertical or grid centering.
   - Used by: `calc-converter`, `image-studio`, `stopwatch-interval`.
3. **`FullBleedLayout`**:
   - Intended for sensor-driven, canvas, or direct physical measurement interfaces requiring edge-to-edge touch allocation without page scrolling.
   - Used by: `sound-meter`, `guitar-tuner`, `level-protractor`, `screen-ruler`, `sketch-suite`.

---

## Design System & Themes

All visual primitives and tokens originate from `@all/ui`:

- **Design Tokens**: Standard CSS custom properties (`--all-bg`, `--all-surface`, `--all-border`, `--all-text`, `--all-accent`, `--all-space-*`).
- **Typography**: Clean, readable system sans-serif hierarchy for UI elements, paired with `ui-monospace` for data, hashes, and calculations.
- **Supported Themes**:
  - `dark`: High-contrast dark theme (default).
  - `light`: Clean ink-on-paper light aesthetic.
  - `e-ink-light`: High-contrast pure black/white theme with zero animations and solid borders for e-paper screens.
  - `e-ink-dark`: Inverted monochrome E-Ink palette.
- **Motion Profiles**: Configurable between `none`, `normal`, and `expressive`, with automatic `none` override under E-Ink and `prefers-reduced-motion`.

---

## Tool API Contract

Every tool in `packages/tools/<slug>` is a self-contained module exporting its metadata and component.

### 1. Metadata Export (`src/metadata.tsx`)

```tsx
import React from 'react'
import { IconGuitar } from '@all/ui'
import type { ToolMetadata } from '../../../apps/shell/src/types/tool'

export const metadata: ToolMetadata = {
  slug: 'guitar-tuner',
  name: {
    en: 'Guitar Tuner',
    pl: 'Tuner Gitarowy',
  },
  description: {
    en: 'Accurate chromatic and guitar tuner with real-time frequency analysis & reference tones.',
    pl: 'Precyzyjny tuner chromatyczny i gitarowy z analizą częstotliwości w czasie rzeczywistym.',
  },
  icon: <IconGuitar size={24} strokeWidth={1.5} />,
  category: 'audio',
  tags: {
    en: ['Audio', 'Instrument', 'Pitch'],
    pl: ['Audio', 'Instrument', 'Dźwięk'],
  },
}
```

### 2. Component Export (`src/index.tsx`)

```tsx
export * from './metadata'
export { GuitarTuner as ToolComponent } from './GuitarTuner'
```

### 3. Component Props (`ToolComponentProps`)

```ts
export interface ToolComponentProps {
  /** Current language code ('en' | 'pl') */
  locale: 'en' | 'pl'
  /** Optional callback to render custom actions/widgets into the top shell header */
  setHeader?: (content: React.ReactNode) => void
  /** Optional callback for persisting arbitrary data */
  onSave?: (data: unknown) => void
}
```

---

## Getting Started

### Prerequisites

- **Node.js**: `22` (the version used by CI)
- **npm**: `9.0.0` or higher (supporting npm workspaces)

### Installation & Run

```bash
# Clone repository with submodules
git clone --recurse-submodules https://github.com/patrasxd/AllTools.git
cd AllTools

# Install monorepo dependencies
npm install

# Start local development server
npm run dev

# Run linter
npm run lint

# Check code formatting with Prettier
npm run format:check

# Run Vitest test suite across all tools
npm test

# Run TypeScript type check across shell and packages
npm run typecheck

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Deployment

Deployment is fully automated via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) on push to the `main` branch:

1. **Verification**: Runs a clean install (`npm ci`), ESLint linter (`npm run lint`), static TypeScript check (`npm run typecheck`), and Vitest test suite (`npm test`). If any check fails, the deployment is aborted.
2. **Build & Routing Setup**: Builds the production bundle (`npm run build`) and copies `apps/shell/dist/index.html` to `apps/shell/dist/404.html` to ensure deep-linking and page refreshes work properly under GitHub Pages without `HashRouter`.
3. **Publishing**: Deploys `./apps/shell/dist` to the `gh-pages` branch via `peaceiris/actions-gh-pages`.

---

## Adding a New Tool

1. **Scaffold Package**:
   Create a new package directory under `packages/tools/<new-tool>` with its own `package.json` named `@alltools/<new-tool>`.
2. **Select Layout Template**:
   Choose the appropriate template from `@all/ui` (`SplitWorkspaceLayout`, `CenteredUtilityLayout`, or `FullBleedLayout`).
3. **Implement Logic & UI**:
   Implement your tool components using design tokens and controls from `@all/ui`.
4. **Export Metadata & Component**:
   Create `src/metadata.tsx` and export `{ metadata, ToolComponent }` from `src/index.tsx`.
5. **Register in Shell Registry**:
   Add the tool metadata to `TOOLS_METADATA` and dynamic loader to `loaders` in `apps/shell/src/tools/registry.ts`.
6. **Add Unit & Integration Tests**:
   Write test suites under `src/__tests__/` and run `npm test`.

---

## Storage & Privacy

All data is stored purely in client-side browser `localStorage`. Storage access goes through the safe helpers in `packages/ui` (`safeGetItem`, `safeSetItem`, `safeGetJSON`, `safeSetJSON`), so an unavailable or full storage (for example in private mode) never breaks a tool; it just falls back to defaults. Keys:

| Key                                     | Type                                                 | Description                                         |
| :-------------------------------------- | :--------------------------------------------------- | :-------------------------------------------------- |
| `all_theme`                             | `'dark' \| 'light' \| 'e-ink-light' \| 'e-ink-dark'` | Theme preference (shared AllUI theme provider)      |
| `alltools:language`                     | `'en' \| 'pl'`                                       | Language preference                                 |
| `alltools:quick-notes:v2:lists`         | `JSON`                                               | Quick Notes lists and checklists                    |
| `alltools:code-studio:v1:session`       | `JSON`                                               | Code Studio open documents and editor settings      |
| `alltools:code-studio:v1:image-options` | `JSON`                                               | Code Studio code-to-image settings                  |
| `alltools:calc-history`                 | `JSON`                                               | Calculator history                                  |
| `alltools:ruler:ppm`                    | `number`                                             | Calibrated screen pixels per millimeter             |
| `alltools:tuner:*`                      | `string`                                             | Guitar tuner preset, A4 calibration, noise gate     |
| `alltools:level:*`                      | `string`                                             | Level, protractor and compass settings, calibration |
| `alltools:interval:*`                   | `string \| JSON`                                     | Interval timer preset and custom steps              |
| `alltools:qr-camera-id`                 | `string`                                             | Last used camera for the QR scanner                 |

No data, file contents, camera feeds, or audio waveforms are transmitted over the network. Files you open (PDFs, images, audio) are processed in memory in your browser and never uploaded. There are no cookies and no analytics. Production builds ship a Content Security Policy that limits network connections to the same origin (`connect-src 'self'`) and allows no external hosts, so the app cannot send data to third-party servers. The policy includes `'unsafe-eval'` for the HEIC converter (the `heic2any` library), which is why it is described as restrictive rather than strict.

---

## AI-assisted Development

This project is built with AI coding agents under human direction. The architecture, the tech stack, the testing approach, the look and feel, and the written instructions the agents follow ([`AGENTS.md`](AGENTS.md) and the rules and skills in [`.agents/`](.agents/)) were decided by the author. The agents implement within those rules, the author reviews the result, and the repository has also been cross-checked with Claude, GitHub Copilot and Antigravity. Lint, formatting, type checks, tests and a production build must pass in CI before every deployment.

---

## License

This project is licensed under the [MIT License](LICENSE).
