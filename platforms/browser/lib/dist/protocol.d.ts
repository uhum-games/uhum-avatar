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
export type MessageType = 'join' | 'welcome' | 'leave' | 'intention' | 'decision' | 'memory' | 'snapshot' | 'presence' | 'ack' | 'ping' | 'pong' | 'error' | 'backpressure';
export type Term = {
    type: 'atom';
    value: string;
} | {
    type: 'number';
    value: number;
} | {
    type: 'string';
    value: string;
} | {
    type: 'list';
    items: Term[];
} | {
    type: 'compound';
    functor: string;
    args: Term[];
} | {
    type: 'variable';
    name: string;
};
export declare const Term: {
    atom: (value: string) => Term;
    number: (value: number) => Term;
    string: (value: string) => Term;
    list: (items: Term[]) => Term;
    compound: (functor: string, args: Term[]) => Term;
    variable: (name: string) => Term;
};
export declare function termToString(term: Term): string;
export declare function parseTerm(input: string): Term;
export declare function encodeFrame(frame: UhumFrame): string;
export declare function decodeFrame(input: string): UhumFrame;
export declare function generateMessageId(): string;
export interface MessageBuilderOptions {
    type: MessageType;
    from: string;
    to: string;
    reply?: string;
    trace?: string;
}
export declare function buildMessage(options: MessageBuilderOptions, body?: Term): string;
export declare function parseMessage(input: string): UhumMessage;
export interface JoinOptions {
    avatarId: string;
    agentAddress: string;
    capabilities?: string[];
    resumeToken?: string;
    /** Cursor position to resume from (for reconnection) */
    resumeCursor?: number;
}
export declare function buildJoinMessage(options: JoinOptions): string;
export interface IntentionOptions {
    avatarId: string;
    agentAddress: string;
    intent: string;
    params: Record<string, unknown>;
}
export declare function buildIntentionMessage(options: IntentionOptions): string;
export interface TextMessageOptions {
    avatarId: string;
    agentAddress: string;
    text: string;
}
export declare function buildTextMessage(options: TextMessageOptions): string;
export declare function buildLeaveMessage(avatarId: string, agentAddress: string): string;
export declare function buildPingMessage(avatarId: string, agentAddress: string): string;
export declare function buildAckMessage(avatarId: string, agentAddress: string, cursor: number): string;
/**
 * Extract data terms from a DECISION message body.
 *
 * Decision format: decision(Status, facts([...]), effects([...]), response("..."))
 * We look for facts(...) compound term in the args.
 *
 * Note: Brain returns "facts" (logical assertions), but Avatar treats them
 * as "entities" (model instances for display). This function extracts the
 * raw terms which are then converted to entities by the Avatar.
 */
export declare function extractDecisionData(body: Term): Term[];
/**
 * @deprecated Use extractDecisionData instead
 */
export declare function extractDecisionFacts(body: Term): Term[];
/**
 * Extract view instructions from a DECISION message body.
 *
 * Decision format: decision(Status, facts([...]), effects([...]), response("..."))
 * We extract from effects(...) which contains message, desire, navigate, etc.
 */
export declare function extractViewInstructions(body: Term): Term[];
/**
 * Extract response text from a DECISION message body.
 *
 * Decision format: decision(Status, facts([...]), effects([...]), response("..."))
 */
export declare function extractDecisionResponse(body: Term): string | null;
/**
 * Extract events from a MEMORY message body.
 *
 * Body format: memory([event(...), event(...)]).
 */
export declare function extractMemoryEvents(body: Term): Term[];
/**
 * Convert Term to a plain JavaScript object for easier use in UI.
 */
export declare function termToObject(term: Term): unknown;
import type { AgentDossier } from './types';
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
export declare function extractDossierFromWelcome(body: Term): AgentDossier | null;
//# sourceMappingURL=protocol.d.ts.map