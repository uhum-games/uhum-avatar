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
 * Chat message for conversational history.
 * These are agent/user exchanges shown in the chat area.
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message text */
  text: string;
  /** Who sent the message */
  sender: 'user' | 'agent';
  /** When the message was sent */
  timestamp: number;
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
  | 'loading'       // Parsing agent card
  | 'ready';        // All set!

/**
 * Agent intent from card.
 */
export interface AgentCardIntent {
  name: string;
  description?: string;
  params?: AgentCardParam[];
  effects?: string[];
}

/**
 * Intent parameter from card.
 */
export interface AgentCardParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/**
 * Brand info from card presentation.
 */
export interface AgentCardBrand {
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
 * Home section from card presentation.
 */
export interface AgentCardHomeSection {
  name: string;
  message?: string;
  dataSource?: string;
  layoutHint?: string;
  actions?: string[];
}

// =============================================================================
// Model Definitions (schema for facts)
// =============================================================================

/**
 * Field types supported by models and components.
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
export type AgentCardFieldType =
  | 'string'
  | 'number'
  | 'atom'
  | 'text'
  | 'datetime'
  | 'date'
  | 'boolean'
  | 'model';

/**
 * Model field definition.
 * 
 * Defines a single field in a model schema.
 */
export interface AgentCardModelField {
  /** Field name (positional in the fact) */
  name: string;
  /** Field data type */
  type: AgentCardFieldType;
  /** Human-readable label */
  label: string;
  /** For model type: the referenced model name */
  reference?: string;
}

/**
 * Model definition - schema for a type of fact.
 * 
 * Models define the structure of facts stored in the Brain.
 * They are used by components to understand the data shape.
 * 
 * @example
 * ```prolog
 * model(book, [
 *     field(title, string, "Book title"),
 *     field(author, string, "Author name"),
 *     field(year, number, "Publication year"),
 *     field(status, atom, "Reading status: unread | reading | read")
 * ]).
 * ```
 */
export interface AgentCardModel {
  /** Model name (fact functor) */
  name: string;
  /** Field definitions (ordered, positional) */
  fields: AgentCardModelField[];
}

// =============================================================================
// Field Types (used by Components)
// =============================================================================

/**
 * Field definition for components.
 * 
 * Fields define the data structure displayed/edited by a component.
 */
export interface AgentCardField {
  /** Field name (matches model property) */
  name: string;
  /** Field data type */
  type: AgentCardFieldType;
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
export interface AgentCardComponentAction {
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
export interface AgentCardComponentFilter {
  field: string;
  type: 'select' | 'search' | 'date' | 'range';
  label?: string;
  options?: string[];
}

// =============================================================================
// Component Types
// =============================================================================

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
export type AgentCardComponentType =
  | 'list'
  | 'grid'
  | 'detail'
  | 'form'
  | 'dashboard'
  | 'chat';

/**
 * Component definition from card presentation.
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
export interface AgentCardComponent {
  /** Unique component identifier */
  name: string;
  /** Human-readable title */
  title?: string;
  /** Component description */
  description?: string;
  /** Component type - determines rendering style */
  type?: AgentCardComponentType;
  /** Data model for this component (fact type) */
  source?: string;
  /** Context variable this component depends on */
  context?: string;
  /** Intent to trigger for fetching list data (for list/grid components) */
  listIntent?: string;
  /** Intent to trigger for fetching a single entity (for detail components) */
  detailIntent?: string;
  /** Field definitions */
  fields?: AgentCardField[];
  /** Available actions */
  actions?: AgentCardComponentAction[];
  /** Filter definitions */
  filters?: AgentCardComponentFilter[];
  /** Default sort configuration */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  /** Whether this is the default/home component */
  isDefault?: boolean;
  /** Icon for navigation */
  icon?: string;
  /** Whether to auto-fetch data on component mount (default: true) */
  autoFetch?: boolean;
}

// =============================================================================
// State (UI State Schema)
// =============================================================================

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
export interface AgentCardStateVariable {
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
 * State schema from card presentation.
 * 
 * Defines the UI state variables for the Avatar presentation layer.
 * Controls which views and components are shown based on user interactions.
 * 
 * **Note:** This is Avatar-only state, not Brain state.
 */
export interface AgentCardState {
  /** Available state variables */
  variables: AgentCardStateVariable[];
}

// =============================================================================
// View Types (composition of components)
// =============================================================================

/**
 * View definition from card presentation.
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
export interface AgentCardView {
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
 * @deprecated Use AgentCardField in components instead
 */
export interface AgentCardViewColumn {
  name: string;
  type: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

/**
 * Legacy action definition for views.
 * @deprecated Use AgentCardComponentAction in components instead
 */
export interface AgentCardViewAction {
  intent: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  requiresSelection?: boolean;
}

/**
 * Legacy filter definition for views.
 * @deprecated Use AgentCardComponentFilter in components instead
 */
export interface AgentCardViewFilter {
  field: string;
  type: 'select' | 'search' | 'date' | 'range';
  label?: string;
  options?: string[];
}

/**
 * Legacy view types.
 * @deprecated Component types are now defined on components, not views
 */
export type AgentCardViewType = 
  | 'list'
  | 'grid'
  | 'detail'
  | 'form'
  | 'dashboard'
  | 'chat'
  | 'custom';

// =============================================================================
// Layout Hints
// =============================================================================

/**
 * Layout hint from card presentation.
 */
export interface AgentCardLayoutHint {
  dataType: string;
  layout: string;
  options?: Record<string, unknown>;
}

// =============================================================================
// Presentation (combines all presentation hints)
// =============================================================================

/**
 * Presentation hints from agent card.
 * 
 * Contains all UI-related hints from the agent:
 * - **Brand** - Visual identity (colors, logo, greetings)
 * - **Models** - Data schemas (defines the structure of facts)
 * - **State** - UI state schema (controls which views/components are shown)
 * - **Components** - Reusable UI building blocks (list, detail, form, etc.)
 * - **Views** - Composition of components (which components to show together)
 * - **Home** - Landing page sections
 * - **Layouts** - Rendering suggestions
 * 
 * ## Architecture
 * 
 * ```
 * Models (data schemas)
 *   ├── book (title, author, year, status)
 *   └── genre (book_title, genre)
 * 
 * State (UI only) ──────────────────────────────────────────────────┐
 *                                                                   │
 * Components (building blocks)                                      │
 *   ├── books (list of books) ─────────── uses model: book         │
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
export interface AgentCardPresentation {
  /** Brand identity (colors, logo, greetings) */
  brand?: AgentCardBrand;
  /** UI state schema - controls which views/components are shown (Avatar-only, not Brain state) */
  state?: AgentCardState;
  /** UI components - reusable building blocks */
  components?: AgentCardComponent[];
  /** Views - composition of components (which components to show together) */
  views?: AgentCardView[];
  /** Home/landing sections */
  home?: AgentCardHomeSection[];
  /** Layout hints for rendering */
  layouts?: AgentCardLayoutHint[];
}

/**
 * Agent identity from card.
 */
export interface AgentCardIdentity {
  id: string;
  name: string;
  version: string;
  description?: string;
  tags?: string[];
}

/**
 * Agent Card - capabilities and presentation hints.
 * 
 * Received from the Brain in the WELCOME message.
 */
export interface AgentCard {
  identity: AgentCardIdentity;
  intents: AgentCardIntent[];
  /** Model definitions - schemas for facts (defines data structure) */
  models?: AgentCardModel[];
  presentation?: AgentCardPresentation;
}

/**
 * Entity store organized by model type.
 * 
 * Entities are the working set of model instances loaded from the Brain.
 * Unlike Brain facts (complete, used for inference), Avatar entities are
 * a subset for display and interaction (may be paginated, filtered, etc.).
 * 
 * E.g., `{ book: [...], genre: [...] }`
 */
export interface EntityStore {
  /** Entities indexed by model name */
  [model: string]: Record<string, unknown>[];
}

/**
 * @deprecated Use EntityStore instead
 */
export type FactsStore = EntityStore;

/**
 * Cache entry for list queries.
 */
export interface ListCache {
  /** Intent that was triggered */
  intent: string;
  /** Model this cache is for */
  model: string;
  /** When the cache was last updated */
  updatedAt: number;
  /** Whether a request is currently pending */
  loading: boolean;
}

/**
 * Cache entry for a single entity.
 */
export interface EntityCache {
  /** Intent that was triggered */
  intent: string;
  /** Model this cache is for */
  model: string;
  /** Entity identifier */
  entityId: string;
  /** When the cache was last updated */
  updatedAt: number;
  /** Whether a request is currently pending */
  loading: boolean;
}

/**
 * Global Avatar UI state.
 *
 * This is the single source of truth for all UI state.
 * Components subscribe to slices of this state and re-render when they change.
 */
export interface AvatarState {
  // === Feedback ===
  /** Current notification message (for errors/warnings - use chatMessages for conversations) */
  message: Message | null;
  /** Current loading indicator (if any) */
  loading: LoadingState | null;

