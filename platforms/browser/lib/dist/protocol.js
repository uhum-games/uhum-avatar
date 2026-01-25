/**
 * Uhum Protocol encoder/decoder for TypeScript.
 *
 * Uhum frames consist of:
 * - Version line: "UHUM/1.0"
 * - Headers: "key: value" pairs
 * - Empty line separator
 * - Body: Prolog-style term
 *
 * @example
 * ```
 * UHUM/1.0
 * type: intention
 * id: msg_001
 * from: uhum://avatar:quickstart.billing/ses_abc
 * to: uhum://quickstart.billing
 * at: 1706140800000
 *
 * intention(pay_invoice, [invoice_id("INV-001")]).
 * ```
 */
// ============================================================================
// Term Constructors
// ============================================================================
export const Term = {
    atom: (value) => ({ type: 'atom', value }),
    number: (value) => ({ type: 'number', value }),
    string: (value) => ({ type: 'string', value }),
    list: (items) => ({ type: 'list', items }),
    compound: (functor, args) => ({ type: 'compound', functor, args }),
    variable: (name) => ({ type: 'variable', name }),
};
// ============================================================================
// Term Serialization (to Prolog format)
// ============================================================================
export function termToString(term) {
    switch (term.type) {
        case 'atom':
            // Quote atom if it contains special characters or starts with uppercase
            if (/^[a-z][a-z0-9_]*$/.test(term.value)) {
                return term.value;
            }
            return `'${term.value.replace(/'/g, "\\'")}'`;
        case 'number':
            return term.value.toString();
        case 'string':
            return `"${term.value.replace(/"/g, '\\"')}"`;
        case 'list':
            return `[${term.items.map(termToString).join(', ')}]`;
        case 'compound':
            if (term.args.length === 0) {
                return term.functor;
            }
            return `${term.functor}(${term.args.map(termToString).join(', ')})`;
        case 'variable':
            return term.name;
        default:
            throw new Error(`Unknown term type: ${term.type}`);
    }
}
// ============================================================================
// Term Parsing (from Prolog format)
// ============================================================================
class TermParser {
    constructor(input) {
        this.pos = 0;
        this.input = input.trim();
    }
    parse() {
        this.skipWhitespace();
        return this.parseTerm();
    }
    parseTerm() {
        this.skipWhitespace();
        const ch = this.peek();
        if (ch === '[') {
            return this.parseList();
        }
        if (ch === '"') {
            return this.parseString();
        }
        if (ch === "'") {
            return this.parseQuotedAtom();
        }
        if (ch === '-' || (ch >= '0' && ch <= '9')) {
            return this.parseNumber();
        }
        if (ch >= 'A' && ch <= 'Z') {
            return this.parseVariable();
        }
        if (ch >= 'a' && ch <= 'z') {
            return this.parseAtomOrCompound();
        }
        throw new Error(`Unexpected character: ${ch} at position ${this.pos}`);
    }
    parseList() {
        this.expect('[');
        this.skipWhitespace();
        if (this.peek() === ']') {
            this.advance();
            return Term.list([]);
        }
        const items = [];
        items.push(this.parseTerm());
        while (this.peek() === ',') {
            this.advance();
            this.skipWhitespace();
            items.push(this.parseTerm());
        }
        this.skipWhitespace();
        this.expect(']');
        return Term.list(items);
    }
    parseString() {
        this.expect('"');
        let value = '';
        while (this.pos < this.input.length && this.peek() !== '"') {
            if (this.peek() === '\\') {
                this.advance();
                value += this.advance();
            }
            else {
                value += this.advance();
            }
        }
        this.expect('"');
        return Term.string(value);
    }
    parseQuotedAtom() {
        this.expect("'");
        let value = '';
        while (this.pos < this.input.length && this.peek() !== "'") {
            if (this.peek() === '\\') {
                this.advance();
                value += this.advance();
            }
            else {
                value += this.advance();
            }
        }
        this.expect("'");
        return Term.atom(value);
    }
    parseNumber() {
        let numStr = '';
        if (this.peek() === '-') {
            numStr += this.advance();
        }
        while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
            numStr += this.advance();
        }
        return Term.number(parseFloat(numStr));
    }
    parseVariable() {
        let name = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            name += this.advance();
        }
        return Term.variable(name);
    }
    parseAtomOrCompound() {
        let name = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            name += this.advance();
        }
        this.skipWhitespace();
        if (this.peek() === '(') {
            this.advance();
            this.skipWhitespace();
            if (this.peek() === ')') {
                this.advance();
                return Term.compound(name, []);
            }
            const args = [];
            args.push(this.parseTerm());
            while (this.peek() === ',') {
                this.advance();
                this.skipWhitespace();
                args.push(this.parseTerm());
            }
            this.skipWhitespace();
            this.expect(')');
            return Term.compound(name, args);
        }
        return Term.atom(name);
    }
    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.peek())) {
            this.advance();
        }
    }
    peek() {
        return this.input[this.pos] || '';
    }
    advance() {
        return this.input[this.pos++] || '';
    }
    expect(ch) {
        if (this.peek() !== ch) {
            throw new Error(`Expected '${ch}' but found '${this.peek()}' at position ${this.pos}`);
        }
        this.advance();
    }
}
export function parseTerm(input) {
    // Remove trailing period if present
    const trimmed = input.trim().replace(/\.$/, '').trim();
    return new TermParser(trimmed).parse();
}
// ============================================================================
// Frame Encoding
// ============================================================================
export function encodeFrame(frame) {
    const lines = [frame.version];
    for (const [key, value] of Object.entries(frame.headers)) {
        lines.push(`${key}: ${value}`);
    }
    lines.push(''); // Empty line separator
    if (frame.body) {
        lines.push(frame.body);
    }
    return lines.join('\n');
}
// ============================================================================
// Frame Decoding
// ============================================================================
export function decodeFrame(input) {
    const lines = input.split('\n');
    if (lines.length === 0) {
        throw new Error('Empty frame');
    }
    const version = lines[0];
    if (!version.startsWith('UHUM/')) {
        throw new Error(`Invalid version line: ${version}`);
    }
    const headers = {};
    let bodyStartIndex = lines.length;
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') {
            bodyStartIndex = i + 1;
            break;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
            throw new Error(`Invalid header line: ${line}`);
        }
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();
        headers[key] = value;
    }
    const body = lines.slice(bodyStartIndex).join('\n').trim() || undefined;
    return { version, headers, body };
}
// ============================================================================
// Message Building
// ============================================================================
let messageCounter = 0;
export function generateMessageId() {
    return `msg_${Date.now().toString(36)}_${(++messageCounter).toString(36)}`;
}
export function buildMessage(options, body) {
    const frame = {
        version: 'UHUM/1.0',
        headers: {
            type: options.type,
            id: generateMessageId(),
            from: options.from,
            to: options.to,
            at: Date.now().toString(),
        },
    };
    if (options.reply) {
        frame.headers.reply = options.reply;
    }
    if (options.trace) {
        frame.headers.trace = options.trace;
    }
    if (body) {
        frame.body = termToString(body) + '.';
    }
    return encodeFrame(frame);
}
// ============================================================================
// Message Parsing
// ============================================================================
export function parseMessage(input) {
    const frame = decodeFrame(input);
    const message = {
        type: frame.headers.type,
        id: frame.headers.id,
        from: frame.headers.from,
        to: frame.headers.to,
        at: parseInt(frame.headers.at, 10),
    };
    if (frame.headers.cursor) {
        message.cursor = parseInt(frame.headers.cursor, 10);
    }
    if (frame.headers.cursor_end) {
        message.cursorEnd = parseInt(frame.headers.cursor_end, 10);
    }
    if (frame.headers.trace) {
        message.trace = frame.headers.trace;
    }
    if (frame.headers.reply) {
        message.reply = frame.headers.reply;
    }
    if (frame.body) {
        message.body = parseTerm(frame.body);
    }
    return message;
}
export function buildJoinMessage(options) {
    const capabilities = options.capabilities || ['memory_sync', 'intentions'];
    const bodyArgs = [
        Term.compound('capabilities', [Term.list(capabilities.map(Term.atom))]),
    ];
    if (options.resumeToken) {
        bodyArgs.push(Term.compound('resume', [Term.string(options.resumeToken)]));
    }
    if (options.resumeCursor !== undefined) {
        bodyArgs.push(Term.compound('cursor', [Term.number(options.resumeCursor)]));
    }
    return buildMessage({
        type: 'join',
        from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
        to: `uhum://${options.agentAddress}`,
    }, Term.compound('join', [Term.list(bodyArgs)]));
}
export function buildIntentionMessage(options) {
    const paramTerms = Object.entries(options.params).map(([key, value]) => {
        return Term.compound(key, [valueToTerm(value)]);
    });
    const body = Term.compound('intention', [
        Term.atom(options.intent),
        Term.list(paramTerms),
        Term.compound('context', [
            Term.list([Term.compound('session', [Term.string(options.avatarId)])]),
        ]),
    ]);
    return buildMessage({
        type: 'intention',
        from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
        to: `uhum://${options.agentAddress}`,
    }, body);
}
export function buildTextMessage(options) {
    const body = Term.compound('message', [Term.string(options.text)]);
    return buildMessage({
        type: 'intention',
        from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
        to: `uhum://${options.agentAddress}`,
    }, body);
}
export function buildLeaveMessage(avatarId, agentAddress) {
    return buildMessage({
        type: 'leave',
        from: `uhum://avatar:${agentAddress}/${avatarId}`,
        to: `uhum://${agentAddress}`,
    }, Term.atom('leave'));
}
export function buildPingMessage(avatarId, agentAddress) {
    return buildMessage({
        type: 'ping',
        from: `uhum://avatar:${agentAddress}/${avatarId}`,
        to: `uhum://${agentAddress}`,
    }, Term.atom('ping'));
}
export function buildAckMessage(avatarId, agentAddress, cursor) {
    const frame = {
        version: 'UHUM/1.0',
        headers: {
            type: 'ack',
            id: generateMessageId(),
            from: `uhum://avatar:${agentAddress}/${avatarId}`,
            to: `uhum://${agentAddress}`,
            at: Date.now().toString(),
            cursor: cursor.toString(),
        },
    };
    frame.body = 'ack.';
    return encodeFrame(frame);
}
// ============================================================================
// Helpers
// ============================================================================
function valueToTerm(value) {
    if (typeof value === 'string') {
        return Term.string(value);
    }
    if (typeof value === 'number') {
        return Term.number(value);
    }
    if (typeof value === 'boolean') {
        return Term.atom(value ? 'true' : 'false');
    }
    if (Array.isArray(value)) {
        return Term.list(value.map(valueToTerm));
    }
    if (value === null || value === undefined) {
        return Term.atom('null');
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        return Term.list(entries.map(([k, v]) => Term.compound(k, [valueToTerm(v)])));
    }
    return Term.string(String(value));
}
// ============================================================================
// Response Extraction Helpers
// ============================================================================
/**
 * Extract facts from a DECISION message body.
 *
 * Body format: decision(Status, [facts(...), effects(...)]).
 */
