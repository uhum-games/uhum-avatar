//! Avatar Runtime - Effect execution and state management.
//!
//! The runtime is the orchestrator that:
//! - Holds the current state (single source of truth)
//! - Dispatches actions through the reducer
//! - Executes effects (timers, platform APIs)
//! - Manages subscriptions for UI reactivity
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                      AVATAR RUNTIME                              │
//! │                                                                  │
//! │   ┌─────────────┐    dispatch()    ┌─────────────────────────┐  │
//! │   │   ACTION    │ ───────────────▶ │        REDUCER          │  │
//! │   └─────────────┘                  │  (state, action) → ...  │  │
//! │         ▲                          └───────────┬─────────────┘  │
//! │         │                                      │                │
//! │         │ fire()                    ┌──────────┴──────────┐     │
//! │         │                           ▼                     ▼     │
//! │   ┌─────┴───────┐           ┌─────────────┐       ┌───────────┐ │
//! │   │  SCHEDULER  │◀──────────│    STATE    │       │  EFFECTS  │ │
//! │   │  (timers)   │  schedule │             │       │           │ │
//! │   └─────────────┘           └──────┬──────┘       └─────┬─────┘ │
//! │                                    │                    │       │
//! │                              notify│              execute│      │
//! │                                    ▼                    ▼       │
//! │                            ┌─────────────┐    ┌──────────────┐  │
//! │                            │ SUBSCRIBERS │    │   EXECUTOR   │  │
//! │                            │    (UI)     │    │  (platform)  │  │
//! │                            └─────────────┘    └──────────────┘  │
//! └─────────────────────────────────────────────────────────────────┘
//! ```
//!
//! ## Usage
//!
//! ```ignore
//! // Create runtime with platform implementations
//! let runtime = AvatarRuntime::new(scheduler, executor);
//!
//! // Subscribe to state changes
//! runtime.subscribe(|state| {
//!     // Update UI based on new state
//! });
//!
//! // Dispatch actions (from view instructions)
//! runtime.dispatch(Action::ShowMessage { text: "Hello".into(), message_type: MessageType::Success });
//!
//! // Process view instructions from Brain
//! runtime.process_instructions(instructions);
//! ```

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;

use crate::reactive::{reduce, Action, AvatarState, Effect, PlatformEffect, ReduceResult};
use crate::routing::ViewInstruction;

// =============================================================================
// SCHEDULER TRAIT
// =============================================================================

/// Platform-specific timer scheduling.
///
/// Platforms implement this trait to provide timer functionality:
/// - Browser: Uses `setTimeout` / `clearTimeout`
/// - Native: Uses `tokio::time::sleep` or similar
///
/// The scheduler is given a callback that should be invoked when the timer fires.
pub trait Scheduler: Send + Sync {
    /// Schedule an action to be dispatched after a delay.
    ///
    /// Returns a handle that can be used to cancel the scheduled action.
    /// The `callback` should be invoked when the timer fires.
    fn schedule(
        &self,
        id: String,
        delay_ms: u64,
        callback: Box<dyn FnOnce() + Send + 'static>,
    );

    /// Cancel a previously scheduled action.
    fn cancel(&self, id: &str);
}

// =============================================================================
// EFFECT EXECUTOR TRAIT
// =============================================================================

/// Platform-specific effect execution.
///
/// Platforms implement this to handle platform-specific effects:
/// - Copy to clipboard
/// - Haptic feedback
/// - Sound playback
/// - Scroll/focus DOM elements (browser)
pub trait EffectExecutor: Send + Sync {
    /// Execute a platform-specific effect.
    fn execute(&self, effect: PlatformEffect);
}

// =============================================================================
// SUBSCRIPTION
// =============================================================================

/// A subscription ID for unsubscribing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SubscriptionId(u64);

/// Subscriber callback type.
pub type Subscriber = Box<dyn Fn(&AvatarState) + Send + Sync>;

// =============================================================================
// AVATAR RUNTIME
// =============================================================================

