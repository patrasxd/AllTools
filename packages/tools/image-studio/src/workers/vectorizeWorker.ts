import type { VectorizeWorkerRequest, VectorizeWorkerResponse } from '../types'
import { traceImageDataToSVG } from '../utils/vectorEngine'

self.onmessage = async (e: MessageEvent<VectorizeWorkerRequest>) => {
  const req = e.data

  if (!req || req.type !== 'vectorize') {
    return
  }

  const startTime = performance.now()

  try {
    const data = new Uint8ClampedArray(req.buffer)
    const result = await traceImageDataToSVG(
      {
        width: req.width,
        height: req.height,
        data,
      },
      req.config,
    )

    const durationMs = Math.max(1, Math.round(performance.now() - startTime))

    const response: VectorizeWorkerResponse = {
      id: req.id,
      type: 'success',
      svg: result.svg,
      pathsCount: result.pathsCount,
      durationMs,
    }

    self.postMessage(response)
  } catch (err) {
    const response: VectorizeWorkerResponse = {
      id: req.id,
      type: 'error',
      error: err instanceof Error ? err.message : 'Unknown vectorization failure',
    }

    self.postMessage(response)
  }
}