export function extractDecisionFacts(body) {
    if (body.type !== 'compound' || body.functor !== 'decision') {
        return [];
    }
    // decision(accepted, [...])
    const dataList = body.args[1];
    if (dataList?.type !== 'list') {
        return [];
    }
    // Find facts(...) in the list
    for (const item of dataList.items) {
        if (item.type === 'compound' && item.functor === 'facts') {
            const factsList = item.args[0];
            if (factsList?.type === 'list') {
                return factsList.items;
            }
        }
    }
    return [];
}
/**
 * Extract view instructions from a DECISION message body.
 */
export function extractViewInstructions(body) {
    if (body.type !== 'compound' || body.functor !== 'decision') {
        return [];
    }
    const dataList = body.args[1];
    if (dataList?.type !== 'list') {
        return [];
    }
    // Find view_instructions(...) in the list
    for (const item of dataList.items) {
        if (item.type === 'compound' && item.functor === 'view_instructions') {
            const instructionsList = item.args[0];
            if (instructionsList?.type === 'list') {
                return instructionsList.items;
            }
        }
    }
    return [];
}
/**
 * Extract events from a MEMORY message body.
 *
 * Body format: memory([event(...), event(...)]).
 */
export function extractMemoryEvents(body) {
    if (body.type !== 'compound' || body.functor !== 'memory') {
        return [];
    }
    const eventList = body.args[0];
    if (eventList?.type !== 'list') {
        return [];
    }
    return eventList.items;
}
/**
 * Convert Term to a plain JavaScript object for easier use in UI.
 */
