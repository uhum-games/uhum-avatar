import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
