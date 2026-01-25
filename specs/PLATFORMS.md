# Platform Architecture Specification

This document defines how the Avatar is implemented across different platforms.

---

## 1. Architecture Overview

The Avatar follows a **Core + Shell** architecture:

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
│   │  Intention  │  │   Memory    │  │      Runtime            │ │
│   │   Queue     │  │   Cache     │  │   (State, Effects)      │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core (Rust)

Platform-agnostic logic shared across all platforms:

| Crate | Purpose |
|-------|---------|
| `ua-core` | Shared types, error handling, platform boundary traits |
| `ua-agent` | Agent communication (session, dossier, queue, cache) |
| `ua-view` | Uhum View layer (routing, reactive state, runtime) |

### Shell (Platform-Specific)

Platform implementations that provide:

| Component | Responsibility |
|-----------|----------------|
| **Transport** | WebSocket connectivity |
| **Storage** | Persistent storage for cursors, tokens, cache |
| **Scheduler** | Timer scheduling for effects |
| **EffectExecutor** | Platform-specific effects (clipboard, haptics) |
| **UI Components** | Native Uhum View component rendering |

---

## 2. Platform Boundary Traits

Platforms implement these Rust traits to connect to the core:

```rust
/// WebSocket transport
trait Transport: Send + Sync {
    async fn connect(&self, url: &str) -> Result<()>;
    async fn disconnect(&self) -> Result<()>;
    async fn send(&self, frame: Frame) -> Result<()>;
    async fn receive(&self) -> Result<Frame>;
    fn is_connected(&self) -> bool;
}

/// Persistent storage
trait Storage: Send + Sync {
    async fn save_cursor(&self, agent_id: &Address, cursor: Cursor) -> Result<()>;
    async fn load_cursor(&self, agent_id: &Address) -> Result<Option<Cursor>>;
    async fn save_resume_token(&self, agent_id: &Address, token: ResumeToken) -> Result<()>;
    async fn load_resume_token(&self, agent_id: &Address) -> Result<Option<ResumeToken>>;
    async fn save_events(&self, agent_id: &Address, events: &[Event]) -> Result<()>;
    async fn load_events(&self, agent_id: &Address, from: Cursor) -> Result<Vec<Event>>;
}

/// Timer scheduling for effects
trait Scheduler: Send + Sync {
    fn schedule(&self, id: String, delay_ms: u64, callback: Box<dyn FnOnce() + Send>);
    fn cancel(&self, id: &str);
}

/// Platform-specific effect execution
trait EffectExecutor: Send + Sync {
    fn execute(&self, effect: PlatformEffect);
}

/// Time operations (for deterministic testing)
trait Clock: Send + Sync {
    fn now_millis(&self) -> Timestamp;
}

/// ID generation (for deterministic testing)
trait Random: Send + Sync {
    fn message_id(&self) -> MessageId;
    fn session_id(&self) -> SessionId;
}
```

---

## 3. Directory Structure

```
uhum-avatar/
├── Cargo.toml                 # Workspace root
├── crates/                    # Rust crates (Cargo workspace)
│   ├── ua-core/               # Shared types & platform boundary
│   ├── ua-agent/              # Agent communication
│   ├── ua-view/               # Uhum View layer
│   └── ua-wasm/               # Browser WASM bindings
│
├── platforms/                 # Platform-specific code (non-Rust)
│   ├── browser/               # TypeScript/React
│   │   ├── lib/               # Avatar library (internal)
│   │   │   └── src/
│   │   │       ├── index.ts       # Library exports
│   │   │       ├── avatar.ts      # AvatarClient class
│   │   │       ├── directory.ts   # Directory service client
│   │   │       ├── protocol.ts    # Uhum protocol encoding
│   │   │       ├── types.ts       # TypeScript types
│   │   │       ├── hooks/         # React hooks
│   │   │       └── components/    # Uhum View components
│   │   │
│   │   ├── app/               # Deployable Avatar app
│   │   │   └── src/
│   │   │       ├── main.tsx       # Entry point
│   │   │       ├── App.tsx        # Root with directory resolution
│   │   │       └── styles.css     # Global styles
│   │   │
│   │   ├── package.json       # Workspace root
│   │   └── pnpm-workspace.yaml
│   │
│   ├── ios/                   # Swift/SwiftUI (future)
│   ├── android/               # Kotlin/Compose (future)
│   └── desktop/               # Tauri app (future)
│
└── specs/                     # Specifications
    ├── BROWSER-DEPLOYMENT.md  # Browser deployment architecture
    ├── UHUM-VIEW.md
    ├── VIEW-INSTRUCTIONS.md
    ├── SMART-ROUTING.md
    └── PLATFORMS.md           # This file
```

