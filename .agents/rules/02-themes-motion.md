# Themes and Motion in AllTools

## Visual Themes

AllTools supports the neutral shared themes:
- `dark` (default theme)
- `light`
- `e-ink-light` (crisp paper-like high contrast, white background, black borders, zero shadows)
- `e-ink-dark` (inverted monochrome, black background)

### Candy Theme Non-Goal
- Candy is a proposed future theme for AllGames only (not present in current codebase) and is NOT supported in AllTools.
- If Candy is ever requested in AllTools, fall back gracefully to Light.

### Theme Mechanics
- Document root receives `data-theme="dark|light|e-ink-light|e-ink-dark"`.
- Legacy compatibility: `data-eink="true"` is preserved alongside semantic theme attributes.
- All styling must rely on semantic design tokens (`--bg`, `--surface`, `--surface-2`, `--border`, `--border-2`, `--text`, `--text-muted`, `--text-dim`, `--accent`).

## Motion Profiles

Motion is strictly decoupled from visual theme:
- `none`: Used in E-Ink modes and when `prefers-reduced-motion: reduce` is detected.
- `normal`: Standard subtle transitions (150ms-250ms) for Light and Dark modes.
- `expressive`: Not standard in AllTools.

### Reduced Motion Override
Any `window.matchMedia('(prefers-reduced-motion: reduce)')` MUST force the motion profile to `none`.
Tool calculations and measurement readouts must render instantaneously without transition lag.
