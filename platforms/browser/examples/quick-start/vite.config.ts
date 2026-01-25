import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to print startup banner
function uhumBanner(): Plugin {
  return {
    name: 'uhum-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const agentId = process.env.VITE_AGENT_ID || 'quickstart.billing';
        const agentUrl = process.env.VITE_AGENT_URL || 'ws://localhost:8080';
        
        console.log(`
    ╭──────────────────────────────────────────╮
    │                                          │
    │   👤 UHUM AVATAR - Quick Start           │
    │                                          │
    │   Protocol: UHUM/1.0 (term-based)        │
    │   Transport: WebSocket                   │
    │   Agent:    ${agentId.padEnd(29)}│
    │   Endpoint: ${agentUrl.padEnd(29)}│
    │                                          │
    ╰──────────────────────────────────────────╯
        `);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), uhumBanner()],
  resolve: {
    alias: {
      // Point to local @uhum/avatar source
      '@uhum/avatar': path.resolve(__dirname, '../../src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy WebSocket to mock server
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