---

## 4. Browser Platform

### Architecture

Each agent gets their own Avatar bundle with the **agent ID baked in at build time**. The Brain WebSocket URL is resolved at runtime from the **Directory Service**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (JavaScript)                          │
│                                                                  │
│   BUILD TIME (per agent):                                        │
│   VITE_AGENT_ID=acme.billing pnpm build                         │
│   → Bundle contains AGENT_ID, NOT Brain URL                      │
│                                                                  │
│   RUNTIME:                                                       │
│   1. User visits acme.com                                        │
│   2. CDN serves Acme's bundle                                    │
│   3. Bundle calls Directory: GET /resolve?agentId=acme.billing   │
│   4. Directory returns: { wsUrl: "wss://brain.acme.com" }        │
│   5. Bundle connects to Brain via WebSocket                      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Avatar App                              │       │
│   │   • DirectoryClient — resolve agent ID → Brain URL   │       │
│   │   • AvatarClient — state management, connection      │       │
│   │   • useAvatar — React hook for state                 │       │
│   │   • UhumView — main container component              │       │
│   └─────────────────────────────────────────────────────┘       │
│              │                                                   │
│              ▼ (optional WASM for performance)                   │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              ua-wasm (Rust → WASM)                   │       │
│   │   • BrowserScheduler, BrowserEffectExecutor          │       │
│   │   • BrowserTransport (WebSocket API)                 │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

> **Full specification:** See [BROWSER-DEPLOYMENT.md](./BROWSER-DEPLOYMENT.md)

### Deployment Model

| What | When | Where |
|------|------|-------|
| Agent ID | Build time | Baked into bundle (`VITE_AGENT_ID`) |
| Brain URL | Runtime | Directory Service |
| Domain routing | CDN edge | Routes domain → agent bundle |

### Development

```bash
cd platforms/browser

# Install dependencies
pnpm install

# Development (mock mode - no agent ID needed)
pnpm dev:mock

# Development with specific agent
VITE_AGENT_ID=acme.billing pnpm dev

# Production build
VITE_AGENT_ID=acme.billing pnpm build
```

### Directory Service

The Directory Service resolves agent IDs to Brain connection info:

```
GET /resolve?agentId=acme.billing

Response:
{
  "wsUrl": "wss://brain.acme.com",
  "dossier": { ... }
}
```

### Library Usage (Internal)

```typescript
import { AvatarClient, DirectoryClient } from '@uhum/avatar-lib';

// Resolve Brain URL from Directory
const directory = new DirectoryClient();
const { wsUrl } = await directory.resolve('acme.billing');

// Connect to Brain
const avatar = new AvatarClient({ debug: true });
await avatar.connect(wsUrl, 'acme.billing');

// Send intention
avatar.sendIntention('pay_invoice', { invoice_id: 'INV-123' });
```

### React Usage

```tsx
import { AvatarProvider, useAvatar, UhumView } from '@uhum/avatar-lib';

function App() {
  return (
    <AvatarProvider options={{ debug: true }}>
      <UhumView>
        <InvoiceApp />
      </UhumView>
    </AvatarProvider>
  );
}

function InvoiceApp() {
  const { state, client } = useAvatar();

  return (
    <div>
      <h1>Invoices</h1>
      {state.facts.map((fact) => (
        <InvoiceCard 
          key={fact.id} 
          invoice={fact} 
          onPay={() => client.sendIntention('pay_invoice', { invoice_id: fact.id })} 
        />
      ))}
    </div>
  );
}
```

### WASM Bindings (`ua-wasm`)

The WASM crate provides Rust implementations of platform traits for browsers:

| Component | Implementation |
|-----------|----------------|
| `BrowserScheduler` | `setTimeout` / `clearTimeout` |
| `BrowserEffectExecutor` | Clipboard API, `scrollIntoView`, `focus()` |
| `BrowserTransport` | WebSocket API |

Build WASM:

```bash
cd crates/ua-wasm
wasm-pack build --target web --out-dir ../../platforms/browser/lib/wasm
```

---

## 5. iOS Platform (Future)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       iOS (Swift)                                │
│                                                                  │
│   SwiftUI Views                                                  │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Swift Bindings                          │       │
│   │                                                      │       │
│   │   • AvatarClient — Swift wrapper                     │       │
│   │   • @Published state — SwiftUI reactive binding      │       │
│   │   • UhumView — SwiftUI container                     │       │
│   └─────────────────────────────────────────────────────┘       │
│              │                                                   │
│              ▼ (FFI via UniFFI)                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Avatar Core (Rust)                      │       │
│   │              XCFramework                             │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Implementations

