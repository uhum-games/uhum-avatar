# AI Agent Guidelines

When working on this codebase, always refer to the following specifications:

## Specifications

- **[../uhum-brain/specs/ARCHITECTURE.md](../uhum-brain/specs/ARCHITECTURE.md)** — System architecture, Agent vs Brain distinction, decision flow
- **[../uhum-brain/specs/PROTOCOL.md](../uhum-brain/specs/PROTOCOL.md)** — UHUM protocol, message types, term syntax
- **[./specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md)** — Uhum View rendering, layered architecture, user preferences
- **[./specs/VIEW-INSTRUCTIONS.md](./specs/VIEW-INSTRUCTIONS.md)** — View instructions from Brain, variable binding, platform mapping
- **[./specs/SMART-ROUTING.md](./specs/SMART-ROUTING.md)** — Input handling, text vs UI interactions, Brain gateway

---

## What is the Avatar?

The Avatar is the **client-side runtime** that connects to Brains. It has **two fundamental aspects**:

### 1. Generic Client (Platform-Agnostic Core)

The Avatar is a **universal client** for the UHUM network:

- **Reads Agent Dossiers** — understands what any agent can do (intents, parameters, effects)
- **Queries the Network** — discovers agents via `uhum://uhum.discovery`
- **Multi-Agent Connections** — can connect to multiple agents simultaneously (future)
- **Protocol Compliance** — speaks UHUM protocol fluently (Terms, Frames, LiveLink)
- **Memory Sync** — cursor-based synchronization with at-least-once delivery
- **Offline Support** — queues intentions when disconnected, syncs when reconnected

This core logic is **the same regardless of platform**.

### 2. Platform Implementation (Platform-Specific Shell)

The Avatar runs on **specific platforms**, each with its own:

| Platform | Technology | Transport | Storage | UI |
|----------|------------|-----------|---------|-----|
| **Browser** | TypeScript/WASM | WebSocket API | IndexedDB/localStorage | React/Vue/Svelte |
| **iOS** | Swift + Rust FFI | URLSessionWebSocket | CoreData/SQLite | SwiftUI |
| **Android** | Kotlin + Rust FFI | OkHttp WebSocket | Room/SQLite | Jetpack Compose |
| **macOS** | Swift + Rust FFI | URLSessionWebSocket | CoreData/SQLite | SwiftUI |
| **Windows** | Rust native | tokio-tungstenite | SQLite | egui/Tauri |
| **Linux** | Rust native | tokio-tungstenite | SQLite | egui/Tauri |
| **IoT/TV** | Platform-specific | Platform WebSocket | Embedded storage | Platform UI |

### The Core + Shell Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLATFORM SHELL                               │
│                                                                  │
│   UI Components    Platform APIs    Native Storage    Transport  │
│   (SwiftUI,        (Notifications,  (SQLite,          (Native    │
│    React, etc.)    Keychain, etc.)  IndexedDB)        WebSocket) │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     AVATAR CORE (Rust)                           │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │  Protocol   │  │   Session   │  │     Agent Dossier       │ │
│   │  (Terms,    │  │  (Cursors,  │  │   (Capabilities,        │ │
│   │   Frames)   │  │   Dedup)    │  │    Intent Discovery)    │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │  Intention  │  │   Memory    │  │      Network            │ │
│   │   Queue     │  │   Cache     │  │   (Discovery, Routing)  │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**The Avatar does NOT own truth** — it synchronizes with the Brain.

---

## Uhum View

The Avatar renders a **unified, AI-native interface** called **Uhum View** — not traditional websites or apps.

> **Full specification:** See [specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md)

### Core Principle: Brain Returns Data + View Instructions

The Brain returns **semantic data** plus **optional view instructions**:

```prolog
% Brain returns semantic data + generic view instructions
decision(accepted, [
  % Data (semantic facts)
  invoice("INV-123", 99.50, paid),
  payment("PAY-456", "INV-123", now)
], [
  % View instructions (generic, not platform-specific)
  message(success, "Invoice paid!"),
  navigate(invoices)
]).
```

