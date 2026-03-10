//! Agent AgentCard parsing and representation.
//!
//! The Agent Card is the agent's self-description, containing:
//! - Identity (id, name, version)
//! - Intents (what the agent can do - semantic)
//! - Endpoints (how to connect)
//! - Presentation hints (optional builder preferences - NOT UI commands)
//!
//! ## Layered Architecture
//!
//! Rendering decisions come from three layers (priority order):
//! 1. User Preferences (Avatar-local, highest priority)
//! 2. Presentation Hints (from AgentCard, optional)
//! 3. Avatar Defaults (lowest priority)
//!
//! Presentation hints are **hints, not commands**. The Avatar can override
//! them based on user preferences. See specs/UHUM-VIEW.md for details.

use ua_core::Result;
use ub_protocol::Term;

/// An Agent Card - the agent's self-description.
#[derive(Debug, Clone)]
pub struct AgentCard {
    /// Agent ID (e.g., "acme.billing").
    pub id: String,
    /// Human-readable name.
    pub name: Option<String>,
    /// Version string.
    pub version: Option<String>,
    /// Description.
    pub description: Option<String>,
    /// Available intents (semantic - what the agent can do).
    pub intents: Vec<Intent>,
    /// Connection endpoints.
    pub endpoints: Vec<Endpoint>,
    /// Optional presentation hints (builder preferences).
    /// These are HINTS, not commands. Avatar can override based on user prefs.
    pub presentation: Option<PresentationHints>,
}

impl AgentCard {
    /// Parse an Agent Card from a Term.
    ///
    /// Expected format:
    /// ```prolog
    /// agent_card(
    ///   id('acme.billing'),
    ///   name("Acme Billing"),
    ///   intents([...]),
    ///   endpoints([...]),
    ///   presentation([...])  % OPTIONAL
    /// )
    /// ```
    pub fn from_term(term: &Term) -> Result<Self> {
        // For now, create a minimal agent_card
        // TODO: Implement full Term parsing
        let id = extract_id(term).unwrap_or_else(|| "unknown".to_string());

        Ok(Self {
            id,
            name: extract_string_field(term, "name"),
            version: extract_string_field(term, "version"),
            description: extract_string_field(term, "description"),
            intents: extract_intents(term).unwrap_or_default(),
            endpoints: extract_endpoints(term).unwrap_or_default(),
            presentation: extract_presentation(term),
        })
    }

    /// Get an intent by name.
    pub fn get_intent(&self, name: &str) -> Option<&Intent> {
        self.intents.iter().find(|i| i.name == name)
    }

    /// Check if this agent_card has presentation hints.
    pub fn has_presentation_hints(&self) -> bool {
        self.presentation.is_some()
    }

    /// Get the brand information (if available).
    pub fn get_brand(&self) -> Option<&Brand> {
        self.presentation.as_ref().map(|p| &p.brand)
    }

    /// Get layout hint for a specific data type.
    pub fn get_layout_hint(&self, data_type: &str) -> Option<&LayoutHint> {
        self.presentation
            .as_ref()?
            .layout_hints
            .iter()
            .find(|h| h.data_type == data_type)
    }
}

/// An intent that the agent supports (semantic definition).
#[derive(Debug, Clone)]
pub struct Intent {
    /// Intent name (e.g., "pay_invoice").
    pub name: String,
    /// Human-readable description.
    pub description: Option<String>,
    /// Required and optional parameters.
    pub params: Vec<Param>,
    /// Possible effects (what might happen).
    pub effects: Vec<String>,
    /// Example phrases (for NLU).
    pub examples: Vec<String>,
}

/// A parameter for an intent.
#[derive(Debug, Clone)]
pub struct Param {
    /// Parameter name.
    pub name: String,
    /// Parameter type.
    pub param_type: ParamType,
    /// Whether the parameter is required.
    pub required: bool,
    /// Human-readable description.
    pub description: Option<String>,
}

/// Parameter types.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParamType {
    String,
    Number,
    Integer,
    Boolean,
    Money,
    Date,
    DateTime,
    Enum(Vec<String>),
    List(Box<ParamType>),
    Any,
}

/// A connection endpoint.
#[derive(Debug, Clone)]
pub struct Endpoint {
    /// Endpoint type (e.g., "livelink", "quic").
    pub endpoint_type: String,
    /// URL.
    pub url: String,
}

// =============================================================================
// PRESENTATION HINTS (Optional Builder Preferences)
// =============================================================================