| Trait | iOS Implementation |
|-------|-------------------|
| `Transport` | `URLSessionWebSocketTask` |
| `Storage` | CoreData or Keychain |
| `Scheduler` | `DispatchQueue.main.asyncAfter` |
| `EffectExecutor` | UIKit haptics, UIPasteboard |

### SwiftUI Usage (Planned)

```swift
import UhumAvatar

struct InvoiceApp: View {
    @StateObject private var avatar = AvatarClient()
    
    var body: some View {
        UhumView(state: avatar.state) {
            ForEach(avatar.state.facts) { invoice in
                InvoiceCard(invoice: invoice) {
                    avatar.sendIntention("pay_invoice", params: ["invoice_id": invoice.id])
                }
            }
        }
        .task {
            await avatar.connect("wss://brain.example.com/acme.billing")
        }
    }
}
```

---

## 6. Android Platform (Future)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Android (Kotlin)                             │
│                                                                  │
│   Jetpack Compose UI                                             │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Kotlin Bindings                         │       │
│   │                                                      │       │
│   │   • AvatarClient — Kotlin wrapper                    │       │
│   │   • StateFlow — Compose reactive binding             │       │
│   │   • UhumView — Compose container                     │       │
│   └─────────────────────────────────────────────────────┘       │
│              │                                                   │
│              ▼ (FFI via UniFFI)                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Avatar Core (Rust)                      │       │
│   │              AAR Library                             │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Implementations

| Trait | Android Implementation |
|-------|----------------------|
| `Transport` | OkHttp WebSocket |
| `Storage` | Room or EncryptedSharedPreferences |
| `Scheduler` | `Handler.postDelayed` |
| `EffectExecutor` | Vibrator, ClipboardManager |

---

## 7. Desktop Platform (Future)

### Option A: Tauri (Web-based)

Uses the browser platform code in a native wrapper:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Tauri App                                  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              WebView (Browser code)                  │       │
│   │              @uhum/avatar + React                    │       │
│   └─────────────────────────────────────────────────────┘       │
│              │                                                   │
│              ▼ (IPC)                                             │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Tauri Backend (Rust)                    │       │
│   │              Avatar Core                             │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Option B: Native (egui)

Pure Rust desktop app:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Native App (Rust)                          │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              egui UI                                 │       │
│   └─────────────────────────────────────────────────────┘       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              Avatar Core (Rust)                      │       │
│   │              + tokio runtime                         │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Platform Comparison

| Aspect | Browser | iOS | Android | Desktop (Tauri) | Desktop (Native) |
|--------|---------|-----|---------|-----------------|------------------|
| **Core Integration** | WASM | UniFFI → XCFramework | UniFFI → AAR | Rust native | Rust native |
| **UI Framework** | React/Vue/Svelte | SwiftUI | Jetpack Compose | Web (React) | egui |
| **State Binding** | React hooks | @StateObject | StateFlow | React hooks | egui state |
| **Transport** | WebSocket API | URLSession | OkHttp | WebSocket API | tokio-tungstenite |
| **Storage** | IndexedDB | CoreData | Room | IndexedDB | SQLite |
| **Scheduler** | setTimeout | DispatchQueue | Handler | setTimeout | tokio::time |
| **Effects** | DOM APIs | UIKit | Android APIs | DOM APIs | Native APIs |

---

## 9. Building and Testing

### Browser

```bash
cd platforms/browser

# Install dependencies
pnpm install

# Development (mock mode)
pnpm dev:mock

# Build for production (requires agent ID)
VITE_AGENT_ID=acme.billing pnpm build

# Build WASM (optional, for performance)
pnpm build:wasm

# Run tests
pnpm test
```

### Rust Crates

```bash
# Build all crates
cd uhum-avatar
cargo build

# Run tests
cargo test

# Build WASM
cd crates/ua-wasm
wasm-pack build --target web
```

### iOS (Future)

```bash
# Build XCFramework
cd platforms/ios
./build-xcframework.sh

# Open Xcode project
open UhumAvatar.xcodeproj
```

### Android (Future)

```bash
# Build AAR
cd platforms/android
./gradlew assembleRelease
```

---

## 10. Summary

| Principle | Description |
|-----------|-------------|
| **Core is shared** | Same Rust code across all platforms |
| **Shell is native** | Idiomatic code for each platform |
| **Traits are boundaries** | Platform implementations via traits |
| **UI is reactive** | State changes trigger UI updates |
| **Effects are platform-specific** | Timers, clipboard, haptics handled by shell |
