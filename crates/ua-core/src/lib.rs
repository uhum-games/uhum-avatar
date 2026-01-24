//! # UHUM Avatar Core
//!
//! Shared types and platform boundary traits for the UHUM Avatar.
//!
//! This crate defines:
//! - **Error types** — Common error handling
//! - **Platform traits** — Interfaces that platform shells must implement
//!
//! ## Platform Boundary
//!
//! The Avatar Core defines traits that platforms must implement:
//! - [`Transport`] — WebSocket send/receive
//! - [`Storage`] — Persist cursors, tokens, cache
//! - [`Clock`] — Current time for timeouts
//! - [`Random`] — ID generation
//!
//! ## Crate Structure
//!
//! ```text
//! ua-core   ← This crate (shared types, traits)
//!    ↑
//! ua-brain  ← Brain communication (session, queue, sync)
//!    ↑
//! ua-view   ← View layer (routing, reactive state)
//! ```

pub mod error;
pub mod traits;

// Re-exports
pub use error::{AvatarError, Result};
pub use traits::{Clock, Random, Storage, Transport, SystemClock, UuidRandom};

// Re-export shared types from ub-core and ub-protocol
pub use ub_core::{Address, Cursor, Event, MessageId, ResumeToken, SessionId, Timestamp};
pub use ub_protocol::{Frame, Headers, Term};
