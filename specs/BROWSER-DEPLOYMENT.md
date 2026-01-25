# Browser Deployment Architecture

> How the Avatar browser app is built, deployed, and connects to Brains.

## Overview

Each agent gets their own Avatar bundle with the **agent ID baked in at build time**. The Brain WebSocket URL is resolved at runtime from the **Uhum Directory Service**.

This approach provides:
- **Static agent identity** — bundle knows which agent it represents
- **Dynamic Brain URL** — URL can change without rebuilding
- **Simple CDN deployment** — one bundle per agent, routed by domain

```
BUILD TIME (per agent):
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   VITE_AGENT_ID=acme.billing pnpm build                                 │
│                                                                          │
│   Output: dist/                                                          │
│   - index.html                                                           │
│   - assets/main.[hash].js  ← contains AGENT_ID="acme.billing"           │
│   - assets/main.[hash].css                                               │
│                                                                          │
│   The bundle does NOT contain the Brain WebSocket URL.                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

CDN DEPLOYMENT:
┌─────────────────────────────────────────────────────────────────────────┐
│                        CDN (avatar.uhum.io)                              │
│                                                                          │
│   /agents/acme/      → Acme's bundle (AGENT_ID=acme.billing)            │
│   /agents/todos/     → Todos' bundle (AGENT_ID=todos.app)               │
│   /agents/music/     → Music's bundle (AGENT_ID=music.player)           │
│                                                                          │
│   Domain routing (edge):                                                 │
│   acme.com  → /agents/acme/                                             │
│   todos.org → /agents/todos/                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

RUNTIME:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   1. User visits acme.com                                               │
│   2. CDN serves Acme's bundle                                           │
│   3. Bundle loads, reads baked-in AGENT_ID: "acme.billing"              │
│   4. Bundle calls Directory: GET /resolve?agentId=acme.billing          │
│   5. Directory returns: { wsUrl: "wss://brain.acme.com" }               │
│   6. Bundle connects to Brain via WebSocket                              │
│   7. Uhum View renders based on Brain responses                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why Per-Agent Bundles?

| Aspect | Per-Agent Bundle | Universal Bundle |
|--------|------------------|------------------|
| Agent identity | Baked in at build | Resolved by hostname |
| Build frequency | Once per agent | Once for all |
| CDN routing | Domain → agent bundle | Domain → same bundle |
| Dependencies | Directory for URL only | Directory for everything |

We chose per-agent bundles because:
1. **Clearer ownership** — each bundle is definitively "for" one agent
2. **Domain flexibility** — CDN routing handles domain → bundle mapping
3. **Simpler directory** — only maps agent ID → URL, not hostname → everything

## Directory Service

The Directory Service is a simple read-only API that maps agent IDs to connection info.

### API

```
GET https://directory.uhum.io/resolve?agentId=<agent_id>

Response (200):
{
  "wsUrl": "wss://brain.acme.com",
  "dossier": {
    "name": "Acme Billing",
    "intents": [...],
    "presentation": { ... }
  }
}

Response (404):
{
  "error": "Agent not registered"
}
```

### What Directory Stores

| Field | Description |
|-------|-------------|
| `agentId` | Unique agent identifier (lookup key) |
| `wsUrl` | Brain WebSocket URL |
| `dossier` | Optional agent dossier (name, intents, presentation hints) |

### How Directory Gets Updated

The Directory Service is **read-only** from the Avatar's perspective. Registration happens through a separate admin application that manages the Uhum Brain Network:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ADMIN APP (separate project)                                          │
│   - Manages Brain Network nodes                                          │
│   - Registers agents                                                     │
│   - Updates Brain URLs                                                   │
│   - Writes to shared database                                            │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │ writes
                               ▼
                    ┌─────────────────────┐
                    │   Database          │
                    │   (agents registry) │
                    └─────────────────────┘
                               │
                               │ reads
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   DIRECTORY SERVICE                                                      │
│   GET /resolve?agentId=X → returns { wsUrl, dossier }                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
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
│   │   │   ├── useAvatar.tsx
│   │   │   └── useAgent.ts
│   │   ├── components/        # Uhum View components
│   │   │   ├── UhumView.tsx
│   │   │   └── MessageDisplay.tsx
│   │   └── wasm/              # WASM loader
│   │       ├── index.ts
│   │       └── loader.ts
│   ├── package.json
│   └── tsconfig.json
│
├── app/                       # Deployable Avatar app
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Root component (directory resolution)
│   │   ├── styles.css         # Global styles
│   │   └── vite-env.d.ts      # TypeScript env types
│   ├── public/                # Static assets
│   ├── index.html             # HTML template
│   ├── vite.config.ts         # Vite config
│   └── package.json           # App dependencies
│
├── package.json               # Workspace root
├── pnpm-workspace.yaml        # pnpm workspace config
└── README.md                  # Deployment guide
```

