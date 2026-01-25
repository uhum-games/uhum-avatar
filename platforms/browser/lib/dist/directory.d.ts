/**
 * Uhum Directory Service Client
 *
 * Resolves agent IDs to connection information (WebSocket URL, dossier).
 * The Avatar bundle has the agent ID baked in at build time, and uses
 * this service to fetch the Brain URL at runtime.
 *
 * This allows the Brain URL to change without rebuilding the bundle.
 */
/**
 * Agent information returned by the Directory Service.
 */
export interface AgentInfo {
    /** WebSocket URL to connect to the Brain */
    wsUrl: string;
    /** Optional agent dossier with presentation hints */
    dossier?: AgentDossier;
}
/**
 * Agent dossier containing metadata and presentation hints.
 */
export interface AgentDossier {
    /** Display name */
    name?: string;
    /** Agent description */
    description?: string;
    /** Available intents */
    intents?: AgentIntent[];
    /** Presentation hints (brand, home, layout) */
    presentation?: {
        brand?: {
            name?: string;
            logo?: string;
            primaryColor?: string;
            greetings?: string[];
        };
        home?: {
            featuredSections?: string[];
        };
        layoutHints?: Record<string, string>;
    };
}
/**
 * Agent intent definition.
 */
export interface AgentIntent {
    /** Intent name */
    name: string;
    /** Human-readable description */
    description?: string;
    /** Required parameters */
    params?: Array<{
        name: string;
        type: string;
        required?: boolean;
    }>;
}
/**
 * Directory resolution error.
 */
export declare class DirectoryError extends Error {
    readonly code: 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'INVALID_RESPONSE';
    readonly agentId?: string | undefined;
    constructor(message: string, code: 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'INVALID_RESPONSE', agentId?: string | undefined);
}
/**
 * Directory service client options.
 */
export interface DirectoryClientOptions {
    /** Directory service base URL */
    baseUrl?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Number of retry attempts */
    retries?: number;
    /** Base delay between retries (exponential backoff) */
    retryDelay?: number;
}
/**
 * Uhum Directory Service Client.
 *
 * @example
 * ```typescript
 * const directory = new DirectoryClient();
 *
 * // Resolve agent by ID (agent ID is baked into bundle at build time)
 * const agentInfo = await directory.resolve('acme.billing');
 * console.log(agentInfo.wsUrl); // "wss://brain.acme.com"
 *
 * // Connect to the Brain
 * await avatar.connect(agentInfo.wsUrl, 'acme.billing');
 * ```
 */
export declare class DirectoryClient {
    private baseUrl;
    private timeout;
    private debug;
    private retries;
    private retryDelay;
    constructor(options?: DirectoryClientOptions);
    /**
     * Resolve an agent ID to connection information.
     *
     * @param agentId - The agent ID to resolve (e.g., "acme.billing")
     * @returns Agent information including WebSocket URL and dossier
     * @throws {DirectoryError} If resolution fails
     */
    resolve(agentId: string): Promise<AgentInfo>;
    /**
     * Check if the directory service is available.
     */
    healthCheck(): Promise<boolean>;
    private fetchWithTimeout;
    private sleep;
    private log;
}
/**
 * Create a mock directory client for development.
 *
 * @param mockWsUrl - WebSocket URL to return for all agent IDs
 * @param mockDossier - Optional dossier to return
 */
export declare function createMockDirectory(mockWsUrl: string, mockDossier?: AgentDossier): DirectoryClient;
//# sourceMappingURL=directory.d.ts.map