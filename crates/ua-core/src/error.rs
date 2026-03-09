//! Error types for the Uhum Avatar.

use thiserror::Error;

/// Result type for Avatar operations.
pub type Result<T> = std::result::Result<T, AvatarError>;

/// Errors that can occur in the Avatar.
#[derive(Debug, Error)]
pub enum AvatarError {
    /// Protocol-level error.
    #[error("Protocol error: {0}")]
    Protocol(#[from] ub_protocol::ProtocolError),

    /// Core type error.
    #[error("Core error: {0}")]
    Core(#[from] ub_core::Error),

    /// JSON serialization/deserialization error.
    #[error("Serialization error: {0}")]
    Serialization(String),

    /// Missing required data.
    #[error("Missing required data: {0}")]
    MissingData(String),

    /// Invalid data format or value.
    #[error("Invalid data: {0}")]
    InvalidData(String),

    /// Transport layer error (WebSocket, etc.).
    #[error("Transport error: {0}")]
    Transport(String),

    /// Storage layer error.
    #[error("Storage error: {0}")]
    Storage(String),

    /// Not connected to a Brain.
    #[error("Not connected to agent")]
    NotConnected,

    /// Agent agent_card not found or invalid.
    #[error("Agent agent_card not found")]
    DossierNotFound,

    /// Session error.
    #[error("Session error: {0}")]
    Session(String),

    /// Unknown or unexpected error.
    #[error("Unknown error: {0}")]
    Unknown(String),
}
