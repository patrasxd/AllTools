# Tool Boundaries & Hardware API Lifecycle

## What Belongs in a Tool Package

Each tool under `packages/tools/<slug>` owns:
1. **Utility & Conversion Logic**: Pure calculation, string manipulation, encoding, parsing engines (`calcEngine.ts`, `crypto.ts`, `imageEngine.ts`).
2. **Interactive Workbench & Visualizers**: Canvas readouts, meters, gauges, split-input panes.
3. **Tool-Specific Translations & Config**: `i18n.ts` with local Polish and English strings.
4. **Tool Metadata**: Static `slug`, `name`, `description`, `icon`, `category`, `tags`.

## Hardware & Browser API Lifecycle Rules (Critical)

AllTools relies heavily on browser hardware APIs. Strict lifecycle cleanup is mandatory:
1. **Audio Streams (Microphone)**:
   - `getUserMedia` streams must have every track stopped (`track.stop()`) and `AudioContext` closed on unmount, not just when an explicit "stop" button is clicked.
2. **Camera Streams**:
   - Video tracks must be stopped on unmount and when changing tabs.
3. **Device Sensors (Orientation / Motion)**:
   - Must feature-detect `DeviceOrientationEvent.requestPermission` and call it inside a user-gesture handler (button click) for iOS Safari compatibility.
4. **Timers & Intervals**:
   - Never accumulate time with `setInterval` fixed increments. Always calculate elapsed/remaining time against `performance.now()` to prevent drift.

## The `ToolComponentProps` Contract

Tools must implement:
```ts
export interface ToolComponentProps {
  locale: Locale;
  isEink?: boolean;
  onSave?: (data: unknown) => void;
  setHeader?: (content: React.ReactNode) => void;
}
```
- Discovered bug: Several tools historically lacked `isEink?: boolean` in their local props, silently dropping the prop passed by `ToolPage.tsx`. All tools must declare and honor `isEink`.
- Discovered naming leftover: `guitar-tuner/src/types.ts` mistakenly named its props `GameComponentProps`. Use `ToolComponentProps`.
