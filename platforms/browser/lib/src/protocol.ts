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
// Types
// ============================================================================

export interface UhumFrame {
  version: string;
  headers: Record<string, string>;
  body?: string;
}

export interface UhumMessage {
  type: MessageType;
  id: string;
  from: string;
  to: string;
  at: number;
  cursor?: number;
  cursorEnd?: number;
  trace?: string;
  reply?: string;
  body?: Term;
}

export type MessageType =
  | 'join'
  | 'welcome'
  | 'leave'
  | 'intention'
  | 'decision'
  | 'memory'
  | 'snapshot'
  | 'presence'
  | 'ack'
  | 'ping'
  | 'pong'
  | 'error'
  | 'backpressure';

// ============================================================================
// Term Types (Prolog-style)
// ============================================================================

export type Term =
  | { type: 'atom'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'list'; items: Term[] }
  | { type: 'compound'; functor: string; args: Term[] }
  | { type: 'variable'; name: string };

// ============================================================================
// Term Constructors
// ============================================================================

export const Term = {
  atom: (value: string): Term => ({ type: 'atom', value }),
  number: (value: number): Term => ({ type: 'number', value }),
  string: (value: string): Term => ({ type: 'string', value }),
  list: (items: Term[]): Term => ({ type: 'list', items }),
  compound: (functor: string, args: Term[]): Term => ({ type: 'compound', functor, args }),
  variable: (name: string): Term => ({ type: 'variable', name }),
};

// ============================================================================
// Term Serialization (to Prolog format)
// ============================================================================

export function termToString(term: Term): string {
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
      throw new Error(`Unknown term type: ${(term as Term).type}`);
  }
}

// ============================================================================
// Term Parsing (from Prolog format)
// ============================================================================

class TermParser {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input.trim();
  }

  parse(): Term {
    this.skipWhitespace();
    return this.parseTerm();
  }

  private parseTerm(): Term {
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

  private parseList(): Term {
    this.expect('[');
    this.skipWhitespace();

    if (this.peek() === ']') {
      this.advance();
      return Term.list([]);
    }

    const items: Term[] = [];
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

  private parseString(): Term {
    this.expect('"');
    let value = '';
    while (this.pos < this.input.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }
    this.expect('"');
    return Term.string(value);
  }

  private parseQuotedAtom(): Term {
    this.expect("'");
    let value = '';
    while (this.pos < this.input.length && this.peek() !== "'") {
      if (this.peek() === '\\') {
        this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }
    this.expect("'");
    return Term.atom(value);
  }

  private parseNumber(): Term {
    let numStr = '';
    if (this.peek() === '-') {
      numStr += this.advance();
    }
    while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
      numStr += this.advance();
    }
    return Term.number(parseFloat(numStr));
  }

  private parseVariable(): Term {
    let name = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      name += this.advance();
    }
    return Term.variable(name);
  }

  private parseAtomOrCompound(): Term {
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

      const args: Term[] = [];
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

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private advance(): string {
    return this.input[this.pos++] || '';
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) {
      throw new Error(`Expected '${ch}' but found '${this.peek()}' at position ${this.pos}`);
    }
    this.advance();
  }
}

export function parseTerm(input: string): Term {
  // Remove trailing period if present
  const trimmed = input.trim().replace(/\.$/, '').trim();
  return new TermParser(trimmed).parse();
}

// ============================================================================
// Frame Encoding
// ============================================================================

