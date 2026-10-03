// Ambient declarations for the aliases defined in apps/shell/vite.config.ts.
// They point straight at the wasm-bindgen glue and the .wasm file of `vectortracer`
// so the module can be instantiated manually (no wasm/top-level-await Vite plugins).

declare module 'vectortracer-glue' {
  export * from 'vectortracer'
  export function __wbg_set_wasm(wasm: unknown): void
}

declare module 'vectortracer-wasm' {
  const url: string
  export default url
}
