// Manual instantiation of the `vectortracer` WASM module (VTracer, MIT).
//
// The npm package ships a "bundler"-target build whose entry imports the .wasm as an ES module,
// which would require two extra Vite plugins (wasm + top-level-await). Instead, apps/shell/vite.config.ts
// aliases the wasm-bindgen glue and the .wasm file, and we instantiate it here with plain fetch +
// WebAssembly.instantiate. Everything is served from the app origin (CSP: connect-src 'self',
// 'wasm-unsafe-eval') and precached by the PWA service worker, so it also works offline.
//
// This module is only ever loaded via dynamic import() from vectorEngine.ts, so the WASM is
// code-split into the vectorize worker chunk and never reaches the shell entry bundle.

import * as glue from 'vectortracer-glue'
import wasmUrl from 'vectortracer-wasm'

export type VTracerRuntime = typeof glue

let runtimePromise: Promise<VTracerRuntime> | null = null

async function instantiate(): Promise<VTracerRuntime> {
  const response = await fetch(wasmUrl)
  if (!response.ok) {
    throw new Error(`Failed to load vectorizer WASM (HTTP ${response.status})`)
  }
  const bytes = await response.arrayBuffer()
  const { instance } = await WebAssembly.instantiate(bytes, {
    './vectortracer_bg.js': glue as unknown as WebAssembly.ModuleImports,
  })
  glue.__wbg_set_wasm(instance.exports)
  ;(instance.exports as { __wbindgen_start?: () => void }).__wbindgen_start?.()
  return glue
}

/** Loads and caches the VTracer WASM runtime. A failed load is not cached, so it can be retried. */
export function loadVTracer(): Promise<VTracerRuntime> {
  if (!runtimePromise) {
    runtimePromise = instantiate().catch((err) => {
      runtimePromise = null
      throw err
    })
  }
  return runtimePromise
}
