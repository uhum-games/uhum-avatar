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
├── Justfile                # Build commands (like npm scripts)
├── AGENTS.md               # AI agent guidelines
│
├── crates/                 # Rust crates
│   ├── ua-core/            # Shared types & platform boundary traits
│   ├── ua-agent/           # Agent communication (session, dossier, queue)
│   ├── ua-view/            # Uhum View layer (routing, reactive state, runtime)
│   └── ua-wasm/            # Browser WASM bindings
│
├── platforms/              # Platform-specific implementations
│   └── browser/            # TypeScript + React
│       ├── src/            # @uhum/avatar package
│       └── examples/
│           └── demo/       # Demo invoice app
│
└── specs/                  # Specifications
    ├── UHUM-VIEW.md        # Rendering architecture
    ├── VIEW-INSTRUCTIONS.md # Reactive state management
    ├── SMART-ROUTING.md    # Input handling
    └── PLATFORMS.md        # Platform architecture
```

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AVATAR CORE (Rust)                          │
│                                                                  │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│   │  ua-core   │  │  ua-agent  │  │  ua-view   │  │  ua-wasm  │ │
│   │  (types,   │  │  (session, │  │  (routing, │  │  (browser │ │
│   │   traits)  │  │   dossier) │  │   runtime) │  │   bindings)│ │
│   └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
│   ════════════════════ PLATFORM BOUNDARY ══════════════════════ │
│                                                                  │
│   Traits: Transport, Storage, Clock, Random, Scheduler, Executor │
└─────────────────────────────────────────────────────────────────┘
```

## Shared Crates

The Avatar shares crates with [uhum-brain](../uhum-brain):

| Crate | Purpose |
|-------|---------|
| `ub-core` | Identity, Timestamp, Duration, Money, Cursor, Event |
| `ub-protocol` | Term, Frame, Message parsing/serialization |

These are compiled directly into Avatar — one source of truth.

## Building

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) (for browser WASM)
- [Node.js](https://nodejs.org/) (for browser TypeScript)
- [just](https://github.com/casey/just) (optional, for build commands)

### Quick Start

```bash
# Install just (optional but recommended)
cargo install just

# See all available commands
just

# Build everything
just build

# Run tests
just test
```

### Manual Commands

```bash
# Build all Rust crates
cargo build

# Run tests
cargo test

# Build WASM for browser
cd crates/ua-wasm
wasm-pack build --target web --out-dir ../../platforms/browser/wasm

# Build TypeScript package
cd platforms/browser
npm install
npm run build
```

### Available Just Commands

| Command | Description |
|---------|-------------|
| `just build` | Build all Rust crates |
| `just test` | Run all tests |
| `just build-wasm` | Build WASM for browser |
| `just browser-build` | Build TypeScript package |
| `just demo-dev` | Run demo app (localhost:3000) |
| `just demo-server` | Run mock Brain server |
| `just setup` | Install all dependencies |
| `just all` | Full production build |

## Demo App

A demo invoice application showcasing the Avatar:

```bash
# Terminal 1: Start mock Brain server
just demo-server

# Terminal 2: Start dev server
just demo-dev
```

Open http://localhost:3000

![Demo Screenshot](docs/demo-screenshot.png)

Features:
- 📋 Invoice management
- 💳 Payment processing
- 💬 Chat interface
- ✨ Reactive UI updates

## Uhum View

The Avatar renders **Uhum View** — a unified, AI-native interface:

- **Not traditional apps** — same experience across all platforms
- **Component-based** — fixed set of components (cards, carousels, lists, forms)
- **Reactive** — state changes trigger UI updates via Redux-like architecture
- **Platform-native rendering** — React on web, SwiftUI on iOS, etc.

See [specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md) for full documentation.

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | AI agent guidelines |
| [specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md) | Rendering architecture |
| [specs/VIEW-INSTRUCTIONS.md](./specs/VIEW-INSTRUCTIONS.md) | Reactive state management |
| [specs/PLATFORMS.md](./specs/PLATFORMS.md) | Platform architecture |

## License

MIT OR Apache-2.0
