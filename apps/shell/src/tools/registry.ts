import { ToolMetadata } from '../types/tool'

import { metadata as calcConverterMeta } from '@alltools/calc-converter'
import { metadata as imageStudioMeta } from '@alltools/image-studio'
import { metadata as pdfSuiteMeta } from '@alltools/pdf-suite'
import { metadata as guitarTunerMeta } from '@alltools/guitar-tuner'
import { metadata as levelProtractorMeta } from '@alltools/level-protractor'
import { metadata as qrSuiteMeta } from '@alltools/qr-suite'
import { metadata as stopwatchIntervalMeta } from '@alltools/stopwatch-interval'
import { metadata as quickNotesMeta } from '@alltools/quick-notes'
import { metadata as screenRulerMeta } from '@alltools/screen-ruler'

export const TOOLS_METADATA: ToolMetadata[] = [
  pdfSuiteMeta,
  imageStudioMeta,
  calcConverterMeta,
  guitarTunerMeta,
  levelProtractorMeta,
  screenRulerMeta,
  qrSuiteMeta,
  stopwatchIntervalMeta,
  quickNotesMeta,
]

// Dynamic lazy component loaders
const loaders: Record<string, () => Promise<{ ToolComponent: React.ComponentType<any> }>> = {
  'pdf-suite': () => import('@alltools/pdf-suite'),
  'image-studio': () => import('@alltools/image-studio'),
  'calc-converter': () => import('@alltools/calc-converter'),
  'guitar-tuner': () => import('@alltools/guitar-tuner'),
  'level-protractor': () => import('@alltools/level-protractor'),
  'screen-ruler': () => import('@alltools/screen-ruler'),
  'qr-suite': () => import('@alltools/qr-suite'),
  'stopwatch-interval': () => import('@alltools/stopwatch-interval'),
  'quick-notes': () => import('@alltools/quick-notes'),
}

export async function loadToolComponent(slug: string): Promise<React.ComponentType<any> | null> {
  const loader = loaders[slug]
  if (!loader) return null
  const mod = await loader()
  return mod.ToolComponent
}
