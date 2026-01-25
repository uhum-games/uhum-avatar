/**
 * useAvatar - React hook for Avatar state management.
 *
 * Provides access to the Avatar's reactive state and dispatch function.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AvatarClient, AvatarClientOptions } from '../avatar';
import { AvatarState, Action, createInitialState } from '../types';

/**
 * Avatar context value.
 */
export interface AvatarContextValue {
  /** Current avatar state */
  state: AvatarState;
  /** Dispatch an action to update state */
  dispatch: (action: Action) => void;
  /** The underlying Avatar client */
  client: AvatarClient;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

/**
 * Props for the AvatarProvider component.
 */
export interface AvatarProviderProps {
  /** Avatar client options */
  options?: AvatarClientOptions;
  /** Child components */
  children: React.ReactNode;
}

/**
 * Provider component that makes Avatar state available to child components.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AvatarProvider options={{ debug: true }}>
 *       <MyComponent />
 *     </AvatarProvider>
 *   );
 * }
 * ```
 */
export function AvatarProvider({ options, children }: AvatarProviderProps) {
  // Create client once
  const client = useMemo(() => new AvatarClient(options), []);

  // Track state
  const [state, setState] = useState<AvatarState>(createInitialState);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = client.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [client]);

  // Dispatch function
  const dispatch = useCallback(
    (action: Action) => {
      client.dispatch(action);
    },
    [client]
  );

  const value: AvatarContextValue = useMemo(
    () => ({ state, dispatch, client }),
    [state, dispatch, client]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

/**
 * Hook to access Avatar state and dispatch.
 *
 * Must be used within an AvatarProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, dispatch } = useAvatar();
 *
 *   return (
 *     <div>
 *       <p>Current route: {state.currentRoute}</p>
 *       <button onClick={() => dispatch({ type: 'NAVIGATE', route: '/home' })}>
 *         Go Home
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAvatar(): AvatarContextValue {
  const context = useContext(AvatarContext);

  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }

  return context;
}

/**
 * Hook to select a slice of Avatar state.
 *
 * Only re-renders when the selected value changes.
 *
 * @example
 * ```tsx
 * function MessageDisplay() {
 *   const message = useAvatarSelector(state => state.message);
 *
 *   if (!message) return null;
 *   return <div className={message.messageType}>{message.text}</div>;
 * }
 * ```
 */
export function useAvatarSelector<T>(selector: (state: AvatarState) => T): T {
  const { state } = useAvatar();
  return selector(state);
}

/**
 * Hook to get the Avatar client directly.
 *
 * Useful for imperative operations like connect/disconnect.
 *
 * @example
 * ```tsx
 * function ConnectButton() {
 *   const client = useAvatarClient();
 *
 *   const handleConnect = async () => {
 *     await client.connect('wss://brain.example.com/acme.billing');
 *   };
 *
 *   return <button onClick={handleConnect}>Connect</button>;
 * }
 * ```
 */
export function useAvatarClient(): AvatarClient {
  const { client } = useAvatar();
  return client;
}
