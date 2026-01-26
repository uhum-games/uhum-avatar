/**
 * Avatar Client - Main entry point for browser applications.
 *
 * The AvatarClient manages:
 * - WebSocket connection to the Agent (using Uhum protocol)
 * - State management (reactive, event-driven)
 * - View instruction processing
 * - Scheduled effects (timers)
 */
import { createInitialState, avatarReducer, } from './types';
import { parseMessage, buildJoinMessage, buildIntentionMessage, buildTextMessage, buildLeaveMessage, buildAckMessage, extractDecisionFacts, extractViewInstructions, extractDecisionResponse, extractMemoryEvents, extractDossierFromWelcome, termToObject, } from './protocol';
/**
 * Convert a fact Term to a proper object using model schema.
 *
 * A fact like `book("Title", "Author", 1999, read)` becomes:
 * `{ title: "Title", author: "Author", year: 1999, status: "read" }`
 */
function termToFactObject(term, model) {
    if (term.type !== 'compound') {
        return { value: termToObject(term) };
    }
    const functor = term.functor;
    const args = term.args;
    // If we have a model schema, use it to create named fields
    if (model && model.fields.length === args.length) {
        const obj = { _type: functor };
        for (let i = 0; i < model.fields.length; i++) {
            const field = model.fields[i];
            const value = args[i];
            obj[field.name] = termToObject(value);
        }
        return obj;
    }
    // Fallback: create numbered fields
    const obj = { _type: functor };
    for (let i = 0; i < args.length; i++) {
        obj[`arg${i}`] = termToObject(args[i]);
    }
    return obj;
}
/**
 * Group data terms by their model (functor name) into entities.
 *
 * Brain facts are converted to Avatar entities - the working set
 * of model instances for display and interaction.
 */
function groupByModel(terms, models) {
    const groups = new Map();
    for (const term of terms) {
        if (term.type !== 'compound')
            continue;
        const modelName = term.functor;
        const model = models?.find(m => m.name === modelName);
        const entity = termToFactObject(term, model);
        if (!groups.has(modelName)) {
            groups.set(modelName, []);
        }
        groups.get(modelName).push(entity);
    }
    return groups;
}
/**
 * Avatar Client for browser applications.
 *
 * This is the main entry point for using the Avatar in a browser.
 * It manages state, WebSocket connection, and view instruction processing.
 *
 * @example
 * ```typescript
 * const avatar = new AvatarClient({ debug: true });
 *
 * // Subscribe to state changes
 * avatar.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 *
 * // Connect to an agent
 * await avatar.connect('ws://localhost:8080', 'quickstart.billing');
 *
 * // Send an intention
 * avatar.sendIntention('pay_invoice', { invoice_id: 'INV-123' });
 * ```
 */
