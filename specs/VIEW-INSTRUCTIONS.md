# View Instructions Specification

This document defines **View Instructions** — the protocol for Brain to guide Avatar's presentation.

---

## 1. Design Philosophy

### Brain Guides, Avatar Renders Reactively

The Brain can include **view instructions** in its decisions to guide how the Avatar should present the response. These are:

- **Generic** — Not platform-specific (e.g., `message`, not `toast`)
- **Variable-bound** — Reference data from the decision's facts
- **Optional** — Avatar can render without them (using defaults)
- **Overridable** — User preferences take priority
- **Declarative** — Instructions become state changes, not imperative code

```prolog
% Brain returns semantic data + optional view instructions
decision(accepted, [
  % Data (semantic facts)
  invoice("INV-123", 99.50, paid),
  payment("PAY-456", "INV-123", now)
], [
  % View instructions (become state changes)
  message(success, "Invoice ~InvoiceId paid!"),
  navigate(invoice_detail("INV-123"))
]).
```

### Avatar's Reactive Architecture

The Avatar does **NOT** execute view instructions imperatively. Instead:

1. **Instructions become Actions** — Each instruction is converted to a dispatchable action
2. **Actions update State** — A pure reducer function updates the global state
3. **UI reacts to State** — Components re-render when their subscribed state changes
4. **Effects handle Time** — Scheduled events (like "hide after 3s") are effects, not timers in components

```
View Instruction → Dispatch Action → Reducer → New State → UI Reacts
                                         ↓
                                      Effects → Scheduled Future Actions
```

---

## 2. Decision Structure

```prolog
decision(Status, Facts, ViewInstructions).

% Status: accepted | rejected | pending | completed
% Facts: List of semantic data (terms)
% ViewInstructions: List of view instructions (optional)

% Short form (no view instructions)
decision(Status, Facts).
```

### Examples

```prolog
% Payment success with view guidance
decision(accepted, [
  invoice("INV-123", 99.50, paid),
  payment("PAY-456", "INV-123", 1705312800000)
], [
  message(success, "Invoice paid! Amount: $99.50"),
  navigate(invoices),
  highlight("INV-123", duration(3000))
]).

% Query response (Avatar decides presentation)
decision(accepted, [
  invoices([
    invoice("INV-123", 99.50, pending),
    invoice("INV-124", 150.00, paid)
  ])
]).

% Error with guidance
decision(rejected, [
  error(insufficient_funds, "Balance: $50.00, Required: $99.50")
], [
  message(error, "Payment failed: insufficient funds"),
  focus(payment_method)
]).
```

---

## 3. Variable References

View instructions can reference data using `~Variable` syntax:

```prolog
% Facts provide the bindings
decision(accepted, [
  invoice(InvoiceId, Amount, Status),  % InvoiceId="INV-123", Amount=99.50
  customer(Name, Email)                 % Name="John", Email="john@example.com"
], [
  message(success, "Hi ~Name, invoice ~InvoiceId ($~Amount) is now ~Status"),
  navigate(invoice_detail(InvoiceId))
]).

% Avatar binds:
% "Hi John, invoice INV-123 ($99.50) is now paid"
```

### Binding Rules

1. Variables in view instructions are matched against fact arguments
2. If a variable appears in facts, its value is substituted
3. Unbound variables are left as-is (or Avatar uses placeholder)

---

## 4. View Instructions Reference

### 4.1 Feedback

```prolog
% Display a message to the user
message(Type, Text).
message(Type, Text, Options).

% Type: success | error | warning | info | neutral
% Options: duration(Ms), dismissible(Bool), action(Intent)

% Examples:
message(success, "Invoice paid!").
message(error, "Payment failed", duration(5000)).
message(info, "Processing...", dismissible(false)).
message(warning, "Low balance", action(add_funds)).
```

**Avatar mapping:**
| Platform | success | error | info |
|----------|---------|-------|------|
| iOS | Banner (green) | Alert | Banner (blue) |
| Android | Snackbar | Dialog | Snackbar |
| Browser | Toast | Modal | Toast |
| Desktop | Notification | Dialog | Notification |

### 4.2 Navigation

```prolog
% Navigate to a route/view
navigate(Route).
navigate(Route, Params).

% Go back/forward in history
go_back.
go_forward.

% Examples:
navigate(invoices).
navigate(invoice_detail("INV-123")).
navigate(search, query("pending invoices")).
go_back.
```

