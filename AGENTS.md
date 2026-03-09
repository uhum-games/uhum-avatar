# AI Agent Guidelines

When working on this codebase, always refer to the following specifications:

## Specifications

- **[../uhum-brain/specs/ARCHITECTURE.md](../uhum-brain/specs/ARCHITECTURE.md)** — System architecture, Agent vs Brain distinction, decision flow
- **[../uhum-brain/specs/PROTOCOL.md](../uhum-brain/specs/PROTOCOL.md)** — Uhum protocol, message types, term syntax
- **[./specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md)** — Uhum View rendering, layered architecture, user preferences
- **[./specs/VIEW-INSTRUCTIONS.md](./specs/VIEW-INSTRUCTIONS.md)** — View instructions from Brain, variable binding, reactive architecture
- **[./specs/SMART-ROUTING.md](./specs/SMART-ROUTING.md)** — Input handling, text vs UI interactions, Brain gateway
- **[./specs/PLATFORMS.md](./specs/PLATFORMS.md)** — Platform architecture, browser/iOS/Android implementations

---

## What is the Avatar?

The Avatar is the **client-side runtime** that connects to Brains. It has **two fundamental aspects**:

### 1. Generic Client (Platform-Agnostic Core)

The Avatar is a **universal client** for the Uhum network:

- **Reads Agent Cards** — understands what any agent can do (intents, parameters, effects)
- **Queries the Network** — discovers agents via `uhum://uhum.discovery`
- **Multi-Agent Connections** — can connect to multiple agents simultaneously (future)
- **Protocol Compliance** — speaks Uhum protocol fluently (Terms, Frames, LiveLink)
- **Memory Sync** — cursor-based synchronization with at-least-once delivery
- **Offline Support** — queues intentions when disconnected, syncs when reconnected

This core logic is **the same regardless of platform**.

### 2. Platform Implementation (Platform-Specific Shell)

The Avatar runs on **specific platforms**, each with its own:

| Platform | Technology | Transport | Storage | UI |
|----------|------------|-----------|---------|-----|
| **Browser** | TypeScript/WASM | WebSocket API | IndexedDB/localStorage | React/Vue/Svelte |
| **iOS** | Swift + Rust FFI | URLSessionWebSocket | CoreData/SQLite | SwiftUI |
| **Android** | Kotlin + Rust FFI | Room/SQLite | Jetpack Compose |
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
│   │  Protocol   │  │   Session   │  │       Agent Card        │ │
│   │  (Terms,    │  │  (Cursors,  │  │   (Capabilities,        │ │
│   │   Frames)   │  │   Dedup)    │  │    Intent Discovery)    │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │  Intention  │  │   Memory    │  │      Runtime            │ │
│   │   Queue     │  │   Cache     │  │   (State, Effects)      │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**The Avatar does NOT own truth** — it synchronizes with the Brain.

---

## Uhum View

The Avatar renders a **unified, AI-native interface** called **Uhum View**.

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
│  LAYER 2: PRESENTATION HINTS (Part of Agent Card, optional)     │
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
| **Agent Card has hints** | Optional presentation hints fetched once (not per message) |
| **User is sovereign** | User preferences always override builder hints |
| **Avatar is smart** | Makes rendering decisions, learns from user behavior |
| **pnpm is mandatory** | Always use `pnpm` instead of `npm` or `yarn` for JavaScript dependencies. |
