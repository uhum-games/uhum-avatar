/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Agent ID - baked in at build time (REQUIRED for production) */
  readonly VITE_AGENT_ID: string;
  /** Directory service URL */
  readonly VITE_DIRECTORY_URL: string;
  /** Enable mock mode for local development */
  readonly VITE_MOCK_MODE: string;
  /** Mock WebSocket URL (only used in mock mode) */
  readonly VITE_MOCK_WS_URL: string;
  /** Mock agent ID (only used in mock mode) */
  readonly VITE_MOCK_AGENT_ID: string;
  /** Enable debug logging */
  readonly VITE_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
