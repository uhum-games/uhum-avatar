import { jsx as _jsx } from "react/jsx-runtime";
/**
 * useAvatar - React hook for Avatar state management.
 *
 * Provides access to the Avatar's reactive state and dispatch function.
 */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AvatarClient } from '../avatar';
import { createInitialState } from '../types';
const AvatarContext = createContext(null);
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
export function AvatarProvider({ options, children }) {
    // Create client once
    const client = useMemo(() => new AvatarClient(options), []);
    // Track state
    const [state, setState] = useState(createInitialState);
    // Subscribe to state changes
    useEffect(() => {
        const unsubscribe = client.subscribe((newState) => {
            setState(newState);
        });
        return unsubscribe;
    }, [client]);
    // Dispatch function
    const dispatch = useCallback((action) => {
        client.dispatch(action);
    }, [client]);
    const value = useMemo(() => ({ state, dispatch, client }), [state, dispatch, client]);
    return _jsx(AvatarContext.Provider, { value: value, children: children });
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
export function useAvatar() {
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
export function useAvatarSelector(selector) {
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
 *     await client.connect('wss://agent.example.com/acme.billing');
 *   };
 *
 *   return <button onClick={handleConnect}>Connect</button>;
 * }
 * ```
 */
export function useAvatarClient() {
    const { client } = useAvatar();
    return client;
}
//# sourceMappingURL=useAvatar.js.map