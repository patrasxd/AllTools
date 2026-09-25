---
name: migrate-tool-ui
description: Migrate an existing tool to shared UI primitives, responsive templates, and theme tokens with attached testing.
---

# Migrate Tool UI Skill

Use this skill when migrating an existing AllTools package to use `@all/ui` and standard responsive layout templates.

## Step 1: Pre-Migration Archetype & Bug Audit
1. Open the tool's components and lifecycle hooks.
2. Cross-reference with `tool-interaction-archetypes`:
   - If audio (e.g. Guitar Tuner, Sound Meter): verify unmount closes AudioContext and stops all MediaStream tracks.
   - If timer (e.g. Interval Timer): replace naive decrement with timestamp deltas.
   - If sensors (e.g. Level, Protractor): add `DeviceOrientationEvent.requestPermission` user-gesture trigger.
   - Props fix: ensure `isEink?: boolean` is declared in props and honored.
   - Props rename: rename any lingering `GameComponentProps` to `ToolComponentProps`.
3. Fix identified archetype bugs during the migration.

## Step 2: UI Primitives & Tokens Migration
1. Replace local ad-hoc buttons (`ToolButton`, `GameButton`, unexported components) with shared `Button` / `IconButton` from `@all/ui`.
2. Replace local modals, dialogs, and headers with shared `Modal` / `Dialog` / `ConfirmDialog` and `StatsHeader` from `@all/ui`.
3. Replace hardcoded hex colors with semantic CSS custom properties (`--all-bg`, `--all-surface`, `--all-surface-2`, `--all-border`, `--all-text`, `--all-text-muted`, `--all-accent`, etc.).
4. Use `@alltools/ui` strictly for tool-specific vector icons (`IconGuitar`, `IconCalculator`, `IconProtractor`, `IconVolume`, `IconFileText`, `IconKey`). Do not import wrapper components from `@alltools/ui`.
5. Wire `isEink` prop to eliminate drop shadows, blur filters, and transitions.

## Step 3: Viewport & Responsive Template Integration
1. Remove hardcoded clamp formulas (e.g. `max-width: 680px`, `max-width: 760px`).
2. Place tool content inside designated responsive template:
   - Split Workspace (e.g. Dev Vault, PDF Suite): 2-pane side-by-side on desktop, stacked on mobile.
   - Full Bleed (e.g. Screen Ruler): edge-to-edge canvas with overlay controls.
   - Centered Utility (e.g. Guitar Tuner, Sound Meter): responsive centered card that scales gracefully.
3. Replace shell-level slug hacks (`slug === 'screen-ruler'`) with standard template-driven layout.

## Step 4: Attached Testing & Gating (Mandatory)
1. **Tooling Check**: Check for Vitest in repository; install if absent.
2. **Logic Unit Tests**: Add or run unit tests in `src/__tests__/` to verify calculations and conversions remain 100% accurate.
3. **Visual Regression Baselines**: Compare before/after screenshots for:
   - Dark theme
   - Light theme
   - E-Ink mode
4. **Golden Path Check**: Verify tool inputs, buttons, and responsive breakpoints.
5. **Bundle Size Check**: Ensure heavy libraries (`pdf-lib`, `pdfjs-dist`, `heic2any`) remain lazily isolated.
