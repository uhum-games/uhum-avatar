//! Platform boundary traits.
//!
//! These traits define the interface between the platform-agnostic Avatar logic
//! and the platform-specific implementations (browser, iOS, Android, etc.).
//!
//! Platform shells must implement these traits to provide:
//! - Network transport (WebSocket)
//! - Persistent storage
//! - Clock for time operations
//! - Random number generation for IDs

use async_trait::async_trait;
use ub_core::{Address, Cursor, Event, MessageId, ResumeToken, SessionId, Timestamp};
use ub_protocol::Frame;

use crate::error::Result;

/// Abstract interface for network transport (e.g., WebSocket).
///
/// Platform implementations provide the actual WebSocket connection.
#[async_trait]
pub trait Transport: Send + Sync {
    /// Connect to a Brain at the given URL.
    async fn connect(&self, url: &str) -> Result<()>;

    /// Disconnect from the Brain.
    async fn disconnect(&self) -> Result<()>;

    /// Send a frame to the Brain.
    async fn send(&self, frame: Frame) -> Result<()>;

    /// Receive a frame from the Brain.
    async fn receive(&self) -> Result<Frame>;

    /// Check if currently connected.
    fn is_connected(&self) -> bool;
}

/// Abstract interface for persistent storage.
///
/// Platform implementations provide storage (IndexedDB, SQLite, etc.).
#[async_trait]
pub trait Storage: Send + Sync {
    /// Save the cursor position for an agent.
    async fn save_cursor(&self, agent_id: &Address, cursor: Cursor) -> Result<()>;

    /// Load the cursor position for an agent.
    async fn load_cursor(&self, agent_id: &Address) -> Result<Option<Cursor>>;

    /// Save the resume token for an agent.
    async fn save_resume_token(&self, agent_id: &Address, token: ResumeToken) -> Result<()>;

    /// Load the resume token for an agent.
    async fn load_resume_token(&self, agent_id: &Address) -> Result<Option<ResumeToken>>;

    /// Save events to local cache.
    async fn save_events(&self, agent_id: &Address, events: &[Event]) -> Result<()>;

    /// Load events from local cache.
    async fn load_events(&self, agent_id: &Address, from_cursor: Cursor) -> Result<Vec<Event>>;
}

/// Abstract interface for time-related operations.
///
/// This abstraction allows for deterministic testing.
pub trait Clock: Send + Sync {
    /// Get the current time in milliseconds since epoch.
    fn now_millis(&self) -> Timestamp;
}

/// Abstract interface for random ID generation.
///
/// This abstraction allows for deterministic testing.
pub trait Random: Send + Sync {
    /// Generate a new message ID.
    fn message_id(&self) -> MessageId;

    /// Generate a new session ID.
    fn session_id(&self) -> SessionId;

    /// Generate a random avatar ID string.
    fn avatar_id(&self) -> String;
}

// =============================================================================
// DEFAULT IMPLEMENTATIONS
// =============================================================================

/// System clock implementation using real time.
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_millis(&self) -> Timestamp {
        Timestamp::now()
    }
}

/// UUID-based random implementation.
pub struct UuidRandom;

impl Random for UuidRandom {
    fn message_id(&self) -> MessageId {
        MessageId::generate()
    }

    fn session_id(&self) -> SessionId {
        SessionId::generate()
    }

    fn avatar_id(&self) -> String {
        SessionId::generate().to_string()
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_clock() {
        let clock = SystemClock;
        let now = clock.now_millis();
        assert!(now.as_millis() > 0);
    }

    #[test]
    fn test_uuid_random() {
        let random = UuidRandom;
        let id1 = random.avatar_id();
        let id2 = random.avatar_id();
        assert_ne!(id1, id2);
    }
}
