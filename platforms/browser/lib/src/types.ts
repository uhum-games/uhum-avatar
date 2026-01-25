/**
 * Avatar state types - mirrors the Rust AvatarState
 */

/**
 * Message types for user feedback.
 */
export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

/**
 * A message to display to the user.
 */
export interface Message {
  /** Message text */
  text: string;
  /** Message type (determines styling) */
  messageType: MessageType;
}

/**
 * Loading indicator state.
 */
export interface LoadingState {
  /** Optional message to show while loading */
  message?: string;
}

/**
 * Modal state.
 */
export interface Modal {
  /** Modal name/identifier */
  name: string;
  /** Data passed to the modal */
  data?: unknown;
}

/**
 * WebSocket connection state.
 */
export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'closing' 
  | 'reconnecting'
  | 'failed';

/**
 * Connection step for progress indication.
 */
export type ConnectionStep =
  | 'idle'
  | 'locating'      // Finding the agent
  | 'connecting'    // Opening WebSocket
  | 'greeting'      // Sent JOIN, waiting for WELCOME
  | 'loading'       // Parsing dossier
  | 'ready';        // All set!

/**
 * Agent intent from dossier.
 */
export interface DossierIntent {
  name: string;
  description?: string;
  params?: DossierParam[];
  effects?: string[];
}

/**
 * Intent parameter from dossier.
 */
export interface DossierParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/**
 * Brand info from dossier presentation.
 */
export interface DossierBrand {
  name?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  tone?: string;
  /** Greeting messages to show when chat is empty */
  greetings?: string[];
}

/**
 * Home section from dossier presentation.
 */
export interface DossierHomeSection {
  name: string;
  message?: string;
  dataSource?: string;
  layoutHint?: string;
  actions?: string[];
}

/**
 * Column definition for list/grid views.
 */
export interface DossierViewColumn {
  name: string;
  type: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

/**
 * Action definition for views.
 */
export interface DossierViewAction {
  intent: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  requiresSelection?: boolean;
}

/**
 * Filter definition for views.
 */
export interface DossierViewFilter {
  field: string;
  type: 'select' | 'search' | 'date' | 'range';
  label?: string;
  options?: string[];
}

/**
 * View types supported by the Avatar.
 * A view is like a page in a website - it defines what can be rendered.
 */
export type DossierViewType = 
  | 'list'      // Vertical list of items
  | 'grid'      // Grid of cards
  | 'detail'    // Single item detail view
  | 'form'      // Input form
  | 'dashboard' // Dashboard with multiple widgets
  | 'chat'      // Chat-focused view (default)
  | 'custom';   // Custom view (agent-defined)

/**
 * View definition from dossier presentation.
 * 
 * A View in the Avatar is like a page in a website, but instead of HTML,
 * it defines what CAN be rendered in the Avatar View canvas. The Avatar
 * decides HOW to render based on user preferences and platform capabilities.
 */
export interface DossierView {
  /** Unique view identifier (used for navigation) */
  name: string;
  /** Human-readable title */
  title?: string;
  /** View description */
  description?: string;
  /** View type - determines available components */
  type?: DossierViewType;
  /** Data source for the view (fact type or query) */
  source?: string;
  /** Column definitions for list/grid views */
  columns?: DossierViewColumn[];
  /** Available actions in this view */
  actions?: DossierViewAction[];
  /** Filter definitions */
  filters?: DossierViewFilter[];
  /** Default sort configuration */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  /** Whether this is the default/home view */
  isDefault?: boolean;
  /** Icon for navigation */
  icon?: string;
}

/**
 * Layout hint from dossier presentation.
 */
export interface DossierLayoutHint {
  dataType: string;
  layout: string;
  options?: Record<string, unknown>;
}

/**
 * Presentation hints from agent dossier.
 */
export interface DossierPresentation {
  brand?: DossierBrand;
  home?: DossierHomeSection[];
  views?: DossierView[];
  layouts?: DossierLayoutHint[];
}

/**
 * Agent identity from dossier.
 */
export interface DossierIdentity {
  id: string;
  name: string;
  version: string;
  description?: string;
  tags?: string[];
}

/**
 * Agent dossier - capabilities and presentation hints.
 * 
 * Received from the Brain in the WELCOME message.
 */
export interface AgentDossier {
  identity: DossierIdentity;
  intents: DossierIntent[];
  presentation?: DossierPresentation;
}

/**
 * Global Avatar UI state.
 *
 * This is the single source of truth for all UI state.
 * Components subscribe to slices of this state and re-render when they change.
 */
export interface AvatarState {
  // === Feedback ===
  /** Current message being displayed (if any) */
  message: Message | null;
  /** Current loading indicator (if any) */
  loading: LoadingState | null;

  // === Navigation ===
  /** Current route/view */
  currentRoute: string;
  /** Navigation history for back/forward */
  navigationHistory: string[];
  /** Forward history (for go_forward after go_back) */
  forwardHistory: string[];

  // === Overlays ===
  /** Current modal (if any) */
  modal: Modal | null;

  // === Focus/Highlight ===
  /** Currently focused element */
  focusedElement: string | null;
  /** Currently highlighted elements */
  highlightedElements: Set<string>;

  // === Data (from Agent) ===
  /** Facts received from the Agent (as JSON) */
  facts: unknown[];

