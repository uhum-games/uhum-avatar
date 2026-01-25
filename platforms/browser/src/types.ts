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
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'closing';

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
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState };

/**
 * View instruction from Brain.
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

    default:
      return state;
  }
}
