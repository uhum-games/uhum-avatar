/**
 * WASM Loader - Loads the compiled WASM module.
 *
 * The WASM module is built from ua-wasm crate using wasm-pack.
 * This loader handles initialization and provides TypeScript bindings.
 */

// Type definitions for the WASM module
// These match the exports from ua-wasm/src/lib.rs

export interface WasmModule {
  /** Initialize the WASM module */
  init?: () => void;
  /** Log to browser console */
  log: (message: string) => void;
  /** Avatar client (WASM implementation) */
  AvatarWasm: new () => WasmAvatarClient;
}

export interface WasmAvatarClient {
  /** Get state as JSON */
  get_state(): string;
  /** Subscribe to state changes */
  subscribe(callback: (state: string) => void): void;
  /** Dispatch an action */
  dispatch(actionJson: string): void;
  /** Process view instructions */
  process_instructions(instructionsJson: string): void;
}

// Module state
let wasmModule: WasmModule | null = null;
let loadPromise: Promise<WasmModule> | null = null;

/**
 * Load the WASM module.
 *
 * The module is loaded lazily and cached. Multiple calls return the same instance.
 *
 * @param wasmPath - Path to the WASM files (default: '/wasm')
 * @returns Promise resolving to the WASM module
 *
 * @example
 * ```typescript
 * const wasm = await loadWasm('/wasm');
 * const avatar = new wasm.AvatarWasm();
 * ```
 */
export async function loadWasm(wasmPath = '/wasm'): Promise<WasmModule> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule;
  }

  // Return existing load promise if loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = doLoadWasm(wasmPath);
  wasmModule = await loadPromise;
  return wasmModule;
}

async function doLoadWasm(wasmPath: string): Promise<WasmModule> {
  try {
    // Dynamic import of the WASM JS bindings
    // This assumes wasm-pack was run with --target web
    const wasmJs = await import(/* @vite-ignore */ `${wasmPath}/ua_wasm.js`);

    // Initialize the WASM module
    await wasmJs.default(`${wasmPath}/ua_wasm_bg.wasm`);

    // Call init if available
    if (wasmJs.init) {
      wasmJs.init();
    }

    console.log('[WASM] Module loaded successfully');
    return wasmJs as WasmModule;
  } catch (error) {
    console.error('[WASM] Failed to load module:', error);
    throw new Error(`Failed to load WASM module from ${wasmPath}: ${error}`);
  }
}

/**
 * Check if WASM is loaded.
 */
export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Get the loaded WASM module (throws if not loaded).
 */
export function getWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error('WASM module not loaded. Call loadWasm() first.');
  }
  return wasmModule;
}

/**
 * Check if WASM is supported in the current environment.
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
  } catch {
    // WASM not supported
  }
  return false;
}
