//! Browser Effect Executor implementation.
//!
//! Handles platform-specific effects in the browser:
//! - Copy to clipboard
//! - Scroll to element
//! - Focus element
//! - Play sounds
//! - Vibration (on supported devices)

use ua_view::{EffectExecutor, PlatformEffect};
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

/// Browser effect executor using Web APIs.
#[derive(Default)]
pub struct BrowserEffectExecutor;

impl BrowserEffectExecutor {
    /// Create a new browser effect executor.
    pub fn new() -> Self {
        Self
    }

    /// Copy text to clipboard using the Clipboard API.
    fn copy_to_clipboard(value: String) {
        spawn_local(async move {
            let window = match web_sys::window() {
                Some(w) => w,
                None => {
                    web_sys::console::error_1(&"No window object".into());
                    return;
                }
            };

            let navigator = window.navigator();
            let clipboard = navigator.clipboard();

            match wasm_bindgen_futures::JsFuture::from(clipboard.write_text(&value)).await {
                Ok(_) => {
                    web_sys::console::log_1(&format!("Copied to clipboard: {}", value).into());
                }
                Err(e) => {
                    web_sys::console::error_1(
                        &format!("Failed to copy to clipboard: {:?}", e).into(),
                    );
                }
            }
        });
    }

    /// Scroll to an element by ID or data attribute.
    fn scroll_to_element(element_ref: String) {
        let window = match web_sys::window() {
            Some(w) => w,
            None => return,
        };

        let document = match window.document() {
            Some(d) => d,
            None => return,
        };

        // Try to find by ID first, then by data-ref attribute
        let element = document
            .get_element_by_id(&element_ref)
            .or_else(|| document.query_selector(&format!("[data-ref='{}']", element_ref)).ok().flatten());

        if let Some(el) = element {
            el.scroll_into_view();
            web_sys::console::log_1(&format!("Scrolled to: {}", element_ref).into());
        } else {
            web_sys::console::warn_1(&format!("Element not found: {}", element_ref).into());
        }
    }

    /// Focus an element by ID or data attribute.
    fn focus_element(element_ref: String) {
        let window = match web_sys::window() {
            Some(w) => w,
            None => return,
        };

        let document = match window.document() {
            Some(d) => d,
            None => return,
        };

        let element = document
            .get_element_by_id(&element_ref)
            .or_else(|| document.query_selector(&format!("[data-ref='{}']", element_ref)).ok().flatten());

        if let Some(el) = element {
            if let Some(html_el) = el.dyn_ref::<web_sys::HtmlElement>() {
                let _ = html_el.focus();
                web_sys::console::log_1(&format!("Focused: {}", element_ref).into());
            }
        } else {
            web_sys::console::warn_1(&format!("Element not found for focus: {}", element_ref).into());
        }
    }

    /// Trigger device vibration (if supported).
    fn vibrate(duration_ms: u64) {
        let window = match web_sys::window() {
            Some(w) => w,
            None => return,
        };

        let navigator = window.navigator();

        // Vibration API - not available in all browsers
        // We use JS interop since web-sys doesn't expose vibrate directly
        let vibrate_fn = js_sys::Reflect::get(&navigator, &"vibrate".into());
        if let Ok(func) = vibrate_fn {
            if let Some(f) = func.dyn_ref::<js_sys::Function>() {
                let _ = f.call1(&navigator, &(duration_ms as f64).into());
            }
        }
    }

    /// Play a sound (placeholder - would need audio assets).
    fn play_sound(sound: String) {
        web_sys::console::log_1(&format!("Would play sound: {}", sound).into());
        // TODO: Implement with Web Audio API or Audio element
    }
}

impl EffectExecutor for BrowserEffectExecutor {
    fn execute(&self, effect: PlatformEffect) {
        match effect {
            PlatformEffect::CopyToClipboard { value } => {
                Self::copy_to_clipboard(value);
            }
            PlatformEffect::ScrollToElement { element_ref } => {
                Self::scroll_to_element(element_ref);
            }
            PlatformEffect::FocusElement { element_ref } => {
                Self::focus_element(element_ref);
            }
            PlatformEffect::Vibrate { duration_ms } => {
                Self::vibrate(duration_ms);
            }
            PlatformEffect::PlaySound { sound } => {
                Self::play_sound(sound);
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
    fn test_executor_creation() {
        let _executor = BrowserEffectExecutor::new();
        // Basic smoke test
    }
}
