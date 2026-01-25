# Uhum Avatar Quick Start - Invoice App

A quick-start example showcasing the Uhum Avatar client library.

## Features

- 🔌 **WebSocket Connection** — Connects to an Agent (mock or real)
- 📋 **Invoice Management** — View and pay invoices
- 💬 **Chat Interface** — Send text messages to the AI
- ✨ **Reactive UI** — State changes trigger UI updates
- 🎯 **View Instructions** — Messages, highlights, loading states

## Quick Start

### 1. Install Dependencies

```bash
cd platforms/browser/examples/quick-start
pnpm install
```

### 2. Start the Mock Server

```bash
pnpm run mock-server
```

This starts a WebSocket server at `ws://localhost:8080` that simulates an Agent.

### 3. Start the Dev Server

In a new terminal:

```bash
pnpm run dev
```

Open http://localhost:3000 in your browser.

## Offline Mode

If the Agent isn't running, the app runs in "offline mode" with sample data. You can still:

- View invoices
- Click "Pay Now" to simulate payment
- See messages and highlights

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                   Example App                        │       │
│   │   (React + Vite)                                     │       │
│   │                                                      │       │
│   │   • App.tsx — Main component                         │       │
│   │   • InvoiceList — Invoice cards                      │       │
│   │   • ChatInput — Message input                        │       │
│   └─────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              @uhum/avatar                            │       │
│   │                                                      │       │
│   │   • AvatarProvider — React context                   │       │
│   │   • useAvatar — State hook                           │       │
│   │   • AvatarClient — WebSocket + state                 │       │
│   └─────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼ WebSocket                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mock Agent Server                             │
│                    (Node.js + ws)                                │
│                                                                  │
│   • Sends MEMORY with invoices                                   │
│   • Handles INTENTION (pay_invoice)                              │
│   • Handles MESSAGE (NLU simulation)                             │
│   • Returns DECISION with view instructions                      │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Pay an Invoice

1. Click "Pay Now" on any pending invoice
2. Watch the loading indicator
3. See the success message and highlight

### Chat Commands

Try typing:

- `"Show my pending invoices"` — Lists pending invoices
- `"Pay invoice INV-001"` — Pays the specified invoice
- `"What's my total due?"` — Shows total amount due

## Project Structure

```
quick-start/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Main app component
│   ├── styles.css        # Styles
│   └── components/
│       ├── Header.tsx
│       ├── ConnectionStatus.tsx
│       ├── InvoiceList.tsx
│       └── ChatInput.tsx
├── mock-server.js        # Mock Agent server
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## Configuration

The Avatar connection is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_AGENT_URL` | `ws://localhost:8080` | Agent WebSocket URL |
| `VITE_AGENT_ID` | `quickstart.billing` | Agent ID to connect to |

### Connecting to a Real Agent

Create a `.env.local` file:

```bash
# .env.local
VITE_AGENT_URL=wss://your-agent.example.com
VITE_AGENT_ID=acme.billing
```

Or set inline:

```bash
VITE_AGENT_URL=wss://your-agent.example.com VITE_AGENT_ID=acme.billing pnpm dev
```

### Adding New Intents

Edit `mock-server.js` to handle new intents:

```javascript
case 'my_intent':
  // Handle the intent
  sendDecision(ws, 'accepted', facts, viewInstructions);
  break;
```

## License

MIT
