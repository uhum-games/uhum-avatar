//! # Uhum Avatar WASM Bindings
//!
//! This crate provides WebAssembly bindings for the Avatar core,
//! enabling the Avatar to run in web browsers.
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    BROWSER (JavaScript)                      │
//! │                                                              │
//! │   React/Vue/Svelte Components                                │
//! │              │                                               │
//! │              ▼                                               │
//! │   ┌─────────────────────────────────────────────────────┐   │
//! │   │              TypeScript Bindings                     │   │
//! │   │   (platforms/browser/src - wraps WASM exports)      │   │
//! │   └─────────────────────────────────────────────────────┘   │
//! │              │                                               │
//! ├──────────────┼───────────────────────────────────────────────┤
//! │              ▼           WASM BOUNDARY                       │
//! │   ┌─────────────────────────────────────────────────────┐   │
//! │   │              ua-wasm (this crate)                    │   │
//! │   │   - BrowserScheduler (setTimeout)                    │   │
//! │   │   - BrowserEffectExecutor (DOM APIs)                 │   │
//! │   │   - BrowserTransport (WebSocket)                     │   │
//! │   └─────────────────────────────────────────────────────┘   │
//! │              │                                               │
//! │              ▼                                               │
//! │   ┌─────────────────────────────────────────────────────┐   │
//! │   │              Avatar Core (Rust)                      │   │
//! │   │   ua-core, ua-agent, ua-view                         │   │
//! │   └─────────────────────────────────────────────────────┘   │
//! └─────────────────────────────────────────────────────────────┘
//! ```
//!
//! ## Usage from JavaScript
//!
//! ```javascript
//! import { AvatarWasm } from '@uhum/avatar';
//!
//! const avatar = new AvatarWasm();
//! avatar.subscribe((state) => {
//!     // React to state changes
//!     updateUI(state);
//! });
//!
//! // Connect to an agent
//! await avatar.connect('wss://brain.example.com/acme.billing');
//!
//! // Send an intention
//! avatar.sendIntention('pay_invoice', { invoice_id: 'INV-123' });
//! ```

use wasm_bindgen::prelude::*;

pub mod executor;
pub mod scheduler;
pub mod transport;

// Re-exports
pub use executor::BrowserEffectExecutor;
pub use scheduler::BrowserScheduler;
pub use transport::BrowserTransport;

/// Initialize the WASM module (call once on load).
#[wasm_bindgen(start)]
pub fn init() {
    // Future: Set up panic hook for better error messages
    // console_error_panic_hook::set_once();
}

/// Log a message to the browser console.
#[wasm_bindgen]
pub fn log(message: &str) {
    web_sys::console::log_1(&message.into());
}

/// Avatar client for browser.
///
/// This is the main entry point for JavaScript code.
#[wasm_bindgen]
pub struct AvatarWasm {
    // Runtime will be added when we wire everything together
    _placeholder: bool,
}

#[wasm_bindgen]
impl AvatarWasm {
    /// Create a new Avatar instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        log("AvatarWasm created");
        Self { _placeholder: true }
    }

    /// Get the current state as JSON.
    #[wasm_bindgen]
    pub fn get_state(&self) -> JsValue {
        // TODO: Return actual state
        JsValue::from_str("{}")
    }

    /// Subscribe to state changes.
    ///
    /// The callback will be called with the new state whenever it changes.
    #[wasm_bindgen]
    pub fn subscribe(&self, _callback: &js_sys::Function) {
        // TODO: Wire up subscription
        log("Subscription registered");
    }

    /// Dispatch an action (for testing).
    #[wasm_bindgen]
    pub fn dispatch(&self, action_json: &str) {
        log(&format!("Dispatching action: {}", action_json));
        // TODO: Parse and dispatch
    }

    /// Process view instructions from Brain.
    #[wasm_bindgen]
    pub fn process_instructions(&self, instructions_json: &str) {
        log(&format!("Processing instructions: {}", instructions_json));
        // TODO: Parse and process
    }
}

impl Default for AvatarWasm {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// TESTS
// =============================================================================

// Note: WASM-specific tests must use wasm-bindgen-test and run in browser/node.
// Regular Rust tests can only test platform-agnostic logic.

#[cfg(all(test, target_arch = "wasm32"))]
mod wasm_tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_avatar_wasm_creation() {
        let avatar = AvatarWasm::new();
        assert!(avatar._placeholder);
    }
}
