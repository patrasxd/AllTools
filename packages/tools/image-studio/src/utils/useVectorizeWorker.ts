import { useState, useRef, useEffect, useCallback } from 'react'
import type { VectorizeConfig, VectorizeResult, VectorizeWorkerResponse } from '../types'
import { traceImageDataToSVG } from './vectorEngine'

export interface UseVectorizeWorkerReturn {
  isVectorizing: boolean
  vectorResult: VectorizeResult | null
  error: string | null
  runVectorize: (imageData: { width: number; height: number; data: Uint8ClampedArray }, config: VectorizeConfig) => void
  cancelVectorize: () => void
}

export function useVectorizeWorker(): UseVectorizeWorkerReturn {
  const [isVectorizing, setIsVectorizing] = useState(false)
  const [vectorResult, setVectorResult] = useState<VectorizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const activeRequestIdRef = useRef<number>(0)

  // Initialize or recreate worker
  const getOrCreateWorker = useCallback((): Worker | null => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null
    }

    if (!workerRef.current) {
      try {
        const worker = new Worker(new URL('../workers/vectorizeWorker.ts', import.meta.url), {
          type: 'module',
        })

        worker.onmessage = (e: MessageEvent<VectorizeWorkerResponse>) => {
          const res = e.data
          if (!res || res.id !== activeRequestIdRef.current) {
            return // Stale or outdated response
          }

          setIsVectorizing(false)

          if (res.type === 'success') {
            const sizeBytes = new Blob([res.svg], { type: 'image/svg+xml' }).size
            setVectorResult({
              svg: res.svg,
              sizeBytes,
              pathsCount: res.pathsCount,
              durationMs: res.durationMs,
            })
            setError(null)
          } else {
            setError(res.error || 'Vectorization error')
          }
        }

        worker.onerror = (err) => {
          console.error('Vectorize Worker encountered an error:', err)
          setIsVectorizing(false)
          setError(err.message || 'Worker thread execution error')
        }

        workerRef.current = worker
      } catch (err) {
        console.warn('Failed to spawn module worker, falling back to sync execution:', err)
        return null
      }
    }

    return workerRef.current
  }, [])

  const cancelVectorize = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    activeRequestIdRef.current += 1
    setIsVectorizing(false)
  }, [])

  const runVectorize = useCallback(
    (imageData: { width: number; height: number; data: Uint8ClampedArray }, config: VectorizeConfig) => {
      setError(null)
      setIsVectorizing(true)

      const requestId = activeRequestIdRef.current + 1
      activeRequestIdRef.current = requestId

      const worker = getOrCreateWorker()

      if (worker) {
        try {
          // Clone the buffer slice so we can transfer it zero-copy without affecting the caller
          const bufferCopy = imageData.data.buffer.slice(0)
          worker.postMessage(
            {
              id: requestId,
              type: 'vectorize',
              width: imageData.width,
              height: imageData.height,
              buffer: bufferCopy,
              config,
            },
            [bufferCopy],
          )
        } catch (err) {
          console.error('Failed to post message to worker, falling back to main thread:', err)
          // Fallback to synchronous execution
          setTimeout(() => {
            if (activeRequestIdRef.current !== requestId) return
            try {
              const start = performance.now()
              const res = traceImageDataToSVG(imageData, config)
              const durationMs = Math.max(1, Math.round(performance.now() - start))
              const sizeBytes = new Blob([res.svg], { type: 'image/svg+xml' }).size
              setVectorResult({
                svg: res.svg,
                sizeBytes,
                pathsCount: res.pathsCount,
                durationMs,
              })
              setIsVectorizing(false)
            } catch (syncErr) {
              setIsVectorizing(false)
              setError(syncErr instanceof Error ? syncErr.message : 'Vectorization error')
            }
          }, 0)
        }
      } else {
        // Fallback for environments without Web Worker support (e.g. tests)
        setTimeout(() => {
          if (activeRequestIdRef.current !== requestId) return
          try {
            const start = performance.now()
            const res = traceImageDataToSVG(imageData, config)
            const durationMs = Math.max(1, Math.round(performance.now() - start))
            const sizeBytes = new Blob([res.svg], { type: 'image/svg+xml' }).size
            setVectorResult({
              svg: res.svg,
              sizeBytes,
              pathsCount: res.pathsCount,
              durationMs,
            })
            setIsVectorizing(false)
          } catch (syncErr) {
            setIsVectorizing(false)
            setError(syncErr instanceof Error ? syncErr.message : 'Vectorization error')
          }
        }, 0)
      }
    },
    [getOrCreateWorker],
  )

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  return {
    isVectorizing,
    vectorResult,
    error,
    runVectorize,
    cancelVectorize,
  }
}