View instructions are **generic** (e.g., `message`, not `toast`). Avatar maps them to platform and applies user preferences.

> **Full specification:** See [specs/VIEW-INSTRUCTIONS.md](./specs/VIEW-INSTRUCTIONS.md)

### The Layered Architecture

Rendering decisions come from three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: USER PREFERENCES (Avatar-local, highest priority)      │
│  - Layout: carousel vs grid vs list                              │
│  - Accessibility: high contrast, large text, reduce motion       │
│  - Interaction style: conversational vs visual vs hybrid         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: PRESENTATION HINTS (Part of Agent Dossier, optional)   │
│  - Brand: logo, colors, tone                                     │
│  - Home: welcome message, featured sections                      │
│  - Layout hints: suggestions for specific data types             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: BRAIN DATA (Pure semantic, lowest priority for UI)     │
│  - Facts, decisions, events                                      │
│  - Avatar interprets semantically and decides rendering          │
└─────────────────────────────────────────────────────────────────┘
```

**Priority:** User > Builder > Avatar Defaults

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Brain is semantic-only** | Never sends UI components, layouts, or styling |
| **Dossier has hints** | Optional presentation hints fetched once (not per message) |
| **User is sovereign** | User preferences always override builder hints |
| **Avatar is smart** | Makes rendering decisions, learns from user behavior |

### What Uhum View Is NOT

| Traditional Apps | Uhum View |
|------------------|---------|
| Websites with HTML/CSS/JS | Uhum components rendered natively |
| Platform-specific app designs | Consistent AI-native experience |
| Agent authors write frontend code | Agent authors define hints (optional) |
| Different UX per platform | Same UX, platform-native rendering |

### The Uhum View Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                          UHUM VIEW                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🤖 Acme Billing                              [Settings]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Here are your pending invoices:                            ││
│  │                                                             ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    ││
│  │  │ INV-123  │ │ INV-124  │ │ INV-125  │  ← Avatar chose    ││
│  │  │ $99.50   │ │ $150.00  │ │ $75.00   │    carousel based  ││
│  │  │ Due: 3d  │ │ Due: 7d  │ │ Overdue  │    on user prefs   ││
│  │  │  [Pay]   │ │  [Pay]   │ │  [Pay]   │                    ││
│  │  └──────────┘ └──────────┘ └──────────┘                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  💬 Type a message...                             [Send] ↗  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

The user experience is **"talking to an AI that shows you things"** — conversational + visual.

### Uhum View Component Library

A **fixed set of components** that the Avatar can use:

| Component | Description | Example Use |
|-----------|-------------|-------------|
| `message` | Chat bubble (AI or user) | Responses, questions |
| `card` | Single content card | Invoice, product, profile |
| `carousel` | Horizontal scrollable list | Browse items, Netflix-style |
| `list` | Vertical scrollable list | History, feeds, search results |
| `grid` | Grid of cards | Products, gallery, options |
| `form` | Input fields + submit | Collect intention parameters |
| `action_bar` | Row of action buttons | Quick actions, confirmations |
| `table` | Tabular data | Spreadsheets, reports |
| `chart` | Data visualization | Analytics, trends |
| `media` | Image, video, audio | Rich content |
| `map` | Geographic location | Addresses, routes |
| `status` | Status indicator | Progress, states |

**Avatar chooses components** based on: data shape + user prefs + builder hints.

### Presentation Hints in Agent Dossier

Builders can include **optional** presentation hints in the Agent Dossier:

```prolog
agent(
  id('acme.billing'),
  
  % ... intents, endpoints, etc. (semantic) ...
  
  % Presentation hints (OPTIONAL - Avatar works without these)
  presentation([
    brand([
      name("Acme Billing"),
      logo("https://acme.com/logo.png"),
      primary_color("#FF5733")
    ]),
    home([
      section(welcome, [message("Welcome! How can I help?")]),
      section(featured, [data_source(invoices, [status(pending)])])
    ]),
    layout_hints([
      hint(invoices, carousel),      % Suggestion, not requirement
      hint(payment_history, list)
    ])
  ])
).
```

**These are hints, not commands.** Avatar can override based on user preferences.

### How Avatar Renders

```
1. Brain sends MEMORY with facts (semantic only)
   └── invoice("INV-123", 99.50, pending)

