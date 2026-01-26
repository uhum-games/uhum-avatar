/**
 * useList Hook - Fetch and cache list data from the Brain.
 * 
 * This hook:
 * 1. Triggers the appropriate intent to fetch list data (based on component definition)
 * 2. Caches the results to avoid redundant requests
 * 3. Reads from the factsStore for the specified model
 * 4. Provides cache invalidation capability
 * 
 * @example
 * ```tsx
 * function BooksList({ component }) {
 *   const { data, loading, error, refetch, invalidate } = useList({
 *     component,          // The component definition (has listIntent and source)
 *     client,             // The AvatarClient instance
 *     autoFetch: true,    // Automatically fetch on mount
 *   });
 * 
 *   if (loading) return <Spinner />;
 *   return <Table data={data} />;
 * }
 * ```
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { DossierComponent, DossierModel, AvatarState, ListCache } from '../types';
import { AvatarClient } from '../avatar';

/**
 * Options for the useList hook.
 */
export interface UseListOptions {
  /** The component definition (includes source, listIntent, fields) */
  component: DossierComponent;
  /** The AvatarClient instance */
  client: AvatarClient;
  /** Whether to automatically fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Stale time in ms - refetch if cache is older than this (default: 0 = always fresh) */
  staleTime?: number;
}

/**
 * Result from the useList hook.
 */
export interface UseListResult<T = Record<string, unknown>> {
  /** The list data (from factsStore) */
  data: T[];
  /** Whether a fetch is in progress */
  loading: boolean;
  /** Whether data has been fetched at least once */
  fetched: boolean;
  /** The model definition (from dossier) */
  model: DossierModel | undefined;
  /** Cache info */
  cache: ListCache | undefined;
  /** Trigger a fetch (even if cached) */
  refetch: () => void;
  /** Invalidate the cache (next access will refetch) */
  invalidate: () => void;
}

/**
 * Hook to fetch and cache list data for a component.
 * 
 * Automatically triggers the component's `listIntent` and stores results
 * in the `factsStore` under the model name.
 */
export function useList<T = Record<string, unknown>>(
  options: UseListOptions
): UseListResult<T> {
  const { component, client, autoFetch = true, staleTime = 0 } = options;

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
  
  // Get list intent from component (e.g., "list_books")
  const listIntent = component.listIntent ?? `list_${modelName}s`;

  // Get model definition from dossier
  const model = useMemo(() => {
    return state.dossier?.models?.find(m => m.name === modelName);
  }, [state.dossier, modelName]);

  // Get data from factsStore
  const data = useMemo(() => {
    return (state.factsStore[modelName] ?? []) as T[];
  }, [state.factsStore, modelName]);

  // Get cache info
  const cache = state.listCache[modelName];
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
    if (!modelName || !listIntent) {
      console.warn('[useList] Cannot fetch: missing model or listIntent', { modelName, listIntent });
      return;
    }

    // Set loading state
    client.dispatch({
      type: 'SET_LIST_LOADING',
      model: modelName,
      intent: listIntent,
      loading: true,
    });

    // Send the intention to the Brain
    client.sendIntention(listIntent, {});
  }, [client, modelName, listIntent]);

  // Refetch (force fetch regardless of cache)
  const refetch = useCallback(() => {
    fetch();
  }, [fetch]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    client.dispatch({
      type: 'INVALIDATE_LIST_CACHE',
      model: modelName,
    });
  }, [client, modelName]);

  // Auto-fetch on mount if enabled and not already fetched (or stale)
  useEffect(() => {
    if (autoFetch && (!fetched || isStale) && !loading) {
      fetch();
    }
  }, [autoFetch, fetched, isStale, loading, fetch]);

  return {
    data,
    loading,
    fetched,
    model,
    cache,
    refetch,
    invalidate,
  };
}

/**
 * Get facts for a specific model from the Avatar state.
 * 
 * This is a simple selector function for use outside of hooks.
 */
export function getModelFacts<T = Record<string, unknown>>(
  state: AvatarState,
  modelName: string
): T[] {
  return (state.factsStore[modelName] ?? []) as T[];
}

/**
 * Get model definition from the dossier.
 */
export function getModelDefinition(
  state: AvatarState,
  modelName: string
): DossierModel | undefined {
  return state.dossier?.models?.find(m => m.name === modelName);
}

export default useList;
