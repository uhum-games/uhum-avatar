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
export function avatarReducer(state, action) {
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
//# sourceMappingURL=types.js.map