export function termToObject(term) {
    switch (term.type) {
        case 'atom':
            return term.value;
        case 'number':
            return term.value;
        case 'string':
            return term.value;
        case 'variable':
            return `$${term.name}`;
        case 'list':
            return term.items.map(termToObject);
        case 'compound':
            // Convert compound to object if it looks like a record
            if (term.args.length === 1) {
                // functor(value) -> { functor: value }
                return { [term.functor]: termToObject(term.args[0]) };
            }
            // functor(a, b, c) -> { _functor: 'functor', _args: [a, b, c] }
            return {
                _functor: term.functor,
                _args: term.args.map(termToObject),
            };
        default:
            return null;
    }
}
/**
 * Extract dossier from a WELCOME message body.
 *
 * Body format:
 * welcome([
 *   agent(id, version),
 *   resume(token),
 *   cursor(0),
 *   dossier([
 *     identity([id(...), name(...), ...]),
 *     intents([intent(...), ...]),
 *     presentation([...])
 *   ])
 * ])
 */
export function extractDossierFromWelcome(body) {
    if (body.type !== 'compound' || body.functor !== 'welcome') {
        return null;
    }
    const welcomeList = body.args[0];
    if (welcomeList?.type !== 'list') {
        return null;
    }
    // Find dossier(...) in the welcome list
    let dossierTerm = null;
    let agentId = '';
    let agentVersion = '';
    for (const item of welcomeList.items) {
        if (item.type === 'compound') {
            if (item.functor === 'dossier') {
                dossierTerm = item;
            }
            else if (item.functor === 'agent' && item.args.length >= 2) {
                // agent(id, version)
                agentId = extractString(item.args[0]) || '';
                agentVersion = extractString(item.args[1]) || '';
            }
        }
    }
    if (!dossierTerm) {
        // No dossier in WELCOME - create minimal one from agent info
        if (agentId) {
            return {
                identity: {
                    id: agentId,
                    name: agentId,
                    version: agentVersion || '0.0.0',
                },
                intents: [],
            };
        }
        return null;
    }
    // Parse dossier([...])
    const dossierList = dossierTerm.args[0];
    if (dossierList?.type !== 'list') {
        return null;
    }
    let identity = { id: agentId, name: agentId, version: agentVersion };
    let intents = [];
    let presentation;
    for (const item of dossierList.items) {
        if (item.type !== 'compound')
            continue;
        switch (item.functor) {
            case 'identity':
                identity = parseIdentity(item.args[0], agentId, agentVersion);
                break;
            case 'intents':
                intents = parseIntents(item.args[0]);
                break;
            case 'presentation':
                presentation = parsePresentation(item.args[0]);
                break;
        }
    }
    return { identity, intents, presentation };
}
/**
 * Parse identity section.
 */