### 4.3 Focus & Highlight

```prolog
% Scroll to an element
scroll_to(ElementRef).

% Focus an input element
focus(ElementRef).

% Highlight an element temporarily
highlight(ElementRef).
highlight(ElementRef, Options).

% Options: duration(Ms), style(pulse|glow|outline)

% Examples:
scroll_to("INV-123").
focus(amount_input).
highlight("PAY-456", duration(3000)).
highlight(error_field, style(pulse)).
```

### 4.4 View Manipulation

```prolog
% Show/hide a view or section
show(ViewName).
show(ViewName, Data).
hide(ViewName).

% Expand/collapse a section
expand(ElementRef).
collapse(ElementRef).

% Refresh data
refresh(DataType).

% Examples:
show(invoice_list, invoices).
hide(loading_spinner).
expand(payment_details).
refresh(invoices).
```

### 4.5 Modal & Overlay

```prolog
% Show/close a modal
modal(show, ModalName).
modal(show, ModalName, Data).
modal(close).

% Confirmation dialog
confirm(Title, Message, OnConfirmIntent).

% Examples:
modal(show, payment_form, invoice("INV-123")).
modal(close).
confirm("Delete Invoice", "Are you sure?", delete_invoice("INV-123")).
```

### 4.6 Loading States

```prolog
% Show/hide loading indicator
loading(show).
loading(show, Message).
loading(hide).

% Examples:
loading(show, "Processing payment...").
loading(hide).
```

### 4.7 Selection

```prolog
% Select/deselect elements
select(ElementRef).
deselect(ElementRef).
select_all(ListRef).
clear_selection.

% Examples:
select("INV-123").
select_all(invoice_list).
clear_selection.
```

### 4.8 Trigger (UI Simulation)

```prolog
% Trigger an element's action (for voice/chat commands)
trigger(ElementRef).

% Examples:
% User says "click the pay button"
trigger(pay_button).
```

---

## 5. Brain: Built-in View Module

The view instructions are available as a **built-in module** in the Brain's rule system:

```prolog
% Agent rules can use view instructions naturally
:- use_module(library(view)).

handle(pay_invoice(InvoiceId)) :-
    invoice(InvoiceId, Amount, pending),
    process_payment(InvoiceId, PaymentId),
    assert(invoice(InvoiceId, Amount, paid)),
    assert(payment(PaymentId, InvoiceId, now)),
    % View instructions collected automatically
    view:message(success, "Paid $~Amount for invoice ~InvoiceId"),
    view:navigate(invoices),
    view:highlight(InvoiceId).
```

### How It Works

1. During rule evaluation, `view:*` calls are **collected** (not executed)
2. After evaluation completes, collected instructions are included in DECISION
3. Avatar receives facts + view instructions together

---

## 6. Avatar Reactive Architecture

The Avatar processes view instructions using a **reactive, event-driven** architecture inspired by Redux/Elm patterns.

### 6.1 Core Concepts

| Concept | Description |
|---------|-------------|
| **State** | Single source of truth for all UI state |
| **Action** | Describes a state change (from view instruction) |
| **Reducer** | Pure function: `(state, action) → (new_state, effects)` |
| **Effect** | Side effect to execute (timers, platform APIs) |
| **Subscription** | UI components subscribe to state slices |

### 6.2 Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AVATAR RECEIVES DECISION                      │
│                                                                  │
│   decision(accepted, [facts...], [view_instructions...])        │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 1: BIND VARIABLES                                         │
│                                                                  │
│   message(success, "Invoice ~InvoiceId paid!")                  │
│   → message(success, "Invoice INV-123 paid!")                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 2: CONVERT TO ACTIONS                                     │
│                                                                  │
│   message(success, "...", duration(3000))                       │
│   → Action::ShowMessage { text, type: Success }                 │
│   → Effect::Schedule { delay: 3000, action: HideMessage }       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 3: DISPATCH TO REDUCER                                    │
│                                                                  │
│   reduce(state, ShowMessage) → new_state                        │
│   new_state.message = Some(Message { text, type: Success })     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│   STEP 4a: UI REACTS     │     │   STEP 4b: RUN EFFECTS   │
│                          │     │                          │
│   Components subscribed  │     │   Schedule timer: 3000ms │
│   to state.message       │     │   → dispatch HideMessage │
│   re-render              │     │                          │
└──────────────────────────┘     └──────────────────────────┘
```

### 6.3 The State Model

```rust
/// Global Avatar UI state
struct AvatarState {
    // === Feedback ===
    message: Option<Message>,      // Current message (if any)
    loading: Option<LoadingState>, // Loading indicator
    