  // === Chat ===
  /** Chat message history (agent-user conversation) */
  chatMessages: ChatMessage[];

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
  /** 
   * Entity store organized by model type.
   * Contains the working set of model instances loaded from the Brain.
   * E.g., { book: [{title: "...", author: "..."}, ...], genre: [...] }
   */
  entityStore: EntityStore;
  /** 
   * @deprecated Use entityStore instead
   */
  factsStore: EntityStore;
  /** 
   * Legacy facts array (for backward compatibility)
   * @deprecated Use entityStore instead
   */
  facts: unknown[];
  /** List query cache (tracks which lists have been fetched) */
  listCache: Record<string, ListCache>;
  /** Entity query cache (tracks which individual entities have been fetched) */
  entityCache: Record<string, EntityCache>;

  // === Session ===
  /** Whether connected to an Agent */
  connected: boolean;
  /** Current agent ID (if connected) */
  agentId: string | null;
  /** Connection state */
  connectionState: ConnectionState;
  /** Current connection step (for progress UI) */
  connectionStep: ConnectionStep;

  // === AgentCard (from Agent) ===
  /** Agent card with capabilities and presentation hints */
  agentCard: AgentCard | null;
}

/**
 * Actions that can change the Avatar state.
 */
export type Action =
  | { type: 'SHOW_MESSAGE'; text: string; messageType: MessageType }
  | { type: 'HIDE_MESSAGE' }
  // Chat message actions
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'ADD_USER_MESSAGE'; text: string }
  | { type: 'ADD_AGENT_MESSAGE'; text: string }
  | { type: 'CLEAR_CHAT_MESSAGES' }
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
  // Legacy facts action (backward compatibility)
  | { type: 'UPDATE_FACTS'; facts: unknown[] }
  | { type: 'CLEAR_FACTS' }
  // Entity sync actions (organized by model)
  | { type: 'SYNC_ENTITIES'; model: string; entities: Record<string, unknown>[] }
  | { type: 'CLEAR_MODEL_ENTITIES'; model: string }
  | { type: 'CLEAR_ALL_ENTITIES' }
  // @deprecated - use SYNC_ENTITIES instead
  | { type: 'SYNC_FACTS'; model: string; facts: Record<string, unknown>[] }
  | { type: 'CLEAR_MODEL_FACTS'; model: string }
  | { type: 'CLEAR_ALL_FACTS' }
  // List cache actions
  | { type: 'SET_LIST_LOADING'; model: string; intent: string; loading: boolean }
  | { type: 'INVALIDATE_LIST_CACHE'; model: string }
  | { type: 'INVALIDATE_ALL_LIST_CACHE' }
  // Entity cache actions
  | { type: 'SET_ENTITY_LOADING'; model: string; entityId: string; intent: string; loading: boolean }
  | { type: 'INVALIDATE_ENTITY_CACHE'; model: string; entityId?: string }
  | { type: 'INVALIDATE_ALL_ENTITY_CACHE' }
  // Session actions
  | { type: 'SET_CONNECTED'; connected: boolean; agentId?: string }
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_CONNECTION_STEP'; step: ConnectionStep }
  | { type: 'SET_AGENT_CARD'; agentCard: AgentCard }
  | { type: 'CLEAR_AGENT_CARD' };

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
    chatMessages: [],
    currentRoute: '',
    navigationHistory: [],
    forwardHistory: [],
    modal: null,
    focusedElement: null,
    highlightedElements: new Set(),
    entityStore: {},
    factsStore: {}, // @deprecated - use entityStore
    facts: [], // @deprecated - use entityStore
    listCache: {},
    entityCache: {},
    connected: false,
    agentId: null,
    connectionState: 'disconnected',
    connectionStep: 'idle',
    agentCard: null,
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

