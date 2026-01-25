/**
 * @uhum/avatar - Uhum Avatar client for browsers
 *
 * The Avatar is the client-side runtime that connects to UHUM Agents (Brains)
 * and renders the Uhum View interface.
 *
 * @example
 * ```typescript
 * import { AvatarClient, useAvatar, useAgent } from '@uhum/avatar';
 *
 * // Direct usage
 * const avatar = new AvatarClient();
 * await avatar.connect('wss://brain.example.com/acme.billing');
 *
 * // React hooks
 * function App() {
 *   const { state, dispatch } = useAvatar();
 *   const { connected, sendIntention } = useAgent('acme.billing');
 *
 *   return <UhumView state={state} />;
 * }
 * ```
 */

// Core client
export { AvatarClient, type AvatarClientOptions } from './avatar';

// Types
export type {
  AvatarState,
  Message,
  MessageType,
  Modal,
  LoadingState,
  ConnectionState,
} from './types';

// React hooks
export { useAvatar, AvatarProvider, type AvatarContextValue } from './hooks/useAvatar';
export { useAgent, type UseAgentResult } from './hooks/useAgent';

// Components (re-export for convenience)
export { UhumView } from './components/UhumView';
export { MessageDisplay } from './components/MessageDisplay';

// Protocol (UHUM frame encoding/decoding)
export {
  Term,
  termToString,
  parseTerm,
  encodeFrame,
  decodeFrame,
  parseMessage,
  buildJoinMessage,
  buildIntentionMessage,
  buildTextMessage,
  buildLeaveMessage,
  type UhumFrame,
  type UhumMessage,
  type MessageType as ProtocolMessageType,
} from './protocol';

// WASM utilities
export {
  loadWasm,
  isWasmLoaded,
  isWasmSupported,
  type WasmModule,
} from './wasm';