/// Optional presentation hints from the builder.
///
/// These are HINTS, not commands. The Avatar can override them based on
/// user preferences (which have higher priority).
///
/// See specs/UHUM-VIEW.md for the full layered architecture.
#[derive(Debug, Clone, Default)]
pub struct PresentationHints {
    /// Brand identity (logo, colors, tone).
    pub brand: Brand,
    /// Home/landing configuration.
    pub home: Vec<HomeSection>,
    /// Layout hints for specific data types.
    pub layout_hints: Vec<LayoutHint>,
}

/// Brand identity for the agent.
#[derive(Debug, Clone, Default)]
pub struct Brand {
    /// Brand name.
    pub name: Option<String>,
    /// Logo URL.
    pub logo: Option<String>,
    /// Primary color (hex).
    pub primary_color: Option<String>,
    /// Secondary color (hex).
    pub secondary_color: Option<String>,
    /// Tone/voice (e.g., "friendly", "professional", "casual").
    pub tone: Option<String>,
}

/// A section to show on the home/landing view.
#[derive(Debug, Clone)]
pub struct HomeSection {
    /// Section type (e.g., "welcome", "featured", "quick_actions").
    pub section_type: String,
    /// Welcome message (for welcome sections).
    pub message: Option<String>,
    /// Data source query (for data sections).
    pub data_source: Option<DataSource>,
    /// Actions to show (for quick_actions sections).
    pub actions: Vec<String>,
    /// Layout hint for this section.
    pub layout_hint: Option<String>,
}

/// A data source reference for presentation.
#[derive(Debug, Clone)]
pub struct DataSource {
    /// Data type (e.g., "products", "invoices").
    pub data_type: String,
    /// Filter criteria.
    pub filters: Vec<(String, String)>,
    /// Maximum items to show.
    pub max_items: Option<usize>,
}

/// A layout hint for a specific data type.
///
/// This is a SUGGESTION, not a requirement.
/// Avatar can override based on user preferences.
#[derive(Debug, Clone)]
pub struct LayoutHint {
    /// The data type this hint applies to (e.g., "products", "invoices").
    pub data_type: String,
    /// Suggested component (e.g., "carousel", "grid", "list").
    pub suggested_component: String,
    /// Additional options (e.g., columns, show_badge).
    pub options: Vec<(String, String)>,
}

// =============================================================================
// HELPER FUNCTIONS FOR TERM PARSING
// =============================================================================

fn extract_id(term: &Term) -> Option<String> {
    // Look for id('...') in the term
    if let Term::Compound { functor, args } = term {
        if functor == "agent" || functor == "welcome" {
            for arg in args {
                if let Term::Compound { functor: f, args: a } = arg {
                    if f == "id" && !a.is_empty() {
                        return term_to_string(&a[0]);
                    }
                    if f == "agent" && !a.is_empty() {
                        // welcome(agent('id', ...), ...)
                        return term_to_string(&a[0]);
                    }
                }
            }
        }
    }
    None
}

fn extract_string_field(term: &Term, field: &str) -> Option<String> {
    if let Term::Compound { args, .. } = term {
        for arg in args {
            if let Term::Compound { functor, args: field_args } = arg {
                if functor == field && !field_args.is_empty() {
                    return term_to_string(&field_args[0]);
                }
            }
        }
    }
    None
}

fn extract_intents(term: &Term) -> Option<Vec<Intent>> {
    // TODO: Implement full intent parsing
    if let Term::Compound { args, .. } = term {
        for arg in args {
            if let Term::Compound { functor, args: _intent_args } = arg {
                if functor == "intents" {
                    // Parse each intent
                    // For now, return empty
                    return Some(Vec::new());
                }
            }
        }
    }
    None
}

fn extract_endpoints(_term: &Term) -> Option<Vec<Endpoint>> {
    // TODO: Implement full endpoint parsing
    None
}

fn extract_presentation(term: &Term) -> Option<PresentationHints> {
    // Look for presentation([...]) in the term
    if let Term::Compound { args, .. } = term {
        for arg in args {
            if let Term::Compound { functor, args: pres_args } = arg {
                if functor == "presentation" && !pres_args.is_empty() {
                    return Some(parse_presentation_hints(&pres_args[0]));
                }
            }
        }
    }
    None
}