  // === Session ===
  /** Whether connected to an Agent */
  connected: boolean;
  /** Current agent ID (if connected) */
  agentId: string | null;
  /** Connection state */
  connectionState: ConnectionState;
  /** Current connection step (for progress UI) */
  connectionStep: ConnectionStep;

  // === Dossier (from Agent) ===
  /** Agent dossier with capabilities and presentation hints */
  dossier: AgentDossier | null;
}

/**
 * Actions that can change the Avatar state.
 */
export type Action =
  | { type: 'SHOW_MESSAGE'; text: string; messageType: MessageType }
  | { type: 'HIDE_MESSAGE' }
  | { type: 'NAVIGATE'; route: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'SCROLL_TO'; elementRef: string }
  | { type: 'FOCUS'; elementRef: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'HIGHLIGHT'; elementRef: string }
  | { type: 'CLEAR_HIGHLIGHT'; elementRef: string }
  | { type: 'CLEAR_ALL_HIGHLIGHTS' }
  | { type: 'SHOW_MODAL'; name: string; data?: unknown }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SHOW_LOADING'; message?: string }
  | { type: 'HIDE_LOADING' }
  | { type: 'UPDATE_FACTS'; facts: unknown[] }
  | { type: 'CLEAR_FACTS' }
  | { type: 'SET_CONNECTED'; connected: boolean; agentId?: string }
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_CONNECTION_STEP'; step: ConnectionStep }
  | { type: 'SET_DOSSIER'; dossier: AgentDossier }
  | { type: 'CLEAR_DOSSIER' };

/**
 * View instruction from Agent.
 */
export interface ViewInstruction {
  type: string;
  [key: string]: unknown;
}

/**
 * Create initial Avatar state.
 */
export function createInitialState(): AvatarState {
  return {
    message: null,
    loading: null,
    currentRoute: '',
    navigationHistory: [],
    forwardHistory: [],
    modal: null,
    focusedElement: null,
    highlightedElements: new Set(),
    facts: [],
    connected: false,
    agentId: null,
    connectionState: 'disconnected',
    connectionStep: 'idle',
    dossier: null,
  };
}

/**
 * Reducer function for Avatar state.
 */
export function avatarReducer(state: AvatarState, action: Action): AvatarState {
  switch (action.type) {
    case 'SHOW_MESSAGE':
      return {
        ...state,
        message: { text: action.text, messageType: action.messageType },
      };

    case 'HIDE_MESSAGE':
      return { ...state, message: null };

    case 'NAVIGATE': {
      const newHistory = state.currentRoute
        ? [...state.navigationHistory, state.currentRoute]
        : state.navigationHistory;
      return {
        ...state,
        currentRoute: action.route,
        navigationHistory: newHistory,
        forwardHistory: [], // Clear forward on new navigation
      };
    }

    case 'GO_BACK': {
      if (state.navigationHistory.length === 0) return state;
      const newHistory = [...state.navigationHistory];
      const prev = newHistory.pop()!;
      return {
        ...state,
        currentRoute: prev,
        navigationHistory: newHistory,
        forwardHistory: [...state.forwardHistory, state.currentRoute],
      };
    }

    case 'GO_FORWARD': {
      if (state.forwardHistory.length === 0) return state;
      const newForward = [...state.forwardHistory];
      const next = newForward.pop()!;
      return {
        ...state,
        currentRoute: next,
        navigationHistory: [...state.navigationHistory, state.currentRoute],
        forwardHistory: newForward,
      };
    }

    case 'SCROLL_TO':
      // Scroll is handled as a side effect, no state change
      return state;

    case 'FOCUS':
      return { ...state, focusedElement: action.elementRef };

    case 'CLEAR_FOCUS':
      return { ...state, focusedElement: null };

    case 'HIGHLIGHT': {
      const newHighlighted = new Set(state.highlightedElements);
      newHighlighted.add(action.elementRef);
      return { ...state, highlightedElements: newHighlighted };
    }

    case 'CLEAR_HIGHLIGHT': {
      const newHighlighted = new Set(state.highlightedElements);
      newHighlighted.delete(action.elementRef);
      return { ...state, highlightedElements: newHighlighted };
    }

    case 'CLEAR_ALL_HIGHLIGHTS':
      return { ...state, highlightedElements: new Set() };

    case 'SHOW_MODAL':
      return { ...state, modal: { name: action.name, data: action.data } };

    case 'CLOSE_MODAL':
      return { ...state, modal: null };

    case 'SHOW_LOADING':
      return { ...state, loading: { message: action.message } };

    case 'HIDE_LOADING':
      return { ...state, loading: null };

    case 'UPDATE_FACTS':
      return { ...state, facts: action.facts };

    case 'CLEAR_FACTS':
      return { ...state, facts: [] };

    case 'SET_CONNECTED':
      return {
        ...state,
        connected: action.connected,
        agentId: action.agentId ?? null,
      };

    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.state };

    case 'SET_CONNECTION_STEP':
      return { ...state, connectionStep: action.step };

    case 'SET_DOSSIER':
      return { ...state, dossier: action.dossier };

    case 'CLEAR_DOSSIER':
      return { ...state, dossier: null };

    default:
      return state;
  }
}
