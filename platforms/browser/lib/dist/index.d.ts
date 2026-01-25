/**
 * @uhum/avatar - Uhum Avatar client for browsers
 *
 * The Avatar is the client-side runtime that connects to Uhum Agents
 * and renders the Uhum View interface.
 *
 * @example
 * ```typescript
 * import { AvatarClient, useAvatar, useAgent } from '@uhum/avatar';
 *
 * // Direct usage
 * const avatar = new AvatarClient();
 * await avatar.connect('wss://agent.example.com/acme.billing');
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
export { AvatarClient, type AvatarClientOptions, type ReconnectOptions } from './avatar';
export type { AvatarState, Message, MessageType, Modal, LoadingState, ConnectionState, ConnectionStep, AgentDossier, DossierIdentity, DossierIntent, DossierParam, DossierPresentation, DossierBrand, DossierHomeSection, DossierView, DossierViewType, DossierViewColumn, DossierViewAction, DossierViewFilter, DossierLayoutHint, } from './types';
export { useAvatar, AvatarProvider, type AvatarContextValue } from './hooks/useAvatar';
export { useAgent, type UseAgentResult } from './hooks/useAgent';
export { UhumView } from './components/UhumView';
export { MessageDisplay } from './components/MessageDisplay';
export { SmartChat, type SmartChatProps, type DockPosition, type Corner, } from './components/SmartChat';
export { Term, termToString, parseTerm, encodeFrame, decodeFrame, parseMessage, buildJoinMessage, buildIntentionMessage, buildTextMessage, buildLeaveMessage, type UhumFrame, type UhumMessage, type MessageType as ProtocolMessageType, } from './protocol';
export { loadWasm, isWasmLoaded, isWasmSupported, type WasmModule, } from './wasm';
export { DirectoryClient, createMockDirectory, DirectoryError, type DirectoryClientOptions, type AgentInfo, type AgentDossier as DirectoryAgentDossier, type AgentIntent as DirectoryAgentIntent, } from './directory';
//# sourceMappingURL=index.d.ts.map