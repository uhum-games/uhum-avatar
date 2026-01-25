/**
 * Avatar Client - Main entry point for browser applications.
 *
 * The AvatarClient manages:
 * - WebSocket connection to the Agent (using Uhum protocol)
 * - State management (reactive, event-driven)
 * - View instruction processing
 * - Scheduled effects (timers)
 */

import {
  AvatarState,
  Action,
  ViewInstruction,
  MessageType,
  createInitialState,
  avatarReducer,
} from './types';
import {
  parseMessage,
  buildJoinMessage,
  buildIntentionMessage,
  buildTextMessage,
  buildLeaveMessage,
  buildAckMessage,
  extractDecisionFacts,
  extractViewInstructions,
  extractMemoryEvents,
  extractDossierFromWelcome,
  termToObject,
  UhumMessage,
  Term,
} from './protocol';

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
 * Scheduled effect (timer).
 */
interface ScheduledEffect {
  id: string;
  timerId: ReturnType<typeof setTimeout>;
  action: Action;
}

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
export class AvatarClient {
  private state: AvatarState;
  private subscribers: Set<Subscriber> = new Set();
  private scheduledEffects: Map<string, ScheduledEffect> = new Map();
  private socket: WebSocket | null = null;
  private options: AvatarClientOptions;
  private sessionId: string;
  private agentAddress: string = '';
  private lastCursor: number = 0;

  // Reconnection state
  private wsUrl: string = '';
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean = true;
  private isIntentionalDisconnect: boolean = false;

  // Default reconnection options
  private readonly reconnectOptions: Required<ReconnectOptions>;

  constructor(options: AvatarClientOptions = {}) {
    this.options = options;
    this.state = createInitialState();
    this.sessionId = options.sessionId || `ses_${Date.now().toString(36)}`;

    // Initialize reconnection options with defaults
    this.reconnectOptions = {
      enabled: options.reconnect?.enabled ?? true,
      initialDelayMs: options.reconnect?.initialDelayMs ?? 1000,
      maxDelayMs: options.reconnect?.maxDelayMs ?? 30000,
      backoffMultiplier: options.reconnect?.backoffMultiplier ?? 2,
      maxAttempts: options.reconnect?.maxAttempts ?? Infinity,
    };

    if (options.initialRoute) {
      this.state.currentRoute = options.initialRoute;
    }
  }

  /**
   * Get the current state.
   */
  getState(): AvatarState {
    return this.state;
  }

  /**
   * Subscribe to state changes.
   *
   * @returns Unsubscribe function
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Dispatch an action to update state.
   */
  dispatch(action: Action): void {
    this.log('Dispatching action:', action);

    const newState = avatarReducer(this.state, action);
    this.state = newState;

    // Notify subscribers
    this.subscribers.forEach((callback) => callback(newState));

    // Handle side effects
    this.handleSideEffects(action);
  }

  /**
   * Process view instructions from the Agent.
   */
  processInstructions(instructions: ViewInstruction[]): void {
    for (const instruction of instructions) {
      const { action, effects } = this.instructionToAction(instruction);

      if (action) {
        this.dispatch(action);
      }

      // Schedule effects
      for (const effect of effects) {
        this.scheduleEffect(effect.id, effect.delayMs, effect.action);
      }
    }
  }