function parseIdentity(term, defaultId, defaultVersion) {
    const identity = {
        id: defaultId,
        name: defaultId,
        version: defaultVersion,
    };
    if (!term || term.type !== 'list')
        return identity;
    for (const item of term.items) {
        if (item.type !== 'compound' || item.args.length < 1)
            continue;
        const value = extractString(item.args[0]);
        switch (item.functor) {
            case 'id':
                identity.id = value || defaultId;
                break;
            case 'name':
                identity.name = value || defaultId;
                break;
            case 'version':
                identity.version = value || defaultVersion;
                break;
            case 'description':
                identity.description = value || undefined;
                break;
            case 'tags':
                if (item.args[0]?.type === 'list') {
                    identity.tags = item.args[0].items.map(t => extractString(t) || '').filter(Boolean);
                }
                break;
        }
    }
    return identity;
}
/**
 * Parse intents section.
 */
function parseIntents(term) {
    if (!term || term.type !== 'list')
        return [];
    const intents = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'intent')
            continue;
        const intent = parseIntent(item);
        if (intent)
            intents.push(intent);
    }
    return intents;
}
/**
 * Parse a single intent.
 */
function parseIntent(term) {
    if (term.type !== 'compound' || term.functor !== 'intent')
        return null;
    const name = extractString(term.args[0]);
    if (!name)
        return null;
    const intent = { name };
    const propsList = term.args[1];
    if (propsList?.type !== 'list')
        return intent;
    for (const prop of propsList.items) {
        if (prop.type !== 'compound')
            continue;
        switch (prop.functor) {
            case 'description':
                intent.description = extractString(prop.args[0]) || undefined;
                break;
            case 'params':
                intent.params = parseParams(prop.args[0]);
                break;
            case 'effects':
                if (prop.args[0]?.type === 'list') {
                    intent.effects = prop.args[0].items.map(t => extractString(t) || '').filter(Boolean);
                }
                break;
        }
    }
    return intent;
}
/**
 * Parse intent parameters.
 */
