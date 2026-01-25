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
 * Connection step for progress indication.
 */
export type ConnectionStep = 'idle' | 'locating' | 'connecting' | 'greeting' | 'loading' | 'ready';
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
export type DossierViewType = 'list' | 'grid' | 'detail' | 'form' | 'dashboard' | 'chat' | 'custom';
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
    defaultSort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
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
    /** Welcome message shown when user first connects */
    welcomeMessage?: string;
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
    /** Current connection step (for progress UI) */
    connectionStep: ConnectionStep;
    /** Agent dossier with capabilities and presentation hints */
    dossier: AgentDossier | null;
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
} | {
    type: 'SET_CONNECTION_STEP';
    step: ConnectionStep;
} | {
    type: 'SET_DOSSIER';
    dossier: AgentDossier;
} | {
    type: 'CLEAR_DOSSIER';
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