  /**
   * Connect to an Agent via WebSocket using Uhum protocol.
   *
   * @param url - WebSocket URL (e.g., 'ws://localhost:8080')
   * @param agentAddress - Agent address (e.g., 'acme.billing')
   */
  async connect(url: string, agentAddress?: string): Promise<void> {
    // Store connection params for reconnection
    this.wsUrl = url;
    this.agentAddress = agentAddress || this.extractAgentAddress(url);
    this.isIntentionalDisconnect = false;
    this.shouldReconnect = true;

    // Set initial connection step (locating is done by App before calling connect)
    this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'locating' });

    // Clear any pending reconnect
    this.clearReconnectTimeout();

    return this.doConnect();
  }

  /**
   * Internal connect method (used for initial connection and reconnection).
   */
  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set connection state and step
      this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connecting' });
      this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'connecting' });

      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.log('WebSocket connected, sending JOIN');

        // Clear any pending reconnect timeout (prevents stale reconnects)
        this.clearReconnectTimeout();

        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;

        // Update step to greeting (waiting for WELCOME)
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'greeting' });

        // Send JOIN message using Uhum protocol
        const joinMsg = buildJoinMessage({
          avatarId: this.sessionId,
          agentAddress: this.agentAddress,
          capabilities: ['memory_sync', 'intentions'],
          // Include cursor for resumption if we have one
          resumeCursor: this.lastCursor > 0 ? this.lastCursor : undefined,
        });

        this.log('Sending JOIN:', joinMsg);
        this.socket!.send(joinMsg);
      };

      this.socket.onclose = (event) => {
        this.log('WebSocket disconnected', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'disconnected' });
        this.dispatch({ type: 'SET_CONNECTED', connected: false });
        
        // Reset step based on whether we have a dossier loaded
        // If dossier is loaded, stay at 'ready', otherwise go to 'idle'
        const hasDossier = this.state.dossier !== null;
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: hasDossier ? 'ready' : 'idle' });

        // Attempt reconnection if not intentional disconnect
        if (!this.isIntentionalDisconnect && this.shouldReconnect && this.reconnectOptions.enabled) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        this.log('WebSocket error:', error);
        // Don't reject here - let onclose handle reconnection
        // Only reject if this is the initial connection attempt
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data, resolve, reject);
      };
    });
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOptions.maxAttempts) {
      this.log(`Max reconnection attempts (${this.reconnectOptions.maxAttempts}) reached, giving up`);
      this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'failed' });
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectOptions.initialDelayMs * Math.pow(this.reconnectOptions.backoffMultiplier, this.reconnectAttempts),
      this.reconnectOptions.maxDelayMs
    );

    this.reconnectAttempts++;
    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'reconnecting' });

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      
      // Safety check: don't reconnect if already connected
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.log('Already connected, skipping reconnection');
        return;
      }
      
      this.log(`Attempting reconnection (attempt ${this.reconnectAttempts})`);
      
      this.doConnect().catch((error) => {
        this.log('Reconnection failed:', error);
        // onclose will handle scheduling next attempt
      });
    }, delay);
  }

  /**
   * Clear any pending reconnection timeout.
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Disconnect from the Agent.
   * 
   * @param intentional - If true, won't attempt to reconnect (default: true)
   */
  disconnect(intentional: boolean = true): void {
    this.isIntentionalDisconnect = intentional;
    
    // Clear any pending reconnection
    this.clearReconnectTimeout();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Send LEAVE message
      const leaveMsg = buildLeaveMessage(this.sessionId, this.agentAddress);
      this.socket.send(leaveMsg);

      this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'closing' });
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Reset reconnection state
    this.reconnectAttempts = 0;

    // Reset step based on whether we have dossier loaded
    // Keeps dossier so UI can still show agent info while disconnected
    const hasDossier = this.state.dossier !== null;
    this.dispatch({ type: 'SET_CONNECTION_STEP', step: hasDossier ? 'ready' : 'idle' });
  }

  /**
   * Stop reconnection attempts without disconnecting.
   */
  stopReconnecting(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();
  }

  /**
   * Get current reconnection state.
   */
  getReconnectState(): { attempts: number; isReconnecting: boolean } {
    return {
      attempts: this.reconnectAttempts,
      isReconnecting: this.reconnectTimeoutId !== null,
    };
  }

  /**
   * Send an intention to the Agent.
   */
  sendIntention(intent: string, params: Record<string, unknown> = {}): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send intention: not connected');
      return;
    }

    const intentionMsg = buildIntentionMessage({
      avatarId: this.sessionId,
      agentAddress: this.agentAddress,
      intent,
      params,
    });

    this.log('Sending INTENTION:', intentionMsg);
    this.socket.send(intentionMsg);
  }

  /**
   * Send a text message to the Agent (for NLU processing).
   */
  sendMessage(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send message: not connected');
      return;
    }

    const textMsg = buildTextMessage({
      avatarId: this.sessionId,
      agentAddress: this.agentAddress,
      text,
    });

    this.log('Sending MESSAGE:', textMsg);
    this.socket.send(textMsg);
  }

  // === Private methods ===

  private extractAgentAddress(url: string): string {
    // Try to extract from URL path, fallback to 'default.agent'
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.slice(1); // Remove leading /
      return path || 'default.agent';
    } catch {
      return 'default.agent';
    }
  }

  private handleMessage(
    data: string,
    resolveConnect?: () => void,
    rejectConnect?: (error: Error) => void
  ): void {
    try {
      this.log('Received raw message:', data);

      const message = parseMessage(data);
      this.log('Parsed message:', message.type, message);

      switch (message.type) {
        case 'welcome':
          this.handleWelcome(message);
          if (resolveConnect) {
            this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
            this.dispatch({
              type: 'SET_CONNECTED',
              connected: true,
              agentId: this.agentAddress,
            });
            resolveConnect();
          }
          break;

        case 'decision':
          this.handleDecision(message);
          break;

        case 'memory':
          this.handleMemory(message);
          break;

        case 'error':
          const errorMessage = this.handleError(message);
          if (rejectConnect) {
            rejectConnect(new Error(errorMessage));
          }
          break;

        case 'pong':
          // Keep-alive response, ignore
          break;

        default:
          this.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      this.log('Failed to parse message:', error, 'Raw:', data);

      // Try to handle as JSON for backward compatibility with mock server
      this.handleLegacyJsonMessage(data, resolveConnect, rejectConnect);
    }
  }

  private handleLegacyJsonMessage(
    data: string,
    resolveConnect?: () => void,
    rejectConnect?: (error: Error) => void
  ): void {
    try {
      const message = JSON.parse(data);
      this.log('Handling legacy JSON message:', message);

      switch (message.type) {
        case 'WELCOME':
          this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
          this.dispatch({
            type: 'SET_CONNECTED',
            connected: true,
            agentId: this.agentAddress,
          });
          if (resolveConnect) resolveConnect();
          break;

        case 'DECISION':
          if (message.facts) {
            this.dispatch({ type: 'UPDATE_FACTS', facts: message.facts });
          }
          if (message.viewInstructions) {
            this.processInstructions(message.viewInstructions);
          }
          break;

        case 'MEMORY':
          if (message.events) {
            this.dispatch({ type: 'UPDATE_FACTS', facts: message.events });
          }
          break;

        case 'ERROR':
          this.dispatch({
            type: 'SHOW_MESSAGE',
            text: message.message || 'An error occurred',
            messageType: 'error',
          });
          if (rejectConnect) rejectConnect(new Error(message.message));
          break;
      }
    } catch {
      this.log('Message is neither Uhum nor JSON, ignoring');
    }
  }

  private handleWelcome(message: UhumMessage): void {
    this.log('Received WELCOME:', message);

    // Update connection step - loading dossier
    this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'loading' });

    // Extract cursor from welcome message
    if (message.cursor !== undefined) {
      this.lastCursor = message.cursor;
    }

    // Extract dossier from body if available
    if (message.body) {
      const dossier = extractDossierFromWelcome(message.body);
      if (dossier) {
        this.log('Parsed dossier:', dossier);
        this.dispatch({ type: 'SET_DOSSIER', dossier });
      } else {
        this.log('No dossier in WELCOME message');
      }
    }

    // Connection is now ready
    this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'ready' });
  }

  private handleDecision(message: UhumMessage): void {
    this.log('Received DECISION:', message);

    if (!message.body) return;

    // Extract facts
    const facts = extractDecisionFacts(message.body);
    if (facts.length > 0) {
      const factsAsObjects = facts.map(termToObject);
      this.log('Decision facts:', factsAsObjects);
      this.dispatch({ type: 'UPDATE_FACTS', facts: factsAsObjects });
    }

    // Extract view instructions - Brain controls what to show
    const instructions = extractViewInstructions(message.body);
    if (instructions.length > 0) {
      const viewInstructions = this.termInstructionsToViewInstructions(instructions);
      this.log('View instructions:', viewInstructions);
      this.processInstructions(viewInstructions);
    }

    // Only show rejection messages (errors are important feedback)
    // Success messages should come from view_instructions if the Brain wants to show them
    if (message.body.type === 'compound' && message.body.functor === 'decision') {
      const status = message.body.args[0];
      if (status?.type === 'atom' && status.value === 'rejected') {
        const reason = message.body.args[2];
        const reasonText = reason?.type === 'string' ? reason.value : 'Request rejected';
        this.dispatch({
          type: 'SHOW_MESSAGE',
          text: reasonText,
          messageType: 'error',
        });
      }
    }
  }

  private handleMemory(message: UhumMessage): void {
    this.log('Received MEMORY:', message);

    // Update cursor
    if (message.cursorEnd !== undefined) {
      this.lastCursor = message.cursorEnd;

      // Send ACK
      const ackMsg = buildAckMessage(this.sessionId, this.agentAddress, this.lastCursor);
      this.socket?.send(ackMsg);
    }

    if (!message.body) return;

    // Extract events
    const events = extractMemoryEvents(message.body);
    if (events.length > 0) {
      const eventsAsObjects = events.map(termToObject);
      this.log('Memory events:', eventsAsObjects);
      this.dispatch({ type: 'UPDATE_FACTS', facts: eventsAsObjects });
    }
  }

  private handleError(message: UhumMessage): string {
    this.log('Received ERROR:', message);

    let errorCode = 'unknown_error';
    let errorText = 'An error occurred';

    // Parse error(code, message, details) term
    if (message.body?.type === 'compound' && message.body.functor === 'error') {
      const [codeArg, msgArg] = message.body.args;

      // First arg is the error code (atom)
      if (codeArg?.type === 'atom') {
        errorCode = codeArg.value;
      }

      // Second arg is the error message (string)
      if (msgArg?.type === 'string') {
        errorText = msgArg.value;
      }
    }

    this.log(`Error [${errorCode}]: ${errorText}`);

    this.dispatch({
      type: 'SHOW_MESSAGE',
      text: errorText,
      messageType: 'error',
    });

    return `[${errorCode}] ${errorText}`;
  }

  private termInstructionsToViewInstructions(terms: Term[]): ViewInstruction[] {
    return terms.map((term) => {
      if (term.type !== 'compound') {
        return { type: 'unknown' };
      }

      const instruction: ViewInstruction = { type: term.functor };

      // Parse common instruction patterns
      switch (term.functor) {
        case 'message':
          // message(Type, Text) or message(Type, Text, duration(Ms))
          instruction.messageType = term.args[0]?.type === 'atom' ? term.args[0].value : 'info';
          instruction.text = term.args[1]?.type === 'string' ? term.args[1].value : '';
          if (term.args[2]?.type === 'compound' && term.args[2].functor === 'duration') {
            instruction.duration = term.args[2].args[0]?.type === 'number'
              ? term.args[2].args[0].value
              : undefined;
          }
          break;

        case 'navigate':
          instruction.route = term.args[0]?.type === 'atom' ? term.args[0].value : '';
          break;

        case 'highlight':
          instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
          if (term.args[1]?.type === 'compound' && term.args[1].functor === 'duration') {
            instruction.duration = term.args[1].args[0]?.type === 'number'
              ? term.args[1].args[0].value
              : undefined;
          }
          break;

        case 'scroll_to':
          instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
          break;

        case 'focus':
          instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
          break;

        case 'loading':
          instruction.show = term.args[0]?.type === 'atom' ? term.args[0].value === 'true' : true;
          instruction.message = term.args[1]?.type === 'string' ? term.args[1].value : '';
          break;

        case 'modal':
          instruction.name = term.args[0]?.type === 'atom' ? term.args[0].value : '';
          instruction.data = term.args[1] ? termToObject(term.args[1]) : undefined;
          break;

        case 'close_modal':
          // No additional args
          break;

        case 'go_back':
          // No additional args
          break;
      }

      return instruction;
    });
  }

  private instructionToAction(
    instruction: ViewInstruction
  ): { action: Action | null; effects: Array<{ id: string; delayMs: number; action: Action }> } {
    const effects: Array<{ id: string; delayMs: number; action: Action }> = [];

    switch (instruction.type) {
      case 'message': {
        const action: Action = {
          type: 'SHOW_MESSAGE',
          text: instruction.text as string,
          messageType: (instruction.messageType as MessageType) || 'info',
        };

        if (instruction.duration) {
          effects.push({
            id: 'message',
            delayMs: instruction.duration as number,
            action: { type: 'HIDE_MESSAGE' },
          });
        }

        return { action, effects };
      }

      case 'navigate':
        return {
          action: { type: 'NAVIGATE', route: instruction.route as string },
          effects,
        };

      case 'go_back':
        return { action: { type: 'GO_BACK' }, effects };

      case 'scroll_to':
        // Scroll is handled as a side effect
        this.scrollToElement(instruction.elementRef as string);
        return { action: null, effects };

      case 'focus':
        return {
          action: { type: 'FOCUS', elementRef: instruction.elementRef as string },
          effects,
        };

      case 'highlight': {
        const action: Action = {
          type: 'HIGHLIGHT',
          elementRef: instruction.elementRef as string,
        };

        if (instruction.duration) {
          effects.push({
            id: `highlight_${instruction.elementRef}`,
            delayMs: instruction.duration as number,
            action: { type: 'CLEAR_HIGHLIGHT', elementRef: instruction.elementRef as string },
          });
        }

        return { action, effects };
      }

      case 'modal':
        return {
          action: {
            type: 'SHOW_MODAL',
            name: instruction.name as string,
            data: instruction.data,
          },
          effects,
        };

      case 'close_modal':
        return { action: { type: 'CLOSE_MODAL' }, effects };

      case 'loading':
        if (instruction.show) {
          return {
            action: { type: 'SHOW_LOADING', message: instruction.message as string },
            effects,
          };
        } else {
          return { action: { type: 'HIDE_LOADING' }, effects };
        }

      default:
        this.log('Unknown instruction type:', instruction.type);
        return { action: null, effects };
    }
  }

  private handleSideEffects(action: Action): void {
    // Handle scroll effect
    if (action.type === 'SCROLL_TO') {
      this.scrollToElement(action.elementRef);
    }

    // Handle focus effect
    if (action.type === 'FOCUS') {
      this.focusElement(action.elementRef);
    }
  }

  private scrollToElement(elementRef: string): void {
    const element =
      document.getElementById(elementRef) ||
      document.querySelector(`[data-ref="${elementRef}"]`);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      this.log('Element not found for scroll:', elementRef);
    }
  }

  private focusElement(elementRef: string): void {
    const element =
      document.getElementById(elementRef) ||
      document.querySelector(`[data-ref="${elementRef}"]`);

    if (element instanceof HTMLElement) {
      element.focus();
    } else {
      this.log('Element not found for focus:', elementRef);
    }
  }

  private scheduleEffect(id: string, delayMs: number, action: Action): void {
    // Cancel existing effect with same ID
    this.cancelEffect(id);

    const timerId = setTimeout(() => {
      this.scheduledEffects.delete(id);
      this.dispatch(action);
    }, delayMs);

    this.scheduledEffects.set(id, { id, timerId, action });
  }

  private cancelEffect(id: string): void {
    const effect = this.scheduledEffects.get(id);
    if (effect) {
      clearTimeout(effect.timerId);
      this.scheduledEffects.delete(id);
    }
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[Avatar]', ...args);
    }
  }
}
