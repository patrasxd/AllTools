import '@testing-library/jest-dom/vitest'
import { MotionGlobalConfig } from 'framer-motion'

MotionGlobalConfig.skipAnimations = true

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as any
}
