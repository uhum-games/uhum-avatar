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
 * Directory resolution error.
 */
export class DirectoryError extends Error {
    constructor(message, code, agentId) {
        super(message);
        this.code = code;
        this.agentId = agentId;
        this.name = 'DirectoryError';
    }
}
const DEFAULT_DIRECTORY_URL = 'https://directory.uhum.io';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
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
export class DirectoryClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || DEFAULT_DIRECTORY_URL;
        this.timeout = options.timeout || DEFAULT_TIMEOUT;
        this.debug = options.debug || false;
        this.retries = options.retries ?? DEFAULT_RETRIES;
        this.retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;
    }
    /**
     * Resolve an agent ID to connection information.
     *
     * @param agentId - The agent ID to resolve (e.g., "acme.billing")
     * @returns Agent information including WebSocket URL and dossier
     * @throws {DirectoryError} If resolution fails
     */
    async resolve(agentId) {
        this.log(`Resolving agent: ${agentId}`);
        let lastError = null;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const result = await this.fetchWithTimeout(agentId);
                this.log(`Resolved ${agentId}:`, result);
                return result;
            }
            catch (error) {
                lastError = error;
                this.log(`Attempt ${attempt + 1} failed:`, error);
                if (error instanceof DirectoryError && error.code === 'NOT_FOUND') {
                    // Don't retry for 404
                    throw error;
                }
                if (attempt < this.retries) {
                    const delay = this.retryDelay * Math.pow(2, attempt);
                    this.log(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError || new DirectoryError('Failed to resolve agent after retries', 'SERVICE_UNAVAILABLE', agentId);
    }
    /**
     * Check if the directory service is available.
     */
    async healthCheck() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async fetchWithTimeout(agentId) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const url = `${this.baseUrl}/resolve?agentId=${encodeURIComponent(agentId)}`;
            this.log(`Fetching: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.status === 404) {
                throw new DirectoryError(`Agent not registered: ${agentId}`, 'NOT_FOUND', agentId);
            }
            if (response.status >= 500) {
                throw new DirectoryError(`Directory service error: ${response.status}`, 'SERVICE_UNAVAILABLE', agentId);
            }
            if (!response.ok) {
                throw new DirectoryError(`Unexpected response: ${response.status}`, 'INVALID_RESPONSE', agentId);
            }
            const data = await response.json();
            if (!data.wsUrl) {
                throw new DirectoryError('Invalid response: missing wsUrl', 'INVALID_RESPONSE', agentId);
            }
            return {
                wsUrl: data.wsUrl,
                dossier: data.dossier,
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof DirectoryError) {
                throw error;
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new DirectoryError(`Request timeout after ${this.timeout}ms`, 'NETWORK_ERROR', agentId);
            }
            throw new DirectoryError(`Network error: ${error.message}`, 'NETWORK_ERROR', agentId);
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    log(...args) {
        if (this.debug) {
            console.log('[Directory]', ...args);
        }
    }
}
/**
 * Create a mock directory client for development.
 *
 * @param mockWsUrl - WebSocket URL to return for all agent IDs
 * @param mockDossier - Optional dossier to return
 */
export function createMockDirectory(mockWsUrl, mockDossier) {
    const client = new DirectoryClient();
    // Override resolve to return mock data
    client.resolve = async (agentId) => {
        console.log(`[MockDirectory] Resolving ${agentId} → ${mockWsUrl}`);
        return {
            wsUrl: mockWsUrl,
            dossier: mockDossier,
        };
    };
    return client;
}
//# sourceMappingURL=directory.js.map