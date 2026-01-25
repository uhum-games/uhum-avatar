import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Plugin to print startup banner in development.
 */
function uhumBanner(): Plugin {
  return {
    name: 'uhum-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const agentId = process.env.VITE_AGENT_ID || '(not set)';
        const mockMode = process.env.VITE_MOCK_MODE === 'true';
        const mockAgentId = process.env.VITE_MOCK_AGENT_ID || 'dev.agent';
        const mockWsUrl = process.env.VITE_MOCK_WS_URL || 'ws://localhost:8080';

        console.log(`
    ╭──────────────────────────────────────────────────────────────╮
    │                                                              │
    │   👤 UHUM AVATAR                                             │
    │                                                              │
    │   Mode:      ${mockMode ? 'Mock (local development)'.padEnd(48) : 'Production'.padEnd(48)}│
    │   Agent ID:  ${(mockMode ? mockAgentId : agentId).padEnd(48)}│
    ${mockMode ? `│   Mock URL:  ${mockWsUrl.padEnd(48)}│` : '│                                                              │'}
    │                                                              │
    │   Build for production:                                      │
    │   VITE_AGENT_ID=your.agent pnpm build                        │
    │                                                              │
    ╰──────────────────────────────────────────────────────────────╯
        `);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), uhumBanner()],
  resolve: {
    alias: {
      // Point to local library source for development
      '@uhum/avatar-lib': path.resolve(__dirname, '../lib/src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