/// The Avatar Runtime orchestrates state management and effect execution.
///
/// This is the central hub that:
/// - Holds the single source of truth (state)
/// - Dispatches actions through the reducer
/// - Executes effects (timers, platform APIs)
/// - Notifies subscribers of state changes
pub struct AvatarRuntime<S: Scheduler, E: EffectExecutor> {
    /// Current state (single source of truth).
    state: RwLock<AvatarState>,

    /// Subscribers that are notified on state changes.
    subscribers: RwLock<HashMap<SubscriptionId, Subscriber>>,

    /// Next subscription ID.
    next_subscription_id: RwLock<u64>,

    /// Platform scheduler for timed effects.
    scheduler: S,

    /// Platform effect executor.
    executor: E,

    /// Self-reference for scheduling callbacks.
    /// This is set after construction via `initialize()`.
    self_ref: RwLock<Option<Arc<AvatarRuntime<S, E>>>>,
}

impl<S: Scheduler + 'static, E: EffectExecutor + 'static> AvatarRuntime<S, E> {
    /// Create a new runtime with platform implementations.
    pub fn new(scheduler: S, executor: E) -> Self {
        Self {
            state: RwLock::new(AvatarState::default()),
            subscribers: RwLock::new(HashMap::new()),
            next_subscription_id: RwLock::new(0),
            scheduler,
            executor,
            self_ref: RwLock::new(None),
        }
    }

    /// Create a new runtime wrapped in Arc (for self-referential callbacks).
    pub fn new_arc(scheduler: S, executor: E) -> Arc<Self> {
        let runtime = Arc::new(Self::new(scheduler, executor));
        *runtime.self_ref.write() = Some(Arc::clone(&runtime));
        runtime
    }

    /// Get the current state.
    pub fn state(&self) -> AvatarState {
        self.state.read().clone()
    }

    /// Get a reference to the current state (for efficient reads).
    pub fn with_state<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&AvatarState) -> R,
    {
        f(&self.state.read())
    }

    /// Subscribe to state changes.
    ///
    /// The subscriber will be called whenever state changes.
    /// Returns a subscription ID that can be used to unsubscribe.
    pub fn subscribe(&self, subscriber: Subscriber) -> SubscriptionId {
        let mut id_guard = self.next_subscription_id.write();
        let id = SubscriptionId(*id_guard);
        *id_guard += 1;

        self.subscribers.write().insert(id, subscriber);
        id
    }

    /// Unsubscribe from state changes.
    pub fn unsubscribe(&self, id: SubscriptionId) {
        self.subscribers.write().remove(&id);
    }

    /// Dispatch an action to update state.
    ///
    /// This is the primary way to change state. The action goes through
    /// the reducer, which produces new state and effects.
    pub fn dispatch(&self, action: Action) {
        // Get current state and run reducer
        let current_state = self.state.read().clone();
        let ReduceResult { state, effects } = reduce(current_state, action);

        // Update state
        *self.state.write() = state.clone();

        // Notify subscribers
        let subscribers = self.subscribers.read();
        for subscriber in subscribers.values() {
            subscriber(&state);
        }

        // Execute effects
        for effect in effects {
            self.execute_effect(effect);
        }
    }

    /// Process view instructions from the Brain.
    ///
    /// Converts instructions to actions and dispatches them.
    pub fn process_instructions(&self, instructions: Vec<ViewInstruction>) {
        for instruction in instructions {
            let (action, effects) = crate::reactive::instruction_to_action(instruction);

            // Dispatch the action
            self.dispatch(action);

            // Execute any immediate effects
            for effect in effects {
                self.execute_effect(effect);
            }
        }
    }

    /// Execute an effect.
    fn execute_effect(&self, effect: Effect) {
        match effect {
            Effect::Schedule {
                id,
                delay_ms,
                action,
            } => {
                self.schedule_action(id, delay_ms, action);
            }

            Effect::CancelScheduled { id } => {
                self.scheduler.cancel(&id);
            }

            Effect::Platform(platform_effect) => {
                self.executor.execute(platform_effect);
            }
        }
    }

    /// Schedule an action to be dispatched after a delay.
    fn schedule_action(&self, id: String, delay_ms: u64, action: Action) {
        // Get self reference for the callback
        let self_ref = self.self_ref.read().clone();

        let callback = Box::new(move || {
            if let Some(runtime) = self_ref {
                runtime.dispatch(action);
            }
        });

        self.scheduler.schedule(id, delay_ms, callback);
    }
}

