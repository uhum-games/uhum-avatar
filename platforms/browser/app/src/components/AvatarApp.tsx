import { useEffect, useState, useCallback } from 'react';
import {
  useAvatar,
  UhumView,
  SmartChat,
  type AgentInfo,
  type DockPosition,
} from '@uhum/avatar-lib';
import { ErrorScreen } from './ErrorScreen';
import { ConnectionStepsScreen } from './ConnectionSteps';
import { ContentArea } from './ContentArea';
import { ChatHeader, ChatMessages, ChatInput } from './Chat';

interface AvatarAppProps {
  agentId: string;
  agentInfo: AgentInfo;
  debug?: boolean;
}

/**
 * Main Avatar application component.
 * Connects to the resolved agent and renders the Uhum View.
 */
export function AvatarApp({ agentId, agentInfo, debug = false }: AvatarAppProps) {
  const { state, client } = useAvatar();

  // SmartChat state
  const [chatMode, setChatMode] = useState<'docked' | 'smart'>('smart');
  const [dockPosition, setDockPosition] = useState<DockPosition>('bottom');
  const [chatMinimized, setChatMinimized] = useState(false);

  // Connect to agent on mount
  useEffect(() => {
    if (debug) {
      console.log(`[Avatar] Connecting to ${agentInfo.wsUrl} as ${agentId}`);
    }

    // Start connection - don't await, let reconnection logic handle failures
    client
      .connect(agentInfo.wsUrl, agentId)
      .then(() => {
        if (debug) {
          console.log(`[Avatar] Connected to uhum://${agentId}`);
        }
      })
      .catch((error) => {
        // Log but don't show error screen - reconnection will handle it
        if (debug) {
          console.log('[Avatar] Initial connection failed, reconnection will retry:', error);
        }
      });

    return () => {
      client.disconnect();
    };
  }, [client, agentId, agentInfo, debug]);

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

  // Show connection steps when connecting and no dossier loaded yet
  // This provides a nice animated loading experience on first connect
  const isInitialConnect = !state.dossier && state.connectionStep !== 'ready';
  if (isInitialConnect && state.connectionStep !== 'idle') {
    const agentName = agentInfo.dossier?.presentation?.brand?.name || agentId;
    return <ConnectionStepsScreen currentStep={state.connectionStep} agentName={agentName} />;
  }

  // Header content for SmartChat
  const chatHeader = (
    <ChatHeader
      agentId={agentId}
      agentInfo={agentInfo}
      dossier={state.dossier}
      connectionState={state.connectionState}
    />
  );

  return (
    <UhumView className="avatar-app">
      <main className="avatar-main avatar-main--with-chat">
        <ContentArea state={state} />
      </main>

      <SmartChat
        mode={chatMode}
        dockPosition={dockPosition}
        initialCorner="bottom-right"
        dockedSize={350}
        smartWidth={400}
        smartHeight={520}
        margin={40}
        minMargin={16}
        marginBreakpoint={768}
        minimized={chatMinimized}
        onMinimizedChange={setChatMinimized}
        onModeChange={setChatMode}
        onDockPositionChange={setDockPosition}
        header={chatHeader}
        showModeToggle={true}
        showDockControls={true}
        className="avatar-smart-chat"
      >
        <div className="avatar-chat-container">
          <div className="avatar-chat-messages">
            <ChatMessages state={state} />
          </div>
          <ChatInput onSend={handleSendMessage} disabled={!state.connected} />
        </div>
      </SmartChat>
    </UhumView>
  );
}
