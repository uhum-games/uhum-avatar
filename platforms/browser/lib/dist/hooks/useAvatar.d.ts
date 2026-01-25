/**
 * useAvatar - React hook for Avatar state management.
 *
 * Provides access to the Avatar's reactive state and dispatch function.
 */
import React from 'react';
import { AvatarClient, AvatarClientOptions } from '../avatar';
import { AvatarState, Action } from '../types';
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
export declare function AvatarProvider({ options, children }: AvatarProviderProps): import("react/jsx-runtime").JSX.Element;
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
export declare function useAvatar(): AvatarContextValue;
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
export declare function useAvatarSelector<T>(selector: (state: AvatarState) => T): T;
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
 *     await client.connect('wss://agent.example.com/acme.billing');
 *   };
 *
 *   return <button onClick={handleConnect}>Connect</button>;
 * }
 * ```
 */
export declare function useAvatarClient(): AvatarClient;
//# sourceMappingURL=useAvatar.d.ts.map