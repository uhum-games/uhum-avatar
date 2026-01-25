//! Input Handling - Deterministic routing for user interactions.
//!
//! The Avatar is a thin client. All text input goes to the Agent (Brain).
//! UI interactions are handled deterministically based on component metadata.
//!
//! ## Input Types
//!
//! | Input | Handling |
//! |-------|----------|
//! | Text/Chat | Always send MESSAGE to Agent |
//! | UI with intent action | Send INTENTION to Agent |
//! | UI with local action | Handle locally (navigate, expand, etc.) |
//! | Pure UI (scroll, focus) | Handle locally |
//!
//! See specs/SMART-ROUTING.md for full specification.

use std::collections::HashMap;
use ub_protocol::Term;

/// Action metadata attached to UI components.
///
/// Every interactive component has action metadata in Uhum Language
/// that tells the Avatar what to do when the user interacts with it.
#[derive(Debug, Clone)]
pub enum ComponentAction {
    /// Trigger an intent (goes to Agent)
    Intent {
        name: String,
        params: HashMap<String, Term>,
    },
    /// Navigate to a route (handled locally)
    Navigate { route: String },
    /// Show a modal (handled locally)
    Modal { name: String, data: Option<Term> },
    /// Expand a section (handled locally)
    Expand { element_ref: String },
    /// Collapse a section (handled locally)
    Collapse { element_ref: String },
    /// Copy to clipboard (handled locally)
    Copy { value: String },
    /// Custom action (for extensibility)
    Custom { action_type: String, data: Term },
}

impl ComponentAction {
    /// Check if this action requires an Agent call.
    pub fn requires_agent(&self) -> bool {
        matches!(self, ComponentAction::Intent { .. })
    }

    /// Parse a ComponentAction from a Term.
    ///
    /// Expected formats:
    /// - `intent(name, [params...])`
    /// - `navigate(route)`
    /// - `modal(show, name)`
    /// - `expand(ref)`
    /// - `collapse(ref)`
    /// - `copy(value)`
    pub fn from_term(term: &Term) -> Option<Self> {
        if let Term::Compound { functor, args } = term {
            match functor.as_str() {
                "intent" if !args.is_empty() => {
                    let name = term_to_string(&args[0])?;
                    let params = if args.len() > 1 {
                        parse_params(&args[1])
                    } else {
                        HashMap::new()
                    };
                    Some(ComponentAction::Intent { name, params })
                }
                "navigate" if !args.is_empty() => {
                    let route = term_to_string(&args[0])?;
                    Some(ComponentAction::Navigate { route })
                }
                "modal" if args.len() >= 2 => {
                    let name = term_to_string(&args[1])?;
                    let data = args.get(2).cloned();
                    Some(ComponentAction::Modal { name, data })
                }
                "expand" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    Some(ComponentAction::Expand { element_ref })
                }
                "collapse" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    Some(ComponentAction::Collapse { element_ref })
                }
                "copy" if !args.is_empty() => {
                    let value = term_to_string(&args[0])?;
                    Some(ComponentAction::Copy { value })
                }
                _ => Some(ComponentAction::Custom {
                    action_type: functor.clone(),
                    data: term.clone(),
                }),
            }
        } else {
            None
        }
    }
}

/// Result of handling a component action.
#[derive(Debug, Clone)]
pub enum ActionResult {
    /// Action handled locally, no Agent call needed.
    Local(LocalAction),
    /// Need to send INTENTION to Agent.
    SendIntention {
        intent_name: String,
        params: HashMap<String, Term>,
    },
}

/// Local actions that don't require Agent communication.
#[derive(Debug, Clone)]
pub enum LocalAction {
    /// Navigate to a route.
    Navigate { route: String },
    /// Show a modal.
    ShowModal { name: String, data: Option<Term> },
    /// Close modal.
    CloseModal,
    /// Expand a section.
    Expand { element_ref: String },
    /// Collapse a section.
    Collapse { element_ref: String },
    /// Copy to clipboard.
    Copy { value: String },
    /// Go back in navigation history.
    GoBack,
    /// Go forward in navigation history.
    GoForward,
    /// Scroll to an element.
    ScrollTo { element_ref: String },
    /// Focus an element.
    Focus { element_ref: String },
}

