/**
 * WASM Loader - Loads the compiled WASM module.
 *
 * The WASM module is built from ua-wasm crate using wasm-pack.
 * This loader handles initialization and provides TypeScript bindings.
 */
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
export declare function loadWasm(wasmPath?: string): Promise<WasmModule>;
/**
 * Check if WASM is loaded.
 */
export declare function isWasmLoaded(): boolean;
/**
 * Get the loaded WASM module (throws if not loaded).
 */
export declare function getWasm(): WasmModule;
/**
 * Check if WASM is supported in the current environment.
 */
export declare function isWasmSupported(): boolean;
//# sourceMappingURL=loader.d.ts.map