export function encodeFrame(frame: UhumFrame): string {
  const lines: string[] = [frame.version];

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

export function decodeFrame(input: string): UhumFrame {
  const lines = input.split('\n');

  if (lines.length === 0) {
    throw new Error('Empty frame');
  }

  const version = lines[0];
  if (!version.startsWith('UHUM/')) {
    throw new Error(`Invalid version line: ${version}`);
  }

  const headers: Record<string, string> = {};
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

export function generateMessageId(): string {
  return `msg_${Date.now().toString(36)}_${(++messageCounter).toString(36)}`;
}

export interface MessageBuilderOptions {
  type: MessageType;
  from: string;
  to: string;
  reply?: string;
  trace?: string;
}

export function buildMessage(options: MessageBuilderOptions, body?: Term): string {
  const frame: UhumFrame = {
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

export function parseMessage(input: string): UhumMessage {
  const frame = decodeFrame(input);

  const message: UhumMessage = {
    type: frame.headers.type as MessageType,
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

// ============================================================================
// High-Level Message Builders
// ============================================================================

export interface JoinOptions {
  avatarId: string;
  agentAddress: string;
  capabilities?: string[];
  resumeToken?: string;
  /** Cursor position to resume from (for reconnection) */
  resumeCursor?: number;
}

export function buildJoinMessage(options: JoinOptions): string {
  const capabilities = options.capabilities || ['memory_sync', 'intentions'];

  const bodyArgs: Term[] = [
    Term.compound('capabilities', [Term.list(capabilities.map(Term.atom))]),
  ];

  if (options.resumeToken) {
    bodyArgs.push(Term.compound('resume', [Term.string(options.resumeToken)]));
  }

  if (options.resumeCursor !== undefined) {
    bodyArgs.push(Term.compound('cursor', [Term.number(options.resumeCursor)]));
  }

  return buildMessage(
    {
      type: 'join',
      from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
      to: `uhum://${options.agentAddress}`,
    },
    Term.compound('join', [Term.list(bodyArgs)])
  );
}

export interface IntentionOptions {
  avatarId: string;
  agentAddress: string;
  intent: string;
  params: Record<string, unknown>;
}

export function buildIntentionMessage(options: IntentionOptions): string {
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

  return buildMessage(
    {
      type: 'intention',
      from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
      to: `uhum://${options.agentAddress}`,
    },
    body
  );
}

export interface TextMessageOptions {
  avatarId: string;
  agentAddress: string;
  text: string;
}

export function buildTextMessage(options: TextMessageOptions): string {
  const body = Term.compound('message', [Term.string(options.text)]);

  return buildMessage(
    {
      type: 'intention',
      from: `uhum://avatar:${options.agentAddress}/${options.avatarId}`,
      to: `uhum://${options.agentAddress}`,
    },
    body
  );
}

export function buildLeaveMessage(avatarId: string, agentAddress: string): string {
  return buildMessage(
    {
      type: 'leave',
      from: `uhum://avatar:${agentAddress}/${avatarId}`,
      to: `uhum://${agentAddress}`,
    },
    Term.atom('leave')
  );
}

export function buildPingMessage(avatarId: string, agentAddress: string): string {
  return buildMessage(
    {
      type: 'ping',
      from: `uhum://avatar:${agentAddress}/${avatarId}`,
      to: `uhum://${agentAddress}`,
    },
    Term.atom('ping')
  );
}

export function buildAckMessage(
  avatarId: string,
  agentAddress: string,
  cursor: number
): string {
  const frame: UhumFrame = {
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

function valueToTerm(value: unknown): Term {
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
    const entries = Object.entries(value as Record<string, unknown>);
    return Term.list(
      entries.map(([k, v]) => Term.compound(k, [valueToTerm(v)]))
    );
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
export function extractDecisionFacts(body: Term): Term[] {
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
export function extractViewInstructions(body: Term): Term[] {
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
export function extractMemoryEvents(body: Term): Term[] {
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
export function termToObject(term: Term): unknown {
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

// ============================================================================
// Dossier Extraction
// ============================================================================

import type {
  AgentDossier,
  DossierIdentity,
  DossierIntent,
  DossierParam,
  DossierPresentation,
  DossierBrand,
  DossierHomeSection,
  DossierView,
  DossierViewColumn,
  DossierViewAction,
  DossierViewFilter,
  DossierViewType,
  DossierLayoutHint,
  // Model types
  DossierModel,
  DossierModelField,
  // Component types
  DossierComponent,
  DossierComponentType,
  DossierComponentAction,
  DossierComponentFilter,
  DossierField,
  DossierFieldType,
  // State types
  DossierState,
  DossierStateVariable,
} from './types';

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
export function extractDossierFromWelcome(body: Term): AgentDossier | null {
  if (body.type !== 'compound' || body.functor !== 'welcome') {
    return null;
  }

  const welcomeList = body.args[0];
  if (welcomeList?.type !== 'list') {
    return null;
  }

  // Find dossier(...) in the welcome list
  let dossierTerm: Term | null = null;
  let agentId = '';
  let agentVersion = '';

  for (const item of welcomeList.items) {
    if (item.type === 'compound') {
      if (item.functor === 'dossier') {
        dossierTerm = item;
      } else if (item.functor === 'agent' && item.args.length >= 2) {
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

  let identity: DossierIdentity = { id: agentId, name: agentId, version: agentVersion };
  let intents: DossierIntent[] = [];
  let models: DossierModel[] | undefined;
  let presentation: DossierPresentation | undefined;

  for (const item of dossierList.items) {
    if (item.type !== 'compound') continue;

    switch (item.functor) {
      case 'identity':
        identity = parseIdentity(item.args[0], agentId, agentVersion);
        break;
      case 'intents':
        intents = parseIntents(item.args[0]);
        break;
      case 'models':
        models = parseModels(item.args[0]);
        break;
      case 'presentation':
        presentation = parsePresentation(item.args[0]);
        break;
    }
  }

  return { identity, intents, models, presentation };
}

/**
 * Parse identity section.
 */
function parseIdentity(term: Term | undefined, defaultId: string, defaultVersion: string): DossierIdentity {
  const identity: DossierIdentity = {
    id: defaultId,
    name: defaultId,
    version: defaultVersion,
  };

  if (!term || term.type !== 'list') return identity;

  for (const item of term.items) {
    if (item.type !== 'compound' || item.args.length < 1) continue;

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
function parseIntents(term: Term | undefined): DossierIntent[] {
  if (!term || term.type !== 'list') return [];

  const intents: DossierIntent[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'intent') continue;

    const intent = parseIntent(item);
    if (intent) intents.push(intent);
  }

  return intents;
}

/**
 * Parse a single intent.
 */
function parseIntent(term: Term): DossierIntent | null {
  if (term.type !== 'compound' || term.functor !== 'intent') return null;

  const name = extractString(term.args[0]);
  if (!name) return null;

  const intent: DossierIntent = { name };

  const propsList = term.args[1];
  if (propsList?.type !== 'list') return intent;

  for (const prop of propsList.items) {
    if (prop.type !== 'compound') continue;

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
function parseParams(term: Term | undefined): DossierParam[] {
  if (!term || term.type !== 'list') return [];

  const params: DossierParam[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'param') continue;

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
 * 
 * Note: models are at dossier root, not in presentation.
 */
function parsePresentation(term: Term | undefined): DossierPresentation | undefined {
  if (!term || term.type !== 'list') return undefined;

  const presentation: DossierPresentation = {};

  for (const item of term.items) {
    if (item.type !== 'compound') continue;

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
function parseBrand(term: Term | undefined): DossierBrand | undefined {
  if (!term || term.type !== 'list') return undefined;

  const brand: DossierBrand = {};

  for (const item of term.items) {
    if (item.type !== 'compound') continue;

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
            .filter((s): s is string => s !== null && s.length > 0);
        }
        break;
    }
  }

  return Object.keys(brand).length > 0 ? brand : undefined;
}

// =============================================================================
// Model Parsing
// =============================================================================

/**
 * Parse model definitions.
 * 
 * Models define the schema for facts (data structure).
 * 
 * Format:
 * ```prolog
 * models([
 *     model(book, [
 *         field(title, string, "Book title"),
 *         field(author, string, "Author name"),
 *         field(year, number, "Publication year"),
 *         field(status, atom, "Reading status")
 *     ]),
 *     model(genre, [
 *         field(book_title, string, "Reference to book"),
 *         field(genre, atom, "Genre category")
 *     ])
 * ])
 * ```
 */
function parseModels(term: Term | undefined): DossierModel[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const models: DossierModel[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'model') continue;
    
    const model = parseModel(item);
    if (model) models.push(model);
  }

  return models.length > 0 ? models : undefined;
}

/**
 * Parse a single model definition.
 * 
 * Format: model(name, [field(...), field(...), ...])
 */
function parseModel(term: Term): DossierModel | null {
  if (term.type !== 'compound' || term.functor !== 'model') return null;
  if (term.args.length < 2) return null;

  const name = extractString(term.args[0]);
  if (!name) return null;

  const fieldsList = term.args[1];
  if (fieldsList?.type !== 'list') return null;

  const fields: DossierModelField[] = [];
  for (const fieldTerm of fieldsList.items) {
    if (fieldTerm.type !== 'compound' || fieldTerm.functor !== 'field') continue;
    
    const field = parseModelField(fieldTerm);
    if (field) fields.push(field);
  }

  return { name, fields };
}

/**
 * Parse a model field definition.
 * 
 * Format: field(name, type, label) or field(name, type, label, reference(model))
 */
function parseModelField(term: Term): DossierModelField | null {
  if (term.type !== 'compound' || term.functor !== 'field') return null;
  if (term.args.length < 3) return null;

  const name = extractString(term.args[0]);
  const type = extractString(term.args[1]) as DossierModelField['type'];
  const label = extractString(term.args[2]);

  if (!name || !type || !label) return null;

  const field: DossierModelField = { name, type, label };

  // Check for reference (optional 4th arg)
  if (term.args.length >= 4) {
    const refTerm = term.args[3];
    if (refTerm?.type === 'compound' && refTerm.functor === 'reference') {
      field.reference = extractString(refTerm.args[0]) || undefined;
    }
  }

  return field;
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
function parseState(term: Term | undefined): DossierState | undefined {
  if (!term || term.type !== 'list') return undefined;

  const variables: DossierStateVariable[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound') continue;

    // Each item is: variable_name([type(...), source(...), ...])
    const name = item.functor;
    const variable: DossierStateVariable = { name, type: 'unknown' };
    
    const propsList = item.args[0];
    if (propsList?.type === 'list') {
      for (const prop of propsList.items) {
        if (prop.type !== 'compound') continue;
        
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
function parseComponents(term: Term | undefined): DossierComponent[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const components: DossierComponent[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'component') continue;

    const name = extractString(item.args[0]);
    if (!name) continue;

    const component: DossierComponent = { name };
    const propsList = item.args[1];

    if (propsList?.type === 'list') {
      for (const prop of propsList.items) {
        if (prop.type !== 'compound') continue;

        switch (prop.functor) {
          case 'title':
            component.title = extractString(prop.args[0]) || undefined;
            break;
          case 'description':
            component.description = extractString(prop.args[0]) || undefined;
            break;
          case 'type':
            component.type = extractString(prop.args[0]) as DossierComponentType || undefined;
            break;
          case 'source':
            component.source = extractString(prop.args[0]) || undefined;
            break;
          case 'context':
            // context(selected_book) - the context variable this component depends on
            component.context = extractString(prop.args[0]) || undefined;
            break;
          case 'list_intent':
            // list_intent(list_books) - intent to trigger for fetching list data
            component.listIntent = extractString(prop.args[0]) || undefined;
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
function parseComponentFields(term: Term | undefined): DossierField[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const fields: DossierField[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'field') continue;

    const name = extractString(item.args[0]);
    const type = (extractString(item.args[1]) || 'string') as DossierFieldType;
    const label = extractString(item.args[2]) || name || '';

    if (name) {
      const field: DossierField = { name, type, label };
      
      // Parse optional properties from 4th argument if present
      const optsList = item.args[3];
      if (optsList?.type === 'list') {
        for (const opt of optsList.items) {
          if (opt.type !== 'compound') continue;
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
function parseComponentActions(term: Term | undefined): DossierComponentAction[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const actions: DossierComponentAction[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'action') continue;

    const intent = extractString(item.args[0]);
    const label = extractString(item.args[1]) || intent || '';

    if (intent) {
      const action: DossierComponentAction = { intent, label };
      
      // Optional icon (3rd arg)
      if (item.args[2]) {
        action.icon = extractString(item.args[2]) || undefined;
      }
      
      // Parse optional properties from 4th argument if present
      const optsList = item.args[3];
      if (optsList?.type === 'list') {
        for (const opt of optsList.items) {
          if (opt.type !== 'compound') continue;
          switch (opt.functor) {
            case 'variant':
              action.variant = extractString(opt.args[0]) as 'primary' | 'secondary' | 'danger' || undefined;
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
function parseComponentFilters(term: Term | undefined): DossierComponentFilter[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const filters: DossierComponentFilter[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'filter') continue;

    const field = extractString(item.args[0]);
    const type = (extractString(item.args[1]) || 'select') as DossierComponentFilter['type'];

    if (field) {
      const filter: DossierComponentFilter = { field, type };
      
      // Optional label (3rd arg)
      if (item.args[2]) {
        filter.label = extractString(item.args[2]) || undefined;
      }
      
      // Optional options list (4th arg)
      if (item.args[3]?.type === 'list') {
        filter.options = item.args[3].items
          .map(t => extractString(t))
          .filter((s): s is string => s !== null);
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
function parseHome(term: Term | undefined): DossierHomeSection[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const sections: DossierHomeSection[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'section') continue;

    const name = extractString(item.args[0]);
    if (!name) continue;

    const section: DossierHomeSection = { name };
    const propsList = item.args[1];

    if (propsList?.type === 'list') {
      for (const prop of propsList.items) {
        if (prop.type !== 'compound') continue;

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
function parseViews(term: Term | undefined): DossierView[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const views: DossierView[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'view') continue;

    const name = extractString(item.args[0]);
    if (!name) continue;

    const view: DossierView = { name };
    const propsList = item.args[1];

    if (propsList?.type === 'list') {
      for (const prop of propsList.items) {
        if (prop.type !== 'compound') continue;

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
                .filter((s): s is string => s !== null);
            }
            break;
          case 'layout':
            // How to arrange components: single, split, tabs, stack
            view.layout = extractString(prop.args[0]) as DossierView['layout'] || undefined;
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
function parseViewColumns(term: Term | undefined): DossierViewColumn[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const columns: DossierViewColumn[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'column') continue;

    const name = extractString(item.args[0]);
    const type = extractString(item.args[1]) || 'string';
    const label = extractString(item.args[2]) || name || '';

    if (name) {
      const column: DossierViewColumn = { name, type, label };
      
      // Parse optional properties from 4th argument if present
      const optsList = item.args[3];
      if (optsList?.type === 'list') {
        for (const opt of optsList.items) {
          if (opt.type !== 'compound') continue;
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
function parseViewActions(term: Term | undefined): DossierViewAction[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const actions: DossierViewAction[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'action') continue;

    const intent = extractString(item.args[0]);
    const label = extractString(item.args[1]) || intent || '';

    if (intent) {
      const action: DossierViewAction = { intent, label };
      
      // Optional icon (3rd arg)
      if (item.args[2]) {
        action.icon = extractString(item.args[2]) || undefined;
      }
      
      // Parse optional properties from 4th argument if present
      const optsList = item.args[3];
      if (optsList?.type === 'list') {
        for (const opt of optsList.items) {
          if (opt.type !== 'compound') continue;
          switch (opt.functor) {
            case 'variant':
              action.variant = extractString(opt.args[0]) as 'primary' | 'secondary' | 'danger' || undefined;
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
function parseViewFilters(term: Term | undefined): DossierViewFilter[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const filters: DossierViewFilter[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'filter') continue;

    const field = extractString(item.args[0]);
    const type = (extractString(item.args[1]) || 'select') as DossierViewFilter['type'];

    if (field) {
      const filter: DossierViewFilter = { field, type };
      
      // Optional label (3rd arg)
      if (item.args[2]) {
        filter.label = extractString(item.args[2]) || undefined;
      }
      
      // Optional options list (4th arg)
      if (item.args[3]?.type === 'list') {
        filter.options = item.args[3].items
          .map(t => extractString(t))
          .filter((s): s is string => s !== null);
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
function parseDefaultSort(term: Term | undefined): DossierComponent['defaultSort'] | undefined {
  if (!term || term.type !== 'list') return undefined;

  let field: string | undefined;
  let direction: 'asc' | 'desc' = 'asc';

  for (const item of term.items) {
    if (item.type !== 'compound') continue;
    
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
function parseLayouts(term: Term | undefined): DossierLayoutHint[] | undefined {
  if (!term || term.type !== 'list') return undefined;

  const layouts: DossierLayoutHint[] = [];

  for (const item of term.items) {
    if (item.type !== 'compound' || item.functor !== 'layout_hint') continue;

    const dataType = extractString(item.args[0]);
    const layout = extractString(item.args[1]);
    if (!dataType || !layout) continue;

    layouts.push({ dataType, layout });
  }

  return layouts.length > 0 ? layouts : undefined;
}

/**
 * Extract string value from term.
 */
function extractString(term: Term | undefined): string | null {
  if (!term) return null;
  if (term.type === 'string') return term.value;
  if (term.type === 'atom') return term.value;
  return null;
}
