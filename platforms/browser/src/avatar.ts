/**
 * Avatar Client - Main entry point for browser applications.
 *
 * The AvatarClient manages:
 * - WebSocket connection to the Brain
 * - State management (reactive, event-driven)
 * - View instruction processing
 * - Scheduled effects (timers)
 */

import {
  AvatarState,
  Action,
  ConnectionState,
  ViewInstruction,
  createInitialState,
  avatarReducer,
} from './types';

/**
 * Options for creating an AvatarClient.
 */
export interface AvatarClientOptions {
  /** Initial route */
  initialRoute?: string;
  /** Enable debug logging */
  debug?: boolean;
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
 * await avatar.connect('wss://brain.example.com/acme.billing');
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

  constructor(options: AvatarClientOptions = {}) {
    this.options = options;
    this.state = createInitialState();

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
   * Process view instructions from the Brain.
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
   * Connect to an Agent via WebSocket.
   */
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connecting' });

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.log('WebSocket connected');
        this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
        this.dispatch({ type: 'SET_CONNECTED', connected: true, agentId: url });
        resolve();
      };

      this.socket.onclose = () => {
        this.log('WebSocket disconnected');
        this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'disconnected' });
        this.dispatch({ type: 'SET_CONNECTED', connected: false });
      };

      this.socket.onerror = (error) => {
        this.log('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Disconnect from the Agent.
   */
  disconnect(): void {
    if (this.socket) {
      this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'closing' });
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Send an intention to the Agent.
   */
  sendIntention(intent: string, params: Record<string, unknown> = {}): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send intention: not connected');
      return;
    }

    const message = {
      type: 'INTENTION',
      intent,
      params,
    };

    this.socket.send(JSON.stringify(message));
    this.log('Sent intention:', message);
  }

  /**
   * Send a text message to the Agent.
   */
  sendMessage(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send message: not connected');
      return;
    }

    const message = {
      type: 'MESSAGE',
      text,
    };

    this.socket.send(JSON.stringify(message));
    this.log('Sent message:', message);
  }

  // === Private methods ===

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.log('Received message:', message);

      switch (message.type) {
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
          break;

        default:
          this.log('Unknown message type:', message.type);
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
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
          messageType: (instruction.messageType as string) || 'info',
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
