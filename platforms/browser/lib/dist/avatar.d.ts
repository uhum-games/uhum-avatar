/**
 * Avatar Client - Main entry point for browser applications.
 *
 * The AvatarClient manages:
 * - WebSocket connection to the Agent (using Uhum protocol)
 * - State management (reactive, event-driven)
 * - View instruction processing
 * - Scheduled effects (timers)
 */
import { AvatarState, Action, ViewInstruction } from './types';
/**
 * Reconnection configuration.
 */
export interface ReconnectOptions {
    /** Enable automatic reconnection (default: true) */
    enabled?: boolean;
    /** Initial delay in ms before first reconnect attempt (default: 1000) */
    initialDelayMs?: number;
    /** Maximum delay in ms between reconnect attempts (default: 30000) */
    maxDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** Maximum number of reconnection attempts (default: Infinity) */
    maxAttempts?: number;
}
/**
 * Options for creating an AvatarClient.
 */
export interface AvatarClientOptions {
    /** Initial route */
    initialRoute?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Session ID (defaults to random) */
    sessionId?: string;
    /** Reconnection options */
    reconnect?: ReconnectOptions;
}
/**
 * Subscription callback type.
 */
export type Subscriber = (state: AvatarState) => void;
/**
 * Avatar Client for browser applications.
 *
 * This is the main entry point for using the Avatar in a browser.
 * It manages state, WebSocket connection, and view instruction processing.
 *
 * @example
 * ```typescript
 * const avatar = new AvatarClient({ debug: true });
 *
 * // Subscribe to state changes
 * avatar.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 *
 * // Connect to an agent
 * await avatar.connect('ws://localhost:8080', 'quickstart.billing');
 *
 * // Send an intention
 * avatar.sendIntention('pay_invoice', { invoice_id: 'INV-123' });
 * ```
 */
export declare class AvatarClient {
    private state;
    private subscribers;
    private scheduledEffects;
    private socket;
    private options;
    private sessionId;
    private agentAddress;
    private lastCursor;
    private wsUrl;
    private reconnectAttempts;
    private reconnectTimeoutId;
    private shouldReconnect;
    private isIntentionalDisconnect;
    private readonly reconnectOptions;
    constructor(options?: AvatarClientOptions);
    /**
     * Get the current state.
     */
    getState(): AvatarState;
    /**
     * Subscribe to state changes.
     *
     * @returns Unsubscribe function
     */
    subscribe(callback: Subscriber): () => void;
    /**
     * Dispatch an action to update state.
     */
    dispatch(action: Action): void;
    /**
     * Process view instructions from the Agent.
     */
    processInstructions(instructions: ViewInstruction[]): void;
    /**
     * Connect to an Agent via WebSocket using Uhum protocol.
     *
     * @param url - WebSocket URL (e.g., 'ws://localhost:8080')
     * @param agentAddress - Agent address (e.g., 'acme.billing')
     */
    connect(url: string, agentAddress?: string): Promise<void>;
    /**
     * Internal connect method (used for initial connection and reconnection).
     */
    private doConnect;
    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect;
    /**
     * Clear any pending reconnection timeout.
     */
    private clearReconnectTimeout;
    /**
     * Disconnect from the Agent.
     *
     * @param intentional - If true, won't attempt to reconnect (default: true)
     */
    disconnect(intentional?: boolean): void;
    /**
     * Stop reconnection attempts without disconnecting.
     */
    stopReconnecting(): void;
    /**
     * Get current reconnection state.
     */
    getReconnectState(): {
        attempts: number;
        isReconnecting: boolean;
    };
    /**
     * Send an intention to the Agent.
     */
    sendIntention(intent: string, params?: Record<string, unknown>): void;
    /**
     * Send a text message to the Agent (for NLU processing).
     */
    sendMessage(text: string): void;
    private extractAgentAddress;
    private handleMessage;
    private handleLegacyJsonMessage;
    private handleWelcome;
    private handleDecision;
    private handleMemory;
    private handleError;
    private termInstructionsToViewInstructions;
    private instructionToAction;
    private handleSideEffects;
    private scrollToElement;
    private focusElement;
    private scheduleEffect;
    private cancelEffect;
    private log;
}
//# sourceMappingURL=avatar.d.ts.map