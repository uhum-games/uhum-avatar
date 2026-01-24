//! # UHUM Avatar View Layer
//!
//! This crate handles the Uhum View rendering and state management:
//!
//! - **Routing** — Deterministic input handling, component actions
//! - **Reactive** — Redux-like state management (State, Actions, Effects, Reducer)
//! - **View Instructions** — Processing Brain's generic instructions
//!
//! ## Crate Structure
//!
//! ```text
//! ua-core   ← Shared types, platform traits
//!    ↑
//! ua-agent  ← Agent communication (session, dossier)
//!    ↑
//! ua-view   ← This crate (view layer)
//! ```
//!
//! ## Reactive Architecture
//!
//! The Avatar uses a reactive, event-driven architecture:
//!
//! 1. View instructions from Brain → converted to Actions
//! 2. Actions dispatched to Reducer → produces new State + Effects
//! 3. UI components subscribe to State → re-render on change
//! 4. Effects executed by runtime → may dispatch future Actions
//!
//! See specs/VIEW-INSTRUCTIONS.md for full specification.

pub mod reactive;
pub mod routing;

// Re-exports
pub use reactive::{
    Action, AvatarState, Effect, LoadingState, Message, MessageType as StateMessageType, Modal,
    PlatformEffect, ReduceResult, instruction_to_action, reduce,
};
pub use routing::{
    ActionResult, ComponentAction, LocalAction, MessageType, ViewInstruction,
    handle_component_action, parse_view_instructions,
};
