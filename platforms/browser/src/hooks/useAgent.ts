/**
 * useAgent - React hook for Agent connection management.
 *
 * Manages the connection lifecycle and provides methods for
 * sending intentions and messages to the Agent.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAvatarClient, useAvatarSelector } from './useAvatar';

/**
 * Result of the useAgent hook.
 */
export interface UseAgentResult {
  /** Whether connected to the agent */
  connected: boolean;
  /** Whether currently connecting */
  connecting: boolean;
  /** Connection error (if any) */
  error: Error | null;
  /** Connect to the agent */
  connect: () => Promise<void>;
  /** Disconnect from the agent */
  disconnect: () => void;
  /** Send an intention to the agent */
  sendIntention: (intent: string, params?: Record<string, unknown>) => void;
  /** Send a text message to the agent */
  sendMessage: (text: string) => void;
}

/**
 * Hook for managing an Agent connection.
 *
 * @param agentUrl - WebSocket URL of the Agent (e.g., 'wss://agent.example.com/acme.billing')
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function InvoiceApp() {
 *   const { connected, connecting, connect, sendIntention } = useAgent(
 *     'wss://agent.example.com/acme.billing'
 *   );
 *
 *   useEffect(() => {
 *     connect();
 *   }, [connect]);
 *
 *   const handlePayInvoice = (invoiceId: string) => {
 *     sendIntention('pay_invoice', { invoice_id: invoiceId });
 *   };
 *
 *   if (connecting) return <Loading />;
 *   if (!connected) return <ConnectionError />;
 *
 *   return <InvoiceList onPay={handlePayInvoice} />;
 * }
 * ```
 */
export function useAgent(
  agentUrl: string,
  options?: { autoConnect?: boolean }
): UseAgentResult {
  const client = useAvatarClient();
  const connectionState = useAvatarSelector((state) => state.connectionState);
  const [error, setError] = useState<Error | null>(null);

  const connected = connectionState === 'connected';
  const connecting = connectionState === 'connecting';

  const connect = useCallback(async () => {
    setError(null);
    try {
      await client.connect(agentUrl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [client, agentUrl]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  const sendIntention = useCallback(
    (intent: string, params: Record<string, unknown> = {}) => {
      client.sendIntention(intent, params);
    },
    [client]
  );

  const sendMessage = useCallback(
    (text: string) => {
      client.sendMessage(text);
    },
    [client]
  );

  // Auto-connect if enabled
  useEffect(() => {
    if (options?.autoConnect && !connected && !connecting && !error) {
      connect();
    }
  }, [options?.autoConnect, connected, connecting, error, connect]);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    sendIntention,
    sendMessage,
  };
}
