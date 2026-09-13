# Testing & Gating Rules for AllTools

## Per-Module Testing Attachment

Testing is NOT an isolated one-time project phase. Instead, every migration or creation of a tool module must satisfy the following testing requirements in the same task:

1. **Tooling Verification**:
   - Check if unit test tooling (Vitest + React Testing Library) and visual regression/e2e tooling (Playwright) exist.
   - If not installed, set it up lazily as the first step of the module's skill.
2. **Unit Tests for Core Calculation / Utility Engines**:
   - Every tool must have unit tests covering non-visual calculation/conversion logic:
     - `calc-converter`: unit conversions, expression parsing, edge cases (division by zero, precision).
     - `dev-vault`: encoding (Base64, URL), hash generation, JSON formatting/validation.
     - `guitar-tuner`: frequency to note mapping algorithms.
     - `stopwatch-interval`: elapsed time computation logic without timestamp drift.
3. **Hardware Lifecycle Mocking**:
   - For audio/camera/sensor tools, verify unmount cleanup (mocking `MediaStream.getTracks()` and `AudioContext.close()`).
4. **Visual Regression Baselines**:
   - Capture screenshot baselines per theme (Light, Dark, E-Ink) and viewports (mobile portrait 390px, desktop 1280px).

## Gating Rule

No tool migration may be marked complete unless:
1. `npm run test` (Vitest) passes.
2. Production build (`npm run build`) passes and heavy dependencies (`pdf-lib`, `pdfjs-dist`, `heic2any`) do not leak into the initial shell chunk.
3. Responsive workspace layout behaves as expected across mobile portrait, mobile landscape, and desktop.