2. Avatar checks user preferences
   └── User prefers: grid layout, comfortable density

3. Avatar checks builder hints (from Dossier)
   └── Builder suggests: carousel

4. Avatar makes decision (user wins)
   └── Show as grid (user preference overrides)

5. Platform shell renders native component
   └── Browser: React <Grid />
   └── iOS: SwiftUI GridView
   └── Android: Compose LazyVerticalGrid
```

### The Smart Avatar Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      SMART AVATAR LAYER                          │
│                                                                  │
│  • User preferences — stored locally, learned over time          │
│  • Reactive state — functional, event-driven architecture        │
│  • Scheduled effects — time-based actions (hide message, etc.)  │
│  • Multi-agent — unified experience across connected agents      │
│  • Offline handling — queues actions, syncs when connected       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACTIVE STATE MANAGEMENT                     │
│                                                                  │
│  View Instructions → Actions → Reducer → State → UI Reacts      │
│                                   ↓                              │
│                               Effects → Scheduled Future Actions │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PLATFORM-NATIVE RENDERING                      │
│                                                                  │
│  React / SwiftUI / Compose / egui — same components, native feel │
└─────────────────────────────────────────────────────────────────┘
```

### Reactive Architecture

The Avatar uses a **reactive, event-driven** architecture:

| Concept | Description |
|---------|-------------|
| **State** | Single source of truth for all UI state |
| **Action** | State change from view instruction (like Redux) |
| **Reducer** | Pure function: `(state, action) → (new_state, effects)` |
| **Effect** | Side effect: timers, platform APIs, scheduled actions |
| **Subscription** | UI components subscribe to state, re-render on change |

**Why reactive?** View instructions are NOT executed imperatively. A `message(success, "Paid!", duration(3000))` becomes:
1. `Action::ShowMessage` → state.message = Some(...)
2. `Effect::Schedule` → dispatch `HideMessage` after 3000ms

This makes the Avatar **testable**, **predictable**, and **platform-agnostic**.

---

## Input Handling

The Avatar is a **thin client** — all interpretation happens in the Brain's gateway.

> **Full specification:** See [specs/SMART-ROUTING.md](./specs/SMART-ROUTING.md)

### Simple Rule: Text Goes to Brain

| Input Type | Where It Goes | Why |
|------------|---------------|-----|
| **Text/Chat** | Always to Brain | Brain has gateway for NLU |
| **UI Interaction** | Deterministic | Action encoded in component |
| **Pure UI** | Local only | Scroll, expand, etc. |

### Input Flow

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
                │ MESSAGE              INTENTION (if action)
                │                      or LOCAL (if pure UI)
                │                             │
                └──────────────┬──────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │    BRAIN    │
                        │   Gateway   │
                        └─────────────┘
```

### Component Action Metadata

Interactive components have their action encoded in UHUM Language:

```prolog
% Button triggers an intent
component(button, [
  label("Pay Invoice"),
  action(intent(pay_invoice, [invoice_id("INV-123")]))
]).

