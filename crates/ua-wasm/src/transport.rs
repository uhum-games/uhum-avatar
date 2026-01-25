//! Browser WebSocket Transport implementation.
//!
//! Provides WebSocket connectivity for the browser using the Web API.

use parking_lot::RwLock;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{MessageEvent, WebSocket};

/// Connection state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Closing,
}

/// Browser WebSocket transport.
pub struct BrowserTransport {
    /// The WebSocket connection (if connected).
    socket: RwLock<Option<WebSocket>>,
    /// Current connection state.
    state: RwLock<ConnectionState>,
    /// Callback for received messages.
    on_message: RwLock<Option<js_sys::Function>>,
    /// Callback for connection state changes.
    on_state_change: RwLock<Option<js_sys::Function>>,
}

impl Default for BrowserTransport {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserTransport {
    /// Create a new browser transport.
    pub fn new() -> Self {
        Self {
            socket: RwLock::new(None),
            state: RwLock::new(ConnectionState::Disconnected),
            on_message: RwLock::new(None),
            on_state_change: RwLock::new(None),
        }
    }

    /// Create a new transport wrapped in Arc for shared ownership.
    pub fn new_arc() -> Arc<Self> {
        Arc::new(Self::new())
    }

    /// Set the message callback.
    pub fn set_on_message(&self, callback: js_sys::Function) {
        *self.on_message.write() = Some(callback);
    }

    /// Set the state change callback.
    pub fn set_on_state_change(&self, callback: js_sys::Function) {
        *self.on_state_change.write() = Some(callback);
    }

    /// Get the current connection state.
    pub fn get_state(&self) -> ConnectionState {
        *self.state.read()
    }

    /// Check if connected.
    pub fn is_connected(&self) -> bool {
        *self.state.read() == ConnectionState::Connected
    }

    /// Connect to a WebSocket URL.
    pub fn connect(&self, url: &str) -> Result<(), JsValue> {
        // Don't connect if already connecting or connected
        let current_state = *self.state.read();
        if current_state == ConnectionState::Connecting || current_state == ConnectionState::Connected {
            return Ok(());
        }

        *self.state.write() = ConnectionState::Connecting;
        self.notify_state_change();

        // Create WebSocket
        let ws = WebSocket::new(url)?;
        ws.set_binary_type(web_sys::BinaryType::Arraybuffer);

        // Set up event handlers
        self.setup_handlers(&ws);

        *self.socket.write() = Some(ws);

        Ok(())
    }

    /// Disconnect from the WebSocket.
    pub fn disconnect(&self) {
        let mut socket_guard = self.socket.write();
        if let Some(ws) = socket_guard.take() {
            *self.state.write() = ConnectionState::Closing;
            self.notify_state_change();

            let _ = ws.close();
        }
    }

    /// Send a message through the WebSocket.
    pub fn send(&self, message: &str) -> Result<(), JsValue> {
        let socket_guard = self.socket.read();
        if let Some(ws) = socket_guard.as_ref() {
            if ws.ready_state() == WebSocket::OPEN {
                ws.send_with_str(message)?;
                return Ok(());
            }
        }
        Err(JsValue::from_str("WebSocket not connected"))
    }

    /// Send binary data through the WebSocket.
    pub fn send_binary(&self, data: &[u8]) -> Result<(), JsValue> {
        let socket_guard = self.socket.read();
        if let Some(ws) = socket_guard.as_ref() {
            if ws.ready_state() == WebSocket::OPEN {
                ws.send_with_u8_array(data)?;
                return Ok(());
            }
        }
        Err(JsValue::from_str("WebSocket not connected"))
    }

    /// Set up WebSocket event handlers.
    fn setup_handlers(&self, ws: &WebSocket) {
        // onopen handler
        let state_ptr = &self.state as *const RwLock<ConnectionState>;
        let on_state_change_ptr = &self.on_state_change as *const RwLock<Option<js_sys::Function>>;
        
        let onopen = Closure::wrap(Box::new(move |_: JsValue| {
            // SAFETY: We're in single-threaded WASM, these pointers are valid
            unsafe {
                *(*state_ptr).write() = ConnectionState::Connected;
                if let Some(callback) = (*on_state_change_ptr).read().as_ref() {
                    let _ = callback.call1(&JsValue::NULL, &JsValue::from_str("connected"));
                }
            }
            web_sys::console::log_1(&"WebSocket connected".into());
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onopen(Some(onopen.as_ref().unchecked_ref()));
        onopen.forget();

        // onclose handler
        let state_ptr = &self.state as *const RwLock<ConnectionState>;
        let on_state_change_ptr = &self.on_state_change as *const RwLock<Option<js_sys::Function>>;
        
        let onclose = Closure::wrap(Box::new(move |_: JsValue| {
            unsafe {
                *(*state_ptr).write() = ConnectionState::Disconnected;
                if let Some(callback) = (*on_state_change_ptr).read().as_ref() {
                    let _ = callback.call1(&JsValue::NULL, &JsValue::from_str("disconnected"));
                }
            }
            web_sys::console::log_1(&"WebSocket disconnected".into());
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onclose(Some(onclose.as_ref().unchecked_ref()));
        onclose.forget();

        // onerror handler
        let onerror = Closure::wrap(Box::new(move |e: JsValue| {
            web_sys::console::error_1(&format!("WebSocket error: {:?}", e).into());
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        onerror.forget();

        // onmessage handler
        let on_message_ptr = &self.on_message as *const RwLock<Option<js_sys::Function>>;
        
        let onmessage = Closure::wrap(Box::new(move |e: MessageEvent| {
            let data = e.data();
            unsafe {
                if let Some(callback) = (*on_message_ptr).read().as_ref() {
                    let _ = callback.call1(&JsValue::NULL, &data);
                }
            }
        }) as Box<dyn FnMut(MessageEvent)>);
        ws.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
        onmessage.forget();
    }

    /// Notify state change callback.
    fn notify_state_change(&self) {
        if let Some(callback) = self.on_state_change.read().as_ref() {
            let state_str = match *self.state.read() {
                ConnectionState::Disconnected => "disconnected",
                ConnectionState::Connecting => "connecting",
                ConnectionState::Connected => "connected",
                ConnectionState::Closing => "closing",
            };
            let _ = callback.call1(&JsValue::NULL, &JsValue::from_str(state_str));
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
    fn test_transport_creation() {
        let transport = BrowserTransport::new();
        assert_eq!(transport.get_state(), ConnectionState::Disconnected);
        assert!(!transport.is_connected());
    }
}
