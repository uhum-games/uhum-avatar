# Input Handling Specification

This document defines how the Avatar handles user input.

---

## 1. Design Philosophy

### Simple Rule: Text Goes to Brain

The Avatar follows a simple routing principle:

| Input Type | Where It Goes | Why |
|------------|---------------|-----|
| **Text/Chat** | Always to Brain | Brain has gateway for NLU |
| **UI Interaction** | Deterministic | Action encoded in component |
| **Pure UI** | Local only | Scroll, expand, etc. |

**No local LLM needed.** The Brain's gateway handles all interpretation.

---

## 2. Input Types

### 2.1 Text Input (Chat)

All text input is sent to the Brain:

```
User types: "pay my invoice"

Avatar:
  → Sends MESSAGE("pay my invoice")

Brain:
  Gateway → NLU → Intent classification
  → Returns DECISION with facts + view instructions
```

The Brain's gateway handles:
- Intent classification
- Entity extraction
- Disambiguation
- UI command recognition ("click the pay button")

### 2.2 UI Interaction (Deterministic)

UI components have their action encoded:

```
┌──────────────────────────────────────────────────────────────┐
│  [Pay Invoice]                                                │
│                                                              │
│  Component metadata (in Uhum Language):                       │
│  {                                                           │
│    action: intent,                                           │
│    intent: pay_invoice,                                      │
│    params: { invoice_id: "INV-123" }                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘

User clicks → Avatar reads metadata → Sends INTENTION
```

This is like HTML's `<a href="...">` — the behavior is encoded, not interpreted.

### 2.3 Pure UI Actions (Local)

Some actions don't involve the Brain at all:

| Action | Handling |
|--------|----------|
| Scroll | Local viewport update |
| Expand/collapse | Local state toggle |
| Tab switch | Local navigation |
| Input focus | Local DOM/native |
| Copy to clipboard | Local system API |

These happen entirely in the Avatar without any Brain communication.

---

## 3. The Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
        ┌───────▼───────┐             ┌───────▼───────┐
        │  TEXT INPUT   │             │ UI INTERACTION │
        │  (chat)       │             │ (click, etc.)  │
        └───────┬───────┘             └───────┬───────┘
                │                             │
                │                     ┌───────▼───────┐
                │                     │ HAS ACTION    │
                │                     │ METADATA?     │
                │                     └───────┬───────┘
                │                       yes   │   no
                │                     ┌───────┴───────┐
                │                     │               │
                ▼                     ▼               ▼
        ┌───────────────┐     ┌───────────────┐  ┌──────────┐
        │    MESSAGE    │     │   INTENTION   │  │  LOCAL   │
        │  to Brain     │     │   to Brain    │  │  ONLY    │
        └───────┬───────┘     └───────┬───────┘  └──────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │       BRAIN         │
                │                     │
                │  Gateway → Logic    │
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │     DECISION        │
                │  (facts + view)     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │      AVATAR         │
                │                     │
                │  Process view       │
                │  instructions       │
                │  deterministically  │
                └─────────────────────┘
```

---

## 4. Component Action Metadata

Every interactive component has action metadata in Uhum Language:

```prolog
% Button that triggers an intent
component(button, [
  label("Pay Invoice"),
  action(intent(pay_invoice, [invoice_id("INV-123")]))
]).

% Link that navigates
component(link, [
  label("View Details"),
  action(navigate(invoice_detail("INV-123")))
]).

% Button that shows a modal
component(button, [
  label("Delete"),
  action(modal(show, confirm_delete, [invoice_id("INV-123")]))
]).
```

### Action Types

| Action | Description | Brain Call? |
|--------|-------------|-------------|
| `intent(Name, Params)` | Trigger an intent | Yes (INTENTION) |
| `navigate(Route)` | Go to a route | No (local) |
| `modal(show, Name)` | Show a modal | No (local) |
| `expand(Ref)` | Expand a section | No (local) |
| `copy(Value)` | Copy to clipboard | No (local) |

---

## 5. Brain Gateway

The Brain has a **gateway** that handles all incoming messages:

```
┌─────────────────────────────────────────────────────────────────┐
│                      BRAIN GATEWAY                               │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    INPUT CLASSIFIER                      │   │
│   │                                                          │   │
│   │  MESSAGE("pay my invoice")                              │   │
│   │  → Intent: pay_invoice                                  │   │
│   │  → Params: {} (needs clarification)                     │   │
│   │                                                          │   │
│   │  MESSAGE("click the pay button")                        │   │
│   │  → UI Request: trigger(pay_button)                      │   │
│   │                                                          │   │
│   │  INTENTION(pay_invoice, {invoice_id: "INV-123"})       │   │
│   │  → Direct to logic engine                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    LOGIC ENGINE                          │   │
│   │                                                          │   │
│   │  Evaluates rules, produces DECISION                     │   │
│   │  with facts + view instructions                         │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

The gateway is where NLU/LLM processing happens — **on the server**, not the client.

---

## 6. Examples

### Example 1: User clicks "Pay" button

```
Button metadata: action(intent(pay_invoice, [invoice_id("INV-123")]))

Avatar:
  Reads metadata
  → Sends INTENTION(pay_invoice, {invoice_id: "INV-123"})

Brain:
  Gateway: Structured INTENTION, route to logic
  Logic: Process payment
  
  → Returns DECISION(accepted, [
      invoice("INV-123", 99.50, paid)
    ], [
      message(success, "Invoice paid!"),
      navigate(invoices)
    ])

Avatar:
  Processes view instructions deterministically
  Shows success message
  Navigates to invoices
```

### Example 2: User types "pay invoice 123"

```
Avatar:
  → Sends MESSAGE("pay invoice 123")

Brain:
  Gateway: NLU classifies
    Intent: pay_invoice
    Params: {invoice_id: "INV-123"}
  Logic: Process payment
  
  → Returns same DECISION as Example 1

Avatar:
  Same deterministic processing
```

### Example 3: User types "click the pay button"

```
Avatar:
  → Sends MESSAGE("click the pay button")

Brain:
  Gateway: Recognizes UI request
  Resolves: "pay button" → component with certain action
  
  → Returns DECISION(accepted, [], [
      trigger(pay_button)
    ])

Avatar:
  Finds component "pay_button"
  Triggers its action
  → Which sends INTENTION (Example 1 flow)
```

### Example 4: User scrolls the list

```
Avatar:
  User scrolls → Pure UI action
  Updates viewport locally
  
  No Brain communication
```

---

## 7. Summary

| Input | Avatar Action | Brain Call? |
|-------|---------------|-------------|
| Text chat | Send MESSAGE | Yes |
| Button click (with intent) | Send INTENTION | Yes |
| Button click (navigate) | Navigate locally | No |
| Scroll, expand, focus | Handle locally | No |
| Voice command | Convert to text, send MESSAGE | Yes |

**Key Principle:** The Avatar is a thin client. All interpretation happens in the Brain's gateway. The Avatar just sends input and processes view instructions deterministically.