    // === Navigation ===
    current_route: String,
    navigation_history: Vec<String>,
    
    // === Overlays ===
    modal: Option<Modal>,
    
    // === Focus/Highlight ===
    focused_element: Option<String>,
    highlighted_elements: HashSet<String>,
    
    // === Data (from Brain) ===
    facts: FactStore,
    
    // === User Preferences ===
    preferences: UserPreferences,
}
```

### 6.4 Actions (State Changes)

```rust
enum Action {
    // === Messages ===
    ShowMessage { text: String, message_type: MessageType },
    HideMessage,
    
    // === Navigation ===
    Navigate { route: String },
    GoBack,
    
    // === Focus/Highlight ===
    Focus { element_ref: String },
    ClearFocus,
    Highlight { element_ref: String },
    ClearHighlight { element_ref: String },
    
    // === Modal ===
    ShowModal { name: String, data: Option<Term> },
    CloseModal,
    
    // === Loading ===
    ShowLoading { message: Option<String> },
    HideLoading,
    
    // === Data ===
    UpdateFacts { facts: Vec<Term> },
}
```

### 6.5 Effects (Side Effects)

Effects are **not** state changes — they're things that happen outside the reducer:

```rust
enum Effect {
    /// Schedule a future action
    Schedule {
        id: String,        // For cancellation
        delay_ms: u64,
        action: Action,
    },
    
    /// Cancel a scheduled action
    CancelScheduled { id: String },
    
    /// Platform-specific effects
    Platform(PlatformEffect),
}

