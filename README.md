# Uhum Avatar

The **Avatar** is the client-side runtime for the Uhum network. It connects to Brains, syncs memory, sends intentions, and renders the **Uhum View**.

## What is the Avatar?

The Avatar has two fundamental aspects:

### 1. Generic Client (Platform-Agnostic Core)

A universal client for the Uhum network:

- **Reads Agent Dossiers** — understands what any agent can do
- **Queries the Network** — discovers agents via `uhum://uhum.discovery`
- **Multi-Agent Connections** — can connect to multiple agents simultaneously
- **Protocol Compliance** — speaks Uhum protocol fluently
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
├── Justfile                # Build commands
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
│       ├── lib/            # Avatar library (internal)
│       │   └── src/        # Client, hooks, components, protocol
│       ├── app/            # Deployable Avatar app
│       │   └── src/        # Main app with directory resolution
│       └── README.md       # Browser platform docs
│
└── specs/                  # Specifications
    ├── BROWSER-DEPLOYMENT.md  # Browser deployment architecture
    ├── UHUM-VIEW.md           # Rendering architecture
    ├── VIEW-INSTRUCTIONS.md   # Reactive state management
    ├── SMART-ROUTING.md       # Input handling
    └── PLATFORMS.md           # Platform architecture
```

## Browser Platform Architecture

Each agent gets their own Avatar bundle with the **agent ID baked in at build time**. The Brain WebSocket URL is resolved at runtime from the **Directory Service**.

```
BUILD TIME (per agent):
  VITE_AGENT_ID=acme.billing pnpm build
  → Bundle contains AGENT_ID="acme.billing"
  → Bundle does NOT contain Brain URL

RUNTIME:
  User visits acme.com
  → CDN serves Acme's bundle
  → Bundle calls: GET /resolve?agentId=acme.billing
  → Directory returns: { wsUrl: "wss://brain.acme.com" }
  → Bundle connects to Brain
```

See [specs/BROWSER-DEPLOYMENT.md](./specs/BROWSER-DEPLOYMENT.md) for full documentation.

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
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/) (for browser TypeScript)
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

### Browser Platform

```bash
cd platforms/browser

# Install dependencies
pnpm install

# Development (mock mode - no agent ID needed)
pnpm dev:mock

# Development with specific agent
VITE_AGENT_ID=acme.billing pnpm dev

# Production build (requires agent ID)
VITE_AGENT_ID=acme.billing pnpm build
```

### Local Development with Brain

Run Avatar connected to a local Brain:

```bash
# Terminal 1: Start Brain (from uhum-brain)
cd ../uhum-brain
cargo run  # or: just dev

# Terminal 2: Start Avatar (from uhum-avatar root)
just dev browser

# Or with a specific agent ID (use quotes for IDs with dots)
just dev browser "quickstart.billing"
```

Open http://localhost:3000 — the Avatar will connect to your local Brain at `ws://localhost:8080`.

For mock mode (no Brain needed):
```bash
just mock browser
```

See [platforms/browser/README.md](./platforms/browser/README.md) for detailed instructions.

### Manual Commands

```bash
# Build all Rust crates
cargo build

# Run tests
cargo test

# Build WASM for browser
cd crates/ua-wasm
wasm-pack build --target web --out-dir ../../platforms/browser/lib/wasm

# Build browser app
cd platforms/browser
pnpm install
VITE_AGENT_ID=my.agent pnpm build
```

### Available Just Commands

**Platform Commands** (pattern: `just <action> <platform> [args]`):

| Command | Description |
|---------|-------------|
| `just dev browser` | Dev server with local Brain (ws://localhost:8080) |
| `just dev browser "my.agent"` | Dev server with specific agent ID |
| `just mock browser` | Mock mode (no Brain needed) |
| `just build browser "acme.billing"` | Build browser for production |
| `just install browser` | Install browser dependencies |
| `just test browser` | Run browser tests |

**Rust Commands**:

| Command | Description |
|---------|-------------|
| `just build-rust` | Build all Rust crates |
| `just test` | Run all Rust tests |
| `just build-wasm` | Build WASM for browser |

**Workflows**:

| Command | Description |
|---------|-------------|
| `just setup` | Setup everything for development |
| `just all AGENT_ID` | Full production build |

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
| [specs/BROWSER-DEPLOYMENT.md](./specs/BROWSER-DEPLOYMENT.md) | Browser deployment architecture |
| [specs/UHUM-VIEW.md](./specs/UHUM-VIEW.md) | Rendering architecture |
| [specs/VIEW-INSTRUCTIONS.md](./specs/VIEW-INSTRUCTIONS.md) | Reactive state management |
| [specs/PLATFORMS.md](./specs/PLATFORMS.md) | Platform architecture |

## License

MIT OR Apache-2.0