% Link navigates locally
component(link, [
  label("View Details"),
  action(navigate(invoice_detail("INV-123")))
]).
```

Avatar reads metadata → sends INTENTION (or handles locally).

### Brain Gateway

The Brain has a **gateway** that handles all interpretation:

- **NLU/Intent classification** — "pay my invoice" → `intent(pay_invoice)`
- **UI request recognition** — "click the pay button" → `trigger(pay_button)`
- **Entity extraction** — "invoice 123" → `{invoice_id: "INV-123"}`

**No local LLM needed.** All intelligence is in the Brain.

---

## Key Terminology

| Term | Description |
|------|-------------|
| **Agent** | External identity — what users connect to (`uhum://acme.billing`) |
| **Brain** | Server-side runtime — logic engine + memory + gateway for NLU |
| **Brain Gateway** | Entry point that handles NLU, intent classification, UI requests |
| **Avatar** | Client runtime — this project! Connects to Brains, renders Uhum View |
| **Avatar Core** | Platform-agnostic logic (Rust) — protocol, session, state |
| **Avatar Shell** | Platform-specific code — UI, storage, transport adapters |
| **Uhum View** | Unified component-based interface rendered by Avatar across all platforms |
| **View Instructions** | Generic presentation guidance from Brain (message, navigate, etc.) |
| **Agent Dossier** | Agent's self-description — intents, parameters, effects, + presentation hints |
| **Presentation Hints** | Optional builder preferences in Dossier (brand, home, layout suggestions) |
| **User Preferences** | Avatar-local settings (layout, accessibility, shortcuts) — highest priority |
| **LiveLink** | Persistent streaming protocol between Brain and Avatar |
| **Term** | Prolog-style data structure (atoms, variables, compounds, lists) |
| **Intention** | Request from Avatar to do something |
| **Decision** | Brain's response — facts (data) + view instructions (presentation) |
| **Cursor** | Position in the event stream for resumption |

## Protocol Messages (Avatar ↔ Brain)

### Avatar → Brain
- `JOIN` — connect to agent with capabilities and optional resume token
- `INTENTION` — request an action
- `ACK` — acknowledge received events
- `PING` — keep-alive
- `LEAVE` — graceful disconnect
- `BACKPRESSURE` — flow control

### Brain → Avatar
- `WELCOME` — connection accepted, includes agent capabilities
- `MEMORY` — event batch with cursor range
- `DECISION` — intention result (accepted/rejected/pending/completed)
- `SNAPSHOT` — compressed state checkpoint
- `PRESENCE` — who's connected
- `PONG` — keep-alive response
- `ERROR` — something went wrong

## Architecture Overview

### Core Layers (Rust — shared across all platforms)

```
┌─────────────────────────────────────────────────────────────┐
│                    AVATAR CORE (Rust)                        │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │                 PROTOCOL LAYER                      │    │
│   │                                                     │    │
│   │   • Term parsing & serialization                    │    │
│   │   • Frame encoding/decoding                         │    │
│   │   • Message type handling                           │    │
│   │   • Shared with uhum-brain (ub-protocol crate)      │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │                 SESSION LAYER                       │    │
│   │                                                     │    │
│   │   • Brain session state machine                     │    │
│   │   • Cursor tracking per agent                       │    │
│   │   • Event deduplication                             │    │
│   │   • Intention queue (offline support)               │    │
│   │   • Resume token management                         │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │                 AGENT LAYER                         │    │
│   │                                                     │    │
│   │   • Agent Dossier parsing                           │    │
│   │   • Intent discovery & validation                   │    │
│   │   • Multi-agent connection orchestration            │    │
│   │   • Network discovery (uhum://uhum.discovery)       │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │                 STATE LAYER                         │    │
│   │                                                     │    │
│   │   • Local memory cache (from MEMORY messages)       │    │
│   │   • Derived views/projections                       │    │
│   │   • Reactive subscriptions (callback-based)         │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│   ════════════════════════════════════════════════════════  │
│                    PLATFORM BOUNDARY                         │
│   ════════════════════════════════════════════════════════  │
│                            │                                 │
│   Traits (interfaces) that platforms must implement:         │
│   • Transport — WebSocket send/receive                       │
│   • Storage — persist cursors, tokens, cache                 │
│   • Clock — current time (for timeouts)                      │
│   • Random — ID generation                                   │
└─────────────────────────────────────────────────────────────┘
```

