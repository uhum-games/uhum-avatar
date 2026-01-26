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
// Core client
export { AvatarClient } from './avatar';
// React hooks
export { useAvatar, AvatarProvider } from './hooks/useAvatar';
export { useAgent } from './hooks/useAgent';
export { useList, getModelFacts, getModelDefinition, } from './hooks/useList';
// Components (re-export for convenience)
export { UhumView } from './components/UhumView';
export { MessageDisplay } from './components/MessageDisplay';
export { SmartChat, } from './components/SmartChat';
// Protocol (Uhum frame encoding/decoding)
export { Term, termToString, parseTerm, encodeFrame, decodeFrame, parseMessage, buildJoinMessage, buildIntentionMessage, buildTextMessage, buildLeaveMessage, } from './protocol';
// WASM utilities
export { loadWasm, isWasmLoaded, isWasmSupported, } from './wasm';
// Directory service
export { DirectoryClient, createMockDirectory, DirectoryError, } from './directory';
// Presentation layer (view rendering)
export { 
// State management
PresentationStateManager, createPresentationStateManager, 
// View selection engine
PresentationEngine, createPresentationEngine, filterFactsBySource, getContextItem, 
// Component registry
registerComponent, getComponentRenderer, hasComponentRenderer, getRegisteredTypes, renderComponent, 
// UI Components
ListComponent, GridComponent, DetailComponent, FormComponent, DashboardComponent, ChatComponent, 
// Main renderer
ViewRenderer, } from './presentation';
//# sourceMappingURL=index.js.map