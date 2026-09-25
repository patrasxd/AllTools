---
name: add-new-tool
description: Create and register a new tool in AllTools with built-in testing, lifecycle safety, and responsive template setup.
---

# Add New Tool Skill

Follow this standardized procedure to scaffold, implement, test, and register a new tool in AllTools.

## 1. Interaction Archetype Selection & Safety Checks
Classify the tool against the workspace archetypes catalog:
- Archetype 1: Audio-loop (must release tracks and close AudioContext on unmount)
- Archetype 2: Camera (must stop video tracks on unmount)
- Archetype 3: Device sensors (must feature-detect and request permission via user gesture)
- Archetype 4: Interval/timer (must reference `performance.now()` / timestamp deltas, never fixed decrement)
- Archetype 5: File/canvas processing (keep heavy dependencies isolated)
- Archetype 6: Simple I/O (split pane or input-focused)

## 2. Package Scaffolding & Module Graph Separation
1. Create `packages/tools/<slug>`:
   - `package.json` (`@alltools/<slug>`, version `0.1.0`, private; declare `"@all/ui": "file:../../../AllUI"` in dependencies, and `"@alltools/ui": "*"` only if using tool-specific vector icons)
   - `src/metadata.ts` (isolated static metadata: localized name, description, category, tags, and icon — MUST contain zero imports of the component or heavy runtime libraries)
   - `src/types.ts` (`ToolComponentProps` including `isEink?: boolean`)
   - `src/i18n.ts` (bilingual `en` and `pl` strings)
   - `src/utils/<engine>.ts` (pure calculation/conversion functions)
   - `src/<Tool>.tsx` (main component)
   - `src/index.tsx` (lazy component entry point, exporting `ToolComponent`)
2. **CRITICAL Module Graph Rule**: The metadata entry point (`metadata.ts`) and the component entry point (`index.tsx`) must be resolvable as genuinely separate module graphs, never re-exported from one common barrel file. If metadata is imported from a barrel that re-exports the component, Rollup/Vite treats the lazy `import()` as an eager static dependency, pulling the component and its heavy libraries (`heic2any`, `pdfjs-dist`, `pdf-lib`, etc.) directly into the initial shell bundle.
3. **Use Shared UI Components (`@all/ui`) & Tool Icons (`@alltools/ui`)**:
   - Layout Templates (`@all/ui`): `SplitWorkspaceLayout`, `CenteredUtilityLayout`, `FullBleedLayout`.
   - Action Bars & Controls (`@all/ui`): `ControlsBar`, `Button`, `IconButton`, `Input`, `Select`, `Toggle`, `PillGroup`, `ModeSelect`.
   - Content & Surfaces (`@all/ui`): `Card`, `Badge`.
   - Modals & Dialogs (`@all/ui`): `ConfirmDialog`, `Dialog`, `Modal`.
   - Utilities & Formatters (`@all/ui`): `formatTime`, `formatStopwatchTime`, `pad3`.
   - Tool Vector Icons (`@alltools/ui`): `IconGuitar`, `IconCalculator`, `IconProtractor`, `IconVolume`, `IconFileText`, `IconKey`.
4. Embed inside an appropriate responsive template (`SplitWorkspaceLayout`, `CenteredUtilityLayout`, or `FullBleedLayout`).

## 3. Register in App Shell
1. In `apps/shell/src/tools/registry.ts`:
   - Import metadata directly from the dedicated metadata file:
     ```ts
     import { metadata as newToolMeta } from '@alltools/<slug>/src/metadata' // or '@alltools/<slug>/metadata'
     ```
     NEVER import metadata from `@alltools/<slug>` barrel!
   - Add metadata to `TOOLS_METADATA`.
   - Add dynamic import loader in `loaders` map:
     ```ts
     '<slug>': () => import('@alltools/<slug>'),
     ```
2. In `apps/shell/vite.config.ts`: Add path aliases for package `src` and package `metadata`.
3. In `apps/shell/package.json`: Add workspace dependency.

## 4. Built-in Testing & Bundle Verification (Mandatory)
1. **Tooling Check**: Verify Vitest and Playwright exist; set up minimal runners if absent.
2. **Unit Tests**: Create `src/__tests__/<engine>.test.ts` covering calculations, string parsing, edge cases.
3. **Lifecycle Test**: If using hardware APIs, test stream cleanup on unmount.
4. **Visual Baseline**: Capture screenshots across themes (Dark, Light, E-Ink) and viewports (mobile 390px, desktop 1280px).
5. **Concrete Build Verification**:
   - Run a real production build: `npm run build --workspace=@alltools/shell`
   - Verify that Vite/Rollup outputs **ZERO** warnings of the form:
     `(!) ... is dynamically imported by ... but also statically imported by ..., dynamic import will not move module into another chunk.`
   - Verify via sourcemap/module inspection that the new tool's component and third-party dependencies (especially any heavy libraries) reside strictly inside its own dynamic chunk, and that the main entry chunk size has not regressed. Do NOT rely on visual inspection alone.

