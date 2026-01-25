/**
 * useAgent - React hook for Agent connection management.
 *
 * Manages the connection lifecycle and provides methods for
 * sending intentions and messages to the Agent.
 */
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
export declare function useAgent(agentUrl: string, options?: {
    autoConnect?: boolean;
}): UseAgentResult;
//# sourceMappingURL=useAgent.d.ts.map