enum PlatformEffect {
    CopyToClipboard { value: String },
    Vibrate { duration_ms: u64 },
    PlaySound { sound: String },
}
```

### 6.6 The Reducer (Pure Function)

```rust
fn reduce(state: AvatarState, action: Action) -> (AvatarState, Vec<Effect>) {
    match action {
        Action::ShowMessage { text, message_type } => {
            let mut new_state = state;
            new_state.message = Some(Message { text, message_type });
            (new_state, vec![]) // Effects added by instruction processor
        }
        
        Action::HideMessage => {
            let mut new_state = state;
            new_state.message = None;
            (new_state, vec![])
        }
        
        Action::Navigate { route } => {
            let mut new_state = state;
            new_state.navigation_history.push(state.current_route.clone());
            new_state.current_route = route;
            (new_state, vec![])
        }
        
        // ... other actions
    }
}
```

### 6.7 Instruction → Action + Effects

Each view instruction becomes an action plus optional effects:

```rust
fn process_instruction(instr: ViewInstruction) -> (Action, Vec<Effect>) {
    match instr {
        ViewInstruction::Message { text, message_type, duration } => {
            let action = Action::ShowMessage { text, message_type };
            
            // Schedule hide if duration specified
            let effects = match duration {
                Some(ms) => vec![Effect::Schedule {
                    id: "message".into(),
                    delay_ms: ms,
                    action: Action::HideMessage,
                }],
                None => vec![],
            };
            
            (action, effects)
        }
        
        ViewInstruction::Highlight { element_ref, duration } => {
            let action = Action::Highlight { element_ref: element_ref.clone() };
            
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
        
        // ... other instructions
    }
}
```

### 6.8 Timeline Example

```
Time 0ms:    Brain returns message(success, "Paid!", duration(3000))
             │
             ├─► Convert to Action::ShowMessage
             │
             ├─► Dispatch to reducer
             │   └─► state.message = Some(Message { text: "Paid!", type: Success })
             │
             ├─► UI reacts: Message component appears
             │
             └─► Schedule Effect: HideMessage in 3000ms

Time 3000ms: Timer fires
             │
             ├─► Dispatch Action::HideMessage
             │   └─► state.message = None
             │
             └─► UI reacts: Message component disappears
```

### 6.9 Why Reactive?

| Imperative | Reactive |
|------------|----------|
| `showToast("Paid!"); setTimeout(hideToast, 3000)` | State change + scheduled effect |
| Timer lives in component | Timer managed by runtime |
| Hard to test | Easy to test (pure functions) |
| Race conditions possible | Predictable state transitions |
| Platform-coupled | Platform-agnostic |

**Key Benefits:**
- **Testable** — Reducers are pure functions
- **Predictable** — State transitions are explicit
- **Time-travel debugging** — Can replay actions
- **Platform-agnostic** — Same logic, different renderers

### 6.10 The AvatarRuntime

The `AvatarRuntime` is the orchestrator that ties everything together:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AVATAR RUNTIME                              │
│                                                                  │
│   ┌─────────────┐    dispatch()    ┌─────────────────────────┐  │
│   │   ACTION    │ ───────────────▶ │        REDUCER          │  │
│   └─────────────┘                  │  (state, action) → ...  │  │
│         ▲                          └───────────┬─────────────┘  │
│         │                                      │                │
│         │ fire()                    ┌──────────┴──────────┐     │
│         │                           ▼                     ▼     │
│   ┌─────┴───────┐           ┌─────────────┐       ┌───────────┐ │
│   │  SCHEDULER  │◀──────────│    STATE    │       │  EFFECTS  │ │
│   │  (timers)   │  schedule │             │       │           │ │
│   └─────────────┘           └──────┬──────┘       └─────┬─────┘ │
│                                    │                    │       │
│                              notify│              execute│      │
│                                    ▼                    ▼       │
│                            ┌─────────────┐    ┌──────────────┐  │
│                            │ SUBSCRIBERS │    │   EXECUTOR   │  │
│                            │    (UI)     │    │  (platform)  │  │
│                            └─────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Platform Traits

Platforms implement these traits:

```rust
/// Timer scheduling (browser: setTimeout, native: tokio)
trait Scheduler: Send + Sync {
    fn schedule(&self, id: String, delay_ms: u64, callback: Box<dyn FnOnce()>);
    fn cancel(&self, id: &str);
}

/// Platform-specific effects (clipboard, haptics, scroll)
trait EffectExecutor: Send + Sync {
    fn execute(&self, effect: PlatformEffect);
}
```

#### Usage

```rust
// Create runtime with platform implementations
let runtime = AvatarRuntime::new_arc(scheduler, executor);

// Subscribe to state changes (UI reactivity)
runtime.subscribe(Box::new(|state| {
    render_view(state);
}));

// Dispatch actions directly
runtime.dispatch(Action::ShowMessage { ... });

// Process view instructions from Brain
runtime.process_instructions(instructions);
```

---

## 7. User Preferences (Avatar-local)

Users can customize how view instructions are rendered:

```yaml
view_preferences:
  message:
    position: top-right     # top-left, top-right, bottom-left, bottom-right, center
    duration: 3000          # milliseconds (0 = manual dismiss)
    sound: true             # play sound for messages
    
  navigation:
    animation: slide        # slide, fade, none
    confirm_leave: true     # confirm before leaving unsaved forms
    
  highlight:
    style: glow             # glow, pulse, outline
    duration: 2000          # milliseconds
    
  modal:
    backdrop_dismiss: true  # click outside to close
    animation: scale        # scale, slide, fade
    
  accessibility:
    reduce_motion: false    # disable animations
    high_contrast: false    # high contrast colors
    screen_reader: false    # optimize for screen readers
```

---

## 8. When Brain Omits View Instructions

If the Brain doesn't include view instructions, the Avatar:

1. Uses the **Uhum View layered architecture** (see UHUM-VIEW.md)
2. Applies **user preferences** for layout choice
3. Falls back to **Avatar defaults**

```prolog
% Brain returns only data
decision(accepted, [
  invoices([
    invoice("INV-123", 99.50, pending),
    invoice("INV-124", 150.00, paid)
  ])
]).

% Avatar decides:
% - User prefers carousel → show as carousel
% - No highlight needed
% - No navigation needed (just display data)
```

---

## 9. Summary

| Aspect | Responsibility |
|--------|----------------|
| **What to show** | Brain (facts in decision) |
| **How to present** | Brain suggests (view instructions), Avatar decides |
| **State management** | Avatar (reactive, event-driven) |
| **Time/scheduling** | Avatar (effects system) |
| **Platform mapping** | Avatar (generic → platform-specific) |
| **User style** | Avatar (applies preferences) |
| **Final render** | Avatar (reacts to state changes) |

**Key Principles:**
1. Brain guides presentation with generic instructions
2. Avatar converts instructions to **actions** (state changes)
3. Time-based behavior uses **scheduled effects**, not imperative timers
4. UI **reacts** to state changes, doesn't execute imperatively
5. User preferences are applied during rendering
6. The architecture is **testable** and **platform-agnostic**
