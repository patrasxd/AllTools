# Responsive Layout & Workspace Allocation in AllTools

## Viewport Allocation Principles

Utilities must intelligently utilize the screen across viewports:
- **Mobile Portrait** (< 600px width)
- **Mobile Landscape** (< 900px width, short height)
- **Tablet** (600px - 1024px)
- **Desktop** (1024px - 1440px)
- **Large Desktop** (> 1440px)

## Critical Anti-Patterns to Eliminate

1. **Arbitrary Narrow Constraints on Desktop**:
   - Discovered bugs:
     - Image Studio restricted to `max-width: 760px` and `max-height: 340px` dropzone.
     - PDF Suite and Dev Vault restricted to `max-width: 680px`.
     - Calculator forced to `max-width: 380px`.
   - On a desktop monitor, multi-column split views (input left / output right) should expand naturally to utilize available horizontal space.
2. **One-Off Layout Hacks**:
   - Discovered bug: `ToolPage.tsx` using `slug === 'screen-ruler' ? 'tool-page-content--fullbleed' : 'container'`.
   - Full-bleed vs centered layouts must be handled by reusable responsive templates, not hardcoded slug checks in the shell page.
3. **Internal vs Page Scrolling**:
   - Avoid whole-page scrolling when a tool is active.
   - Long lists (e.g. calculation history, notes list, hash outputs) should scroll internally within their own pane (`overflow-y: auto`).
4. **Touch & Click Sizing**:
   - Ensure all inputs, sliders, and buttons maintain comfortable touch dimensions (minimum 44px hit areas on mobile).