function parseParams(term) {
    if (!term || term.type !== 'list')
        return [];
    const params = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'param')
            continue;
        const name = extractString(item.args[0]);
        const type = extractString(item.args[1]) || 'string';
        const requiredAtom = item.args[2];
        const required = requiredAtom?.type === 'atom' && requiredAtom.value === 'required';
        const description = item.args[3] ? extractString(item.args[3]) ?? undefined : undefined;
        if (name) {
            params.push({ name, type, required, description });
        }
    }
    return params;
}
/**
 * Parse presentation section.
 *
 * Handles:
 * - brand([...]) - Visual identity
 * - state([...]) - Global state schema
 * - components([component(...), ...]) - UI building blocks
 * - views([view(...), ...]) - Composition of components
 * - home([...]) - Landing page configuration
 * - layouts([layout_hint(...), ...]) - Layout hints
 */
function parsePresentation(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const presentation = {};
    for (const item of term.items) {
        if (item.type !== 'compound')
            continue;
        switch (item.functor) {
            case 'brand':
                presentation.brand = parseBrand(item.args[0]);
                break;
            case 'state':
                presentation.state = parseState(item.args[0]);
                break;
            case 'components':
                presentation.components = parseComponents(item.args[0]);
                break;
            case 'views':
                presentation.views = parseViews(item.args[0]);
                break;
            case 'home':
                presentation.home = parseHome(item.args[0]);
                break;
            case 'layouts':
                presentation.layouts = parseLayouts(item.args[0]);
                break;
        }
    }
    return Object.keys(presentation).length > 0 ? presentation : undefined;
}
/**
 * Parse brand info.
 */
function parseBrand(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const brand = {};
    for (const item of term.items) {
        if (item.type !== 'compound')
            continue;
        const value = extractString(item.args[0]);
        switch (item.functor) {
            case 'name':
                brand.name = value || undefined;
                break;
            case 'logo':
                brand.logo = value || undefined;
                break;
            case 'primary_color':
                brand.primaryColor = value || undefined;
                break;
            case 'secondary_color':
                brand.secondaryColor = value || undefined;
                break;
            case 'accent_color':
                brand.accentColor = value || undefined;
                break;
            case 'tone':
                brand.tone = value || undefined;
                break;
            case 'greetings':
                // greetings(["Hello!", "Hi there!", ...])
                if (item.args[0]?.type === 'list') {
                    brand.greetings = item.args[0].items
                        .map(t => extractString(t))
                        .filter((s) => s !== null && s.length > 0);
                }
                break;
        }
    }
    return Object.keys(brand).length > 0 ? brand : undefined;
}
// =============================================================================
// State Parsing
// =============================================================================
/**
 * Parse UI state schema.
 *
 * State defines which views and components are shown in the Avatar.
 * This is Avatar-only state — it does NOT flow to the Brain.
 *
 * Format:
 * ```prolog
 * state([
 *     selected_book([
 *         type(model),
 *         source(book),
 *         description("Currently selected book")
 *     ])
 * ])
 * ```
 */
