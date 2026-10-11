# AGENTS.md

Instructions for AI coding agents working in **AllTools** (browser utilities suite: PDF, images, QR, audio, sensors and more). This file is read natively by Codex, GitHub Copilot, Cursor and Antigravity; Claude Code and Gemini CLI reach it through `CLAUDE.md` and `GEMINI.md`.

The detailed, authoritative instructions live in [`.agents/`](.agents/). This file is only an entry point: read the relevant rule files and skills there before changing code, and do not duplicate their content here.

## Project at a glance

- npm workspaces monorepo (Node 22): `apps/shell` (Vite + React 18 + TypeScript + PWA), `packages/tools` (one package per tool), `packages/ui` (`@alltools/ui`, local helpers and icons).
- Shared UI primitives, layouts and design tokens come from the **AllUI** git submodule (`AllUI/`, imported as `@all/ui`). Clone with `git clone --recurse-submodules`, or run `git submodule update --init --recursive`.
- Two languages (English and Polish), three themes (`dark`, `light`, `e-ink-light`), responsive from phones to desktop.

## Commands

```bash
npm install            # install all workspaces
npm run dev            # start the shell dev server
npm run lint           # eslint
npm run format:check   # prettier --check
npm run typecheck      # tsc -b apps/shell
npm test               # vitest run packages/tools
npm run build          # production build of the shell
```

## Definition of done

Before you finish a task, `lint`, `format:check`, `typecheck`, `test` and `build` must pass. CI runs the same steps (`.github/workflows/deploy.yml`). Every new or changed tool needs tests in the same task (see `.agents/rules/04-testing-gating.md`).

## Where the detailed instructions are

Rules (`.agents/rules/`):

- `00-architecture.md`: repository structure, package responsibilities, shell and registry.
- `01-tool-boundaries.md`: what belongs in a tool package and the component contract.
- `02-themes-motion.md`: themes, tokens, motion and e-ink behavior.
- `03-responsive-layout.md`: viewport allocation, layouts for phone, tablet and desktop.
- `04-testing-gating.md`: required tests per module.

Skills (`.agents/skills/<name>/SKILL.md`), read the matching one when the task fits:

- `add-new-tool`: create and register a new tool with tests and responsive setup.
- `migrate-tool-ui`: move an existing tool to shared UI primitives, layouts and theme tokens.
- `visual-tool-audit`: audit a screen for viewport usage, theme rendering and layout defects.

## Project invariants

- **Privacy first.** No analytics, trackers, cookies, ads or network requests to third parties. User data stays on the device (`localStorage`); files are processed in the browser and never uploaded. Production builds ship a CSP that restricts connections to `'self'`.
- **Works offline** as a PWA. Do not add runtime dependencies on external services or CDNs.
- **Accessibility.** Anything clickable that is not a `<button>` or `<a>` needs `role="button"`, `tabIndex={0}` and keyboard support: use `onKeyActivate` from `@alltools/ui`. Never remove focus indicators; keep keyboard focus visible with `:focus-visible`.

## Workflow

Make all requested changes in one go. Do not create a separate branch per task and do not commit after every small change, unless asked.
