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
 * Field types supported by components.
 *
 * - `string` - Text value
 * - `number` - Numeric value
 * - `atom` - Enumerated/status value
 * - `text` - Long text (multiline)
 * - `datetime` - Date and time
 * - `date` - Date only
 * - `boolean` - True/false
 * - `model` - Reference to another model (foreign key)
 */
export type DossierFieldType = 'string' | 'number' | 'atom' | 'text' | 'datetime' | 'date' | 'boolean' | 'model';
/**
 * Field definition for components.
 *
 * Fields define the data structure displayed/edited by a component.
 */
export interface DossierField {
    /** Field name (matches model property) */
    name: string;
    /** Field data type */
    type: DossierFieldType;
    /** Human-readable label */
    label: string;
    /** Whether this field is sortable in list views */
    sortable?: boolean;
    /** Whether this field is filterable */
    filterable?: boolean;
    /** Display width hint */
    width?: string;
    /** For model type: the referenced model name */
    reference?: string;
}
/**
 * Action definition for components.
 *
 * Actions are buttons/links that trigger intents.
 */
export interface DossierComponentAction {
    /** Intent to trigger */
    intent: string;
    /** Button/link label */
    label: string;
    /** Icon name */
    icon?: string;
    /** Visual variant */
    variant?: 'primary' | 'secondary' | 'danger';
    /** Whether this action requires a selected item */
    requiresSelection?: boolean;
}
/**
 * Filter definition for components.
 */
export interface DossierComponentFilter {
    field: string;
    type: 'select' | 'search' | 'date' | 'range';
    label?: string;
    options?: string[];
}
/**
 * Component types supported by the Avatar.
 *
 * - `list` - Vertical list of items
 * - `grid` - Grid of cards
 * - `detail` - Single item detail view
 * - `form` - Input form for creating/editing
 * - `dashboard` - Multi-widget dashboard
 * - `chat` - Chat-focused component
 */
export type DossierComponentType = 'list' | 'grid' | 'detail' | 'form' | 'dashboard' | 'chat';
/**
 * Component definition from dossier presentation.
 *
 * A Component is a reusable UI building block. Components can:
 * - Display data from a model (source)
 * - Depend on context variables (context)
 * - Have actions that trigger intents
 *
 * Multiple components can be rendered simultaneously (e.g., a list of books
 * alongside the detail view of the selected book).
 *
 * @example
 * ```prolog
 * component(books, [
 *     title("My Books"),
 *     type(list),
 *     source(book),
 *     fields([field(title, string, "Title"), ...]),
 *     actions([action(add_book, "Add Book", plus)])
 * ]).
 *
 * component(book_detail, [
 *     title("Book Details"),
 *     type(detail),
 *     source(book),
 *     context(selected_book),
 *     fields([...]),
 *     actions([action(edit_book, "Edit", pencil)])
 * ]).
 * ```
 */
export interface DossierComponent {
    /** Unique component identifier */
    name: string;
    /** Human-readable title */
    title?: string;
    /** Component description */
    description?: string;
    /** Component type - determines rendering style */
    type?: DossierComponentType;
    /** Data model for this component (fact type) */
    source?: string;
    /** Context variable this component depends on */
    context?: string;
    /** Field definitions */
    fields?: DossierField[];
    /** Available actions */
    actions?: DossierComponentAction[];
    /** Filter definitions */
    filters?: DossierComponentFilter[];
    /** Default sort configuration */
    defaultSort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
    /** Whether this is the default/home component */
    isDefault?: boolean;
    /** Icon for navigation */
    icon?: string;
}
/**
 * State variable definition.
 *
 * State variables define the **UI state** for the Avatar presentation layer.
 * This is Avatar-only state — it controls which views and components are shown.
 *
 * **Important:** This is NOT Brain state and does NOT flow to the Brain.
 * It's purely for UI behavior defined by the agent author.
 *
 * @example
 * ```prolog
 * state([
 *     selected_book([
 *         type(model),
 *         source(book),
 *         description("Currently selected book for detail view")
 *     ])
 * ]).
 * ```
 */
