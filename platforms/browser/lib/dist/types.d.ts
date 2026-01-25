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
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'closing' | 'reconnecting' | 'failed';
/**
 * Global Avatar UI state.
 *
 * This is the single source of truth for all UI state.
 * Components subscribe to slices of this state and re-render when they change.
 */
export interface AvatarState {
    /** Current message being displayed (if any) */
    message: Message | null;
    /** Current loading indicator (if any) */
    loading: LoadingState | null;
    /** Current route/view */
    currentRoute: string;
    /** Navigation history for back/forward */
    navigationHistory: string[];
    /** Forward history (for go_forward after go_back) */
    forwardHistory: string[];
    /** Current modal (if any) */
    modal: Modal | null;
    /** Currently focused element */
    focusedElement: string | null;
    /** Currently highlighted elements */
    highlightedElements: Set<string>;
    /** Facts received from the Agent (as JSON) */
    facts: unknown[];
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
export type Action = {
    type: 'SHOW_MESSAGE';
    text: string;
    messageType: MessageType;
} | {
    type: 'HIDE_MESSAGE';
} | {
    type: 'NAVIGATE';
    route: string;
} | {
    type: 'GO_BACK';
} | {
    type: 'GO_FORWARD';
} | {
    type: 'SCROLL_TO';
    elementRef: string;
} | {
    type: 'FOCUS';
    elementRef: string;
} | {
    type: 'CLEAR_FOCUS';
} | {
    type: 'HIGHLIGHT';
    elementRef: string;
} | {
    type: 'CLEAR_HIGHLIGHT';
    elementRef: string;
} | {
    type: 'CLEAR_ALL_HIGHLIGHTS';
} | {
    type: 'SHOW_MODAL';
    name: string;
    data?: unknown;
} | {
    type: 'CLOSE_MODAL';
} | {
    type: 'SHOW_LOADING';
    message?: string;
} | {
    type: 'HIDE_LOADING';
} | {
    type: 'UPDATE_FACTS';
    facts: unknown[];
} | {
    type: 'CLEAR_FACTS';
} | {
    type: 'SET_CONNECTED';
    connected: boolean;
    agentId?: string;
} | {
    type: 'SET_CONNECTION_STATE';
    state: ConnectionState;
};
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
export declare function createInitialState(): AvatarState;
/**
 * Reducer function for Avatar state.
 */
export declare function avatarReducer(state: AvatarState, action: Action): AvatarState;
//# sourceMappingURL=types.d.ts.map