export class AvatarClient {
    constructor(options = {}) {
        this.subscribers = new Set();
        this.scheduledEffects = new Map();
        this.socket = null;
        this.agentAddress = '';
        this.lastCursor = 0;
        // Reconnection state
        this.wsUrl = '';
        this.reconnectAttempts = 0;
        this.reconnectTimeoutId = null;
        this.shouldReconnect = true;
        this.isIntentionalDisconnect = false;
        this.options = options;
        this.state = createInitialState();
        this.sessionId = options.sessionId || `ses_${Date.now().toString(36)}`;
        // Initialize reconnection options with defaults
        this.reconnectOptions = {
            enabled: options.reconnect?.enabled ?? true,
            initialDelayMs: options.reconnect?.initialDelayMs ?? 1000,
            maxDelayMs: options.reconnect?.maxDelayMs ?? 30000,
            backoffMultiplier: options.reconnect?.backoffMultiplier ?? 2,
            maxAttempts: options.reconnect?.maxAttempts ?? Infinity,
        };
        if (options.initialRoute) {
            this.state.currentRoute = options.initialRoute;
        }
    }
    /**
     * Get the current state.
     */
    getState() {
        return this.state;
    }
    /**
     * Subscribe to state changes.
     *
     * @returns Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        // Immediately call with current state
        callback(this.state);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    /**
     * Dispatch an action to update state.
     */
    dispatch(action) {
        this.log('Dispatching action:', action);
        const newState = avatarReducer(this.state, action);
        this.state = newState;
        // Notify subscribers
        this.subscribers.forEach((callback) => callback(newState));
        // Handle side effects
        this.handleSideEffects(action);
    }
    /**
     * Process view instructions from the Agent.
     */
    processInstructions(instructions) {
        for (const instruction of instructions) {
            const { action, effects } = this.instructionToAction(instruction);
            if (action) {
                this.dispatch(action);
            }
            // Schedule effects
            for (const effect of effects) {
                this.scheduleEffect(effect.id, effect.delayMs, effect.action);
            }
        }
    }
    /**
     * Connect to an Agent via WebSocket using Uhum protocol.
     *
     * @param url - WebSocket URL (e.g., 'ws://localhost:8080')
     * @param agentAddress - Agent address (e.g., 'acme.billing')
     */
    async connect(url, agentAddress) {
        // Store connection params for reconnection
        this.wsUrl = url;
        this.agentAddress = agentAddress || this.extractAgentAddress(url);
        this.isIntentionalDisconnect = false;
        this.shouldReconnect = true;
        // Set initial connection step (locating is done by App before calling connect)
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'locating' });
        // Clear any pending reconnect
        this.clearReconnectTimeout();
        return this.doConnect();
    }
    /**
     * Internal connect method (used for initial connection and reconnection).
     */
    doConnect() {
        return new Promise((resolve, reject) => {
            // Set connection state and step
            this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connecting' });
            this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'connecting' });
            this.socket = new WebSocket(this.wsUrl);
            this.socket.onopen = () => {
                this.log('WebSocket connected, sending JOIN');
                // Clear any pending reconnect timeout (prevents stale reconnects)
                this.clearReconnectTimeout();
                // Reset reconnect attempts on successful connection
                this.reconnectAttempts = 0;
                // Update step to greeting (waiting for WELCOME)
                this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'greeting' });
                // Send JOIN message using Uhum protocol
                const joinMsg = buildJoinMessage({
                    avatarId: this.sessionId,
                    agentAddress: this.agentAddress,
                    capabilities: ['memory_sync', 'intentions'],
                    // Include cursor for resumption if we have one
                    resumeCursor: this.lastCursor > 0 ? this.lastCursor : undefined,
                });
                this.log('Sending JOIN:', joinMsg);
                this.socket.send(joinMsg);
            };
            this.socket.onclose = (event) => {
                this.log('WebSocket disconnected', { code: event.code, reason: event.reason, wasClean: event.wasClean });
                this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'disconnected' });
                this.dispatch({ type: 'SET_CONNECTED', connected: false });
                // Reset step based on whether we have a dossier loaded
                // If dossier is loaded, stay at 'ready', otherwise go to 'idle'
                const hasDossier = this.state.dossier !== null;
                this.dispatch({ type: 'SET_CONNECTION_STEP', step: hasDossier ? 'ready' : 'idle' });
                // Attempt reconnection if not intentional disconnect
                if (!this.isIntentionalDisconnect && this.shouldReconnect && this.reconnectOptions.enabled) {
                    this.scheduleReconnect();
                }
            };
            this.socket.onerror = (error) => {
                this.log('WebSocket error:', error);
                // Don't reject here - let onclose handle reconnection
                // Only reject if this is the initial connection attempt
                if (this.reconnectAttempts === 0) {
                    reject(error);
                }
            };
            this.socket.onmessage = (event) => {
                this.handleMessage(event.data, resolve, reject);
            };
        });
    }
    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.reconnectOptions.maxAttempts) {
            this.log(`Max reconnection attempts (${this.reconnectOptions.maxAttempts}) reached, giving up`);
            this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'failed' });
            return;
        }
        // Calculate delay with exponential backoff
        const delay = Math.min(this.reconnectOptions.initialDelayMs * Math.pow(this.reconnectOptions.backoffMultiplier, this.reconnectAttempts), this.reconnectOptions.maxDelayMs);
        this.reconnectAttempts++;
        this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'reconnecting' });
        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectTimeoutId = null;
            // Safety check: don't reconnect if already connected
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.log('Already connected, skipping reconnection');
                return;
            }
            this.log(`Attempting reconnection (attempt ${this.reconnectAttempts})`);
            this.doConnect().catch((error) => {
                this.log('Reconnection failed:', error);
                // onclose will handle scheduling next attempt
            });
        }, delay);
    }
    /**
     * Clear any pending reconnection timeout.
     */
    clearReconnectTimeout() {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }
    /**
     * Disconnect from the Agent.
     *
     * @param intentional - If true, won't attempt to reconnect (default: true)
     */
    disconnect(intentional = true) {
        this.isIntentionalDisconnect = intentional;
        // Clear any pending reconnection
        this.clearReconnectTimeout();
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Send LEAVE message
            const leaveMsg = buildLeaveMessage(this.sessionId, this.agentAddress);
            this.socket.send(leaveMsg);
            this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'closing' });
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        // Reset reconnection state
        this.reconnectAttempts = 0;
        // Reset step based on whether we have dossier loaded
        // Keeps dossier so UI can still show agent info while disconnected
        const hasDossier = this.state.dossier !== null;
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: hasDossier ? 'ready' : 'idle' });
    }
    /**
     * Stop reconnection attempts without disconnecting.
     */
    stopReconnecting() {
        this.shouldReconnect = false;
        this.clearReconnectTimeout();
    }
    /**
     * Get current reconnection state.
     */
    getReconnectState() {
        return {
            attempts: this.reconnectAttempts,
            isReconnecting: this.reconnectTimeoutId !== null,
        };
    }
    /**
     * Send an intention to the Agent.
     */
    sendIntention(intent, params = {}) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.log('Cannot send intention: not connected');
            return;
        }
        const intentionMsg = buildIntentionMessage({
            avatarId: this.sessionId,
            agentAddress: this.agentAddress,
            intent,
            params,
        });
        this.log('Sending INTENTION:', intentionMsg);
        this.socket.send(intentionMsg);
    }
    /**
     * Send a text message to the Agent (for NLU processing).
     */
    sendMessage(text) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.log('Cannot send message: not connected');
            return;
        }
        const textMsg = buildTextMessage({
            avatarId: this.sessionId,
            agentAddress: this.agentAddress,
            text,
        });
        this.log('Sending MESSAGE:', textMsg);
        this.socket.send(textMsg);
    }
    // === Private methods ===
    extractAgentAddress(url) {
        // Try to extract from URL path, fallback to 'default.agent'
        try {
            const parsed = new URL(url);
            const path = parsed.pathname.slice(1); // Remove leading /
            return path || 'default.agent';
        }
        catch {
            return 'default.agent';
        }
    }
    handleMessage(data, resolveConnect, rejectConnect) {
        try {
            this.log('Received raw message:', data);
            const message = parseMessage(data);
            this.log('Parsed message:', message.type, message);
            switch (message.type) {
                case 'welcome':
                    this.handleWelcome(message);
                    if (resolveConnect) {
                        this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
                        this.dispatch({
                            type: 'SET_CONNECTED',
                            connected: true,
                            agentId: this.agentAddress,
                        });
                        resolveConnect();
                    }
                    break;
                case 'decision':
                    this.handleDecision(message);
                    break;
                case 'memory':
                    this.handleMemory(message);
                    break;
                case 'error':
                    const errorMessage = this.handleError(message);
                    if (rejectConnect) {
                        rejectConnect(new Error(errorMessage));
                    }
                    break;
                case 'pong':
                    // Keep-alive response, ignore
                    break;
                default:
                    this.log('Unhandled message type:', message.type);
            }
        }
        catch (error) {
            this.log('Failed to parse message:', error, 'Raw:', data);
            // Try to handle as JSON for backward compatibility with mock server
            this.handleLegacyJsonMessage(data, resolveConnect, rejectConnect);
        }
    }
    handleLegacyJsonMessage(data, resolveConnect, rejectConnect) {
        try {
            const message = JSON.parse(data);
            this.log('Handling legacy JSON message:', message);
            switch (message.type) {
                case 'WELCOME':
                    this.dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
                    this.dispatch({
                        type: 'SET_CONNECTED',
                        connected: true,
                        agentId: this.agentAddress,
                    });
                    if (resolveConnect)
                        resolveConnect();
                    break;
                case 'DECISION':
                    if (message.facts) {
                        this.dispatch({ type: 'UPDATE_FACTS', facts: message.facts });
                    }
                    if (message.viewInstructions) {
                        this.processInstructions(message.viewInstructions);
                    }
                    break;
                case 'MEMORY':
                    if (message.events) {
                        this.dispatch({ type: 'UPDATE_FACTS', facts: message.events });
                    }
                    break;
                case 'ERROR':
                    this.dispatch({
                        type: 'SHOW_MESSAGE',
                        text: message.message || 'An error occurred',
                        messageType: 'error',
                    });
                    if (rejectConnect)
                        rejectConnect(new Error(message.message));
                    break;
            }
        }
        catch {
            this.log('Message is neither Uhum nor JSON, ignoring');
        }
    }
    handleWelcome(message) {
        this.log('Received WELCOME:', message);
        // Update connection step - loading dossier
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'loading' });
        // Extract cursor from welcome message
        if (message.cursor !== undefined) {
            this.lastCursor = message.cursor;
        }
        // Extract dossier from body if available
        if (message.body) {
            const dossier = extractDossierFromWelcome(message.body);
            if (dossier) {
                this.log('Parsed dossier:', dossier);
                this.dispatch({ type: 'SET_DOSSIER', dossier });
            }
            else {
                this.log('No dossier in WELCOME message');
            }
        }
        // Connection is now ready
        this.dispatch({ type: 'SET_CONNECTION_STEP', step: 'ready' });
    }
    handleDecision(message) {
        this.log('Received DECISION:', message);
        if (!message.body)
            return;
        // Extract data from decision and convert to entities
        const dataTerms = extractDecisionFacts(message.body);
        if (dataTerms.length > 0) {
            // Get model definitions from dossier (if available)
            const models = this.state.dossier?.models;
            // Group by model and sync to entityStore
            const entitiesByModel = groupByModel(dataTerms, models);
            for (const [modelName, entities] of entitiesByModel) {
                this.log(`Syncing ${entities.length} entities for model "${modelName}"`);
                this.dispatch({ type: 'SYNC_ENTITIES', model: modelName, entities });
            }
            // Also update legacy facts array for backward compatibility
            const factsAsObjects = dataTerms.map(termToObject);
            this.log('Decision data (legacy):', factsAsObjects);
            this.dispatch({ type: 'UPDATE_FACTS', facts: factsAsObjects });
        }
        // Extract view instructions (effects) - Brain controls what to show
        const instructions = extractViewInstructions(message.body);
        const viewInstructions = instructions.length > 0
            ? this.termInstructionsToViewInstructions(instructions)
            : [];
        // Check if effects already contain a message
        const hasMessageEffect = viewInstructions.some(i => i.type === 'message');
        // Extract response text - add to chat as agent message (avoid duplicates with message effect)
        const responseText = extractDecisionResponse(message.body);
        if (responseText && !hasMessageEffect) {
            this.log('Decision response:', responseText);
            // Add response to chat history (agent talking to user)
            this.dispatch({
                type: 'ADD_AGENT_MESSAGE',
                text: responseText,
            });
        }
        else if (responseText) {
            this.log('Decision response (handled via message effect):', responseText);
        }
        // Process view instructions
        if (viewInstructions.length > 0) {
            this.log('View instructions:', viewInstructions);
            this.processInstructions(viewInstructions);
        }
        // Only show rejection messages as notifications (errors are important feedback)
        // Regular messages go to chat history
        if (message.body.type === 'compound' && message.body.functor === 'decision') {
            const status = message.body.args[0];
            if (status?.type === 'atom' && status.value === 'rejected') {
                const reason = message.body.args[2];
                const reasonText = reason?.type === 'string' ? reason.value : 'Request rejected';
                this.dispatch({
                    type: 'SHOW_MESSAGE',
                    text: reasonText,
                    messageType: 'error',
                });
            }
        }
    }
    handleMemory(message) {
        this.log('Received MEMORY:', message);
        // Update cursor
        if (message.cursorEnd !== undefined) {
            this.lastCursor = message.cursorEnd;
            // Send ACK
            const ackMsg = buildAckMessage(this.sessionId, this.agentAddress, this.lastCursor);
            this.socket?.send(ackMsg);
        }
        if (!message.body)
            return;
        // Extract events and convert to entities
        const events = extractMemoryEvents(message.body);
        if (events.length > 0) {
            // Get model definitions from dossier (if available)
            const models = this.state.dossier?.models;
            // Group events by model and sync to entityStore
            const entitiesByModel = groupByModel(events, models);
            for (const [modelName, entities] of entitiesByModel) {
                this.log(`Syncing ${entities.length} memory events for model "${modelName}"`);
                this.dispatch({ type: 'SYNC_ENTITIES', model: modelName, entities });
            }
            // Also update legacy facts array for backward compatibility
            const eventsAsObjects = events.map(termToObject);
            this.log('Memory events (legacy):', eventsAsObjects);
            this.dispatch({ type: 'UPDATE_FACTS', facts: eventsAsObjects });
        }
    }
    handleError(message) {
        this.log('Received ERROR:', message);
        let errorCode = 'unknown_error';
        let errorText = 'An error occurred';
        // Parse error(code, message, details) term
        if (message.body?.type === 'compound' && message.body.functor === 'error') {
            const [codeArg, msgArg] = message.body.args;
            // First arg is the error code (atom)
            if (codeArg?.type === 'atom') {
                errorCode = codeArg.value;
            }
            // Second arg is the error message (string)
            if (msgArg?.type === 'string') {
                errorText = msgArg.value;
            }
        }
        this.log(`Error [${errorCode}]: ${errorText}`);
        this.dispatch({
            type: 'SHOW_MESSAGE',
            text: errorText,
            messageType: 'error',
        });
        return `[${errorCode}] ${errorText}`;
    }
    termInstructionsToViewInstructions(terms) {
        return terms.map((term) => {
            if (term.type !== 'compound') {
                return { type: 'unknown' };
            }
            const instruction = { type: term.functor };
            // Parse common instruction patterns
            switch (term.functor) {
                case 'message':
                    // message(Type, Text) or message(Type, Text, duration(Ms))
                    instruction.messageType = term.args[0]?.type === 'atom' ? term.args[0].value : 'info';
                    instruction.text = term.args[1]?.type === 'string' ? term.args[1].value : '';
                    if (term.args[2]?.type === 'compound' && term.args[2].functor === 'duration') {
                        instruction.duration = term.args[2].args[0]?.type === 'number'
                            ? term.args[2].args[0].value
                            : undefined;
                    }
                    break;
                case 'navigate':
                    instruction.route = term.args[0]?.type === 'atom' ? term.args[0].value : '';
                    break;
                case 'highlight':
                    instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
                    if (term.args[1]?.type === 'compound' && term.args[1].functor === 'duration') {
                        instruction.duration = term.args[1].args[0]?.type === 'number'
                            ? term.args[1].args[0].value
                            : undefined;
                    }
                    break;
                case 'scroll_to':
                    instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
                    break;
                case 'focus':
                    instruction.elementRef = term.args[0]?.type === 'string' ? term.args[0].value : '';
                    break;
                case 'loading':
                    instruction.show = term.args[0]?.type === 'atom' ? term.args[0].value === 'true' : true;
                    instruction.message = term.args[1]?.type === 'string' ? term.args[1].value : '';
                    break;
                case 'modal':
                    instruction.name = term.args[0]?.type === 'atom' ? term.args[0].value : '';
                    instruction.data = term.args[1] ? termToObject(term.args[1]) : undefined;
                    break;
                case 'close_modal':
                    // No additional args
                    break;
                case 'go_back':
                    // No additional args
                    break;
                case 'desire':
                    // desire([component1, component2, ...])
                    // Extract the list of desired components
                    const desireList = term.args[0];
                    if (desireList?.type === 'list') {
                        instruction.desires = desireList.items
                            .map((item) => {
                            if (item.type === 'atom') {
                                return item.value;
                            }
                            return null;
                        })
                            .filter((d) => d !== null);
                    }
                    break;
            }
            return instruction;
        });
    }
    instructionToAction(instruction) {
        const effects = [];
        switch (instruction.type) {
            case 'message': {
                const messageType = instruction.messageType || 'info';
                const text = instruction.text;
                // Errors and warnings go to the notification bar (important feedback)
                // Info and success messages go to chat (conversational)
                if (messageType === 'error' || messageType === 'warning') {
                    const action = {
                        type: 'SHOW_MESSAGE',
                        text,
                        messageType,
                    };
                    if (instruction.duration) {
                        effects.push({
                            id: 'message',
                            delayMs: instruction.duration,
                            action: { type: 'HIDE_MESSAGE' },
                        });
                    }
                    return { action, effects };
                }
                else {
                    // Info/success messages go to chat as agent messages
                    return {
                        action: { type: 'ADD_AGENT_MESSAGE', text },
                        effects,
                    };
                }
            }
            case 'navigate':
                return {
                    action: { type: 'NAVIGATE', route: instruction.route },
                    effects,
                };
            case 'go_back':
                return { action: { type: 'GO_BACK' }, effects };
            case 'scroll_to':
                // Scroll is handled as a side effect
                this.scrollToElement(instruction.elementRef);
                return { action: null, effects };
            case 'focus':
                return {
                    action: { type: 'FOCUS', elementRef: instruction.elementRef },
                    effects,
                };
            case 'highlight': {
                const action = {
                    type: 'HIGHLIGHT',
                    elementRef: instruction.elementRef,
                };
                if (instruction.duration) {
                    effects.push({
                        id: `highlight_${instruction.elementRef}`,
                        delayMs: instruction.duration,
                        action: { type: 'CLEAR_HIGHLIGHT', elementRef: instruction.elementRef },
                    });
                }
                return { action, effects };
            }
            case 'modal':
                return {
                    action: {
                        type: 'SHOW_MODAL',
                        name: instruction.name,
                        data: instruction.data,
                    },
                    effects,
                };
            case 'close_modal':
                return { action: { type: 'CLOSE_MODAL' }, effects };
            case 'loading':
                if (instruction.show) {
                    return {
                        action: { type: 'SHOW_LOADING', message: instruction.message },
                        effects,
                    };
                }
                else {
                    return { action: { type: 'HIDE_LOADING' }, effects };
                }
            case 'desire':
                // desire([component1, component2, ...]) triggers corresponding intentions
                // For each desired component, send an intention with that name
                const desires = instruction.desires;
                if (desires && Array.isArray(desires) && desires.length > 0) {
                    for (const desireName of desires) {
                        this.log(`Triggering intention from desire: ${desireName}`);
                        // Convert desire name (e.g., "list_books") to intention
                        // The desire name should match an intent name
                        this.sendIntention(desireName, {});
                    }
                }
                // No state action needed, just side effect of sending intentions
                return { action: null, effects };
            default:
                this.log('Unknown instruction type:', instruction.type);
                return { action: null, effects };
        }
    }
    handleSideEffects(action) {
        // Handle scroll effect
        if (action.type === 'SCROLL_TO') {
            this.scrollToElement(action.elementRef);
        }
        // Handle focus effect
        if (action.type === 'FOCUS') {
            this.focusElement(action.elementRef);
        }
    }
    scrollToElement(elementRef) {
        const element = document.getElementById(elementRef) ||
            document.querySelector(`[data-ref="${elementRef}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        else {
            this.log('Element not found for scroll:', elementRef);
        }
    }
    focusElement(elementRef) {
        const element = document.getElementById(elementRef) ||
            document.querySelector(`[data-ref="${elementRef}"]`);
        if (element instanceof HTMLElement) {
            element.focus();
        }
        else {
            this.log('Element not found for focus:', elementRef);
        }
    }
    scheduleEffect(id, delayMs, action) {
        // Cancel existing effect with same ID
        this.cancelEffect(id);
        const timerId = setTimeout(() => {
            this.scheduledEffects.delete(id);
            this.dispatch(action);
        }, delayMs);
        this.scheduledEffects.set(id, { id, timerId, action });
    }
    cancelEffect(id) {
        const effect = this.scheduledEffects.get(id);
        if (effect) {
            clearTimeout(effect.timerId);
            this.scheduledEffects.delete(id);
        }
    }
    log(...args) {
        if (this.options.debug) {
            console.log('[Avatar]', ...args);
        }
    }
}
//# sourceMappingURL=avatar.js.map