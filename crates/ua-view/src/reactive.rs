//! Reactive State Management for Avatar.
//!
//! The Avatar uses a reactive, event-driven architecture inspired by Redux/Elm:
//!
//! - **State**: Single source of truth for all UI state
//! - **Action**: Describes a state change (from view instructions)
//! - **Reducer**: Pure function `(state, action) → (new_state, effects)`
//! - **Effect**: Side effects (timers, platform APIs, scheduled actions)
//!
//! View instructions from the Agent are NOT executed imperatively.
//! Instead, they become Actions that update State, and UI reacts to State changes.
//!
//! See specs/VIEW-INSTRUCTIONS.md for full specification.

use std::collections::HashSet;
use ub_protocol::Term;

use crate::routing::{MessageType as VIMessageType, ViewInstruction};

// =============================================================================
// STATE
// =============================================================================

/// Global Avatar UI state.
///
/// This is the single source of truth for all UI state.
/// UI components subscribe to slices of this state and re-render when they change.
#[derive(Debug, Clone, Default)]
pub struct AvatarState {
    // === Feedback ===
    /// Current message being displayed (if any).
    pub message: Option<Message>,
    /// Current loading indicator (if any).
    pub loading: Option<LoadingState>,

    // === Navigation ===
    /// Current route/view.
    pub current_route: String,
    /// Navigation history for back/forward.
    pub navigation_history: Vec<String>,
    /// Forward history (for go_forward after go_back).
    pub forward_history: Vec<String>,

    // === Overlays ===
    /// Current modal (if any).
    pub modal: Option<Modal>,

    // === Focus/Highlight ===
    /// Currently focused element.
    pub focused_element: Option<String>,
    /// Currently highlighted elements.
    pub highlighted_elements: HashSet<String>,

    // === Data (from Agent) ===
    /// Facts received from the Agent.
    pub facts: Vec<Term>,

    // === Session ===
    /// Whether connected to an Agent.
    pub connected: bool,
    /// Current agent ID (if connected).
    pub agent_id: Option<String>,
}

/// A message to display to the user.
#[derive(Debug, Clone)]
pub struct Message {
    /// Message text.
    pub text: String,
    /// Message type (success, error, etc.).
    pub message_type: MessageType,
}

/// Message types for feedback.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Success,
    Error,
    Warning,
    Info,
    Neutral,
}

/// Loading indicator state.
#[derive(Debug, Clone)]
pub struct LoadingState {
    /// Optional message to show while loading.
    pub message: Option<String>,
}

/// Modal state.
#[derive(Debug, Clone)]
pub struct Modal {
    /// Modal name/type.
    pub name: String,
    /// Data to pass to the modal.
    pub data: Option<Term>,
}

// =============================================================================
// ACTIONS
// =============================================================================

/// Actions that can change the Avatar state.
///
/// View instructions from the Agent are converted to these actions.
/// Actions are dispatched to the reducer to produce new state.
#[derive(Debug, Clone)]
pub enum Action {
    // === Messages ===
    /// Show a message to the user.
    ShowMessage {
        text: String,
        message_type: MessageType,
    },
    /// Hide the current message.
    HideMessage,

    // === Navigation ===
    /// Navigate to a route.
    Navigate { route: String },
    /// Go back in navigation history.
    GoBack,
    /// Go forward in navigation history.
    GoForward,

    // === Focus/Highlight ===
    /// Scroll to an element.
    ScrollTo { element_ref: String },
    /// Focus an element.
    Focus { element_ref: String },
    /// Clear focus.
    ClearFocus,
    /// Highlight an element.
    Highlight { element_ref: String },
    /// Clear highlight from an element.
    ClearHighlight { element_ref: String },
    /// Clear all highlights.
    ClearAllHighlights,

    // === Modal ===
    /// Show a modal.
    ShowModal { name: String, data: Option<Term> },
    /// Close the current modal.
    CloseModal,

    // === Loading ===
    /// Show loading indicator.
    ShowLoading { message: Option<String> },
    /// Hide loading indicator.
    HideLoading,

    // === Data ===
    /// Update facts from Agent.
    UpdateFacts { facts: Vec<Term> },
    /// Clear all facts.
    ClearFacts,

    // === Session ===
    /// Set connected state.
    SetConnected {
        connected: bool,
        agent_id: Option<String>,
    },
}

// =============================================================================
// EFFECTS
// =============================================================================

/// Side effects that are NOT state changes.
///
/// Effects are returned by the reducer alongside state changes.
/// The runtime executes these effects (scheduling timers, calling platform APIs, etc.).
#[derive(Debug, Clone)]
pub enum Effect {
    /// Schedule an action to dispatch after a delay.
    Schedule {
        /// Unique ID for cancellation.
        id: String,
        /// Delay in milliseconds.
        delay_ms: u64,
        /// Action to dispatch when timer fires.
        action: Action,
    },

