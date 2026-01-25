//! Browser Scheduler implementation using setTimeout/clearTimeout.

use parking_lot::RwLock;
use std::collections::HashMap;
use ua_view::Scheduler;
use wasm_bindgen::prelude::*;

/// Browser scheduler using JavaScript's setTimeout/clearTimeout.
#[derive(Default)]
pub struct BrowserScheduler {
    /// Map of scheduled timer IDs (our ID → browser timer handle).
    timers: RwLock<HashMap<String, i32>>,
}

impl BrowserScheduler {
    /// Create a new browser scheduler.
    pub fn new() -> Self {
        Self {
            timers: RwLock::new(HashMap::new()),
        }
    }
}

impl Scheduler for BrowserScheduler {
    fn schedule(
        &self,
        id: String,
        delay_ms: u64,
        callback: Box<dyn FnOnce() + Send + 'static>,
    ) {
        // Cancel any existing timer with this ID
        self.cancel(&id);

        // Create a closure that JavaScript can call
        let closure = Closure::once(callback);

        // Get the window object
        let window = match web_sys::window() {
            Some(w) => w,
            None => {
                web_sys::console::error_1(&"No window object available".into());
                return;
            }
        };

        // Schedule the timer
        let timer_id = match window.set_timeout_with_callback_and_timeout_and_arguments_0(
            closure.as_ref().unchecked_ref(),
            delay_ms as i32,
        ) {
            Ok(id) => id,
            Err(e) => {
                web_sys::console::error_1(&format!("Failed to schedule timer: {:?}", e).into());
                return;
            }
        };

        // Store the timer ID
        self.timers.write().insert(id, timer_id);

        // IMPORTANT: We need to forget the closure so it stays alive
        // until the timer fires. This is a memory leak if the timer is
        // cancelled, but it's the standard pattern for WASM callbacks.
        closure.forget();
    }

    fn cancel(&self, id: &str) {
        if let Some(timer_id) = self.timers.write().remove(id) {
            if let Some(window) = web_sys::window() {
                window.clear_timeout_with_handle(timer_id);
            }
        }
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scheduler_creation() {
        let scheduler = BrowserScheduler::new();
        assert!(scheduler.timers.read().is_empty());
    }

    // Note: Full scheduler tests require wasm-bindgen-test
    // and running in a browser environment
}
