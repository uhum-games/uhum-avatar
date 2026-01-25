# Uhum Avatar Demo - Invoice App

A demo application showcasing the Uhum Avatar client library.

## Features

- 🔌 **WebSocket Connection** — Connects to a Brain agent (mock or real)
- 📋 **Invoice Management** — View and pay invoices
- 💬 **Chat Interface** — Send text messages to the AI
- ✨ **Reactive UI** — State changes trigger UI updates
- 🎯 **View Instructions** — Messages, highlights, loading states

## Quick Start

### 1. Install Dependencies

```bash
cd platforms/browser/examples/demo
npm install
```

### 2. Start the Mock Server

```bash
npm run mock-server
```

This starts a WebSocket server at `ws://localhost:8080` that simulates a Brain agent.

### 3. Start the Dev Server

In a new terminal:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Demo Mode

If the mock server isn't running, the app runs in "demo mode" with sample data. You can still:

- View invoices
- Click "Pay Now" to simulate payment
- See messages and highlights

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                    Demo App                          │       │
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
│                    Mock Brain Server                             │
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
demo/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Main app component
│   ├── styles.css        # Styles
│   └── components/
│       ├── Header.tsx
│       ├── ConnectionStatus.tsx
│       ├── InvoiceList.tsx
│       └── ChatInput.tsx
├── mock-server.js        # Mock Brain server
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## Customization

### Connecting to a Real Brain

Update the WebSocket URL in `App.tsx`:

```tsx
await client.connect('wss://your-brain.example.com/agent');
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
