# Input Handling Specification

This document defines how the Avatar handles user input and routes it to the appropriate Brain.

> **Related:**
> - [Brain Gateway Spec](../uhum-brain/specs/GATEWAY.md) — Brain-side processing (orchestrator, Trust Zones)
> - [Network Spec](../uhum-brain/specs/NETWORK.md) — Semantic discovery and Compass routing
> - [Architecture Spec](../uhum-brain/specs/ARCHITECTURE.md) — Agent Card for capability matching

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

### Single Round-Trip Design

When the user sends a chat message, the Avatar does **one round-trip**:

```
Avatar → MESSAGE → Brain (LLM + Execute) → DECISION → Avatar
```

**Not two round-trips:**
```
❌ Avatar → MESSAGE → Brain (LLM) → UL → Avatar → INTENTION → Brain → DECISION
```

The Brain interprets AND executes in one call. This keeps the Avatar thin and reduces latency.

### Future: Multi-Agent Routing via Network

When connected to multiple Brains, the Avatar can use the [Uhum Network](../uhum-brain/specs/NETWORK.md) for semantic routing:
- **Compass** matches user requests to the best agent by capability
- Agent Cards provide intent/domain metadata for routing decisions
- The Avatar does not need a local LLM for routing — the Network provides deterministic selection

---

## 2. Input Types

### 2.1 Text Input (Chat)

All text input is sent to the Brain as a `message` intention:

```
User types: "pay my invoice"

Avatar:
  → Sends INTENTION(message, [text("pay my invoice")])

Brain Gateway:
  1. Receives message intention
  2. Calls LLM with agent context (models, intents, rules)
  3. LLM returns: { response: "...", ul: "intention(...)" }
  4. Brain parses UL clauses
  5. Brain executes each clause through logic engine
  6. Returns DECISION with facts + view instructions + response text

Avatar:
  ← Receives DECISION
  → Shows response in chat
  → Processes view instructions (desires, navigation, etc.)
  → Updates facts store
```

**Example decision from chat:**

```prolog
decision(accepted, [
  facts([
    invoice("INV-123", 99.50, paid)
  ]),
  effects([
    message(success, "Invoice paid!"),
    desire([invoice_detail]),
    navigate(invoices)
  ]),
  response("I've paid your invoice for $99.50. The payment is confirmed.")
]).
```

The `response` field contains the human-readable text for the chat interface.

### 2.2 UI Interaction (Deterministic)

UI components have their action encoded:

```
┌──────────────────────────────────────────────────────────────┐
│  [Pay Invoice]                                                │
│                                                              │
│  Component metadata (in Uhum Language):                       │
│  action(intent(pay_invoice, [invoice_id("INV-123")]))        │
└──────────────────────────────────────────────────────────────┘

User clicks → Avatar reads metadata → Sends INTENTION
```

This is like HTML's `<a href="...">` — the behavior is encoded, not interpreted.

```
Avatar:
  → Sends INTENTION(pay_invoice, [param(invoice_id, "INV-123")])

Brain:
  → Direct to logic engine (no LLM needed)
  → Returns DECISION
```

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
                ▼                     ┌───────▼───────┐
        ┌───────────────┐             │ HAS ACTION    │
        │   INTENTION   │             │ METADATA?     │
        │   (message)   │             └───────┬───────┘
        └───────┬───────┘               yes   │   no
                │                     ┌───────┴───────┐
                │                     │               │
                │                     ▼               ▼
                │             ┌───────────────┐  ┌──────────┐
                │             │   INTENTION   │  │  LOCAL   │
                │             │  (structured) │  │  ONLY    │
                │             └───────┬───────┘  └──────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │    BRAIN GATEWAY    │
                │                     │
                │  message? → LLM     │
                │  structured? → exec │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │     DECISION        │
                │  facts + effects    │
                │  + response (chat)  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │      AVATAR         │
                │                     │
                │  Show response      │
                │  Process effects    │
                │  Update facts       │
                └─────────────────────┘
```

---

## 4. Sending Chat Messages

### TypeScript Implementation

```typescript
// Send a chat message
function sendChatMessage(text: string) {
  avatar.sendIntention('message', { text });
}