    /// Cancel a scheduled action.
    CancelScheduled {
        /// ID of the scheduled action to cancel.
        id: String,
    },

    /// Platform-specific effect.
    Platform(PlatformEffect),
}

/// Platform-specific effects.
#[derive(Debug, Clone)]
pub enum PlatformEffect {
    /// Copy text to clipboard.
    CopyToClipboard { value: String },
    /// Trigger haptic feedback.
    Vibrate { duration_ms: u64 },
    /// Play a sound.
    PlaySound { sound: String },
    /// Scroll to element (platform-specific implementation).
    ScrollToElement { element_ref: String },
    /// Focus element (platform-specific implementation).
    FocusElement { element_ref: String },
}

// =============================================================================
// REDUCER
// =============================================================================

/// Result of reducing an action.
pub struct ReduceResult {
    /// The new state.
    pub state: AvatarState,
    /// Effects to execute.
    pub effects: Vec<Effect>,
}

/// Pure reducer function: (state, action) → (new_state, effects).
///
/// This function is pure — it has no side effects. All side effects
/// are returned as Effect values to be executed by the runtime.
pub fn reduce(state: AvatarState, action: Action) -> ReduceResult {
    match action {
        // === Messages ===
        Action::ShowMessage { text, message_type } => {
            let mut new_state = state;
            new_state.message = Some(Message { text, message_type });
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::HideMessage => {
            let mut new_state = state;
            new_state.message = None;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Navigation ===
        Action::Navigate { route } => {
            let mut new_state = state.clone();
            if !state.current_route.is_empty() {
                new_state
                    .navigation_history
                    .push(state.current_route.clone());
            }
            new_state.current_route = route;
            new_state.forward_history.clear(); // Clear forward on new navigation
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::GoBack => {
            let mut new_state = state.clone();
            if let Some(prev) = new_state.navigation_history.pop() {
                new_state.forward_history.push(state.current_route.clone());
                new_state.current_route = prev;
            }
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::GoForward => {
            let mut new_state = state.clone();
            if let Some(next) = new_state.forward_history.pop() {
                new_state
                    .navigation_history
                    .push(state.current_route.clone());
                new_state.current_route = next;
            }
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Focus/Highlight ===
        Action::ScrollTo { element_ref } => {
            // ScrollTo doesn't change state, just triggers platform effect
            ReduceResult {
                state,
                effects: vec![Effect::Platform(PlatformEffect::ScrollToElement {
                    element_ref,
                })],
            }
        }

        Action::Focus { element_ref } => {
            let mut new_state = state;
            new_state.focused_element = Some(element_ref.clone());
            ReduceResult {
                state: new_state,
                effects: vec![Effect::Platform(PlatformEffect::FocusElement {
                    element_ref,
                })],
            }
        }

        Action::ClearFocus => {
            let mut new_state = state;
            new_state.focused_element = None;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::Highlight { element_ref } => {
            let mut new_state = state;
            new_state.highlighted_elements.insert(element_ref);
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::ClearHighlight { element_ref } => {
            let mut new_state = state;
            new_state.highlighted_elements.remove(&element_ref);
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::ClearAllHighlights => {
            let mut new_state = state;
            new_state.highlighted_elements.clear();
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Modal ===
        Action::ShowModal { name, data } => {
            let mut new_state = state;
            new_state.modal = Some(Modal { name, data });
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::CloseModal => {
            let mut new_state = state;
            new_state.modal = None;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Loading ===
        Action::ShowLoading { message } => {
            let mut new_state = state;
            new_state.loading = Some(LoadingState { message });
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::HideLoading => {
            let mut new_state = state;
            new_state.loading = None;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Data ===
        Action::UpdateFacts { facts } => {
            let mut new_state = state;
            new_state.facts = facts;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        Action::ClearFacts => {
            let mut new_state = state;
            new_state.facts.clear();
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }

        // === Session ===
        Action::SetConnected { connected, agent_id } => {
            let mut new_state = state;
            new_state.connected = connected;
            new_state.agent_id = agent_id;
            ReduceResult {
                state: new_state,
                effects: vec![],
            }
        }
    }
}

// =============================================================================
// VIEW INSTRUCTION → ACTION + EFFECTS
// =============================================================================

/// Convert a ViewInstruction to an Action and optional Effects.
///
/// This is how view instructions from the Agent become state changes.
pub fn instruction_to_action(instruction: ViewInstruction) -> (Action, Vec<Effect>) {
    match instruction {
        ViewInstruction::Message {
            message_type,
            text,
            duration,
        } => {
            let mt = match message_type {
                VIMessageType::Success => MessageType::Success,
                VIMessageType::Error => MessageType::Error,
                VIMessageType::Warning => MessageType::Warning,
                VIMessageType::Info => MessageType::Info,
                VIMessageType::Neutral => MessageType::Neutral,
            };

            let action = Action::ShowMessage {
                text,
                message_type: mt,
            };

            // Schedule hide if duration specified
            let effects = match duration {
                Some(ms) => vec![Effect::Schedule {
                    id: "message".to_string(),
                    delay_ms: ms,
                    action: Action::HideMessage,
                }],
                None => vec![],
            };

            (action, effects)
        }

        ViewInstruction::Navigate { route } => (Action::Navigate { route }, vec![]),

        ViewInstruction::GoBack => (Action::GoBack, vec![]),

        ViewInstruction::ScrollTo { element_ref } => (Action::ScrollTo { element_ref }, vec![]),

        ViewInstruction::Focus { element_ref } => (Action::Focus { element_ref }, vec![]),

        ViewInstruction::Highlight {
            element_ref,
            duration,
        } => {
            let action = Action::Highlight {
                element_ref: element_ref.clone(),
            };

            let effects = match duration {
                Some(ms) => vec![Effect::Schedule {
                    id: format!("highlight_{}", element_ref),
                    delay_ms: ms,
                    action: Action::ClearHighlight { element_ref },
                }],
                None => vec![],
            };

            (action, effects)
        }

        ViewInstruction::Show { view_name, data: _ } => {
            // Show translates to navigate for now
            (Action::Navigate { route: view_name }, vec![])
        }

        ViewInstruction::Hide { view_name: _ } => {
            // Hide could close a modal or go back
            (Action::GoBack, vec![])
        }

        ViewInstruction::Modal { name, data } => (Action::ShowModal { name, data }, vec![]),

        ViewInstruction::CloseModal => (Action::CloseModal, vec![]),

        ViewInstruction::Loading { show, message } => {
            if show {
                (Action::ShowLoading { message }, vec![])
            } else {
                (Action::HideLoading, vec![])
            }
        }

        ViewInstruction::Trigger { element_ref: _ } => {
            // Trigger is handled separately by the input handler
            // It doesn't directly become a state change
            (Action::HideLoading, vec![]) // No-op for now
        }

        ViewInstruction::Refresh { data_type: _ } => {
            // Refresh triggers an Agent query, handled separately
            (Action::HideLoading, vec![]) // No-op for now
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
    fn test_show_message() {
        let state = AvatarState::default();
        let result = reduce(
            state,
            Action::ShowMessage {
                text: "Hello".to_string(),
                message_type: MessageType::Success,
            },
        );

        assert!(result.state.message.is_some());
        let msg = result.state.message.unwrap();
        assert_eq!(msg.text, "Hello");
        assert_eq!(msg.message_type, MessageType::Success);
    }

    #[test]
    fn test_hide_message() {
        let mut state = AvatarState::default();
        state.message = Some(Message {
            text: "Hello".to_string(),
            message_type: MessageType::Success,
        });

        let result = reduce(state, Action::HideMessage);
        assert!(result.state.message.is_none());
    }

    #[test]
    fn test_navigation() {
        let mut state = AvatarState::default();
        state.current_route = "/home".to_string();

        // Navigate to invoices
        let result = reduce(
            state,
            Action::Navigate {
                route: "/invoices".to_string(),
            },
        );
        assert_eq!(result.state.current_route, "/invoices");
        assert_eq!(result.state.navigation_history, vec!["/home"]);

        // Go back
        let result = reduce(result.state, Action::GoBack);
        assert_eq!(result.state.current_route, "/home");
        assert_eq!(result.state.forward_history, vec!["/invoices"]);

        // Go forward
        let result = reduce(result.state, Action::GoForward);
        assert_eq!(result.state.current_route, "/invoices");
    }

    #[test]
    fn test_highlight_with_duration() {
        let instruction = ViewInstruction::Highlight {
            element_ref: "INV-123".to_string(),
            duration: Some(3000),
        };

        let (action, effects) = instruction_to_action(instruction);

        assert!(matches!(action, Action::Highlight { .. }));
        assert_eq!(effects.len(), 1);
        assert!(matches!(
            &effects[0],
            Effect::Schedule { delay_ms: 3000, .. }
        ));
    }

    #[test]
    fn test_message_with_duration() {
        let instruction = ViewInstruction::Message {
            message_type: VIMessageType::Success,
            text: "Paid!".to_string(),
            duration: Some(3000),
        };

        let (action, effects) = instruction_to_action(instruction);

        assert!(matches!(action, Action::ShowMessage { .. }));
        assert_eq!(effects.len(), 1);

        if let Effect::Schedule {
            action: scheduled_action,
            delay_ms,
            ..
        } = &effects[0]
        {
            assert_eq!(*delay_ms, 3000);
            assert!(matches!(scheduled_action, Action::HideMessage));
        } else {
            panic!("Expected Schedule effect");
        }
    }
}
