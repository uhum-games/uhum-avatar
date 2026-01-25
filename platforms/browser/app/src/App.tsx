import React, { useEffect, useState, useCallback } from 'react';
import {
  AvatarProvider,
  useAvatar,
  UhumView,
  DirectoryClient,
  createMockDirectory,
  DirectoryError,
  type AgentInfo,
} from '@uhum/avatar-lib';

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
          // Trigger re-resolve via useEffect
          window.location.reload();
        }}
      />
    );
  }

  return (
    <AvatarProvider options={{ debug: DEBUG }}>
      <AvatarApp agentId={EFFECTIVE_AGENT_ID} agentInfo={resolution.agentInfo} />
    </AvatarProvider>
  );
}

/**
 * Main Avatar application component.
 * Connects to the resolved agent and renders the Uhum View.
 */
function AvatarApp({ agentId, agentInfo }: { agentId: string; agentInfo: AgentInfo }) {
  const { state, client } = useAvatar();

  // Connect to agent on mount
  useEffect(() => {
    if (DEBUG) {
      console.log(`[Avatar] Connecting to ${agentInfo.wsUrl} as ${agentId}`);
    }

    // Start connection - don't await, let reconnection logic handle failures
    client.connect(agentInfo.wsUrl, agentId).then(() => {
      if (DEBUG) {
        console.log(`[Avatar] Connected to uhum://${agentId}`);
      }
    }).catch((error) => {
      // Log but don't show error screen - reconnection will handle it
      if (DEBUG) {
        console.log('[Avatar] Initial connection failed, reconnection will retry:', error);
      }
    });

    return () => {
      client.disconnect();
    };
  }, [client, agentId, agentInfo]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (state.connected) {
        client.sendMessage(text);
      }
    },
    [client, state.connected]
  );

  // Only show error screen when reconnection has given up
  if (state.connectionState === 'failed') {
    return (
      <ErrorScreen
        error={new Error('Unable to connect to agent after multiple attempts')}
        onRetry={() => {
          client.connect(agentInfo.wsUrl, agentId);
        }}
      />
    );
  }

  return (
    <UhumView className="avatar-app">
      <Header agentId={agentId} agentInfo={agentInfo} connectionState={state.connectionState} />
      <main className="avatar-main">
        <ContentArea state={state} />
      </main>
      <ChatInput onSend={handleSendMessage} disabled={!state.connected} />
    </UhumView>
  );
}

/**
 * Header component showing agent info and connection status.
 */
function Header({
  agentId,
  agentInfo,
  connectionState,
}: {
  agentId: string;
  agentInfo: AgentInfo;
  connectionState: string;
}) {
  const agentName = agentInfo.dossier?.presentation?.brand?.name || agentId;

  const getStatusLabel = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection failed';
      case 'closing':
        return 'Closing...';
      default:
        return connectionState;
    }
  };

  return (
    <header className="avatar-header">
      <div className="avatar-header-brand">
        {agentInfo.dossier?.presentation?.brand?.logo && (
          <img
            src={agentInfo.dossier.presentation.brand.logo}
            alt={agentName}
            className="avatar-header-logo"
          />
        )}
        <h1 className="avatar-header-title">{agentName}</h1>
      </div>
      <div className="avatar-header-status">
        <span
          className={`status-indicator status-${connectionState}`}
          title={getStatusLabel()}
        />
        {(connectionState === 'reconnecting' || connectionState === 'connecting') && (
          <span className="status-text">{getStatusLabel()}</span>
        )}
      </div>
    </header>
  );
}

/**
 * Main content area that renders based on state.
 */
function ContentArea({ state }: { state: ReturnType<typeof useAvatar>['state'] }) {
  // Show loading overlay
  if (state.loading) {
    return (
      <div className="avatar-loading-overlay">
        <div className="avatar-loading-spinner" />
        <p>{state.loading.message || 'Loading...'}</p>
      </div>
    );
  }

  // Show message if present
  if (state.message) {
    return (
      <div className={`avatar-message avatar-message-${state.message.messageType}`}>
        {state.message.text}
      </div>
    );
  }

  // Show facts/data
  if (state.facts.length > 0) {
    return (
      <div className="avatar-content">
        <pre className="avatar-facts">{JSON.stringify(state.facts, null, 2)}</pre>
      </div>
    );
  }

  // Empty state
  return (
    <div className="avatar-empty">
      <p>Send a message to get started</p>
    </div>
  );
}

/**
 * Chat input component.
 */
function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form className="avatar-chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Connecting...' : 'Type a message...'}
        disabled={disabled}
        className="avatar-chat-field"
      />
      <button type="submit" disabled={disabled || !text.trim()} className="avatar-chat-send">
        Send
      </button>
    </form>
  );
}

/**
 * Loading screen shown during agent resolution.
 */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="avatar-screen avatar-loading-screen">
      <div className="avatar-loading-spinner" />
      <p>{message}</p>
    </div>
  );
}

/**
 * Error screen shown when resolution or connection fails.
 */
function ErrorScreen({
  error,
  onRetry,
}: {
  error: DirectoryError | Error;
  onRetry: () => void;
}) {
  const isNotFound = error instanceof DirectoryError && error.code === 'NOT_FOUND';

  return (
    <div className="avatar-screen avatar-error-screen">
      <div className="avatar-error-icon">⚠️</div>
      <h2>{isNotFound ? 'Agent Not Found' : 'Connection Error'}</h2>
      <p className="avatar-error-message">
        {isNotFound
          ? `No agent is registered for this domain.`
          : error.message || 'An unexpected error occurred'}
      </p>
      {!isNotFound && (
        <button onClick={onRetry} className="avatar-retry-button">
          Try Again
        </button>
      )}
    </div>
  );
}

export default App;