/// Handle a component action.
///
/// Returns either a local action to execute or an intention to send to Agent.
pub fn handle_component_action(action: &ComponentAction) -> ActionResult {
    match action {
        ComponentAction::Intent { name, params } => ActionResult::SendIntention {
            intent_name: name.clone(),
            params: params.clone(),
        },
        ComponentAction::Navigate { route } => ActionResult::Local(LocalAction::Navigate {
            route: route.clone(),
        }),
        ComponentAction::Modal { name, data } => ActionResult::Local(LocalAction::ShowModal {
            name: name.clone(),
            data: data.clone(),
        }),
        ComponentAction::Expand { element_ref } => ActionResult::Local(LocalAction::Expand {
            element_ref: element_ref.clone(),
        }),
        ComponentAction::Collapse { element_ref } => ActionResult::Local(LocalAction::Collapse {
            element_ref: element_ref.clone(),
        }),
        ComponentAction::Copy { value } => ActionResult::Local(LocalAction::Copy {
            value: value.clone(),
        }),
        ComponentAction::Custom { .. } => {
            // Custom actions default to Agent
            ActionResult::SendIntention {
                intent_name: "custom_action".to_string(),
                params: HashMap::new(),
            }
        }
    }
}

// =============================================================================
// VIEW INSTRUCTIONS PROCESSING
// =============================================================================

/// A view instruction from the Agent (Brain).
///
/// These are generic instructions that the Avatar maps to platform-specific
/// rendering and applies user preferences on top.
#[derive(Debug, Clone)]
pub enum ViewInstruction {
    /// Display a message to the user.
    Message {
        message_type: MessageType,
        text: String,
        duration: Option<u64>,
    },
    /// Navigate to a route.
    Navigate { route: String },
    /// Go back in history.
    GoBack,
    /// Scroll to an element.
    ScrollTo { element_ref: String },
    /// Focus an element.
    Focus { element_ref: String },
    /// Highlight an element.
    Highlight {
        element_ref: String,
        duration: Option<u64>,
    },
    /// Show a view.
    Show { view_name: String, data: Option<Term> },
    /// Hide a view.
    Hide { view_name: String },
    /// Show a modal.
    Modal { name: String, data: Option<Term> },
    /// Close modal.
    CloseModal,
    /// Show loading indicator.
    Loading { show: bool, message: Option<String> },
    /// Trigger a component's action (for voice commands like "click the pay button").
    Trigger { element_ref: String },
    /// Refresh data of a certain type.
    Refresh { data_type: String },
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

impl ViewInstruction {
    /// Parse a ViewInstruction from a Term.
    pub fn from_term(term: &Term) -> Option<Self> {
        if let Term::Compound { functor, args } = term {
            match functor.as_str() {
                "message" if args.len() >= 2 => {
                    let message_type = parse_message_type(&args[0])?;
                    let text = term_to_string(&args[1])?;
                    let duration = args.get(2).and_then(|t| term_to_u64(t));
                    Some(ViewInstruction::Message {
                        message_type,
                        text,
                        duration,
                    })
                }
                "navigate" if !args.is_empty() => {
                    let route = term_to_string(&args[0])?;
                    Some(ViewInstruction::Navigate { route })
                }
                "go_back" => Some(ViewInstruction::GoBack),
                "scroll_to" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    Some(ViewInstruction::ScrollTo { element_ref })
                }
                "focus" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    Some(ViewInstruction::Focus { element_ref })
                }
                "highlight" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    let duration = args.get(1).and_then(|t| {
                        if let Term::Compound { functor, args } = t {
                            if functor == "duration" && !args.is_empty() {
                                return term_to_u64(&args[0]);
                            }
                        }
                        None
                    });
                    Some(ViewInstruction::Highlight {
                        element_ref,
                        duration,
                    })
                }
                "show" if !args.is_empty() => {
                    let view_name = term_to_string(&args[0])?;
                    let data = args.get(1).cloned();
                    Some(ViewInstruction::Show { view_name, data })
                }
                "hide" if !args.is_empty() => {
                    let view_name = term_to_string(&args[0])?;
                    Some(ViewInstruction::Hide { view_name })
                }
                "modal" if args.len() >= 2 => {
                    if term_to_string(&args[0])? == "close" {
                        Some(ViewInstruction::CloseModal)
                    } else {
                        let name = term_to_string(&args[1])?;
                        let data = args.get(2).cloned();
                        Some(ViewInstruction::Modal { name, data })
                    }
                }
                "loading" if !args.is_empty() => {
                    let show = term_to_string(&args[0])? == "show";
                    let message = args.get(1).and_then(|t| term_to_string(t));
                    Some(ViewInstruction::Loading { show, message })
                }
                "trigger" if !args.is_empty() => {
                    let element_ref = term_to_string(&args[0])?;
                    Some(ViewInstruction::Trigger { element_ref })
                }
                "refresh" if !args.is_empty() => {
                    let data_type = term_to_string(&args[0])?;
                    Some(ViewInstruction::Refresh { data_type })
                }
                _ => None,
            }
        } else {
            None
        }
    }
}