    // Chat message actions
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message],
      };

    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        chatMessages: [
          ...state.chatMessages,
          {
            id: `user_${Date.now()}`,
            text: action.text,
            sender: 'user' as const,
            timestamp: Date.now(),
          },
        ],
      };

    case 'ADD_AGENT_MESSAGE':
      return {
        ...state,
        chatMessages: [
          ...state.chatMessages,
          {
            id: `agent_${Date.now()}`,
            text: action.text,
            sender: 'agent' as const,
            timestamp: Date.now(),
          },
        ],
      };

    case 'CLEAR_CHAT_MESSAGES':
      return { ...state, chatMessages: [] };

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

    // Legacy facts actions (backward compatibility)
    case 'UPDATE_FACTS':
      return { ...state, facts: action.facts };

    case 'CLEAR_FACTS':
      return { ...state, facts: [] };

    // Entity sync actions (organized by model)
    case 'SYNC_ENTITIES': {
      const newEntityStore = {
        ...state.entityStore,
        [action.model]: action.entities,
      };
      return { 
        ...state, 
        entityStore: newEntityStore,
        factsStore: newEntityStore, // Keep deprecated alias in sync
        // Update list cache timestamp
        listCache: {
          ...state.listCache,
          [action.model]: {
            ...state.listCache[action.model],
            updatedAt: Date.now(),
            loading: false,
          },
        },
      };
    }

    case 'CLEAR_MODEL_ENTITIES': {
      const newEntityStore = { ...state.entityStore };
      delete newEntityStore[action.model];
      return { ...state, entityStore: newEntityStore, factsStore: newEntityStore };
    }

    case 'CLEAR_ALL_ENTITIES':
      return { ...state, entityStore: {}, factsStore: {}, listCache: {}, entityCache: {} };

    // @deprecated - use SYNC_ENTITIES instead
    case 'SYNC_FACTS': {
      const newEntityStore = {
        ...state.entityStore,
        [action.model]: action.facts,
      };
      return { 
        ...state, 
        entityStore: newEntityStore,
        factsStore: newEntityStore,
        listCache: {
          ...state.listCache,
          [action.model]: {
            ...state.listCache[action.model],
            updatedAt: Date.now(),
            loading: false,
          },
        },
      };
    }

    // @deprecated - use CLEAR_MODEL_ENTITIES instead
    case 'CLEAR_MODEL_FACTS': {
      const newEntityStore = { ...state.entityStore };
      delete newEntityStore[action.model];
      return { ...state, entityStore: newEntityStore, factsStore: newEntityStore };
    }

    // @deprecated - use CLEAR_ALL_ENTITIES instead
    case 'CLEAR_ALL_FACTS':
      return { ...state, entityStore: {}, factsStore: {}, listCache: {}, entityCache: {} };

    // List cache actions
    case 'SET_LIST_LOADING': {
      return {
        ...state,
        listCache: {
          ...state.listCache,
          [action.model]: {
            intent: action.intent,
            model: action.model,
            updatedAt: state.listCache[action.model]?.updatedAt ?? 0,
            loading: action.loading,
          },
        },
      };
    }

    case 'INVALIDATE_LIST_CACHE': {
      const newCache = { ...state.listCache };
      delete newCache[action.model];
      return { ...state, listCache: newCache };
    }

    case 'INVALIDATE_ALL_LIST_CACHE':
      return { ...state, listCache: {} };

    // Entity cache actions
    case 'SET_ENTITY_LOADING': {
      const cacheKey = `${action.model}:${action.entityId}`;
      return {
        ...state,
        entityCache: {
          ...state.entityCache,
          [cacheKey]: {
            intent: action.intent,
            model: action.model,
            entityId: action.entityId,
            updatedAt: state.entityCache[cacheKey]?.updatedAt ?? 0,
            loading: action.loading,
          },
        },
      };
    }

    case 'INVALIDATE_ENTITY_CACHE': {
      if (action.entityId) {
        // Invalidate specific entity
        const cacheKey = `${action.model}:${action.entityId}`;
        const { [cacheKey]: _, ...rest } = state.entityCache;
        return { ...state, entityCache: rest };
      } else {
        // Invalidate all entities for this model
        const newCache: Record<string, EntityCache> = {};
        for (const [key, value] of Object.entries(state.entityCache)) {
          if (value.model !== action.model) {
            newCache[key] = value;
          }
        }
        return { ...state, entityCache: newCache };
      }
    }

    case 'INVALIDATE_ALL_ENTITY_CACHE':
      return { ...state, entityCache: {} };

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

    case 'SET_AGENT_CARD':
      return { ...state, agentCard: action.agentCard };

    case 'CLEAR_AGENT_CARD':
      return { ...state, agentCard: null };

    default:
      return state;
  }
}
