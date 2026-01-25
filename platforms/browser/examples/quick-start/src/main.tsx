import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Startup banner
console.log(`
╭──────────────────────────────────────────╮
│                                          │
│   👤 UHUM AVATAR - Quick Start           │
│                                          │
│   Protocol: UHUM/1.0 (term-based)        │
│   Transport: WebSocket                   │
│   Agent:    ${(import.meta.env.VITE_AGENT_ID || 'quickstart.billing').padEnd(29)}│
│   Endpoint: ${(import.meta.env.VITE_AGENT_URL || 'ws://localhost:8080').padEnd(29)}│
│                                          │
╰──────────────────────────────────────────╯
`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