// =============================================================================
// NULL IMPLEMENTATIONS (for testing)
// =============================================================================

/// A no-op scheduler for testing.
#[derive(Default)]
pub struct NullScheduler;

impl Scheduler for NullScheduler {
    fn schedule(&self, _id: String, _delay_ms: u64, _callback: Box<dyn FnOnce() + Send + 'static>) {
        // No-op: don't actually schedule anything
    }

    fn cancel(&self, _id: &str) {
        // No-op
    }
}

/// A no-op effect executor for testing.
#[derive(Default)]
pub struct NullEffectExecutor;

impl EffectExecutor for NullEffectExecutor {
    fn execute(&self, _effect: PlatformEffect) {
        // No-op
    }
}

// =============================================================================
// MOCK IMPLEMENTATIONS (for testing with verification)
// =============================================================================

/// A mock scheduler that records scheduled actions.
#[derive(Default)]
pub struct MockScheduler {
    /// Recorded schedule calls.
    pub scheduled: RwLock<Vec<MockScheduledAction>>,
    /// Recorded cancel calls.
    pub cancelled: RwLock<Vec<String>>,
}

/// A recorded scheduled action.
#[derive(Debug, Clone)]
pub struct MockScheduledAction {
    pub id: String,
    pub delay_ms: u64,
}

impl Scheduler for MockScheduler {
    fn schedule(&self, id: String, delay_ms: u64, _callback: Box<dyn FnOnce() + Send + 'static>) {
        self.scheduled.write().push(MockScheduledAction {
            id,
            delay_ms,
        });
    }

    fn cancel(&self, id: &str) {
        self.cancelled.write().push(id.to_string());
    }
}

impl MockScheduler {
    /// Get all scheduled actions.
    pub fn get_scheduled(&self) -> Vec<MockScheduledAction> {
        self.scheduled.read().clone()
    }

    /// Get all cancelled IDs.
    pub fn get_cancelled(&self) -> Vec<String> {
        self.cancelled.read().clone()
    }

    /// Clear recorded calls.
    pub fn clear(&self) {
        self.scheduled.write().clear();
        self.cancelled.write().clear();
    }
}

/// A mock effect executor that records executed effects.
#[derive(Default)]
pub struct MockEffectExecutor {
    /// Recorded effects.
    pub effects: RwLock<Vec<PlatformEffect>>,
}

impl EffectExecutor for MockEffectExecutor {
    fn execute(&self, effect: PlatformEffect) {
        self.effects.write().push(effect);
    }
}

impl MockEffectExecutor {
    /// Get all executed effects.
    pub fn get_effects(&self) -> Vec<PlatformEffect> {
        self.effects.read().clone()
    }