function parseState(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const variables = [];
    for (const item of term.items) {
        if (item.type !== 'compound')
            continue;
        // Each item is: variable_name([type(...), source(...), ...])
        const name = item.functor;
        const variable = { name, type: 'unknown' };
        const propsList = item.args[0];
        if (propsList?.type === 'list') {
            for (const prop of propsList.items) {
                if (prop.type !== 'compound')
                    continue;
                switch (prop.functor) {
                    case 'type':
                        variable.type = extractString(prop.args[0]) || 'unknown';
                        break;
                    case 'source':
                        variable.source = extractString(prop.args[0]) || undefined;
                        break;
                    case 'description':
                        variable.description = extractString(prop.args[0]) || undefined;
                        break;
                }
            }
        }
        variables.push(variable);
    }
    return variables.length > 0 ? { variables } : undefined;
}
// =============================================================================
// Component Parsing
// =============================================================================
/**
 * Parse component definitions.
 *
 * Format:
 * ```prolog
 * components([
 *     component(books, [
 *         title("My Books"),
 *         type(list),
 *         source(book),
 *         fields([field(title, string, "Title"), ...]),
 *         actions([action(add_book, "Add Book", plus)])
 *     ]),
 *     component(book_detail, [
 *         title("Book Details"),
 *         type(detail),
 *         source(book),
 *         context(selected_book),
 *         fields([...]),
 *         actions([...])
 *     ])
 * ])
 * ```
 */
function parseComponents(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const components = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'component')
            continue;
        const name = extractString(item.args[0]);
        if (!name)
            continue;
        const component = { name };
        const propsList = item.args[1];
        if (propsList?.type === 'list') {
            for (const prop of propsList.items) {
                if (prop.type !== 'compound')
                    continue;
                switch (prop.functor) {
                    case 'title':
                        component.title = extractString(prop.args[0]) || undefined;
                        break;
                    case 'description':
                        component.description = extractString(prop.args[0]) || undefined;
                        break;
                    case 'type':
                        component.type = extractString(prop.args[0]) || undefined;
                        break;
                    case 'source':
                        component.source = extractString(prop.args[0]) || undefined;
                        break;
                    case 'context':
                        // context(selected_book) - the context variable this component depends on
                        component.context = extractString(prop.args[0]) || undefined;
                        break;
                    case 'icon':
                        component.icon = extractString(prop.args[0]) || undefined;
                        break;
                    case 'is_default':
                        component.isDefault = prop.args[0]?.type === 'atom' && prop.args[0].value === 'true';
                        break;
                    case 'fields':
                        component.fields = parseComponentFields(prop.args[0]);
                        break;
                    case 'actions':
                        component.actions = parseComponentActions(prop.args[0]);
                        break;
                    case 'filters':
                        component.filters = parseComponentFilters(prop.args[0]);
                        break;
                    case 'default_sort':
                        component.defaultSort = parseDefaultSort(prop.args[0]);
                        break;
                }
            }
        }
        components.push(component);
    }
    return components.length > 0 ? components : undefined;
}
/**
 * Parse component fields.
 *
 * Format: fields([field(name, type, "Label"), ...])
 */
function parseComponentFields(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const fields = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'field')
            continue;
        const name = extractString(item.args[0]);
        const type = (extractString(item.args[1]) || 'string');
        const label = extractString(item.args[2]) || name || '';
        if (name) {
            const field = { name, type, label };
            // Parse optional properties from 4th argument if present
            const optsList = item.args[3];
            if (optsList?.type === 'list') {
                for (const opt of optsList.items) {
                    if (opt.type !== 'compound')
                        continue;
                    switch (opt.functor) {
                        case 'sortable':
                            field.sortable = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                        case 'filterable':
                            field.filterable = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                        case 'width':
                            field.width = extractString(opt.args[0]) || undefined;
                            break;
                        case 'reference':
                            // For model type fields: reference to another model
                            field.reference = extractString(opt.args[0]) || undefined;
                            break;
                    }
                }
            }
            fields.push(field);
        }
    }
    return fields.length > 0 ? fields : undefined;
}
/**
 * Parse component actions.
 *
 * Format: actions([action(intent, "Label", icon, [options]), ...])
 */
