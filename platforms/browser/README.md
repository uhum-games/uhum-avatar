# Uhum Avatar - Browser Platform

The browser platform for Uhum Avatar. This package contains:

- **lib/** - Avatar library (internal) with client, hooks, components, and protocol
- **app/** - Deployable Avatar application

## Architecture

Each agent gets their own Avatar bundle with the **agent ID baked in at build time**. The Brain WebSocket URL is resolved at runtime from the Directory Service.

```
BUILD TIME (per agent):
┌─────────────────────────────────────────────────────────────────────────┐
│   VITE_AGENT_ID=acme.billing pnpm build → dist/                         │
│                                                                          │
│   Bundle contains: AGENT_ID = "acme.billing"                             │
│   Bundle does NOT contain: WebSocket URL (resolved at runtime)          │
└─────────────────────────────────────────────────────────────────────────┘

RUNTIME:
┌─────────────────────────────────────────────────────────────────────────┐
│   User visits acme.com                                                   │
│       ↓                                                                  │
│   CDN serves acme's bundle (AGENT_ID=acme.billing baked in)             │
│       ↓                                                                  │
│   Bundle calls: GET directory.uhum.io/resolve?agentId=acme.billing      │
│       ↓                                                                  │
│   Directory returns: { wsUrl: "wss://brain.acme.com", dossier: {...} }  │
│       ↓                                                                  │
│   Bundle connects to Brain via WebSocket                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Agent ID is static (baked in) → identifies which agent this bundle is for
- Brain URL is dynamic (runtime) → can change without rebuilding
- One CDN deployment per agent, but URL changes don't require rebuilds

See [specs/BROWSER-DEPLOYMENT.md](../../specs/BROWSER-DEPLOYMENT.md) for full documentation.

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Start development server (mock mode - no agent ID required)
pnpm dev:mock

# Start with specific agent ID
VITE_AGENT_ID=my.agent pnpm dev
```

### Environment Variables

#### Build-Time (baked into bundle)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AGENT_ID` | Agent ID | Yes (for production) |

#### Runtime (read at startup)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DIRECTORY_URL` | Directory service URL | `https://directory.uhum.io` |
| `VITE_DEBUG` | Enable debug logging | `false` (true in dev) |

#### Development Only

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MOCK_MODE` | Enable mock mode | `false` |
| `VITE_MOCK_WS_URL` | Mock WebSocket URL | `ws://localhost:8080` |
| `VITE_MOCK_AGENT_ID` | Mock agent ID | `dev.agent` |

### Mock Mode

For local development without a real directory service or Brain:

```bash
# Start in mock mode
pnpm dev:mock

# Or with custom mock settings
VITE_MOCK_MODE=true \
VITE_MOCK_WS_URL=ws://localhost:9000 \
VITE_MOCK_AGENT_ID=test.agent \
pnpm dev
```

### Local Development with a Real Brain

To run the Avatar locally connected to a local Brain:

#### 1. Start the Brain (in uhum-brain project)

```bash
# Terminal 1: Navigate to uhum-brain
cd ../uhum-brain

# Run the Brain server (default: ws://localhost:8080)
cargo run

# Or use just if available
just dev
```

The Brain will start on `ws://localhost:8080` by default.

#### 2. Start the Avatar (in uhum-avatar project)

```bash
# Terminal 2: Navigate to uhum-avatar/platforms/browser
cd platforms/browser

# Install dependencies (first time only)
pnpm install

# Start Avatar pointing to local Brain
VITE_MOCK_MODE=true \
VITE_MOCK_WS_URL=ws://localhost:8080 \
VITE_MOCK_AGENT_ID=quickstart.billing \
pnpm dev
```

The Avatar will start on `http://localhost:3000` and connect to your local Brain.

#### Full Local Development Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Terminal 1: Brain                                                       │
│  cd uhum-brain && cargo run                                              │
│  → Running on ws://localhost:8080                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Terminal 2: Avatar                                                      │
│  cd uhum-avatar/platforms/browser                                        │
│  VITE_MOCK_MODE=true VITE_MOCK_WS_URL=ws://localhost:8080 pnpm dev      │
│  → Running on http://localhost:3000                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Open browser
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser: http://localhost:3000                                          │
│  → Avatar UI connected to local Brain                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Using Just (Recommended)

From the `uhum-avatar` root directory:

```bash
# Terminal 1: Start Brain (from uhum-brain)
cd ../uhum-brain
just dev

# Terminal 2: Start Avatar with local Brain
cd ../uhum-avatar
just dev browser

# Or with a specific agent ID (use quotes for IDs with dots)
just dev browser "quickstart.billing"
```

#### Custom Brain Port

If your Brain runs on a different port:

```bash
VITE_MOCK_MODE=true \
VITE_MOCK_WS_URL=ws://localhost:9000 \
VITE_MOCK_AGENT_ID=my.agent \
pnpm dev
```

## Building

```bash
# Build for a specific agent
VITE_AGENT_ID=acme.billing pnpm build

# Output: app/dist/
```

## Deployment

### Per-Agent Builds

Each agent needs their own build:

```bash
# Build for Acme
VITE_AGENT_ID=acme.billing pnpm build
# Deploy app/dist/ to CDN at path for acme.com

# Build for Todos
VITE_AGENT_ID=todos.app pnpm build
# Deploy app/dist/ to CDN at path for todos.org
```

### CDN Setup

1. Build bundle with agent ID
2. Upload to CDN (e.g., `avatar.uhum.io/agents/acme/`)
3. Configure CDN routing: `acme.com` → `/agents/acme/`
4. Add CNAME: `acme.com` → `avatar.uhum.io`
5. Register agent in Directory Service (via admin app)

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install && VITE_AGENT_ID=${AGENT_ID} pnpm build

FROM nginx:alpine
COPY --from=builder /app/app/dist /usr/share/nginx/html
```

```bash
docker build --build-arg AGENT_ID=acme.billing -t uhum-avatar-acme .
```

## Project Structure

```
platforms/browser/
├── lib/                       # Avatar library (internal)
│   ├── src/
│   │   ├── index.ts           # Library exports
│   │   ├── avatar.ts          # AvatarClient class
│   │   ├── directory.ts       # Directory service client
│   │   ├── protocol.ts        # Uhum protocol encoding
│   │   ├── types.ts           # Type definitions
│   │   ├── hooks/             # React hooks
│   │   ├── components/        # Uhum View components
│   │   └── wasm/              # WASM loader
│   └── package.json
│
├── app/                       # Deployable Avatar app
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Root component
│   │   └── styles.css         # Global styles
│   ├── public/                # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── package.json               # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

## Scripts

### pnpm Commands (from `platforms/browser/`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm dev:mock` | Start dev server in mock mode |
| `pnpm build` | Build for production (requires VITE_AGENT_ID) |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm build:wasm` | Build WASM from Rust crates |
| `pnpm clean` | Clean build artifacts |

### Just Commands (from `uhum-avatar/` root)

| Command | Description |
|---------|-------------|
| `just dev browser` | Dev server with local Brain (ws://localhost:8080) |
| `just dev browser "my.agent"` | Dev server with specific agent ID |
| `just mock browser` | Mock mode (no Brain needed) |
| `just build browser "acme.billing"` | Build for production |
| `just install browser` | Install dependencies |
| `just test browser` | Run tests |

> **Note:** Use quotes around agent IDs that contain dots (e.g., `"my.agent"`).

## Related Documentation

- [BROWSER-DEPLOYMENT.md](../../specs/BROWSER-DEPLOYMENT.md) - Deployment architecture
- [UHUM-VIEW.md](../../specs/UHUM-VIEW.md) - View rendering
- [VIEW-INSTRUCTIONS.md](../../specs/VIEW-INSTRUCTIONS.md) - Reactive architecture
- [SMART-ROUTING.md](../../specs/SMART-ROUTING.md) - Input handling