## Configuration

### Build-Time Variables (baked into bundle)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AGENT_ID` | Agent ID | Yes (for production) |

### Runtime Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DIRECTORY_URL` | Directory service URL | `https://directory.uhum.io` |
| `VITE_DEBUG` | Enable debug logging | `false` |

### Development Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MOCK_MODE` | Enable mock mode | `false` |
| `VITE_MOCK_WS_URL` | Mock WebSocket URL | `ws://localhost:8080` |
| `VITE_MOCK_AGENT_ID` | Mock agent ID | `dev.agent` |

## Building

### Per-Agent Build

```bash
cd platforms/browser

# Build for Acme
VITE_AGENT_ID=acme.billing pnpm build
# Output: app/dist/ (deploy to /agents/acme/)

# Build for Todos
VITE_AGENT_ID=todos.app pnpm build
# Output: app/dist/ (deploy to /agents/todos/)
```

### Build Pipeline (CI/CD)

```yaml
# Example GitHub Actions workflow
jobs:
  build-avatar:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent:
          - id: acme.billing
            path: acme
          - id: todos.app
            path: todos
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: VITE_AGENT_ID=${{ matrix.agent.id }} pnpm build
      - run: aws s3 sync app/dist/ s3://avatar-cdn/agents/${{ matrix.agent.path }}/
```

## Deployment

### CDN Structure

```
avatar.uhum.io/
├── agents/
│   ├── acme/
│   │   ├── index.html
│   │   └── assets/
│   ├── todos/
│   │   ├── index.html
│   │   └── assets/
│   └── music/
│       ├── index.html
│       └── assets/
```

### Domain Routing

Configure CDN to route domains to agent bundles:

| Domain | Routes To |
|--------|-----------|
| `acme.com` | `/agents/acme/` |
| `todos.org` | `/agents/todos/` |
| `music.app` | `/agents/music/` |

#### Cloudflare Workers Example

```javascript
export default {
  async fetch(request) {
    const host = request.headers.get('host');
    
    const routes = {
      'acme.com': '/agents/acme',
      'todos.org': '/agents/todos',
      'music.app': '/agents/music',
    };
    
    const basePath = routes[host] || '';
    const url = new URL(request.url);
    
    return fetch(`https://avatar.uhum.io${basePath}${url.pathname}`);
  }
}
```

### Custom Domain Setup

1. **Build** bundle with agent ID: `VITE_AGENT_ID=acme.billing pnpm build`
2. **Deploy** to CDN at `/agents/acme/`
3. **Route** domain in CDN: `acme.com` → `/agents/acme/`
4. **DNS** CNAME: `acme.com` → `avatar.uhum.io`
5. **Register** agent in Directory (via admin app): `acme.billing` → `wss://brain.acme.com`
6. **SSL** auto-provisioned by CDN

## Development

### Local Development

```bash
cd platforms/browser

# Install dependencies
pnpm install

# Start dev server (mock mode - no real directory/brain needed)
pnpm dev:mock

# Start with specific agent (requires directory service)
VITE_AGENT_ID=acme.billing pnpm dev
```

### Mock Mode

Mock mode bypasses the directory service for local development:

```bash
# Uses default mock settings
pnpm dev:mock

# Custom mock settings
VITE_MOCK_MODE=true \
VITE_MOCK_WS_URL=ws://localhost:9000 \
VITE_MOCK_AGENT_ID=test.agent \
pnpm dev
```

## Security Considerations

### Directory Service

- Read-only API (no registration endpoint)
- CORS allows any origin (bundles served from various domains)
- Registration managed through separate admin app

### WebSocket Connections

- Browser connects directly to Brain
- Brain validates avatar session
- TLS required in production (`wss://`)

## Offline Support

When the browser is offline:

1. Service worker serves cached bundle
2. App shows "Offline" indicator
3. Intentions are queued locally (in IndexedDB)
4. When back online:
   - Re-resolve Brain URL (in case it changed)
   - Reconnect to Brain
   - Replay queued intentions

## Summary

| What | When | Where |
|------|------|-------|
| Agent ID | Build time | Baked into bundle |
| Brain URL | Runtime | Directory Service |
| Domain routing | CDN edge | Cloudflare/Vercel/etc |
| Registration | Admin app | Separate project |

The Avatar bundle is built **per agent** with the agent ID baked in. The Brain WebSocket URL is resolved at runtime, allowing URL changes without rebuilds.