function parseComponentActions(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const actions = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'action')
            continue;
        const intent = extractString(item.args[0]);
        const label = extractString(item.args[1]) || intent || '';
        if (intent) {
            const action = { intent, label };
            // Optional icon (3rd arg)
            if (item.args[2]) {
                action.icon = extractString(item.args[2]) || undefined;
            }
            // Parse optional properties from 4th argument if present
            const optsList = item.args[3];
            if (optsList?.type === 'list') {
                for (const opt of optsList.items) {
                    if (opt.type !== 'compound')
                        continue;
                    switch (opt.functor) {
                        case 'variant':
                            action.variant = extractString(opt.args[0]) || undefined;
                            break;
                        case 'requires_selection':
                            action.requiresSelection = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                    }
                }
            }
            actions.push(action);
        }
    }
    return actions.length > 0 ? actions : undefined;
}
/**
 * Parse component filters.
 *
 * Format: filters([filter(field, type, "Label", [options]), ...])
 */
function parseComponentFilters(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const filters = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'filter')
            continue;
        const field = extractString(item.args[0]);
        const type = (extractString(item.args[1]) || 'select');
        if (field) {
            const filter = { field, type };
            // Optional label (3rd arg)
            if (item.args[2]) {
                filter.label = extractString(item.args[2]) || undefined;
            }
            // Optional options list (4th arg)
            if (item.args[3]?.type === 'list') {
                filter.options = item.args[3].items
                    .map(t => extractString(t))
                    .filter((s) => s !== null);
            }
            filters.push(filter);
        }
    }
    return filters.length > 0 ? filters : undefined;
}
// =============================================================================
// Home Section Parsing
// =============================================================================
/**
 * Parse home sections.
 */
function parseHome(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const sections = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'section')
            continue;
        const name = extractString(item.args[0]);
        if (!name)
            continue;
        const section = { name };
        const propsList = item.args[1];
        if (propsList?.type === 'list') {
            for (const prop of propsList.items) {
                if (prop.type !== 'compound')
                    continue;
                switch (prop.functor) {
                    case 'message':
                        section.message = extractString(prop.args[0]) || undefined;
                        break;
                    case 'data_source':
                        section.dataSource = extractString(prop.args[0]) || undefined;
                        break;
                    case 'layout_hint':
                        section.layoutHint = extractString(prop.args[0]) || undefined;
                        break;
                    case 'actions':
                        if (prop.args[0]?.type === 'list') {
                            section.actions = prop.args[0].items.map(t => extractString(t) || '').filter(Boolean);
                        }
                        break;
                }
            }
        }
        sections.push(section);
    }
    return sections.length > 0 ? sections : undefined;
}
/**
 * Parse view definitions.
 *
 * Views are compositions of components. They define which components
 * to show together and can be activated by context.
 *
 * Format:
 * ```prolog
 * views([
 *     view(home, [
 *         title("Home"),
 *         is_default(true),
 *         components([books])
 *     ]),
 *     view(book_view, [
 *         title("Book Details"),
 *         context(selected_book),
 *         components([books, book_detail]),
 *         layout(split)
 *     ])
 * ])
 * ```
 */
function parseViews(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const views = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'view')
            continue;
        const name = extractString(item.args[0]);
        if (!name)
            continue;
        const view = { name };
        const propsList = item.args[1];
        if (propsList?.type === 'list') {
            for (const prop of propsList.items) {
                if (prop.type !== 'compound')
                    continue;
                switch (prop.functor) {
                    case 'title':
                        view.title = extractString(prop.args[0]) || undefined;
                        break;
                    case 'description':
                        view.description = extractString(prop.args[0]) || undefined;
                        break;
                    case 'context':
                        // Context variable that activates this view
                        view.context = extractString(prop.args[0]) || undefined;
                        break;
                    case 'components':
                        // List of component names to show in this view
                        if (prop.args[0]?.type === 'list') {
                            view.components = prop.args[0].items
                                .map(t => extractString(t))
                                .filter((s) => s !== null);
                        }
                        break;
                    case 'layout':
                        // How to arrange components: single, split, tabs, stack
                        view.layout = extractString(prop.args[0]) || undefined;
                        break;
                    case 'icon':
                        view.icon = extractString(prop.args[0]) || undefined;
                        break;
                    case 'is_default':
                        view.isDefault = prop.args[0]?.type === 'atom' && prop.args[0].value === 'true';
                        break;
                }
            }
        }
        views.push(view);
    }
    return views.length > 0 ? views : undefined;
}
/**
 * Parse view columns.
 * Format: columns([column(name, type, "Label"), ...])
 */
