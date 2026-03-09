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
  dossier?: AgentCard;
}

/**
 * Agent dossier containing metadata and presentation hints.
 */
export interface AgentCard {
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
export class DirectoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'INVALID_RESPONSE',
    public readonly agentId?: string
  ) {
    super(message);
    this.name = 'DirectoryError';
  }
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
  private baseUrl: string;
  private timeout: number;
  private debug: boolean;
  private retries: number;
  private retryDelay: number;

  constructor(options: DirectoryClientOptions = {}) {
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
  async resolve(agentId: string): Promise<AgentInfo> {
    this.log(`Resolving agent: ${agentId}`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const result = await this.fetchWithTimeout(agentId);
        this.log(`Resolved ${agentId}:`, result);
        return result;
      } catch (error) {
        lastError = error as Error;
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

    throw lastError || new DirectoryError(
      'Failed to resolve agent after retries',
      'SERVICE_UNAVAILABLE',
      agentId
    );
  }

  /**
   * Check if the directory service is available.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetchWithTimeout(agentId: string): Promise<AgentInfo> {
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
        throw new DirectoryError(
          `Agent not registered: ${agentId}`,
          'NOT_FOUND',
          agentId
        );
      }

      if (response.status >= 500) {
        throw new DirectoryError(
          `Directory service error: ${response.status}`,
          'SERVICE_UNAVAILABLE',
          agentId
        );
      }

      if (!response.ok) {
        throw new DirectoryError(
          `Unexpected response: ${response.status}`,
          'INVALID_RESPONSE',
          agentId
        );
      }

      const data = await response.json();

      if (!data.wsUrl) {
        throw new DirectoryError(
          'Invalid response: missing wsUrl',
          'INVALID_RESPONSE',
          agentId
        );
      }

      return {
        wsUrl: data.wsUrl,
        dossier: data.dossier,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DirectoryError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DirectoryError(
          `Request timeout after ${this.timeout}ms`,
          'NETWORK_ERROR',
          agentId
        );
      }

      throw new DirectoryError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR',
        agentId
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[Directory]', ...args);
    }
  }
}

/**
 * Create a mock directory client for development.
 *
 * @param mockWsUrl - WebSocket URL to return for all agent IDs
 * @param mockAgentCard - Optional dossier to return
 */
export function createMockDirectory(mockWsUrl: string, mockAgentCard?: AgentCard): DirectoryClient {
  const client = new DirectoryClient();

  // Override resolve to return mock data
  client.resolve = async (agentId: string) => {
    console.log(`[MockDirectory] Resolving ${agentId} → ${mockWsUrl}`);
    return {
      wsUrl: mockWsUrl,
      dossier: mockAgentCard,
    };
  };

  return client;
}
