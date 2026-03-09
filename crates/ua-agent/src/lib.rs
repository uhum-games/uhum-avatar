//! # Uhum Avatar Agent Communication
//!
//! This crate handles all communication with Agents (server-side Brains):
//!
//! - **Session** — Connection lifecycle, message handling, cursor tracking
//! - **AgentCard** — Agent self-description parsing (intents, endpoints, hints)
//! - **Queue** — Offline intention queueing with retry logic
//! - **Cache** — Local memory cache with deduplication
//!
//! ## Crate Structure
//!
//! ```text
//! ua-core   ← Shared types, platform traits
//!    ↑
//! ua-agent  ← This crate (agent communication)
//!    ↑
//! ua-view   ← View layer (routing, reactive state)
//! ```
//!
//! ## Terminology
//!
//! From the Avatar's perspective:
//! - **Agent** — The entity it connects to (e.g., `uhum://acme.billing`)
//! - **Brain** — Server-side implementation detail (Avatar doesn't care)
//! - **AgentCard** — Agent's self-description (intents, capabilities, hints)

pub mod cache;
pub mod agent_card;
pub mod queue;
pub mod session;

// Re-exports
pub use cache::{CachedEvent, DerivedView, MemoryCache};
pub use agent_card::{
    AgentDossier, Brand, DataSource, Endpoint, HomeSection, Intent, LayoutHint, Param, ParamType,
    PresentationHints,
};
pub use queue::{IntentionQueue, QueuedIntention};
pub use session::{AgentSession, IncomingMessage, SessionConfig, SessionState};