    /// Clear recorded effects.
    pub fn clear(&self) {
        self.effects.write().clear();
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reactive::MessageType;
    use std::sync::atomic::{AtomicU32, Ordering};

    #[test]
    fn test_dispatch_updates_state() {
        let runtime = AvatarRuntime::new(NullScheduler, NullEffectExecutor);

        assert!(runtime.state().message.is_none());

        runtime.dispatch(Action::ShowMessage {
            text: "Hello".to_string(),
            message_type: MessageType::Success,
        });

        let state = runtime.state();
        assert!(state.message.is_some());
        assert_eq!(state.message.unwrap().text, "Hello");
    }

    #[test]
    fn test_subscription_notified() {
        let runtime = AvatarRuntime::new(NullScheduler, NullEffectExecutor);
        let counter = Arc::new(AtomicU32::new(0));
        let counter_clone = Arc::clone(&counter);

        runtime.subscribe(Box::new(move |_state| {
            counter_clone.fetch_add(1, Ordering::SeqCst);
        }));

        runtime.dispatch(Action::ShowMessage {
            text: "Hello".to_string(),
            message_type: MessageType::Success,
        });

        assert_eq!(counter.load(Ordering::SeqCst), 1);

        runtime.dispatch(Action::HideMessage);

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn test_unsubscribe() {
        let runtime = AvatarRuntime::new(NullScheduler, NullEffectExecutor);
        let counter = Arc::new(AtomicU32::new(0));
        let counter_clone = Arc::clone(&counter);

        let sub_id = runtime.subscribe(Box::new(move |_state| {
            counter_clone.fetch_add(1, Ordering::SeqCst);
        }));

        runtime.dispatch(Action::ShowMessage {
            text: "Hello".to_string(),
            message_type: MessageType::Success,
        });

        assert_eq!(counter.load(Ordering::SeqCst), 1);

        runtime.unsubscribe(sub_id);

        runtime.dispatch(Action::HideMessage);

        // Should NOT be called after unsubscribe
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn test_mock_scheduler_records_scheduled() {
        let scheduler = MockScheduler::default();
        let runtime = AvatarRuntime::new(scheduler, NullEffectExecutor);

        // Navigate triggers no scheduled effects
        runtime.dispatch(Action::Navigate {
            route: "/test".to_string(),
        });

        assert!(runtime.scheduler.get_scheduled().is_empty());
    }

    #[test]
    fn test_process_instructions() {
        let runtime = AvatarRuntime::new(NullScheduler, NullEffectExecutor);

        let instructions = vec![
            ViewInstruction::Navigate {
                route: "/invoices".to_string(),
            },
            ViewInstruction::Message {
                message_type: crate::routing::MessageType::Success,
                text: "Welcome!".to_string(),
                duration: None,
            },
        ];

        runtime.process_instructions(instructions);

        let state = runtime.state();
        assert_eq!(state.current_route, "/invoices");
        assert!(state.message.is_some());
        assert_eq!(state.message.unwrap().text, "Welcome!");
    }

    #[test]
    fn test_message_with_duration_schedules_hide() {
        let scheduler = MockScheduler::default();
        let runtime = AvatarRuntime::new(scheduler, NullEffectExecutor);

        let instructions = vec![ViewInstruction::Message {
            message_type: crate::routing::MessageType::Success,
            text: "Paid!".to_string(),
            duration: Some(3000),
        }];

        runtime.process_instructions(instructions);

        // Message should be visible
        assert!(runtime.state().message.is_some());

        // Should have scheduled HideMessage
        let scheduled = runtime.scheduler.get_scheduled();
        assert_eq!(scheduled.len(), 1);
        assert_eq!(scheduled[0].id, "message");
        assert_eq!(scheduled[0].delay_ms, 3000);
    }

    #[test]
    fn test_platform_effect_executed() {
        let executor = MockEffectExecutor::default();
        let runtime = AvatarRuntime::new(NullScheduler, executor);

        runtime.dispatch(Action::ScrollTo {
            element_ref: "INV-123".to_string(),
        });

        let effects = runtime.executor.get_effects();
        assert_eq!(effects.len(), 1);
        assert!(matches!(
            effects[0],
            PlatformEffect::ScrollToElement { .. }
        ));
    }

    #[test]
    fn test_arc_runtime_self_reference() {
        let runtime = AvatarRuntime::new_arc(MockScheduler::default(), NullEffectExecutor);

        // Should be able to dispatch through Arc
        runtime.dispatch(Action::Navigate {
            route: "/test".to_string(),
        });

        assert_eq!(runtime.state().current_route, "/test");
    }
}
