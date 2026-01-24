# UHUM Avatar

The **Avatar** is the client-side runtime for the UHUM network. It connects to Brains, syncs memory, sends intentions, and renders the **Uhum View**.

## What is the Avatar?

The Avatar has two fundamental aspects:

### 1. Generic Client (Platform-Agnostic Core)

A universal client for the UHUM network:

- **Reads Agent Dossiers** — understands what any agent can do
- **Queries the Network** — discovers agents via `uhum://uhum.discovery`
- **Multi-Agent Connections** — can connect to multiple agents simultaneously
- **Protocol Compliance** — speaks UHUM protocol fluently
- **Memory Sync** — cursor-based synchronization with at-least-once delivery
- **Offline Support** — queues intentions when disconnected

### 2. Platform Implementation (Platform-Specific Shell)

The Avatar runs on specific platforms:

| Platform | Technology | Status |
|----------|------------|--------|
| **Browser** | TypeScript/WASM + React | 🚧 In progress |
| **iOS** | Swift + SwiftUI | 📋 Planned |
| **Android** | Kotlin + Compose | 📋 Planned |
| **Desktop** | Tauri | 📋 Planned |

## Project Structure

```
uhum-avatar/
├── Cargo.toml              # Rust workspace
├── AGENTS.md               # AI agent guidelines
├── README.md               # This file
│
├── crates/
│   └── ua-core/            # Platform-agnostic core (Rust)
│       ├── src/
│       │   ├── lib.rs      # Main entry
│       │   ├── traits.rs   # Platform boundary traits
│       │   ├── session.rs  # Brain session management
│       │   ├── dossier.rs  # Agent Dossier parsing
│       │   ├── state.rs    # Local memory cache
│       │   ├── queue.rs    # Intention queue (offline)
│       │   └── error.rs    # Error types
│       └── Cargo.toml
│
└── platforms/              # Platform-specific shells (planned)
    ├── browser/            # WASM + TypeScript + React
    ├── ios/                # Swift + SwiftUI
    ├── android/            # Kotlin + Compose
    └── desktop/            # Tauri
```

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AVATAR CORE (Rust)                        │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│   │  Protocol   │  │   Session   │  │   Agent Dossier     │ │
│   │  (Terms,    │  │  (Cursors,  │  │   (Capabilities,    │ │
│   │   Frames)   │  │   Dedup)    │  │    Intents, Views)  │ │
│   └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│   │  Intention  │  │   Memory    │  │      State          │ │
│   │   Queue     │  │   Cache     │  │   (Local cache)     │ │
│   └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│   ════════════════════ PLATFORM BOUNDARY ═════════════════  │
│                                                              │
│   Traits: Transport, Storage, Clock, Random                  │
└─────────────────────────────────────────────────────────────┘
```

## Platform Boundary Traits

The core defines traits that platforms must implement:

```rust
// WebSocket communication
trait Transport {
    async fn connect(&mut self, url: &str) -> Result<()>;
    async fn send(&mut self, message: &str) -> Result<()>;
    async fn receive(&mut self) -> Result<Option<String>>;
    async fn close(&mut self) -> Result<()>;
}

// Persistent storage
trait Storage {
    async fn get(&self, key: &str) -> Result<Option<Bytes>>;
    async fn set(&self, key: &str, value: &[u8]) -> Result<()>;
    async fn delete(&self, key: &str) -> Result<()>;
}

// Time (for determinism)
trait Clock {
    fn now(&self) -> Timestamp;
}

// Random (for determinism)
trait Random {
    fn uuid_v4(&self) -> String;
}
```

## Shared Crates

The Avatar shares crates with `uhum-brain`:

```
ub-core      — Identity, Timestamp, Duration, Money, Cursor, Event
ub-protocol  — Term, Frame, Message parsing/serialization
```

## Building

```bash
# Build the core
cargo build

# Run tests
cargo test

# Build for WASM (browser)
cd crates/ua-core
cargo build --target wasm32-unknown-unknown --features wasm
```

## Uhum View

The Avatar renders **Uhum View** — a unified, AI-native interface:

- **Not traditional apps** — same experience across all platforms
- **Component-based** — fixed set of components (cards, carousels, lists, forms)
- **Agent-defined** — agents define views/templates in their dossier
- **Platform-native rendering** — React on web, SwiftUI on iOS, etc.

See [AGENTS.md](./AGENTS.md) for full Uhum View documentation.

## License

MIT OR Apache-2.0
