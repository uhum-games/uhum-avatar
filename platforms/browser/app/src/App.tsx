import { useEffect, useState } from 'react';
import {
  AvatarProvider,
  DirectoryClient,
  createMockDirectory,
  DirectoryError,
  type AgentInfo,
} from '@uhum/avatar-lib';
import { AvatarApp, ErrorScreen, LoadingScreen } from './components';

/**
 * Uhum Avatar Application
 *
 * This is the main Avatar application that:
 * 1. Uses the agent ID baked in at build time (VITE_AGENT_ID)
 * 2. Resolves Brain WebSocket URL from Directory Service
 * 3. Connects to the Brain and renders Uhum View
 *
 * Build-time configuration:
 * - VITE_AGENT_ID: Agent ID (REQUIRED - baked into bundle)
 *
 * Runtime configuration:
 * - VITE_DIRECTORY_URL: Directory service URL (default: https://directory.uhum.io)
 * - VITE_MOCK_MODE: Enable mock mode for local development
 * - VITE_MOCK_WS_URL: Mock WebSocket URL (only in mock mode)
 * - VITE_DEBUG: Enable debug logging
 */

// Build-time configuration (baked into bundle)
const AGENT_ID = import.meta.env.VITE_AGENT_ID;

if (!AGENT_ID && import.meta.env.VITE_MOCK_MODE !== 'true') {
  throw new Error('VITE_AGENT_ID is required. Build with: VITE_AGENT_ID=your.agent pnpm build');
}

// Runtime configuration
const DIRECTORY_URL = import.meta.env.VITE_DIRECTORY_URL || 'https://directory.uhum.io';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const MOCK_WS_URL = import.meta.env.VITE_MOCK_WS_URL || 'ws://localhost:8080';
const MOCK_AGENT_ID = import.meta.env.VITE_MOCK_AGENT_ID || 'dev.agent';
const DEBUG = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV;

// Effective agent ID (mock or real)
const EFFECTIVE_AGENT_ID = MOCK_MODE ? MOCK_AGENT_ID : AGENT_ID;

// Create directory client (mock or real)
const directory = MOCK_MODE
  ? createMockDirectory(MOCK_WS_URL)
  : new DirectoryClient({
      baseUrl: DIRECTORY_URL,
      debug: DEBUG,
    });

/**
 * Resolution state for the directory lookup.
 */
type ResolutionState =
  | { status: 'resolving' }
  | { status: 'resolved'; agentInfo: AgentInfo }
  | { status: 'error'; error: DirectoryError | Error };

function App() {
  const [resolution, setResolution] = useState<ResolutionState>({ status: 'resolving' });

  useEffect(() => {
    const resolveAgent = async () => {
      if (DEBUG) {
        console.log(`[Avatar] Agent ID: ${EFFECTIVE_AGENT_ID}`);
        console.log(`[Avatar] Resolving Brain URL from directory...`);
      }

      try {
        const agentInfo = await directory.resolve(EFFECTIVE_AGENT_ID);

        if (DEBUG) {
          console.log(`[Avatar] Resolved:`, agentInfo);
        }

        setResolution({ status: 'resolved', agentInfo });
      } catch (error) {
        console.error('[Avatar] Failed to resolve agent:', error);
        setResolution({
          status: 'error',
          error: error instanceof DirectoryError ? error : new Error(String(error)),
        });
      }
    };

    resolveAgent();
  }, []);

  if (resolution.status === 'resolving') {
    return <LoadingScreen message="Connecting..." />;
  }

  if (resolution.status === 'error') {
    return (
      <ErrorScreen
        error={resolution.error}
        onRetry={() => {
          setResolution({ status: 'resolving' });
          window.location.reload();
        }}
      />
    );
  }

  return (
    <AvatarProvider options={{ debug: DEBUG }}>
      <AvatarApp agentId={EFFECTIVE_AGENT_ID} agentInfo={resolution.agentInfo} debug={DEBUG} />
    </AvatarProvider>
  );
}

export default App;
