/**
 * Presentation State - Local UI state management for the Avatar
 * 
 * This manages the **presentation state** which is:
 * - Separate from agent/Brain state
 * - Controls which views and components are shown
 * - Reactively updates the UI when state changes
 * 
 * Key distinction:
 * - Agent state (facts, rules) → managed by Brain
 * - Presentation state (selected items, filters) → managed locally by Avatar
 */

import { AgentCardStateVariable } from '../types';

/**
 * Value types for presentation state variables.
 */
export type PresentationValue = 
  | null                           // Variable not set
  | string                         // Atom or string value
  | number                         // Number value
  | boolean                        // Boolean value
  | Record<string, unknown>;       // Model reference (object)

/**
 * Presentation state - holds UI state variables.
 * 
 * Each key is a variable name from the agent card's state schema.
 * Values can be null (not set), atoms, or model references.
 */
export type PresentationState = Record<string, PresentationValue>;

/**
 * Presentation state change callback.
 */
export type PresentationStateSubscriber = (state: PresentationState) => void;

/**
 * Presentation state action types.
 */
export type PresentationAction =
  | { type: 'SET_VALUE'; variable: string; value: PresentationValue }
  | { type: 'CLEAR_VALUE'; variable: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'INITIALIZE'; schema: AgentCardStateVariable[] };

/**
 * Reducer for presentation state.
 */
export function presentationReducer(
  state: PresentationState,
  action: PresentationAction
): PresentationState {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, [action.variable]: action.value };

    case 'CLEAR_VALUE':
      return { ...state, [action.variable]: null };

    case 'CLEAR_ALL':
      // Reset all values to null but keep keys
      const cleared: PresentationState = {};
      for (const key of Object.keys(state)) {
        cleared[key] = null;
      }
      return cleared;

    case 'INITIALIZE':
      // Initialize state from schema - all values start as null
      const initialized: PresentationState = {};
      for (const variable of action.schema) {
        initialized[variable.name] = null;
      }
      return initialized;

    default:
      return state;
  }
}

/**
 * PresentationStateManager - Manages local UI state for the Avatar.
 * 
 * This is a simple reactive state container that:
 * - Holds presentation state variables defined in the agentCard
 * - Notifies subscribers when state changes
 * - Is completely separate from Brain/agent state
 * 
 * @example
 * ```typescript
 * const manager = new PresentationStateManager();
 * 
 * // Initialize from agentCard schema
 * manager.initialize(agentCard.presentation?.state?.variables ?? []);
 * 
 * // Subscribe to changes
 * manager.subscribe((state) => {
 *   console.log('Presentation state changed:', state);
 * });
 * 
 * // Update state (e.g., when user selects a book)
 * manager.setValue('selected_book', { id: '123', title: 'The Book' });
 * 
 * // Clear a value
 * manager.clearValue('selected_book');
 * ```
 */
export class PresentationStateManager {
  private state: PresentationState = {};
  private schema: AgentCardStateVariable[] = [];
  private subscribers: Set<PresentationStateSubscriber> = new Set();

  /**
   * Initialize the state from an agent card state schema.
   * All variables start as null.
   */
  initialize(schema: AgentCardStateVariable[]): void {
    this.schema = schema;
    this.dispatch({ type: 'INITIALIZE', schema });
  }

  /**
   * Get the current state.
   */
  getState(): PresentationState {
    return this.state;
  }

  /**
   * Get the state schema.
   */
  getSchema(): AgentCardStateVariable[] {
    return this.schema;
  }

  /**
   * Get a specific variable's value.
   */
  getValue(variable: string): PresentationValue {
    return this.state[variable] ?? null;
  }

  /**
   * Check if a variable is set (not null).
   */
  isSet(variable: string): boolean {
    return this.state[variable] !== null && this.state[variable] !== undefined;
  }

  /**
   * Set a variable's value.
   */
  setValue(variable: string, value: PresentationValue): void {
    this.dispatch({ type: 'SET_VALUE', variable, value });
  }

  /**
   * Clear a variable's value (set to null).
   */
  clearValue(variable: string): void {
    this.dispatch({ type: 'CLEAR_VALUE', variable });
  }

  /**
   * Clear all values (reset to initial state).
   */
  clearAll(): void {
    this.dispatch({ type: 'CLEAR_ALL' });
  }

  /**
   * Subscribe to state changes.
   * @returns Unsubscribe function
   */
  subscribe(callback: PresentationStateSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Dispatch an action to update state.
   */
  private dispatch(action: PresentationAction): void {
    const newState = presentationReducer(this.state, action);
    
    // Only notify if state actually changed
    if (newState !== this.state) {
      this.state = newState;
      this.notifySubscribers();
    }
  }

  /**
   * Notify all subscribers of state change.
   */
  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }
}

/**
 * Create a new PresentationStateManager.
 */
export function createPresentationStateManager(): PresentationStateManager {
  return new PresentationStateManager();
}
