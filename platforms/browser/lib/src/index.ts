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
export { AvatarClient, type AvatarClientOptions, type ReconnectOptions } from './avatar';

// Types
export type {
  AvatarState,
  Message,
  MessageType,
  Modal,
  LoadingState,
  ConnectionState,
  ConnectionStep,
  AgentDossier,
  DossierIdentity,
  DossierIntent,
  DossierParam,
  DossierPresentation,
  DossierBrand,
  DossierHomeSection,
  DossierView,
  DossierViewType,
  DossierViewColumn,
  DossierViewAction,
  DossierViewFilter,
  DossierLayoutHint,
  // New types
  DossierModel,
  DossierModelField,
  DossierComponent,
  DossierField,
  DossierFieldType,
  FactsStore,
  ListCache,
} from './types';

// React hooks
export { useAvatar, AvatarProvider, type AvatarContextValue } from './hooks/useAvatar';
export { useAgent, type UseAgentResult } from './hooks/useAgent';
export {
  useList,
  getModelFacts,
  getModelDefinition,
  type UseListOptions,
  type UseListResult,
} from './hooks/useList';

// Components (re-export for convenience)
export { UhumView } from './components/UhumView';
export { MessageDisplay } from './components/MessageDisplay';
export {
  SmartChat,
  type SmartChatProps,
  type DockPosition,
  type Corner,
} from './components/SmartChat';

// Protocol (Uhum frame encoding/decoding)
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

// Directory service
export {
  DirectoryClient,
  createMockDirectory,
  DirectoryError,
  type DirectoryClientOptions,
  type AgentInfo,
  type AgentDossier as DirectoryAgentDossier,
  type AgentIntent as DirectoryAgentIntent,
} from './directory';

// Presentation layer (view rendering)
export {
  // State management
  PresentationStateManager,
  createPresentationStateManager,
  type PresentationState,
  type PresentationValue,
  
  // View selection engine
  PresentationEngine,
  createPresentationEngine,
  filterFactsBySource,
  getContextItem,
  type ViewSelectionResult,
  
  // Component registry
  registerComponent,
  getComponentRenderer,
  hasComponentRenderer,
  getRegisteredTypes,
  renderComponent,
  type ComponentRenderProps,
  type ComponentRenderer,
  
  // UI Components
  ListComponent,
  GridComponent,
  DetailComponent,
  FormComponent,
  DashboardComponent,
  ChatComponent,
  
  // Main renderer
  ViewRenderer,
  type ViewRendererProps,
} from './presentation';