export interface DossierStateVariable {
    /** Variable name (e.g., "selected_book") */
    name: string;
    /** Variable type (usually "model" for references) */
    type: string;
    /** For model type: the model this variable references */
    source?: string;
    /** Human-readable description */
    description?: string;
}
/**
 * State schema from dossier presentation.
 *
 * Defines the UI state variables for the Avatar presentation layer.
 * Controls which views and components are shown based on user interactions.
 *
 * **Note:** This is Avatar-only state, not Brain state.
 */
export interface DossierState {
    /** Available state variables */
    variables: DossierStateVariable[];
}
/**
 * View definition from dossier presentation.
 *
 * A View is a composition/suggestion of which components to show together.
 * Views represent different "pages" or "screens" in the Avatar.
 *
 * - **One default view** - shown when no specific context is active
 * - **Other views** - require a context to become active
 *
 * When context changes, the Avatar can switch to a different view that
 * matches that context.
 *
 * @example
 * ```prolog
 * % Default view - shows the books list component
 * view(home, [
 *     title("Home"),
 *     is_default(true),
 *     components([books])
 * ]).
 *
 * % View activated when a book is selected
 * view(book_view, [
 *     title("Book Details"),
 *     context(selected_book),
 *     components([books, book_detail])
 * ]).
 * ```
 */
export interface DossierView {
    /** Unique view identifier */
    name: string;
    /** Human-readable title */
    title?: string;
    /** View description */
    description?: string;
    /** Context variable that activates this view (not required for default view) */
    context?: string;
    /** Components to display in this view */
    components?: string[];
    /** Whether this is the default view (exactly one view should be default) */
    isDefault?: boolean;
    /** Icon for navigation */
    icon?: string;
    /** Layout hint for how to arrange components */
    layout?: 'single' | 'split' | 'tabs' | 'stack';
}
/**
 * Legacy column definition for views.
 * @deprecated Use DossierField in components instead
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
 * Legacy action definition for views.
 * @deprecated Use DossierComponentAction in components instead
 */
export interface DossierViewAction {
    intent: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    requiresSelection?: boolean;
}
/**
 * Legacy filter definition for views.
 * @deprecated Use DossierComponentFilter in components instead
 */
export interface DossierViewFilter {
    field: string;
    type: 'select' | 'search' | 'date' | 'range';
    label?: string;
    options?: string[];
}
/**
 * Legacy view types.
 * @deprecated Component types are now defined on components, not views
 */
export type DossierViewType = 'list' | 'grid' | 'detail' | 'form' | 'dashboard' | 'chat' | 'custom';
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
 *
 * Contains all UI-related hints from the agent:
 * - **Brand** - Visual identity (colors, logo, greetings)
 * - **State** - UI state schema (controls which views/components are shown)
 * - **Components** - Reusable UI building blocks (list, detail, form, etc.)
 * - **Views** - Composition of components (which components to show together)
 * - **Home** - Landing page sections
 * - **Layouts** - Rendering suggestions
 *
 * ## Architecture
 *
 * ```
 * State (UI only) ──────────────────────────────────────────────────┐
 *                                                                   │
 * Components (building blocks)                                      │
 *   ├── books (list of books)                                       │
 *   ├── book_detail (single book) ─────────── depends on ───────────┤
 *   └── add_book_form (create form)                                 │
 *                                                                   │
 * Views (composition) ←───────────── activated by ──────────────────┘
 *   ├── home (default) ─────────── shows [books]
 *   └── book_view ──────────────── shows [books, book_detail]
 * ```
 *
 * **Note:** State is Avatar-only UI state, not Brain state.
 */
export interface DossierPresentation {
    /** Brand identity (colors, logo, greetings) */
    brand?: DossierBrand;
    /** UI state schema - controls which views/components are shown (Avatar-only, not Brain state) */
    state?: DossierState;
    /** UI components - reusable building blocks */
    components?: DossierComponent[];
    /** Views - composition of components (which components to show together) */
    views?: DossierView[];
    /** Home/landing sections */
    home?: DossierHomeSection[];
    /** Layout hints for rendering */
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