fn parse_presentation_hints(term: &Term) -> PresentationHints {
    let mut hints = PresentationHints::default();

    if let Term::List(items) = term {
        for item in items {
            if let Term::Compound { functor, args } = item {
                match functor.as_str() {
                    "brand" if !args.is_empty() => {
                        hints.brand = parse_brand(&args[0]);
                    }
                    "home" if !args.is_empty() => {
                        hints.home = parse_home_sections(&args[0]);
                    }
                    "layout_hints" if !args.is_empty() => {
                        hints.layout_hints = parse_layout_hints(&args[0]);
                    }
                    _ => {}
                }
            }
        }
    }

    hints
}

fn parse_brand(term: &Term) -> Brand {
    let mut brand = Brand::default();

    if let Term::List(items) = term {
        for item in items {
            if let Term::Compound { functor, args } = item {
                if !args.is_empty() {
                    let value = term_to_string(&args[0]);
                    match functor.as_str() {
                        "name" => brand.name = value,
                        "logo" => brand.logo = value,
                        "primary_color" => brand.primary_color = value,
                        "secondary_color" => brand.secondary_color = value,
                        "tone" => brand.tone = value,
                        _ => {}
                    }
                }
            }
        }
    }

    brand
}

fn parse_home_sections(term: &Term) -> Vec<HomeSection> {
    let mut sections = Vec::new();

    if let Term::List(items) = term {
        for item in items {
            if let Term::Compound { functor, args } = item {
                if functor == "section" && args.len() >= 2 {
                    if let Some(section_type) = term_to_string(&args[0]) {
                        let mut section = HomeSection {
                            section_type,
                            message: None,
                            data_source: None,
                            actions: Vec::new(),
                            layout_hint: None,
                        };

                        // Parse section options from args[1] (which should be a list)
                        if let Term::List(opts) = &args[1] {
                            for opt in opts {
                                if let Term::Compound { functor: f, args: a } = opt {
                                    match f.as_str() {
                                        "message" if !a.is_empty() => {
                                            section.message = term_to_string(&a[0]);
                                        }
                                        "layout_hint" if !a.is_empty() => {
                                            section.layout_hint = term_to_string(&a[0]);
                                        }
                                        "actions" if !a.is_empty() => {
                                            section.actions = parse_string_list(&a[0]);
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }

                        sections.push(section);
                    }
                }
            }
        }
    }

    sections
}

fn parse_layout_hints(term: &Term) -> Vec<LayoutHint> {
    let mut hints = Vec::new();

    if let Term::List(items) = term {
        for item in items {
            if let Term::Compound { functor, args } = item {
                if functor == "hint" && args.len() >= 2 {
                    if let (Some(data_type), Some(component)) =
                        (term_to_string(&args[0]), term_to_string(&args[1]))
                    {
                        hints.push(LayoutHint {
                            data_type,
                            suggested_component: component,
                            options: Vec::new(), // TODO: parse options from args[2] if present
                        });
                    }
                }
            }
        }
    }

    hints
}

fn parse_string_list(term: &Term) -> Vec<String> {
    let mut result = Vec::new();
    if let Term::List(items) = term {
        for item in items {
            if let Some(s) = term_to_string(item) {
                result.push(s);
            }
        }
    }
    result
}

fn term_to_string(term: &Term) -> Option<String> {
    match term {
        Term::Atom(s) => Some(s.clone()),
        Term::String(s) => Some(s.clone()),
        Term::Integer(n) => Some(n.to_string()),
        Term::Float(f) => Some(f.to_string()),
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
    fn test_empty_agent_card() {
        let term = Term::Atom("unknown".to_string());
        let agent_card = AgentCard::from_term(&term).unwrap();
        assert_eq!(agent_card.id, "unknown");
        assert!(!agent_card.has_presentation_hints());
    }

    #[test]
    fn test_agent_card_with_id() {
        let term = Term::Compound {
            functor: "agent_card".to_string(),
            args: vec![Term::Compound {
                functor: "id".to_string(),
                args: vec![Term::Atom("acme.billing".to_string())],
            }],
        };
        let agent_card = AgentCard::from_term(&term).unwrap();
        assert_eq!(agent_card.id, "acme.billing");
    }

    #[test]
    fn test_presentation_hints_are_optional() {
        let term = Term::Compound {
            functor: "agent_card".to_string(),
            args: vec![Term::Compound {
                functor: "id".to_string(),
                args: vec![Term::Atom("test.agent".to_string())],
            }],
        };
        let agent_card = AgentCard::from_term(&term).unwrap();
        assert!(agent_card.presentation.is_none());
        assert!(!agent_card.has_presentation_hints());
    }
}