/// Parse view instructions from a list Term.
pub fn parse_view_instructions(term: &Term) -> Vec<ViewInstruction> {
    let mut instructions = Vec::new();
    if let Term::List(items) = term {
        for item in items {
            if let Some(instruction) = ViewInstruction::from_term(item) {
                instructions.push(instruction);
            }
        }
    }
    instructions
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

fn term_to_string(term: &Term) -> Option<String> {
    match term {
        Term::Atom(s) => Some(s.clone()),
        Term::String(s) => Some(s.clone()),
        Term::Integer(n) => Some(n.to_string()),
        Term::Float(f) => Some(f.to_string()),
        _ => None,
    }
}

fn term_to_u64(term: &Term) -> Option<u64> {
    match term {
        Term::Integer(n) => Some(*n as u64),
        Term::Float(f) => Some(*f as u64),
        _ => None,
    }
}

fn parse_params(term: &Term) -> HashMap<String, Term> {
    let mut params = HashMap::new();
    if let Term::List(items) = term {
        for item in items {
            if let Term::Compound { functor, args } = item {
                if !args.is_empty() {
                    params.insert(functor.clone(), args[0].clone());
                }
            }
        }
    }
    params
}

fn parse_message_type(term: &Term) -> Option<MessageType> {
    let s = term_to_string(term)?;
    match s.as_str() {
        "success" => Some(MessageType::Success),
        "error" => Some(MessageType::Error),
        "warning" => Some(MessageType::Warning),
        "info" => Some(MessageType::Info),
        "neutral" => Some(MessageType::Neutral),
        _ => None,
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_intent_action_requires_agent() {
        let action = ComponentAction::Intent {
            name: "pay_invoice".to_string(),
            params: HashMap::new(),
        };
        assert!(action.requires_agent());
    }

    #[test]
    fn test_navigate_action_is_local() {
        let action = ComponentAction::Navigate {
            route: "/invoices".to_string(),
        };
        assert!(!action.requires_agent());
    }

    #[test]
    fn test_handle_intent_action() {
        let action = ComponentAction::Intent {
            name: "pay_invoice".to_string(),
            params: HashMap::new(),
        };
        let result = handle_component_action(&action);
        assert!(matches!(result, ActionResult::SendIntention { .. }));
    }

    #[test]
    fn test_handle_navigate_action() {
        let action = ComponentAction::Navigate {
            route: "/invoices".to_string(),
        };
        let result = handle_component_action(&action);
        assert!(matches!(
            result,
            ActionResult::Local(LocalAction::Navigate { .. })
        ));
    }

    #[test]
    fn test_parse_message_instruction() {
        let term = Term::Compound {
            functor: "message".to_string(),
            args: vec![
                Term::Atom("success".to_string()),
                Term::String("Invoice paid!".to_string()),
            ],
        };
        let instruction = ViewInstruction::from_term(&term);
        assert!(matches!(
            instruction,
            Some(ViewInstruction::Message {
                message_type: MessageType::Success,
                ..
            })
        ));
    }

    #[test]
    fn test_parse_navigate_instruction() {
        let term = Term::Compound {
            functor: "navigate".to_string(),
            args: vec![Term::Atom("invoices".to_string())],
        };
        let instruction = ViewInstruction::from_term(&term);
        assert!(matches!(
            instruction,
            Some(ViewInstruction::Navigate { route }) if route == "invoices"
        ));
    }
}