// The above translates to:
// intention(message, [text("user's message here")]).
```

### Processing the Response

```typescript
// In the decision handler
function handleDecision(decision: Decision) {
  // 1. Show chat response (if present)
  if (decision.response) {
    addChatMessage({
      role: 'assistant',
      text: decision.response,
    });
  }

  // 2. Process effects (messages, desires, navigation)
  for (const effect of decision.effects) {
    processEffect(effect);
  }

  // 3. Update facts store
  for (const fact of decision.facts) {
    factsStore.upsert(fact);
  }
}
```

---

## 5. Component Action Metadata

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

## 6. Brain Gateway (Overview)

> **Full details:** See [Brain Gateway Spec](../../uhum-brain/specs/GATEWAY.md)

The Brain's gateway handles all incoming messages:

```
┌─────────────────────────────────────────────────────────────────┐
│                      BRAIN GATEWAY                               │
│                                                                  │
│   INTENTION(message, [text(...)])                               │
│   └─► LLM interprets with agent context                         │
│       └─► Returns UL clauses                                    │
│           └─► Brain executes each clause                        │
│               └─► Returns DECISION                              │
│                                                                  │
│   INTENTION(pay_invoice, [...])                                 │
│   └─► Direct to logic engine                                    │
│       └─► Returns DECISION                                      │
└─────────────────────────────────────────────────────────────────┘
```

The gateway uses **LLM** (like GPT-4o-mini) to interpret natural language:

1. **Input:** User message + agent context (models, intents, rules)
2. **Output:** UL clauses to execute + human response text
3. **Execution:** Brain runs the UL clauses through logic engine
4. **Result:** DECISION with facts, effects, and chat response

---

## 7. Examples

### Example 1: User clicks "Pay" button

```
Button metadata: action(intent(pay_invoice, [invoice_id("INV-123")]))

Avatar:
  Reads metadata
  → Sends INTENTION(pay_invoice, [param(invoice_id, "INV-123")])

Brain:
  Gateway: Structured INTENTION, route to logic
  Logic: Process payment
  
  → Returns DECISION(accepted, [
      facts([invoice("INV-123", 99.50, paid)]),
      effects([
        message(success, "Invoice paid!"),
        navigate(invoices)
      ])
    ])

Avatar:
  Processes view instructions deterministically
  Shows success message
  Navigates to invoices
```

### Example 2: User types "pay invoice 123"

```
Avatar:
  → Sends INTENTION(message, [text("pay invoice 123")])

Brain:
  Gateway: Message intention, needs LLM
  LLM: "pay invoice 123" → intention(pay_invoice, [param(invoice_id, "INV-123")])
  Logic: Process payment
  
  → Returns DECISION(accepted, [
      facts([invoice("INV-123", 99.50, paid)]),
      effects([
        message(success, "Invoice paid!"),
        desire([invoice_detail]),
        navigate(invoices)
      ]),
      response("I've paid invoice 123 for you. The payment is confirmed.")
    ])

Avatar:
  Shows "I've paid invoice 123..." in chat
  Processes view instructions
  Updates facts store
```

### Example 3: User types "show me my books"

```
Avatar:
  → Sends INTENTION(message, [text("show me my books")])

Brain:
  Gateway: Message intention, needs LLM
  LLM: Interprets as list query + desire
    → intention(list_books, []).
    → desire([book_list]).
  Logic: Executes list_books intent
  
  → Returns DECISION(accepted, [
      facts([
        book("1", "1984", "George Orwell"),
        book("2", "Foundation", "Isaac Asimov"),
        book("3", "Dune", "Frank Herbert")
      ]),
      effects([
        desire([book_list])
      ]),
      response("Here are your books.")
    ])

Avatar:
  Shows "Here are your books." in chat
  Updates facts store with books
  Shows book_list component (because it's desired)
```

### Example 4: User scrolls the list

```
Avatar:
  User scrolls → Pure UI action
  Updates viewport locally
  
  No Brain communication
```

---

## 8. Summary

| Input | Avatar Action | Brain Processing |
|-------|---------------|------------------|
| Text chat | Send `intention(message, [text(...)])` | LLM → Parse UL → Execute |
| Button click (intent) | Send `intention(name, params)` | Direct execute |
| Button click (navigate) | Navigate locally | None |
| Scroll, expand, focus | Handle locally | None |
| Voice command | Convert to text, send as message | LLM → Parse UL → Execute |

**Key Principle:** The Avatar is a thin client. All interpretation happens in the Brain's gateway. The Avatar just sends input and processes view instructions deterministically.
