# AllTools Architecture

## Repository Structure

AllTools is a multi-package utility monorepo managed with npm workspaces:

- `apps/shell`: The central Vite + React 18 + TypeScript + PWA shell (mounted at base path `/AllTools/`).
- `packages/ui`: Local UI package (`@alltools/ui`), now re-exporting unified, tokenized components from `@all/ui` for 100% backward compatibility.
- `packages/tools/*`: 11 individual, self-contained tool packages (`calc-converter`, `dev-vault`, `guitar-tuner`, `image-studio`, `level-protractor`, `pdf-suite`, `qr-suite`, `quick-notes`, `screen-ruler`, `sound-meter`, `stopwatch-interval`).

## Shell & Registry Contract

Tools are registered in `apps/shell/src/tools/registry.ts`:
- Eager metadata list: `TOOLS_METADATA`
- Lazy component loader function: `loadToolComponent(slug)`

Each tool package exports:
```ts
export * from './metadata'
export * from './types'
export { Tool as ToolComponent } from './Tool'
export type { ToolComponentProps } from './types'
```

### Path Aliases & Heavy Dependencies
AllTools shell configures Vite path aliases to resolve tools and UI directly from `src`.
Special attention is required for heavy dependencies:
- `pdf-lib` and `pdfjs-dist`: Must remain strictly code-split inside `pdf-suite` and not leak into shell entry bundle.
- `heic2any`: Must remain inside `image-studio`.

## Technology Stack
- **Framework**: React 18 (hooks, functional components, memo)
- **Styling**: Vanilla CSS with CSS Custom Properties, no Tailwind
- **Animations**: `framer-motion` (with explicit E-Ink and reduced-motion bypass)
- **PWA**: `vite-plugin-pwa` with workbox service worker
- **Routing**: `react-router-dom` v6
