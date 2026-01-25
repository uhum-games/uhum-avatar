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
      return term.value;

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
}

export function buildJoinMessage(options: JoinOptions): string {
  const capabilities = options.capabilities || ['memory_sync', 'intentions'];

  const bodyArgs: Term[] = [
    Term.compound('capabilities', [Term.list(capabilities.map(Term.atom))]),
  ];

  if (options.resumeToken) {
    bodyArgs.push(Term.compound('resume', [Term.string(options.resumeToken)]));
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
