/**
 * Avatar state types - mirrors the Rust AvatarState
 */
/**
 * Create initial Avatar state.
 */
export function createInitialState() {
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
        dossier: null,
    };
}
/**
 * Reducer function for Avatar state.
 */
export function avatarReducer(state, action) {
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
                        sender: 'user',
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
                        sender: 'agent',
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
            if (state.navigationHistory.length === 0)
                return state;
            const newHistory = [...state.navigationHistory];
            const prev = newHistory.pop();
            return {
                ...state,
                currentRoute: prev,
                navigationHistory: newHistory,
                forwardHistory: [...state.forwardHistory, state.currentRoute],
            };
        }
        case 'GO_FORWARD': {
            if (state.forwardHistory.length === 0)
                return state;
            const newForward = [...state.forwardHistory];
            const next = newForward.pop();
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
            }
            else {
                // Invalidate all entities for this model
                const newCache = {};
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
        case 'SET_DOSSIER':
            return { ...state, dossier: action.dossier };
        case 'CLEAR_DOSSIER':
            return { ...state, dossier: null };
        default:
            return state;
    }
}
//# sourceMappingURL=types.js.map