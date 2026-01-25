/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Agent WebSocket URL (default: ws://localhost:8080) */
  readonly VITE_AGENT_URL?: string;
  /** Agent ID to connect to (default: quickstart.billing) */
  readonly VITE_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