function parseViewColumns(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const columns = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'column')
            continue;
        const name = extractString(item.args[0]);
        const type = extractString(item.args[1]) || 'string';
        const label = extractString(item.args[2]) || name || '';
        if (name) {
            const column = { name, type, label };
            // Parse optional properties from 4th argument if present
            const optsList = item.args[3];
            if (optsList?.type === 'list') {
                for (const opt of optsList.items) {
                    if (opt.type !== 'compound')
                        continue;
                    switch (opt.functor) {
                        case 'sortable':
                            column.sortable = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                        case 'filterable':
                            column.filterable = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                        case 'width':
                            column.width = extractString(opt.args[0]) || undefined;
                            break;
                    }
                }
            }
            columns.push(column);
        }
    }
    return columns.length > 0 ? columns : undefined;
}
/**
 * Parse view actions.
 * Format: actions([action(intent, "Label", icon), ...])
 */
function parseViewActions(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const actions = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'action')
            continue;
        const intent = extractString(item.args[0]);
        const label = extractString(item.args[1]) || intent || '';
        if (intent) {
            const action = { intent, label };
            // Optional icon (3rd arg)
            if (item.args[2]) {
                action.icon = extractString(item.args[2]) || undefined;
            }
            // Parse optional properties from 4th argument if present
            const optsList = item.args[3];
            if (optsList?.type === 'list') {
                for (const opt of optsList.items) {
                    if (opt.type !== 'compound')
                        continue;
                    switch (opt.functor) {
                        case 'variant':
                            action.variant = extractString(opt.args[0]) || undefined;
                            break;
                        case 'requires_selection':
                            action.requiresSelection = opt.args[0]?.type === 'atom' && opt.args[0].value === 'true';
                            break;
                    }
                }
            }
            actions.push(action);
        }
    }
    return actions.length > 0 ? actions : undefined;
}
/**
 * Parse view filters.
 * Format: filters([filter(field, type, "Label", [options]), ...])
 */
function parseViewFilters(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const filters = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'filter')
            continue;
        const field = extractString(item.args[0]);
        const type = (extractString(item.args[1]) || 'select');
        if (field) {
            const filter = { field, type };
            // Optional label (3rd arg)
            if (item.args[2]) {
                filter.label = extractString(item.args[2]) || undefined;
            }
            // Optional options list (4th arg)
            if (item.args[3]?.type === 'list') {
                filter.options = item.args[3].items
                    .map(t => extractString(t))
                    .filter((s) => s !== null);
            }
            filters.push(filter);
        }
    }
    return filters.length > 0 ? filters : undefined;
}
/**
 * Parse default sort configuration.
 * Format: default_sort([field(name), direction(asc|desc)])
 */
function parseDefaultSort(term) {
    if (!term || term.type !== 'list')
        return undefined;
    let field;
    let direction = 'asc';
    for (const item of term.items) {
        if (item.type !== 'compound')
            continue;
        switch (item.functor) {
            case 'field':
                field = extractString(item.args[0]) || undefined;
                break;
            case 'direction':
                const dir = extractString(item.args[0]);
                if (dir === 'asc' || dir === 'desc') {
                    direction = dir;
                }
                break;
        }
    }
    return field ? { field, direction } : undefined;
}
/**
 * Parse layout hints.
 */
function parseLayouts(term) {
    if (!term || term.type !== 'list')
        return undefined;
    const layouts = [];
    for (const item of term.items) {
        if (item.type !== 'compound' || item.functor !== 'layout_hint')
            continue;
        const dataType = extractString(item.args[0]);
        const layout = extractString(item.args[1]);
        if (!dataType || !layout)
            continue;
        layouts.push({ dataType, layout });
    }
    return layouts.length > 0 ? layouts : undefined;
}
/**
 * Extract string value from term.
 */
function extractString(term) {
    if (!term)
        return null;
    if (term.type === 'string')
        return term.value;
    if (term.type === 'atom')
        return term.value;
    return null;
}
//# sourceMappingURL=protocol.js.map