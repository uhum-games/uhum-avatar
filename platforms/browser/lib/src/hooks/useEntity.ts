/**
 * useEntity Hook - Fetch and cache a single entity from the Brain.
 * 
 * This hook:
 * 1. Triggers the appropriate intent to fetch a single entity (based on component definition)
 * 2. Caches the results to avoid redundant requests
 * 3. Reads from the entityStore for the specified model
 * 4. Provides cache invalidation capability
 * 
 * Note: For detail components, the entity is typically fetched using `get_<source>` intent
 * with an identifier (e.g., get_book with title or id).
 * 
 * @example
 * ```tsx
 * function BookDetail({ component, entityId }) {
 *   const { entity, loading, error, refetch } = useEntity({
 *     component,          // The component definition (has detailIntent and source)
 *     client,             // The AvatarClient instance
 *     entityId,           // The identifier of the entity to fetch
 *     autoFetch: true,    // Automatically fetch on mount
 *   });
 * 
 *   if (loading) return <Spinner />;
 *   if (!entity) return <div>Not found</div>;
 *   return <Detail data={entity} />;
 * }
 * ```
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { AgentCardComponent, AgentCardModel, AvatarState, EntityCache } from '../types';
import { AvatarClient } from '../avatar';

/**
 * Options for the useEntity hook.
 */
export interface UseEntityOptions {
  /** The component definition (includes source, detailIntent, fields) */
  component: AgentCardComponent;
  /** The AvatarClient instance */
  client: AvatarClient;
  /** The entity identifier to fetch (can be id, title, or other unique field) */
  entityId?: string | number;
  /** The field name used for identification (default: 'id' or 'title') */
  identifierField?: string;
  /** Whether to automatically fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Stale time in ms - refetch if cache is older than this (default: 0 = always fresh) */
  staleTime?: number;
}

/**
 * Result from the useEntity hook.
 */
export interface UseEntityResult<T = Record<string, unknown>> {
  /** The entity data (from entityStore) */
  entity: T | undefined;
  /** Whether a fetch is in progress */
  loading: boolean;
  /** Whether data has been fetched at least once */
  fetched: boolean;
  /** The model definition (from dossier) */
  model: AgentCardModel | undefined;
  /** Cache info */
  cache: EntityCache | undefined;
  /** Trigger a fetch (even if cached) */
  refetch: () => void;
  /** Invalidate the cache (next access will refetch) */
  invalidate: () => void;
}

/**
 * Hook to fetch and cache a single entity for a component.
 * 
 * Automatically triggers the component's `detailIntent` and stores results
 * in the `entityStore` under the model name.
 */
export function useEntity<T = Record<string, unknown>>(
  options: UseEntityOptions
): UseEntityResult<T> {
  const { component, client, entityId, identifierField, autoFetch = true, staleTime = 0 } = options;

  // Local state for reactive updates (subscribes to client state changes)
  const [state, setState] = useState<AvatarState>(client.getState());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = client.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [client]);
  
  // Extract model name from component source
  const modelName = component.source ?? '';
  
  // Get detail intent from component (e.g., "get_book")
  const detailIntent = component.detailIntent ?? `get_${modelName}`;

  // Determine the identifier field (default to 'id' or 'title')
  const idField = identifierField ?? 'id';

  // Get model definition from dossier
  const model = useMemo(() => {
    return state.dossier?.models?.find(m => m.name === modelName);
  }, [state.dossier, modelName]);

  // Get entity from entityStore (find by identifier)
  const entity = useMemo(() => {
    const entities = (state.entityStore[modelName] ?? []) as T[];
    if (!entityId) return undefined;
    
    // Try to find by the identifier field
    return entities.find((e) => {
      const record = e as Record<string, unknown>;
      // Try multiple common identifier fields
      return record[idField] === entityId 
        || record.id === entityId 
        || record.title === entityId
        || record.name === entityId;
    });
  }, [state.entityStore, modelName, entityId, idField]);

  // Generate cache key for this specific entity
  const cacheKey = `${modelName}:${entityId ?? 'none'}`;

  // Get cache info
  const cache = state.entityCache?.[cacheKey];
  const loading = cache?.loading ?? false;
  const fetched = cache?.updatedAt !== undefined && cache.updatedAt > 0;

  // Check if cache is stale
  const isStale = useMemo(() => {
    if (!cache?.updatedAt) return true;
    if (staleTime === 0) return false; // 0 means never stale once fetched
    return Date.now() - cache.updatedAt > staleTime;
  }, [cache?.updatedAt, staleTime]);

  // Fetch function
  const fetch = useCallback(() => {
    if (!modelName || !detailIntent) {
      console.warn('[useEntity] Cannot fetch: missing model or detailIntent', { modelName, detailIntent });
      return;
    }

    if (!entityId) {
      console.warn('[useEntity] Cannot fetch: missing entityId');
      return;
    }

    // Set loading state
    client.dispatch({
      type: 'SET_ENTITY_LOADING',
      model: modelName,
      entityId: String(entityId),
      intent: detailIntent,
      loading: true,
    });

    // Send the intention to the Brain with the identifier
    client.sendIntention(detailIntent, { [idField]: entityId });
  }, [client, modelName, detailIntent, entityId, idField]);

  // Refetch (force fetch regardless of cache)
  const refetch = useCallback(() => {
    fetch();
  }, [fetch]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    client.dispatch({
      type: 'INVALIDATE_ENTITY_CACHE',
      model: modelName,
      entityId: entityId ? String(entityId) : undefined,
    });
  }, [client, modelName, entityId]);

  // Auto-fetch on mount if enabled and not already fetched (or stale)
  useEffect(() => {
    if (autoFetch && entityId && (!fetched || isStale) && !loading) {
      fetch();
    }
  }, [autoFetch, entityId, fetched, isStale, loading, fetch]);

  return {
    entity,
    loading,
    fetched,
    model,
    cache,
    refetch,
    invalidate,
  };
}

/**
 * Get a single entity by identifier from the Avatar state.
 * 
 * This is a simple selector function for use outside of hooks.
 */
export function getEntity<T = Record<string, unknown>>(
  state: AvatarState,
  modelName: string,
  entityId: string | number,
  identifierField = 'id'
): T | undefined {
  const entities = (state.entityStore[modelName] ?? []) as T[];
  return entities.find((e) => {
    const record = e as Record<string, unknown>;
    return record[identifierField] === entityId 
      || record.id === entityId 
      || record.title === entityId
      || record.name === entityId;
  });
}

export default useEntity;
