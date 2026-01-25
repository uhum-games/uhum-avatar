//! # Uhum Avatar View Layer
//!
//! This crate handles the Uhum View rendering and state management:
//!
//! - **Routing** — Deterministic input handling, component actions
//! - **Reactive** — Redux-like state management (State, Actions, Effects, Reducer)
//! - **Runtime** — Effect execution, subscriptions, state orchestration
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
//! 4. Effects executed by Runtime → may dispatch future Actions
//!
//! ## Runtime
//!
//! The `AvatarRuntime` is the orchestrator:
//!
//! ```ignore
//! let runtime = AvatarRuntime::new_arc(scheduler, executor);
//!
//! // Subscribe to state changes
//! runtime.subscribe(Box::new(|state| {
//!     // Update UI
//! }));
//!
//! // Dispatch actions
//! runtime.dispatch(Action::Navigate { route: "/home".into() });
//!
//! // Process view instructions from Brain
//! runtime.process_instructions(instructions);
//! ```
//!
//! See specs/VIEW-INSTRUCTIONS.md for full specification.

pub mod reactive;
pub mod routing;
pub mod runtime;

// Re-exports from reactive
pub use reactive::{
    Action, AvatarState, Effect, LoadingState, Message, MessageType as StateMessageType, Modal,
    PlatformEffect, ReduceResult, instruction_to_action, reduce,
};

// Re-exports from routing
pub use routing::{
    ActionResult, ComponentAction, LocalAction, MessageType, ViewInstruction,
    handle_component_action, parse_view_instructions,
};

// Re-exports from runtime
pub use runtime::{
    AvatarRuntime, EffectExecutor, MockEffectExecutor, MockScheduledAction, MockScheduler,
    NullEffectExecutor, NullScheduler, Scheduler, SubscriptionId, Subscriber,
};