### Shell Layer (Platform-Specific)

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM SHELL                            │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │              TRANSPORT ADAPTER                      │    │
│   │                                                     │    │
│   │   Browser: WebSocket API                            │    │
│   │   iOS/macOS: URLSessionWebSocketTask                │    │
│   │   Android: OkHttp WebSocket                         │    │
│   │   Desktop: tokio-tungstenite                        │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │               STORAGE ADAPTER                       │    │
│   │                                                     │    │
│   │   Browser: IndexedDB / localStorage                 │    │
│   │   iOS/macOS: CoreData / Keychain                    │    │
│   │   Android: Room / EncryptedSharedPreferences        │    │
│   │   Desktop: SQLite / OS keychain                     │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │                 UI LAYER                            │    │
│   │                                                     │    │
│   │   Browser: React / Vue / Svelte                     │    │
│   │   iOS/macOS: SwiftUI                                │    │
│   │   Android: Jetpack Compose                          │    │
│   │   Desktop: Tauri + web / egui                       │    │
│   └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Code Conventions

### Core (Rust)
1. **Rust for core logic** — same crates as uhum-brain where applicable
2. **No I/O in core** — all I/O via traits (Transport, Storage, Clock)
3. **No allocator assumptions** — support no_std for embedded (future)
4. **Term syntax follows Prolog** — atoms are lowercase, variables are Uppercase
5. **Events are immutable** — Avatar receives, never modifies

### Shell (Platform-Specific)
1. **Idiomatic for the platform** — Swift for iOS, Kotlin for Android, etc.
2. **Thin FFI layer** — call into Rust core, handle callbacks
3. **Native UI** — SwiftUI, Compose, React — no cross-platform UI frameworks
4. **Offline-capable** — queue intentions, sync when connected
5. **Reactive** — state changes trigger UI updates

## Code Sharing Strategy

### Shared with uhum-brain

```
ub-core       — Identity, Timestamp, Duration, Money, Cursor, Event
ub-protocol   — Term, Frame, Message parsing/serialization
```

These crates are **compiled directly into the Avatar core**. One source of truth.

### Avatar-Specific Crates

```
ua-core       — Avatar core logic (session, agent dossiers, state, queue)
ua-browser    — Browser shell (WASM + TypeScript bindings)
ua-ios        — iOS shell (Swift bindings via UniFFI)
ua-android    — Android shell (Kotlin bindings via UniFFI)
ua-desktop    — Desktop shell (Tauri or native egui)
```

### Platform Integration

| Platform | Core Integration | UI Integration |
|----------|------------------|----------------|
| **Browser** | Rust → WASM → JS/TS bindings | TypeScript + React/Vue |
| **iOS** | Rust → XCFramework via UniFFI | Swift + SwiftUI |
| **Android** | Rust → AAR via UniFFI | Kotlin + Compose |
| **Desktop** | Rust native | Tauri (web) or egui (native) |

## Decision Flow (from Avatar perspective)

```
Avatar                           Brain
  │                                │
  │  JOIN (capabilities, resume?)  │
  │ ─────────────────────────────▶ │
  │                                │
  │  WELCOME (agent info, cursor)  │
  │ ◀───────────────────────────── │
  │                                │
  │  MEMORY (events since cursor)  │
  │ ◀───────────────────────────── │
  │                                │
  │  ACK (cursor)                  │
  │ ─────────────────────────────▶ │
  │                                │
  │        ... ready ...           │
  │                                │
  │  INTENTION(pay_invoice, ...)   │
  │ ─────────────────────────────▶ │
  │                                │
  │  DECISION (accepted/rejected)  │
  │ ◀───────────────────────────── │
  │                                │
  │  MEMORY (new events)           │
  │ ◀───────────────────────────── │
```
