---
name: visual-tool-audit
description: Audit an AllTools screen for responsive viewport usage, theme rendering, and layout defects.
---

# Visual Tool Audit Skill

Use this skill to inspect and verify an AllTools screen across all required viewports and theme modes.

## Audit Checklist

### 1. Viewport Utilization
Test the screen under 5 standardized viewports:
- **Mobile Portrait** (390 x 844)
- **Mobile Landscape** (844 x 390)
- **Tablet** (820 x 1180)
- **Desktop** (1280 x 800)
- **Large Desktop** (1920 x 1080)

Verify:
- On desktop, is the available width intelligently utilized (e.g. split view for encoders/editors rather than clamped to 680px)?
- Does the tool avoid unintended outer window scrollbars during standard use?
- Are long inputs or lists contained within scrollable inner containers?
- Are touch targets at least 44x44px on touch viewports?

### 2. Theme Verification
Cycle through all supported themes:
- `dark`: High-contrast dark surfaces, legible muted text.
- `light`: Clean light surfaces, proper contrast ratios (> 4.5:1).
- `e-ink-light`: Pure white background, pure black borders (>= 2px), no drop shadows, zero animations.
- `e-ink-dark`: Pure black background, crisp white borders.

### 3. Motion & Accessibility
- Emulate `prefers-reduced-motion: reduce`: Verify all gauges, meters, and transitions update instantly.
- Verify clear labels and aria attributes on measurement tools and inputs.
- Capture comparison screenshots and record any regressions.
